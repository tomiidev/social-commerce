import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Post } from '../models/Post';
import mongoose from 'mongoose';

export const getPosts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { channel } = req.query;

    const query: any = { storeId: new mongoose.Types.ObjectId(storeId) };

    if (channel) {
      query.channel = channel;
    }

    const posts = await Post.find(query)
      .populate('productId')
      .sort({ date: -1 });

    return res.status(200).json(posts);
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
};
