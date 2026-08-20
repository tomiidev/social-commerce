'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../providers';
import {
  Bot,
  CreditCard,
  User,
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, ShopifyIcon } from '../../components/SocialIcons';
import api from '../../lib/api';

export default function SettingsPage() {
  const { store, updateStore } = useAuth();
  
  const profileRef = useRef<HTMLDivElement>(null);
  const integrationsRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState('Perfil de la tienda');

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>, sectionName: string) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(sectionName);
  };

  const navItems = [
    { name: 'Perfil de la tienda', icon: User, ref: profileRef as React.RefObject<HTMLDivElement> },
    { name: 'Canales vinculados', icon: Shield, ref: integrationsRef as React.RefObject<HTMLDivElement> },
    { name: 'Suscripción y plan', icon: CreditCard, ref: subscriptionRef as React.RefObject<HTMLDivElement> }
  ];

  
  // States
  const [storeName, setStoreName] = useState(store?.name || 'Tienda Urbana');
  const [plan, setPlan] = useState(store?.plan || 'Plan Pro');
  
  // Real Meta Integrations States
  const [metaConnected, setMetaConnected] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // Mercado Libre Integration States
  const [meliConnected, setMeliConnected] = useState(false);
  const [loadingMeli, setLoadingMeli] = useState(false);
  
  // AI Usage State
  const [aiUsage, setAiUsage] = useState({ tokensUsed: 0, tokenLimit: 0 });

  // Form notifications
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

        // Fetch Meli
        const resMeli = await api.get('/mercadolibre/status');
        setMeliConnected(resMeli.data.connected);

        // Fetch AI Usage
        const resAi = await api.get('/ai/token-usage');
        setAiUsage(resAi.data);
      } catch (_err) {
        console.error('Error fetching connection status:', _err);
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
    } catch (_err) {
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
      setSuccessMsg('Canales de Meta desconectados correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (_err) {
      console.error('Error disconnecting Meta:', _err);
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
    } catch (_err) {
      console.error('Error connecting Meli:', _err);
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
    } catch (_err) {
      console.error('Error disconnecting Meli:', _err);
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
      setSuccessMsg('¡Conexión simulada de desarrollo activada correctamente!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (_err) {
      console.error('Error activating simulation:', _err);
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
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => scrollToSection(item.ref, item.name)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition ${
                  activeSection === item.name
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
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Section */}
          <section ref={profileRef} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800">Perfil de la tienda</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block mb-1.5 text-[11px] text-slate-500">Nombre de la tienda</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] text-slate-500">Plan</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                  >
                    <option value="Plan Free">Plan Free</option>
                    <option value="Plan Pro">Plan Pro</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition">Guardar Cambios</button>
            </form>
          </section>

          {/* Integration Sections */}
          <section ref={integrationsRef} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800">Integraciones de Canales</h3>
            <div className="space-y-4">
              <IntegrationCard 
                title="Meta (Facebook/Instagram)" 
                connected={metaConnected} 
                onConnect={handleConnectMeta} 
                onDisconnect={handleDisconnectMeta}
                loading={loadingMeta}
                icon={<div className="flex -space-x-1"><div className="p-2 bg-pink-50 text-pink-600 rounded-full"><InstagramIcon className="h-4 w-4" /></div><div className="p-2 bg-blue-50 text-blue-600 rounded-full"><FacebookIcon className="h-4 w-4" /></div></div>}
              />
              <IntegrationCard 
                title="Mercado Libre" 
                connected={meliConnected} 
                onConnect={handleConnectMeli} 
                onDisconnect={handleDisconnectMeli}
                loading={loadingMeli}
                icon={<div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-full font-bold text-[10px]">ML</div>}
              />
              <ShopifyConnectionCard />
            </div>
          </section>
          
          {/* AI Usage Limits */}
          <div ref={subscriptionRef} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">Consumo de IA (Gemini API)</h3>
            
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Tokens consumidos</span>
                <span className="text-slate-800 font-bold">{aiUsage.tokensUsed.toLocaleString()} tokens</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, (aiUsage.tokensUsed / (aiUsage.tokenLimit || 1)) * 100)}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>{((aiUsage.tokensUsed / (aiUsage.tokenLimit || 1)) * 100).toFixed(1)}% del límite mensual</span>
                <span>Límite: {aiUsage.tokenLimit.toLocaleString()} tokens</span>
              </div>

              <div className="flex items-center space-x-2.5 p-3.5 bg-indigo-50/40 border border-indigo-100/30 rounded-2xl mt-4">
                <Bot className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                <p className="text-[10px] text-indigo-900 leading-relaxed font-medium">
                  El uso de la IA se mide en tokens. El límite establecido ayuda a mantener los costos operativos bajo control según tu plan actual.
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

function IntegrationCard({ title, connected, onConnect, onDisconnect, loading, icon }: { title: string, connected: boolean, onConnect: () => void, onDisconnect: () => void, loading: boolean, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
      <div className="flex items-center space-x-3">
        {icon}
        <div className="text-left text-xs">
          <span className="block font-bold text-slate-800">{title}</span>
          <span className={`text-[10px] font-semibold ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>{connected ? 'Conectado' : 'Desconectado'}</span>
        </div>
      </div>
      <button
        onClick={connected ? onDisconnect : onConnect}
        disabled={loading}
        className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
          connected 
            ? 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50/50' 
            : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700'
        } disabled:opacity-50`}
      >
        {loading ? 'Procesando...' : connected ? 'Desconectar' : 'Conectar'}
      </button>
    </div>
  );
}

function ShopifyConnectionCard() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopUrl, setShopUrl] = useState('');

  useEffect(() => {
    api.get('/shopify/status').then(res => setConnected(res.data.connected));
  }, []);

  const handleConnect = async () => {
    if (!shopUrl) return alert('Por favor ingresa la URL de la tienda (ej. tienda.myshopify.com)');
    setLoading(true);
    try {
      const res = await api.get(`/shopify/auth/url?shop=${shopUrl}`);
      window.location.href = res.data.url;
    } catch (_err) {
      alert('Error al iniciar la conexión');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await api.post('/shopify/disconnect');
      setConnected(false);
      setShopUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
      <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center">
        <ShopifyIcon className="h-4 w-4 mr-1.5" /> Shopify
      </h3>
      {connected ? (
        <div className="flex items-center justify-between"><span className="text-emerald-600 text-xs font-bold">Conectado</span><button onClick={handleDisconnect} className="text-rose-500 text-xs font-semibold">Desconectar</button></div>
      ) : (
        <div className="space-y-2"><input placeholder="shop.myshopify.com" value={shopUrl} onChange={e => setShopUrl(e.target.value)} className="w-full border p-2 rounded text-xs" /><button onClick={handleConnect} disabled={loading} className="w-full bg-indigo-600 text-white p-2 rounded text-xs font-semibold">Conectar Shopify</button></div>
      )}
    </div>
  );
}
