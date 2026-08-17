'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId: string;
}

interface Store {
  id: string;
  name: string;
  plan: string;
  logo?: string;
}

interface AuthContextType {
  user: User | null;
  store: Store | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, storeName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateStore: (name: string, plan?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setStore(response.data.store);
      } catch (error) {
        setUser(null);
        setStore(null);
        // Only redirect to login if we aren't already on login or register pages
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      setUser(response.data.user);
      setStore(response.data.store);
      router.push('/dashboard');
    } catch (error) {
      setUser(null);
      setStore(null);
      const errorMsg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al iniciar sesión';
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, storeName: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password, storeName });
      setUser(response.data.user);
      setStore(response.data.store);
      router.push('/dashboard');
    } catch (error) {
      setUser(null);
      setStore(null);
      const errorMsg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al registrarse';
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
      setUser(null);
      setStore(null);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStore = (name: string, plan?: string) => {
    if (store) {
      setStore({
        ...store,
        name,
        plan: plan || store.plan
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, store, loading, login, register, logout, updateStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
