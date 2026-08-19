import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Store } from '../models/Store';
import { AIConversation } from '../models/AIConversation';
import { Event } from '../models/Event';
import { GeminiService } from '../services/gemini.service';
import mongoose from 'mongoose';

export const getAIConversations = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const conversations = await AIConversation.find({ storeId: new mongoose.Types.ObjectId(storeId) })
      .sort({ lastMessageAt: -1 });

    return res.status(200).json(conversations);
  } catch (error: any) {
    console.error('Error fetching AI conversations:', error);
    return res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

export const createAIConversation = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await AIConversation.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      title: 'Nueva Conversación',
      messages: [],
      lastMessageAt: new Date(),
    });

    await Event.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      type: 'conversation',
      text: 'Se inició una nueva conversación con el asistente IA',
      channel: 'system',
      referenceId: conversation._id,
    });

    return res.status(201).json(conversation);
  } catch (error: any) {
    console.error('Error creating AI conversation:', error);
    return res.status(500).json({ error: 'Error al crear conversación' });
  }
};

export const updateAIConversation = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;
    const { messages } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await AIConversation.findOneAndUpdate(
      { _id: id, storeId: new mongoose.Types.ObjectId(storeId) },
      { 
        $set: { 
          messages,
          lastMessageAt: new Date()
        } 
      },
      { new: true }
    );

    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

    return res.status(200).json(conversation);
  } catch (error: any) {
    console.error('Error updating AI conversation:', error);
    return res.status(500).json({ error: 'Error al actualizar conversación' });
  }
};

export const getAIConversationById = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await AIConversation.findOne({ _id: id, storeId: new mongoose.Types.ObjectId(storeId) });
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

    return res.status(200).json(conversation);
  } catch (error: any) {
    console.error('Error fetching AI conversation:', error);
    return res.status(500).json({ error: 'Error al obtener conversación' });
  }
};

export const suggestResponse = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { conversationId } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    if (!conversationId) return res.status(400).json({ error: 'ID de conversación requerido' });

    const conversation = await Conversation.findOne({
      _id: conversationId,
      storeId: new mongoose.Types.ObjectId(storeId),
    }).populate('customerId');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const customerName = (conversation.customerId as any)?.name || 'Cliente';

    // 1. Fetch recent messages in conversation
    const messagesDocs = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Reverse to chronological order
    const messages = messagesDocs.reverse().map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    // 2. Fetch store products as context
    const productsDocs = await Product.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      status: 'active',
    }).select('name price stock colors sizes');

    const productsContext = productsDocs.map((p) => ({
      name: p.name,
      price: p.price,
      stock: p.stock,
      colors: p.colors,
      sizes: p.sizes,
    }));

    // 3. Call Gemini service
    const suggestion = await GeminiService.suggestResponse(
      storeId,
      customerName,
      messages,
      productsContext
    );

    return res.status(200).json({ suggestion });
  } catch (error: any) {
    console.error('Error generating suggestion:', error);
    return res.status(500).json({ error: error.message || 'Error al generar sugerencia con IA' });
  }
};

export const chatAssistant = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { question, history, conversationId } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    if (!question) return res.status(400).json({ error: 'Se requiere una pregunta para el asistente' });

    // Update conversation title if it's the first turn
    console.log('Checking for title update:', { conversationId, historyLength: history?.length });
    if (conversationId && (!history || history.length === 0)) {
        const conversation = await AIConversation.findById(conversationId);
        console.log('Conversation found:', !!conversation, 'Title:', conversation?.title);
        if (conversation && conversation.title === 'Nueva Conversación') {
            const newTitle = await GeminiService.generateConversationTitle(storeId, question);
            console.log('New title generated:', newTitle);
            await AIConversation.findByIdAndUpdate(conversationId, { title: newTitle });
            console.log('Title updated successfully');

            // Update associated event text
            await Event.findOneAndUpdate(
                { referenceId: conversationId },
                { text: `Conversación iniciada: ${newTitle}` }
            );
        }
    }

    const store = await Store.findById(storeId);
    const storeName = store?.name || 'Mi Tienda';

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // 1. Fetch store statistics to inject as context
    const products = await Product.find({ storeId: storeObjectId, status: 'active' }).select('name sku price stock queriesCount');
    const recentSales = await Sale.find({ storeId: storeObjectId, status: 'confirmed' })
      .populate('customerId', 'name')
      .populate('productId', 'name')
      .sort({ date: -1 })
      .limit(4);
    const customersCount = await Customer.countDocuments({ storeId: storeObjectId });
    const topCustomers = await Customer.find({ storeId: storeObjectId }).sort({ purchasesCount: -1 }).limit(3).select('name purchasesCount city');

    const productsSummary = products
      .map((p) => `- ${p.name} (SKU: ${p.sku}): $${p.price} UYU, Stock: ${p.stock}, Consultas acumuladas: ${p.queriesCount}`)
      .join('\n');

    const salesSummary = recentSales
      .map((s) => `- Venta de ${s.productId ? (s.productId as any).name : 'Producto'} a ${s.customerId ? (s.customerId as any).name : 'Cliente'} por $${s.amount} UYU en fecha ${s.date.toLocaleDateString()}`)
      .join('\n');

    const totalIncome = recentSales.reduce((acc, s) => acc + s.amount, 0);

    const customersSummary = `Total clientes registrados: ${customersCount}\nClientes destacados:\n` +
      topCustomers.map(c => ` - ${c.name} (${c.city}): ${c.purchasesCount} compras`).join('\n');

    const metricsSummary = `Facturación acumulada (últimas 5 ventas confirmadas): $${totalIncome} UYU\nProductos en catálogo: ${products.length}\n`;

    const storeDataSummary = {
      products: productsSummary || 'No hay productos en stock.',
      sales: salesSummary || 'No se han registrado ventas recientemente.',
      customers: customersSummary,
      metrics: metricsSummary
    };

    // 2. Map history format for Gemini
    const chatHistory = (history || []).map((h: any) => ({
      role: h.sender === 'user' ? ('user' as const) : ('model' as const),
      text: h.text
    }));

    // 3. Ask assistant
    const reply = await GeminiService.askAssistant(
      storeId,
      storeName,
      chatHistory,
      question,
      storeDataSummary
    );

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Error in AI Assistant chat endpoint:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar consulta con el asistente' });
  }
};

export const handlePredefinedQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { question, queryType, conversationId } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    // Update conversation title if it's the first turn
    if (conversationId) {
        const conversation = await AIConversation.findById(conversationId);
        if (conversation && conversation.title === 'Nueva Conversación') {
            const newTitle = await GeminiService.generateConversationTitle(storeId, question);
            await AIConversation.findByIdAndUpdate(conversationId, { title: newTitle });

            // Update associated event text
            await Event.findOneAndUpdate(
                { referenceId: conversationId },
                { text: `Conversación iniciada: ${newTitle}` }
            );
        }
    }

    // 1. Obtener datos de la BD necesarios para responder
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    
    let dbData: any = {};
    if (queryType === 'TOP_SALES') {
      dbData = await Sale.aggregate([
        { $match: { storeId: storeObjectId } },
        { $group: { _id: "$productId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }
      ]);
    } else if (queryType === 'LOW_STOCK') {
      dbData = await Product.find({ storeId: storeObjectId, stock: { $lt: 5 } }).select('name stock');
    } else if (queryType === 'TOTAL_REVENUE') {
      dbData = await Sale.aggregate([
        { $match: { storeId: storeObjectId } },
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
      ]);
    } else if (queryType === 'TOP_CUSTOMER') {
        dbData = await Customer.find({ storeId: storeObjectId }).sort({ purchasesCount: -1 }).limit(1);
    } else if (queryType === 'TOTAL_QUERIES') {
        dbData = await Product.find({ storeId: storeObjectId }).select('name queriesCount');
    }

    // 2. Usar Gemini para transformar los datos crudos en una respuesta amable
    const reply = await GeminiService.formatPredefinedResponse(storeId, question, dbData, queryType);

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Error handling predefined AI question:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar la pregunta' });
  }
};
