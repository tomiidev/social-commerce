import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIUsage } from '../models/AIUsage';
import mongoose from 'mongoose';

// Estimated cost coefficients (in USD per 1M tokens) for Gemini 1.5 Flash
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

  /**
   * Log AI token usage and estimate cost
   */
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
    const modelName = 'gemini-1.5-flash';
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

    if (!client) {
      // Fallback response generator if API Key is not set
      console.warn('GEMINI_API_KEY is not set. Using fallback mock service.');
      
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
    const modelName = 'gemini-1.5-flash';
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

    if (!client) {
      console.warn('GEMINI_API_KEY is not set. Using fallback assistant service.');
      
      const question = newQuestion.toLowerCase();
      let reply = '';
      
      if (question.includes('producto') || question.includes('demanda') || question.includes('interés') || question.includes('consultado')) {
        reply = `De acuerdo al catálogo de **${storeName}**, los productos que despiertan más interés son:
        
1. **Campera Nike** — 324 consultas (Alta demanda, stock crítico de 3 unidades).
2. **Zapatillas Adidas** — 211 consultas (Buen desempeño, stock de 7 unidades).
3. **Remera Básica** — 87 consultas (Stock de 15 unidades).

*Sugerencia:* Sería recomendable reponer stock de la **Campera Nike**, ya que concentra más del 50% de las consultas de ropa de abrigo esta semana y la conversión podría verse afectada por la falta de talles.`;
      } else if (question.includes('publicaci') || question.includes('interés') || question.includes('post')) {
        reply = `Las publicaciones con mayor tracción social esta semana provienen principalmente de **Instagram**:

* **Instagram - Post Campera Nike** (hace 2 días):
  * **324 consultas** generadas.
  * **87 comentarios**.
  * Es por lejos el post con más interacción.
  
* **Facebook - Post Zapatillas Adidas** (hace 5 días):
  * **211 consultas** generadas.
  * **52 comentarios**.

La audiencia de Instagram está respondiendo un 65% mejor a las campañas visuales directas en comparación con Facebook (35%).`;
      } else if (question.includes('perdiendo') || question.includes('oportunidades') || question.includes('conversión') || question.includes('venta')) {
        reply = `Detectamos dos áreas principales donde se están perdiendo oportunidades de venta:

1. **Falta de Stock:** La **Campera Nike** tiene **324 consultas** pero solo **3 unidades en stock**. Los clientes muestran interés pero no pueden concretar la compra debido a la falta de stock o talles en el catálogo.
2. **Tasa de Respuesta en Facebook:** El canal de Facebook concentra el **35% de las consultas**, pero la tasa de respuesta en el Inbox es del **56%** (en Instagram es del **85%**). Responder más rápido en Facebook podría incrementar las ventas mensuales hasta en un 12%.`;
      } else if (question.includes('pregunta') || question.includes('hacen') || question.includes('consultan')) {
        reply = `Las consultas más frecuentes de los clientes esta semana se agrupan en tres temáticas principales:

1. **Precio e información del producto (45%):** Preguntas directas del tipo *"¿Precio?"* o *"¿Cuánto cuesta?"* tras ver publicaciones de camperas o zapatillas.
2. **Talles y stock disponible (35%):** Consultas sobre disponibilidad en talle M y L de prendas seleccionadas.
3. **Medios de pago y envío (20%):** Preguntas sobre si se acepta transferencia bancaria o envíos al interior del país (ej. a Maldonado, Canelones, Salto).`;
      } else {
        reply = `¡Hola! Soy tu asistente de SocialFlow. He analizado el estado de **${storeName}** y puedo confirmarte que durante la última semana:
        
* Se registraron **1.284 consultas** (un **+18%** respecto a la semana pasada).
* Se concretaron **23 ventas** por un monto total aproximado de **$68.990 UYU**.
* El producto estrella en consultas sigue siendo la **Campera Nike**, seguido por las **Zapatillas Adidas**.

¿Te gustaría que analicemos en detalle la conversión de algún producto o cómo optimizar las respuestas de tus redes sociales?`;
      }

      await this.logUsage(storeId, `${modelName} (mock)`, (systemPrompt.length + newQuestion.length) / 4, reply.length / 4);
      return reply;
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      
      const contents = [];
      // System instructions as system context:
      // In the new API structure, systemInstruction can be passed in config or inside contents
      // To ensure compatibility across different sdk versions, we build a history context:
      const chat = model.startChat({
        history: chatHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        systemInstruction: systemPrompt
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
}
