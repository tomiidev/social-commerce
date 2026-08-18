import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db';

// Load env variables from backend or root directory
const envPath = fs.existsSync(path.join(__dirname, '../.env'))
  ? path.join(__dirname, '../.env')
  : path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

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
import meliRoutes from './routes/mercadolibre.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed CORS origins.
// In Vercel, set ALLOWED_ORIGINS to a comma-separated list of all frontend URLs:
//   e.g. https://social-commerce-frontend-seven.vercel.app,https://www.mystore.com
// FRONTEND_URL is kept for backwards-compatibility (single origin).
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

if (process.env.ALLOWED_ORIGINS) {
  // Comma-separated list: "https://foo.vercel.app,https://bar.com"
  process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed) allowedOrigins.push(trimmed);
  });
} else if (process.env.FRONTEND_URL) {
  // Backwards-compat fallback
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// CORS must be registered FIRST — before any async middleware — so headers are
// always present even when downstream middleware (e.g. DB connection) throws.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-side fetches, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Connect to Database via middleware on every request (reuses cached connection)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

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
app.use('/api/mercadolibre', meliRoutes);
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
