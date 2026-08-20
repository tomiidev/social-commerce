import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Customer } from '../models/Customer';
import { Store } from '../models/Store';
import { createProvider, IMetaCredentials } from '../services/SocialProvider';
import mongoose from 'mongoose';
import { StoreConnections } from '../models/StoreConnections';
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { channel, unread, search } = req.query;

    const query: any = { storeId: new mongoose.Types.ObjectId(storeId) };

    if (channel) {
      query.channel = channel;
    }
    if (unread === 'true') {
      query.unread = true;
    }

    // If search is provided, we find customers matching that name first
    if (search) {
      const customers = await Customer.find({
        storeId: new mongoose.Types.ObjectId(storeId),
        name: { $regex: search, $options: 'i' },
      });
      const customerIds = customers.map((c) => c._id);
      query.customerId = { $in: customerIds };
    }

    const conversations = await Conversation.find(query)
      .populate('customerId')
      .sort({ lastMessageTime: -1 });

    return res.status(200).json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await Conversation.findOne({
      _id: id,
      storeId: new mongoose.Types.ObjectId(storeId),
    }).populate('customerId');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Mark as read
    if (conversation.unread) {
      conversation.unread = false;
      await conversation.save();
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    return res.status(200).json({
      conversation,
      messages,
    });
  } catch (error: any) {
    console.error('Error fetching conversation messages:', error);
    return res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params; // conversationId
    const { text, aiSuggested } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    if (!text) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const conversation = await Conversation.findOne({
      _id: id,
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Create the user message in DB
    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: 'user',
      text,
      aiSuggested: !!aiSuggested,
    });

    // Update conversation metadata
    conversation.lastMessageText = text;
    conversation.lastMessageTime = new Date();
    conversation.unread = false;

    // ... existing imports ...

    // ... (in sendMessage function)
    // Resolve the customer's Meta external ID (IGSID / PSID)
    const customer = await Customer.findById(conversation.customerId);
    const recipientExternalId = customer?.externalId || undefined;

    // Resolve Meta credentials from StoreConnections (null if not connected → fallback mode)
    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    const credentials: IMetaCredentials | null =
      connections?.metaConnected && connections?.metaPageAccessToken && connections?.metaPageId
        ? {
          pageId: connections.metaPageId,
          pageAccessToken: connections.metaPageAccessToken,
          instagramAccountId: connections.instagramAccountId ?? '',
        }
        : null;

    // Use the factory to get the correct provider (real or fallback)
    const provider = createProvider(conversation.channel, credentials);
    await provider.sendMessage(storeId, conversation._id.toString(), text, recipientExternalId);
    // ...

    return res.status(201).json(newMessage);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await Conversation.findOneAndUpdate(
      { _id: id, storeId: new mongoose.Types.ObjectId(storeId) },
      { unread: false },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    return res.status(200).json(conversation);
  } catch (error: any) {
    console.error('Error marking conversation as read:', error);
    return res.status(500).json({ error: 'Error al actualizar conversación' });
  }
};
