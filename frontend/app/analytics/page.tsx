'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Info,
  Calendar,
  Sparkles,
  Award,
  CheckCircle2,
  DollarSign,
  Bot
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';

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
  responseRate: number;
  responseRateDiff: string;
}

interface Insight {
  type: 'warning' | 'info' | 'action' | 'success';
  title: string;
  text: string;
}

interface ChartData {
  dailyQueries: { date: string; dayName: string; consultas: number }[];
  channelDistribution: { name: string; value: number; queries: number }[];
  topProducts: { name: string; queriesCount: number; price: number }[];
  conversationsVsSales: { name: string; conversaciones: number; ventas: number }[];
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics?days=${range}`);
      setKpis(res.data.kpis);
      setCharts(res.data.charts);
      setInsights(res.data.insights || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-5 w-5 text-rose-500 bg-rose-50 p-0.5 rounded-lg border border-rose-100 shrink-0" />;
      case 'action': return <Sparkles className="h-5 w-5 text-amber-500 bg-amber-50 p-0.5 rounded-lg border border-amber-100 shrink-0" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500 bg-emerald-50 p-0.5 rounded-lg border border-emerald-100 shrink-0" />;
      default: return <Info className="h-5 w-5 text-indigo-500 bg-indigo-50 p-0.5 rounded-lg border border-indigo-100 shrink-0" />;
    }
  };

  if (loading && !kpis) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-32 bg-slate-100 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="col-span-2 h-96 bg-white border border-slate-100 animate-pulse rounded-2xl"></div>
          <div className="h-96 bg-white border border-slate-100 animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Analytics</h2>
          <p className="text-xs text-slate-400">Métricas avanzadas y análisis de IA para tu tienda</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-xl px-2.5 py-1.5 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as '7' | '30' | '90')}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* KPI 1: Queries */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-400">Consultas</span>
          <div className="text-2xl font-bold text-slate-800">{kpis?.queries || 1284}</div>
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center">
            <TrendingUp className="h-3 w-3 inline mr-0.5" /> {kpis?.queriesDiff}
          </span>
        </div>

        {/* KPI 2: Response Rate */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-400">Tasa de respuesta</span>
          <div className="text-2xl font-bold text-slate-800">{kpis?.responseRate || 82}%</div>
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center">
            <TrendingUp className="h-3 w-3 inline mr-0.5" /> {kpis?.responseRateDiff || '+5.6% últimos 7 días'}
          </span>
        </div>

        {/* KPI 3: Conversations */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-400">Conversaciones</span>
          <div className="text-2xl font-bold text-slate-800">{kpis?.conversations || 324}</div>
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center">
            <TrendingUp className="h-3 w-3 inline mr-0.5" /> {kpis?.conversationsDiff}
          </span>
        </div>

        {/* KPI 4: Sales */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-400">Ventas</span>
          <div className="text-2xl font-bold text-slate-800">{kpis?.sales || 23}</div>
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center">
            <TrendingUp className="h-3 w-3 inline mr-0.5" /> {kpis?.salesDiff}
          </span>
        </div>

        {/* KPI 5: Income */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-400">Ingresos</span>
          <div className="text-2xl font-bold text-slate-800">${kpis?.income.toLocaleString('es-UY') || '68.990'}</div>
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center">
            <TrendingUp className="h-3 w-3 inline mr-0.5" /> {kpis?.incomeDiff}
          </span>
        </div>
      </div>

      {/* Main Graph Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Queries */}
        <div className="lg:col-span-2 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Consultas por día</h3>
            <p className="text-[10px] text-slate-400">Volumen histórico de consultas de clientes</p>
          </div>
          <div className="h-72 w-full">
            {isMounted && charts && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyQueries}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="consultas" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorQueries)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Queries by channel */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Consultas por canal</h3>
            <p className="text-[10px] text-slate-400">Distribución de clientes por canal de origen</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {isMounted && charts && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.channelDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                    {charts.channelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-slate-800">{kpis?.queries || 1284}</span>
              <span className="text-[9px] text-slate-400 uppercase font-medium">Total</span>
            </div>
          </div>
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

      {/* Product performance & Conversion row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top consulted products */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Consultas por producto</h3>
            <p className="text-[10px] text-slate-400">Top 5 productos de catálogo con más interés</p>
          </div>
          <div className="h-64 w-full">
            {isMounted && charts && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topProducts} layout="vertical">
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }} />
                  <Tooltip />
                  <Bar dataKey="queriesCount" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Conversations vs Sales volume */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Conversaciones vs Ventas</h3>
            <p className="text-[10px] text-slate-400">Eficiencia en la tasa de cierre y conversión</p>
          </div>
          <div className="h-64 w-full">
            {isMounted && charts && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.conversationsVsSales}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" iconSize={10} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                  <Bar dataKey="conversaciones" fill="#94a3b8" opacity={0.4} radius={[6, 6, 0, 0]} name="Conversaciones" />
                  <Bar dataKey="ventas" fill="#6366f1" radius={[6, 6, 0, 0]} name="Ventas Concretadas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Insights automáticos de tu tienda</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, index) => (
            <div key={index} className="flex items-start space-x-3.5 p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm/50">
              {getInsightIcon(ins.type)}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">{ins.title}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{ins.text}</p>
              </div>
            </div>
          ))}

          {insights.length === 0 && (
            <p className="text-xs text-slate-400 italic col-span-2 text-center p-4">No se registran suficientes datos para generar insights comerciales automáticos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
