'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('camila@tiendaurbana.uy'); // Pre-fill with seeded admin for quick login
  const [password, setPassword] = useState('password123'); // Pre-fill with seeded password
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const errorMsg = (err as { message?: string })?.message || 'Error al iniciar sesión';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <Bot className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenido de vuelta</h2>
            <p className="mt-1.5 text-sm text-slate-400">Ingresá a tu cuenta de SocialFlow</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-xs">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="ejemplo@tienda.uy"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full justify-center rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:bg-indigo-850 transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            ¿No tenés una cuenta?{' '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
