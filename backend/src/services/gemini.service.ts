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
   * Analyzes billing transaction data for insights.
   */
  static async analyzeBillingData(
    storeId: string,
    transactions: any[]
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos un experto financiero para e-commerce. Analiza las siguientes transacciones de facturación y ofrece insights clave (tendencias, patrones de gasto, anomalías si las hay).
La moneda es Pesos Uruguayos (UYU) y se representa como $ (ej. $3.990).
Responde de forma clara, profesional y en español uruguayo usando markdown.

Transacciones:
${JSON.stringify(transactions)}`;

    if (!client || !(await this.checkQuotas(storeId))) {
      return "No se pudo realizar el análisis (API KEY no configurada o cuota excedida).";
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
      console.error('Error analyzing billing data with Gemini:', error);
      throw new Error(`Gemini Error: ${error.message}`);
    }
  }

  /**
   * Reconciles external billing report data against database transactions.
   */
  static async reconcileBillingData(
    storeId: string,
    dbTransactions: any[],
    externalReportData: any[]
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos un experto en conciliación contable. Tu tarea es conciliar el reporte externo de facturación (proporcionado en XLSX) contra las transacciones registradas en la base de datos.
Identifica:
1. Transacciones faltantes en la BD.
2. Transacciones faltantes en el reporte externo.
3. Desajustes en montos o fechas.

La moneda es Pesos Uruguayos (UYU).
Responde con un resumen claro en markdown detallando las diferencias encontradas.

Transacciones BD: ${JSON.stringify(dbTransactions)}
Reporte Externo: ${JSON.stringify(externalReportData)}`;

    if (!client || !(await this.checkQuotas(storeId))) {
      return "No se pudo realizar la conciliación (API KEY no configurada o cuota excedida).";
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
      console.error('Error reconciling billing data with Gemini:', error);
      throw new Error(`Gemini Error: ${error.message}`);
    }
  }

  /**
   * Generates pricing recommendations based on profitability and volume.
   */
  static async recommendPricingStrategies(
    storeId: string,
    productData: any[]
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos un consultor de estrategia de precios para e-commerce.
    Analiza los datos de productos provistos: nombre, precio actual, costo estimado y volumen de ventas.
    
    Datos de productos: ${JSON.stringify(productData)}
    
    Genera recomendaciones accionables para cada producto (ej. subir precio si el margen es bajo y el volumen alto, bajar si no se vende, etc.).
    Responde con una tabla comparativa y un resumen estratégico en markdown.`;

    if (!client || !(await this.checkQuotas(storeId))) {
      return "No se pudo realizar la recomendación (API KEY no configurada o cuota excedida).";
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
      console.error('Error generating pricing recommendations with Gemini:', error);
      throw new Error(`Gemini Error: ${error.message}`);
    }
  }

  /**
   * Forecasts future cash flow based on historical series.
   */
  static async forecastCashFlow(
    storeId: string,
    series: { salesSeries: any[], costsSeries: any[] }
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos un analista financiero experto en proyecciones de e-commerce.
    Basándote en las series temporales de ingresos y costos históricos, proyecta el flujo de caja para los próximos 2 meses.
    La moneda es Pesos Uruguayos (UYU).
    
    Series Históricas: ${JSON.stringify(series)}
    
    Analiza la tendencia, calcula el margen proyectado y brinda una conclusión ejecutiva en markdown.`;

    if (!client || !(await this.checkQuotas(storeId))) {
      return "No se pudo realizar el pronóstico (API KEY no configurada o cuota excedida).";
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
      console.error('Error forecasting cash flow with Gemini:', error);
      throw new Error(`Gemini Error: ${error.message}`);
    }
  }

  /**
   * Categorizes a transaction description.
   */
  static async classifyTransaction(
    storeId: string,
    prompt: string
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    if (!client || !(await this.checkQuotas(storeId))) {
      return "Otros";
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
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
        await this.logUsage(storeId, modelName, prompt.length / 4, response.text().length / 4);
      }
      
      return response.text().trim();
    } catch (error: any) {
      console.error('Error categorizing transaction with Gemini:', error);
      return "Otros";
    }
  }
   
  static async parseProductData(
    storeId: string,
    rawData: any
  ): Promise<any> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Sos un experto en catalogación de productos para e-commerce.
Tu tarea es analizar la siguiente información cruda de un producto (posiblemente de una red social) y convertirla al siguiente formato JSON estricto:

{
  "name": string,
  "description": string,
  "price": number,
  "stock": number,
  "sku": string,
  "sizes": string[],
  "colors": string[],
  "status": "active" | "inactive"
}

Si falta información (como precio, stock, etc.), intenta inferirla o asigna valores por defecto razonables (precio 0, stock 0, sku generado a partir del nombre).
Devuelve SOLO el JSON, sin formato markdown ni introducciones.

Datos crudos: ${JSON.stringify(rawData)}`;

    if (!client || !(await this.checkQuotas(storeId))) {
      // Fallback: simple mapping
      return {
        name: rawData.name || 'Producto Desconocido',
        description: rawData.description || '',
        price: Number(rawData.price) || 0,
        stock: Number(rawData.stock) || 0,
        sku: rawData.sku || 'SKU-GEN',
        sizes: rawData.sizes || [],
        colors: rawData.colors || [],
        status: 'active'
      };
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      return JSON.parse(response.text().trim());
    } catch (error) {
      console.error('Error parsing product data with Gemini:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Gemini Parsing Error: ${errorMessage}`);
    }
  } 

  /**
   * Generates a short title for a conversation based on the first message
   */
  static async generateConversationTitle(
    storeId: string,
    message: string
  ): Promise<string> {
    const modelName = 'gemini-3.1-flash-lite';
    const client = this.getClient();

    const systemPrompt = `Tu tarea es generar un título breve (máximo 5 palabras) para una conversación con un asistente IA basado en el mensaje inicial del usuario.
El objetivo es que sea descriptivo para que el usuario pueda identificar la conversación después.
Responde únicamente con el título, sin comillas, sin introducciones.

Mensaje del usuario: "${message}"`;

    if (!client || !(await this.checkQuotas(storeId))) {
      return 'Nueva Conversación';
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      return response.text().trim().replace(/^["']|["']$/g, ''); // Clean quotes if any
    } catch (error) {
      console.error('Error generating conversation title:', error);
      return 'Nueva Conversación';
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Gemini Error: ${errorMessage}`);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Gemini Assistant Error: ${errorMessage}`);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Hubo un error al procesar tu consulta: ${errorMessage}`;
    }
  }
}
