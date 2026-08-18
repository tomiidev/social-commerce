'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers';
import {
  Settings,
  Bot,
  CreditCard,
  User,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InstagramIcon, FacebookIcon } from '../../components/SocialIcons';
import api from '../../lib/api';

export default function SettingsPage() {
  const { store, user, updateStore } = useAuth();
  
  // States
  const [storeName, setStoreName] = useState(store?.name || 'Tienda Urbana');
  const [plan, setPlan] = useState(store?.plan || 'Plan Pro');
  
  // Real Meta Integrations States
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaDetails, setMetaDetails] = useState<{ pageId?: string; instagramAccountId?: string } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // Mercado Libre Integration States
  const [meliConnected, setMeliConnected] = useState(false);
  const [loadingMeli, setLoadingMeli] = useState(false);

  // Form notifications
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const meta = params.get('meta');
      const meli = params.get('meli');
      const reason = params.get('reason');
      if (meta === 'denied' || meli === 'denied') {
        return 'Conexión cancelada por el usuario.';
      } else if (meta === 'error') {
        return `Error al conectar con Meta: ${reason === 'no_pages' ? 'No se encontraron páginas vinculadas.' : reason || 'Error desconocido'}`;
      } else if (meli === 'error') {
        return `Error al conectar con Mercado Libre: ${reason || 'Error desconocido'}`;
      }
    }
    return null;
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const meta = params.get('meta');
      const meli = params.get('meli');
      if (meta === 'connected') {
        return '¡Cuenta de Meta vinculada exitosamente!';
      } else if (meli === 'connected') {
        return '¡Cuenta de Mercado Libre vinculada exitosamente!';
      }
    }
    return null;
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fetch Meta
        const resMeta = await api.get('/meta/status');
        setMetaConnected(resMeta.data.connected);
        if (resMeta.data.connected) {
          setMetaDetails({
            pageId: resMeta.data.pageId,
            instagramAccountId: resMeta.data.instagramAccountId
          });
        } else {
          setMetaDetails(null);
        }

        // Fetch Meli
        const resMeli = await api.get('/mercadolibre/status');
        setMeliConnected(resMeli.data.connected);
      } catch (err) {
        console.error('Error fetching connection status:', err);
      }
    };

    fetchStatus();

    let timerId: ReturnType<typeof setTimeout> | undefined = undefined;

    // Check query params for OAuth status and clean URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const meta = params.get('meta');
      const meli = params.get('meli');

      if (meta || meli) {
        // Clear url params from address bar
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Schedule clear timeouts
        if (meta === 'connected' || meli === 'connected') {
          timerId = setTimeout(() => setSuccessMsg(null), 5000);
        } else {
          timerId = setTimeout(() => setErrorMsg(null), 5000);
        }
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore(storeName, plan);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConnectMeta = async () => {
    setLoadingMeta(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/meta/auth/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (err) {
      console.warn('Real Meta connection failed or APP_ID not set. Showing simulated fallback prompt.');
      setShowSimulateModal(true);
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!window.confirm('¿Estás seguro de que querés desconectar tus canales de Meta? Se detendrá la sincronización de mensajes y publicaciones.')) {
      return;
    }
    setLoadingMeta(true);
    setErrorMsg(null);
    try {
      await api.post('/meta/disconnect');
      setMetaConnected(false);
      setMetaDetails(null);
      setSuccessMsg('Canales de Meta desconectados correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error disconnecting Meta:', err);
      setErrorMsg('Error al desconectar la cuenta de Meta.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleConnectMeli = async () => {
    setLoadingMeli(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/mercadolibre/auth/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (err) {
      console.error('Error connecting Meli:', err);
      setErrorMsg('Error al iniciar la conexión con Mercado Libre.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoadingMeli(false);
    }
  };

  const handleDisconnectMeli = async () => {
    if (!window.confirm('¿Estás seguro de que querés desconectar tu cuenta de Mercado Libre? Se detendrá la gestión de productos.')) {
      return;
    }
    setLoadingMeli(true);
    setErrorMsg(null);
    try {
      await api.post('/mercadolibre/disconnect');
      setMeliConnected(false);
      setSuccessMsg('Cuenta de Mercado Libre desconectada correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error disconnecting Meli:', err);
      setErrorMsg('Error al desconectar la cuenta de Mercado Libre.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoadingMeli(false);
    }
  };

  const handleActivateSimulation = async () => {
    setLoadingMeta(true);
    setShowSimulateModal(false);
    setErrorMsg(null);
    try {
      await api.post('/meta/connect-simulated');
      setMetaConnected(true);
      setMetaDetails({
        pageId: 'simulated_page_12345',
        instagramAccountId: 'simulated_instagram_12345'
      });
      setSuccessMsg('¡Conexión simulada de desarrollo activada correctamente!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Error activating simulation:', err);
      setErrorMsg('Error al activar la conexión simulada.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoadingMeta(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Configuración</h2>
        <p className="text-xs text-slate-400">Administrá el perfil de tu tienda, integraciones y plan B2B</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column navigation */}
        <div className="md:col-span-1 space-y-2">
          {[
            { name: 'Perfil de la tienda', icon: User, active: true },
            { name: 'Canales vinculados', icon: Shield, active: false },
            { name: 'Suscripción y plan', icon: CreditCard, active: false },
            { name: 'Soporte técnico', icon: HelpCircle, active: false }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition ${
                  item.active 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right column settings body */}
        <div className="md:col-span-2 space-y-6">
          
          {successMsg && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Form */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">Perfil</h3>
            
            {saveSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Cambios guardados con éxito.</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block mb-1.5">Nombre de la tienda</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Plan de suscripción</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                  >
                    <option value="Plan Free">Plan Free</option>
                    <option value="Plan Pro">Plan Pro (Recomendado)</option>
                    <option value="Plan Enterprise">Plan Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5">Moneda base</label>
                  <input
                    type="text"
                    disabled
                    value="Pesos Uruguayos (UYU)"
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-slate-400 font-medium bg-slate-100 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4.5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-150 transition"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>

          {/* Social Channels Integration */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">Canales Vinculados (Meta)</h3>
              {metaConnected && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Conectado</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">Conectá las cuentas comerciales de Facebook e Instagram para habilitar el sincronizador de productos, publicaciones e Inbox.</p>

            <div className="space-y-3.5">
              {/* Instagram */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-pink-50 text-pink-600"><InstagramIcon className="h-5 w-5" /></div>
                  <div className="text-left text-xs">
                    <span className="block font-bold text-slate-800">Instagram Commercial Business</span>
                    <span className="text-[10px] text-slate-400">
                      {metaConnected 
                        ? `Vinculada${metaDetails?.instagramAccountId ? ` (ID: ${metaDetails.instagramAccountId})` : ''}` 
                        : 'Desconectada'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={metaConnected ? handleDisconnectMeta : handleConnectMeta}
                  disabled={loadingMeta}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    metaConnected 
                      ? 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50/50' 
                      : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700 shadow-sm'
                  }`}
                >
                  {loadingMeta ? 'Cargando...' : metaConnected ? 'Desconectar' : 'Conectar'}
                </button>
              </div>

              {/* Facebook */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><FacebookIcon className="h-5 w-5" /></div>
                  <div className="text-left text-xs">
                    <span className="block font-bold text-slate-800">Facebook Page Catalog</span>
                    <span className="text-[10px] text-slate-400">
                      {metaConnected 
                        ? `Vinculada${metaDetails?.pageId ? ` (ID: ${metaDetails.pageId})` : ''}` 
                        : 'Desconectada'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={metaConnected ? handleDisconnectMeta : handleConnectMeta}
                  disabled={loadingMeta}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    metaConnected 
                      ? 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50/50' 
                      : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700 shadow-sm'
                  }`}
                >
                  {loadingMeta ? 'Cargando...' : metaConnected ? 'Desconectar' : 'Conectar'}
                </button>
              </div>
            </div>

            {/* Mercado Libre */}
            <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">Canales Vinculados (Mercado Libre)</h3>
                  {meliConnected && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Conectado</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">Conectá tu cuenta de vendedor para gestionar tus productos directamente desde la plataforma.</p>

                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600 font-bold text-lg">ML</div>
                        <div className="text-left text-xs">
                            <span className="block font-bold text-slate-800">Mercado Libre Seller Account</span>
                            <span className="text-[10px] text-slate-400">
                                {meliConnected ? 'Vinculada' : 'Desconectada'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={meliConnected ? handleDisconnectMeli : handleConnectMeli}
                        disabled={loadingMeli}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            meliConnected 
                                ? 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50/50' 
                                : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                    >
                        {loadingMeli ? 'Cargando...' : meliConnected ? 'Desconectar' : 'Conectar'}
                    </button>
                </div>
            </div>
          </div>

          {/* AI Usage Limits */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">Consumo de IA (Gemini API)</h3>
            
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Tokens consumidos (este mes)</span>
                <span className="text-slate-800 font-bold">51,700 tokens</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full w-[15.5%]"></div>
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>15.5% del límite mensual</span>
                <span>Límite: 300,000 tokens</span>
              </div>

              <div className="flex items-center space-x-2.5 p-3.5 bg-indigo-50/40 border border-indigo-100/30 rounded-2xl mt-4">
                <Bot className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                <p className="text-[10px] text-indigo-900 leading-relaxed font-medium">
                  Estás operando bajo el plan Pro. El consumo de Gemini API cuenta con un coste aproximado estimado de **$0.012 USD** hasta el momento, bonificado completamente por SocialFlow.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Simulated Connection Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 transform transition-all scale-100 duration-200">
            <div className="flex items-center space-x-3 text-indigo-600">
              <Bot className="h-6 w-6 shrink-0 animate-bounce" />
              <h4 className="text-sm font-bold text-slate-800">Modo Desarrollo / Simulación</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              No se encontraron credenciales oficiales de Meta (<code className="bg-slate-50 px-1.5 py-0.5 rounded text-indigo-600 font-semibold">META_APP_ID</code>) en tu servidor.
              <br /><br />
              ¿Deseas activar la <strong>Conexión Simulada (Mocks)</strong>? Esto habilitará el Inbox, el catálogo y las publicaciones con datos de prueba realistas para que puedas explorar la plataforma sin configurar tokens reales.
            </p>
            <div className="flex space-x-3.5 pt-2">
              <button
                onClick={() => setShowSimulateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleActivateSimulation}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-150 transition"
              >
                Activar Simulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
