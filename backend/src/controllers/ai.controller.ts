import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Store } from '../models/Store';
import { GeminiService } from '../services/gemini.service';
import mongoose from 'mongoose';

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
    const { question, history } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    if (!question) return res.status(400).json({ error: 'Se requiere una pregunta para el asistente' });

    const store = await Store.findById(storeId);
    const storeName = store?.name || 'Mi Tienda';

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // 1. Fetch store statistics to inject as context
    const products = await Product.find({ storeId: storeObjectId, status: 'active' }).select('name sku price stock queriesCount');
    const recentSales = await Sale.find({ storeId: storeObjectId, status: 'confirmed' })
      .populate('customerId', 'name')
      .populate('productId', 'name')
      .sort({ date: -1 })
      .limit(5);
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
