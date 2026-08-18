import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIUsage } from '../models/AIUsage';
import { Store } from '../models/Store';
import mongoose from 'mongoose';

const COST_PER_1M_INPUT = 0.075; // $0.075 / 1M
const COST_PER_1M_OUTPUT = 0.30;  // $0.30 / 1M

export class GeminiService {
  private static genAI: GoogleGenerativeAI | null = null;

  private static getClient(): GoogleGenerativeAI | null {
    if (!this.genAI && process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  private static async checkQuotas(storeId: string): Promise<boolean> {
    const store = await Store.findById(storeId);
    if (!store) return false;
    return store.aiTokensUsed < store.aiTokenLimit;
  }

  private static async logUsage(
    storeId: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ) {
    try {
      const totalTokens = inputTokens + outputTokens;
      const estimatedCost = 
        (inputTokens * (COST_PER_1M_INPUT / 1000000)) + 
        (outputTokens * (COST_PER_1M_OUTPUT / 1000000));

      // Update Store Token Count
      await Store.findByIdAndUpdate(storeId, {
        $inc: { aiTokensUsed: totalTokens }
      });

      await AIUsage.create({
        storeId: new mongoose.Types.ObjectId(storeId),
        model: modelName,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost
      });
    } catch (error) {
      console.error('Error logging AI usage:', error);
    }
  }

  /**
   * Generates a suggested reply for a client conversation
   */
  static async suggestResponse(
    storeId: string,
    customerName: string,
    conversationHistory: { sender: string; text: string }[],
    productsContext: { name: string; price: number; stock: number; colors?: string[]; sizes?: string[] }[]
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const formattedHistory = conversationHistory
      .map((msg) => `${msg.sender === 'customer' ? customerName : 'Vendedor'}: ${msg.text}`)
      .join('\n');

    const formattedProducts = productsContext
      .map((p) => `- ${p.name}: Precio UYU $${p.price}, Stock: ${p.stock}${p.colors ? `, Colores: ${p.colors.join(', ')}` : ''}${p.sizes ? `, Talles: ${p.sizes.join(', ')}` : ''}`)
      .join('\n');

    const systemPrompt = `Sos un asistente inteligente integrado en SocialFlow, una plataforma de Social Commerce para tiendas de ropa de Uruguay.
Tu tarea es sugerir una respuesta al último mensaje del cliente (${customerName}).
Debes responder de manera profesional, amable, en español uruguayo (usá 'tú' o 'vos' de forma natural y cálida, ej. 'Hola! ¿Cómo estás?', 'Tenés disponible...', 'Te sale $3.990').
La moneda es Pesos Uruguayos (UYU) y se representa como $ (ej. $3.990).
Utilizá únicamente la información del catálogo de productos que se te proporciona a continuación. Si el producto consultado no está en la lista o no hay stock, indícalo amablemente de forma que el vendedor pueda ofrecer alternativas o tomar los datos del cliente.
No inventes precios ni stock.

Catálogo disponible:
${formattedProducts}

Historial de conversación reciente:
${formattedHistory}

Genera solo el texto de la respuesta sugerida. Sin introducciones como "Aquí tienes la respuesta" o formatos markdown excesivos más allá de negritas en el precio o producto si es necesario.`;

    if (!client || !(await this.checkQuotas(storeId))) {
      // Fallback response generator if API Key is not set or quota exceeded
      console.warn(client ? 'AI Quota exceeded.' : 'GEMINI_API_KEY is not set.', 'Using fallback mock service.');

      const lastMessage = conversationHistory[conversationHistory.length - 1]?.text.toLowerCase() || '';
      let reply = `¡Hola, ${customerName}! ¿Cómo estás? `;

      if (lastMessage.includes('precio') || lastMessage.includes('sale') || lastMessage.includes('cuesta')) {
        const found = productsContext.find(p => lastMessage.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(' ').some(word => word.length > 3 && lastMessage.includes(word)));
        if (found) {
          reply += `Te cuento que el precio de la ${found.name} es de **$${found.price}**. Nos quedan ${found.stock} unidades disponibles. ¿Te gustaría que te reserve una?`;
        } else {
          reply += `Para darte el precio exacto, ¿me podrías indicar qué producto te interesaba del catálogo? Te comento que tenemos camperas, remeras y zapatillas en stock.`;
        }
      } else if (lastMessage.includes('talle') || lastMessage.includes('medida') || lastMessage.includes('m') || lastMessage.includes('l')) {
        reply += `Sí, tenemos talles disponibles en varios modelos. Decime qué producto te gustó y te confirmo si nos queda en tu talle.`;
      } else {
        reply += `¡Gracias por comunicarte! Decime en qué producto estás interesado y con gusto te pasamos toda la información de talles y formas de envío.`;
      }

      // Log dummy usage
      await this.logUsage(storeId, `${modelName} (mock)`, systemPrompt.length / 4, reply.length / 4);
      return reply;
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;

      // Extract metadata usage if available
      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          storeId,
          modelName,
          usage.promptTokenCount,
          usage.candidatesTokenCount
        );
      } else {
        // Fallback token approximation
        await this.logUsage(storeId, modelName, systemPrompt.length / 4, response.text().length / 4);
      }

      return response.text().trim();
    } catch (error: any) {
      console.error('Error generating suggested response with Gemini:', error);
      throw new Error(`Gemini Error: ${error.message}`);
    }
  }

  /**
   * General store analytics chat assistant (Asistente IA page)
   */
  static async askAssistant(
    storeId: string,
    storeName: string,
    chatHistory: { role: 'user' | 'model'; text: string }[],
    newQuestion: string,
    storeDataSummary: {
      products: string;
      sales: string;
      customers: string;
      metrics: string;
    }
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos el Asistente IA de SocialFlow, un copiloto analítico inteligente especializado para la tienda "${storeName}" en Uruguay.
Tu rol es ayudar al dueño/vendedor de la tienda a entender sus métricas de venta, productos, clientes y consultas sociales.
Tenés acceso al siguiente resumen consolidado de la base de datos de MongoDB:

[Métricas de la Tienda]
${storeDataSummary.metrics}

[Productos]
${storeDataSummary.products}

[Clientes y Consultas]
${storeDataSummary.customers}

[Últimas Ventas]
${storeDataSummary.sales}

Normas de conducta:
1. Responde en español uruguayo de forma natural y ejecutiva.
2. Basate UNICAMENTE en la información consolidada provista arriba para responder sobre datos específicos de la tienda. Si no tenés la información o el usuario pregunta sobre algo ajeno a la tienda, indícalo de forma profesional y educada, o guíalo a temas de la tienda.
3. Brindá insights útiles (por ejemplo, si te preguntan qué producto tiene más stock o de dónde vienen más consultas, calculalo usando el contexto).
4. La moneda es Pesos Uruguayos (UYU) y se representa como $ (ej. $3.990).
5. Escribe tu respuesta en formato markdown elegante (usa negritas, listas ordenadas, viñetas, tablas cortas si es apropiado para organizar la información).
Evita comentarios técnicos sobre la estructura interna de MongoDB.`;

    try {
      if (!client || !(await this.checkQuotas(storeId))) {
        throw new Error(client ? 'AI Token quota exceeded.' : 'GEMINI_API_KEY is not set.');
      }
      const model = client.getGenerativeModel({ model: modelName });

      const chat = model.startChat({
        history: chatHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        systemInstruction: { text: systemPrompt }
      });

      const result = await chat.sendMessage(newQuestion);
      const response = await result.response;

      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          storeId,
          modelName,
          usage.promptTokenCount,
          usage.candidatesTokenCount
        );
      } else {
        await this.logUsage(storeId, modelName, (systemPrompt.length + newQuestion.length) / 4, response.text().length / 4);
      }

      return response.text().trim();
    } catch (error: any) {
      console.error('Error in Gemini Assistant chat:', error);
      throw new Error(`Gemini Assistant Error: ${error.message}`);
    }
  }

  /**
   * Formats raw DB data for a predefined question into a human-readable response
   */
  static async formatPredefinedResponse(
    storeId: string,
    question: string,
    dbData: any,
    queryType: string
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos un asistente inteligente de SocialFlow.
Tu tarea es convertir datos estadísticos de la base de datos en una respuesta amable, profesional y en español uruguayo para el dueño de la tienda.
La moneda es Pesos Uruguayos (UYU) y se representa como $ (ej. $3.990).
Responde basándote estrictamente en los siguientes datos obtenidos de la BD:

Pregunta original: "${question}"
Tipo de consulta: ${queryType}
Datos de la BD (JSON): ${JSON.stringify(dbData)}

Si los datos están vacíos o no hay información, indica amablemente que no hay datos disponibles para ese período o consulta.`;

    if (!client || !(await this.checkQuotas(storeId))) {
      return `Respuesta automática (API KEY no configurada o cuota excedida): Analizando datos de tipo ${queryType}.`;
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      
      const usage = response.usageMetadata;
      if (usage) {
        await this.logUsage(
          storeId,
          modelName,
          usage.promptTokenCount,
          usage.candidatesTokenCount
        );
      } else {
        await this.logUsage(storeId, modelName, systemPrompt.length / 4, response.text().length / 4);
      }
      
      return response.text().trim();
    } catch (error: any) {
      console.error('Error formatting response with Gemini:', error);
      return `Hubo un error al procesar tu consulta: ${error.message}`;
    }
  }
}
