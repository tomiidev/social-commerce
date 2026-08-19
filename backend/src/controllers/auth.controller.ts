import { Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { StoreConnections } from '../models/StoreConnections';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'socialflow_secret_key_123456_change_me';
const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const signToken = (id: string, storeId: string, role: string) => {
  return jwt.sign({ id, storeId, role }, JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, storeName } = req.body;

    if (!name || !email || !password || !storeName) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 1. Create store
    const store = await Store.create({
      name: storeName,
      plan: 'Plan Pro',
    });
    
    // 2. Create connections
    await StoreConnections.create({ storeId: store._id });

    // 3. Hash password & create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: passwordHash,
      storeId: store._id,
      role: 'admin',
    });

    // 4. Sign JWT & set cookie
    const token = signToken(user._id.toString(), store._id.toString(), user.role);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
      store: {
        id: store._id,
        name: store.name,
        plan: store.plan,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Error del servidor al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const store = await Store.findById(user.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    const token = signToken(user._id.toString(), store._id.toString(), user.role);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
      store: {
        id: store._id,
        name: store.name,
        plan: store.plan,
        logo: store.logo,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie('token', COOKIE_OPTIONS);
    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Error del servidor al cerrar sesión' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const store = await Store.findById(req.user.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    return res.status(200).json({ user, store });
  } catch (error: any) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

export const getConnections = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: storeId }).select('metaConnected meliConnected shopifyConnected');
    if (!connections) return res.status(404).json({ error: 'Conexiones no encontradas' });

    return res.status(200).json({
      meta: connections.metaConnected,
      mercadolibre: connections.meliConnected,
      shopify: connections.shopifyConnected
    });
  } catch (error: any) {
    console.error('getConnections error:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};
