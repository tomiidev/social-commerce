import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';

// Load env variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import customerRoutes from './routes/customer.routes';
import conversationRoutes from './routes/conversation.routes';
import saleRoutes from './routes/sale.routes';
import postRoutes from './routes/post.routes';
import analyticsRoutes from './routes/analytics.routes';
import aiRoutes from './routes/ai.routes';
import metaRoutes from './routes/meta.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database via middleware on every request (reuses cached connection)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/webhook/meta', webhookRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'SocialFlow API is running smoothly' });
});

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Algo salió mal en el servidor.' });
});

// Start Server (only if not running on Vercel Serverless environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] SocialFlow Express server is listening on port ${PORT}`);
    console.log(`[Server] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
