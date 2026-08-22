'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function MarginDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMargins();
  }, []);

  const fetchMargins = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mercadolibre/billing/margins');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching margins:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (!data) return null;

  const cardClass = "bg-white p-5 rounded-2xl border border-slate-100 shadow-sm";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className={cardClass}>
        <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">Ingresos Totales</h4>
        <p className="text-2xl font-black text-slate-900">{data.totalRevenue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
      </div>
      <div className={cardClass}>
        <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">Costos Totales</h4>
        <p className="text-2xl font-black text-rose-600">{data.totalCosts.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
      </div>
      <div className={`${cardClass} bg-indigo-50 border-indigo-100`}>
        <h4 className="text-indigo-600 text-xs font-bold uppercase mb-2">Margen Neto ({data.marginPercentage.toFixed(1)}%)</h4>
        <p className="text-2xl font-black text-indigo-900">{data.netProfit.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
      </div>
    </div>
  );
}
