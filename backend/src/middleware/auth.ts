import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    storeId: string;
    role: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = '';

  // 1. Read token from cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to authorization header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'No autorizado, token ausente' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'socialflow_secret_key_123456_change_me') as any;
    req.user = {
      id: decoded.id,
      storeId: decoded.storeId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'No autorizado, token inválido o expirado' });
  }
};
