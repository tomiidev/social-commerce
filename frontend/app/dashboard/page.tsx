'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  MessageSquare,
  MessageCircle,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag as BagIcon,
  Tag
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, MeliIcon } from '../../components/SocialIcons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useRouter } from 'next/navigation';

interface KPI {
  queries: number;
  queriesDiff: string;
  conversations: number;
  conversationsDiff: string;
  products: number;
  productsDiff: string;
  sales: number;
  salesDiff: string;
  income: number;
  incomeDiff: string;
  salesBreakdown: {
    instagram: number;
    facebook: number;
    mercadolibre: number;
    shopify: number;
  };
  responseRate: number;
}

interface ChartData {
  dailyQueries: { date: string; dayName: string; consultas: number }[];
  channelDistribution: { name: string; value: number; queries: number }[];
  topProducts: { name: string; queriesCount: number; price: number; image: string }[];
}

export default function DashboardPage() {
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter()
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async (showRefreshState: boolean = true) => {
    if (showRefreshState) setIsRefreshing(true);
    else setLoading(true);
    try {
      // Fetch data in parallel from optimized endpoints
      const [analyticsRes, topProductsRes, eventsRes, productsCountRes, salesSummaryRes] = await Promise.all([
        api.get(`/analytics?days=${range}`),
        api.get(`/products/most-consulted`),
        api.get(`/events`),
        api.get(`/products/count`),
        api.get(`/sales/summary`)
      ]);
      
      setKpis({
        ...analyticsRes.data.kpis,
        products: productsCountRes.data.count,
        income: salesSummaryRes.data.totalIncome,
        salesBreakdown: salesSummaryRes.data.salesBreakdown
      });
      setCharts({ ...analyticsRes.data.charts, topProducts: topProductsRes.data });
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    } finally {
      if (showRefreshState) setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [range]);

  const COLORS = ['#6366f1', '#3b82f6']; // Indigo and Blue

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return 'Hace un tiempo';
  };

  const getEventActivity = (event: any) => {
    let icon: React.FC<{ className?: string }> = MessageSquare;
    let iconColor = 'text-slate-500 bg-slate-50';
    let link: string | undefined;

    if (event.channel === 'instagram') {
      icon = InstagramIcon;
      iconColor = 'text-pink-500 bg-pink-50';
    } else if (event.channel === 'facebook') {
      icon = FacebookIcon;
      iconColor = 'text-blue-600 bg-blue-50';
    } else if (event.channel === 'mercadolibre') {
      icon = MeliIcon;
      iconColor = 'text-amber-500 bg-amber-50';
    } else if (event.type === 'sale') {
      icon = BagIcon;
      iconColor = 'text-emerald-500 bg-emerald-50';
    } else if (event.type === 'conversation') {
      icon = MessageSquare;
      iconColor = 'text-indigo-500 bg-indigo-50';
      link = '/ai'; // Redirección al chat IA
    }

    return {
      id: event._id,
      text: event.text,
      time: getTimeAgo(event.createdAt),
      icon,
      iconColor,
      link,
    };
  };

  if (loading && !kpis) {
    return (
      <div className="p-6 space-y-6">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-slate-100 rounded"></div>
                <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded"></div>
              <div className="h-3.5 w-24 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-96 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inicio</h2>
          <p className="text-xs text-slate-400">Resumen de la actividad de tus tiendas</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={async () => {
              setIsSyncing(true);
              await api.post('/sales/import-all');
              await fetchData(false); // Silent refresh
              setIsSyncing(false);
            }}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ventas'}</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">Consultas</span>
            <div className="text-2xl font-bold text-slate-800">{kpis?.queries.toLocaleString() || '1.284'}</div>
            <span className="text-[10px] font-semibold text-emerald-500 flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 inline mr-0.5" />
              {kpis?.queriesDiff}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2 - Commented out
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">Conversaciones</span>
            <div className="text-2xl font-bold text-slate-800">{kpis?.conversations.toLocaleString() || '324'}</div>
            <span className="text-[10px] font-semibold text-emerald-500 flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 inline mr-0.5" />
              {kpis?.conversationsDiff}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <MessageCircle className="h-5 w-5" />
          </div>
        </div>
        */}

        {/* KPI 3 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">Productos</span>
            <div className="text-2xl font-bold text-slate-800">{kpis?.products.toLocaleString() || '87'}</div>
            <span className="text-[10px] font-semibold text-emerald-500 flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 inline mr-0.5" />
              {kpis?.productsDiff}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-500">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">Ventas (Ingresos)</span>
            <div className="text-xl font-bold text-slate-800">${kpis?.income.toLocaleString() || '0'}</div>
          </div>
          
          <div className="grid grid-cols-4 gap-1 mt-3">
             <div className="text-[9px] text-center font-bold text-slate-900"><span className="block">{kpis?.salesBreakdown.instagram || 0}</span>IG</div>
             <div className="text-[9px] text-center font-bold text-slate-900"><span className="block">{kpis?.salesBreakdown.facebook || 0}</span>FB</div>
             <div className="text-[9px] text-center font-bold text-slate-900"><span className="block">{kpis?.salesBreakdown.mercadolibre || 0}</span>ML</div>
             <div className="text-[9px] text-center font-bold text-slate-900"><span className="block">{kpis?.salesBreakdown.shopify || 0}</span>SH</div>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Queries Line/Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Consultas por día</h3>
              <p className="text-[10px] text-slate-400">Volumen histórico diario de consultas</p>
            </div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as '7' | '30' | '90')}
              className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
          </div>
          <div className="h-72 w-full">
            {isMounted && charts && charts.dailyQueries ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyQueries}>
                  <defs>
                    <linearGradient id="queriesColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    }}
                    labelStyle={{ fontSize: '11px', fontWeight: 600, color: '#1e293b' }}
                    itemStyle={{ fontSize: '11px', color: '#6366f1' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="consultas"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#queriesColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">Cargando gráfico...</div>
            )}
          </div>
        </div>

        {/* Channel Distribution Pie Chart */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Consultas por canal</h3>
            <p className="text-[10px] text-slate-400">Distribución porcentual por canal social</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {isMounted && charts && charts.channelDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.channelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.channelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                    }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">Cargando gráfico...</div>
            )}
            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-slate-800">1.284</span>
              <span className="text-[9px] text-slate-400 uppercase font-medium">Total</span>
            </div>
          </div>
          {/* Custom Legends */}
          <div className="flex justify-center space-x-6 text-xs mt-2">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-600"></div>
              <span className="text-slate-600 font-medium">Instagram: 65%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
              <span className="text-slate-600 font-medium">Facebook: 35%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Rankings Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Consulted Products */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Productos más consultados</h3>
            <p className="text-[10px] text-slate-400">Catálogo con mayor interés e interacciones sociales</p>
          </div>
          <div className="space-y-4">
            {charts?.topProducts.map((p, index) => {
              // Calculate width percentage relative to max queries (e.g. 324 queries = 100%)
              const maxQueries = charts.topProducts[0]?.queriesCount || 1;
              const percent = Math.round((p.queriesCount / maxQueries) * 100);

              return (
                <div key={p.name} className="flex items-center space-x-4">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-10 w-10 rounded-lg object-cover border border-slate-100 shadow-sm"
                  />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{p.name}</span>
                      <span className="text-slate-400 font-medium">{p.queriesCount}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Actividad reciente</h3>
            <p className="text-[10px] text-slate-400">Eventos de red social y ventas en tiempo real</p>
          </div>
          <div className="space-y-3.5">
            {events.length > 0 ? (
              events.map((event) => {
                const act = getEventActivity(event);
                const Icon = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={() => act.link && router.push(act.link)}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors group border border-transparent hover:border-slate-100/50 ${act.link ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2 rounded-xl ${act.iconColor}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700">{act.text}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{act.time}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No hay actividad reciente para mostrar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
