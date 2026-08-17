'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { InstagramIcon, FacebookIcon } from '../../components/SocialIcons';

interface Product {
  _id: string;
  name: string;
  price: number;
}

interface Customer {
  _id: string;
  name: string;
}

interface Sale {
  _id: string;
  customerId: Customer;
  productId: Product;
  amount: number;
  date: string;
  channel: 'instagram' | 'facebook';
  status: 'pending' | 'confirmed' | 'cancelled';
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const getStatusBadge = (status: 'pending' | 'confirmed' | 'cancelled') => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center space-x-1 w-fit">
            <CheckCircle className="h-3 w-3" />
            <span>Confirmada</span>
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide bg-amber-50 text-amber-700 border border-amber-100 flex items-center space-x-1 w-fit">
            <Clock className="h-3 w-3" />
            <span>Pendiente</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide bg-slate-50 text-slate-500 border border-slate-150 flex items-center space-x-1 w-fit">
            <XCircle className="h-3 w-3" />
            <span>Cancelada</span>
          </span>
        );
      default:
        return null;
    }
  };

  const filteredSales = sales.filter(s => {
    const custName = s.customerId?.name || '';
    const prodName = s.productId?.name || '';
    
    const matchesSearch = custName.toLowerCase().includes(search.toLowerCase()) ||
      prodName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter ? s.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Ventas</h2>
          <p className="text-xs text-slate-400">Historial de transacciones de tu tienda</p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-600">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="confirmed">Confirmadas</option>
            <option value="pending">Pendientes</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Sales list Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold">
                <th className="p-4">Producto</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Monto (UYU)</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Canal</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 w-28 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-10 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-16 bg-slate-100 rounded-full"></div></td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No se encontraron ventas</p>
                    <p className="text-[10px] mt-1">Las ventas concretadas e historial de conversiones aparecerán acá.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <span className="font-bold text-slate-800">{sale.productId?.name || 'Remera Básica'}</span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">{sale.customerId?.name || 'Cliente'}</td>
                    <td className="p-4 text-slate-800 font-bold">${sale.amount.toLocaleString('es-UY')}</td>
                    <td className="p-4 text-slate-500 font-semibold">
                      {new Date(sale.date).toLocaleDateString('es-UY', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center space-x-1 w-fit border ${
                        sale.channel === 'instagram' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {sale.channel === 'instagram' ? <InstagramIcon className="h-3 w-3" /> : <FacebookIcon className="h-3 w-3" />}
                        <span className="capitalize">{sale.channel}</span>
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(sale.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
