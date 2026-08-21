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
  Upload,
  Edit2,
  X,
  Loader2
} from 'lucide-react';
import { ChannelBadge } from '../../components/ChannelBadge';
import SaleImporter from '../../components/SaleImporter';
import { Sale } from '@/types/sale';

// ... (interfaces remain the same) ...

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editStatus, setEditStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');
  const [editAmount, setEditAmount] = useState(0);
  const [updating, setUpdating] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales?page=${currentPage}&limit=${limit}`);
      setSales(res.data.sales);
      setTotalSales(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [currentPage, limit]);

  const handleOpenEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditStatus(sale.status);
    setEditAmount(sale.amount);
    setIsEditModalOpen(true);
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    setUpdating(true);
    try {
      await api.put(`/sales/${editingSale._id}`, {
        status: editStatus,
        amount: editAmount
      });
      fetchSales();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating sale:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle className="h-3 w-3" /> Confirmada</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"><Clock className="h-3 w-3" /> Pendiente</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700"><XCircle className="h-3 w-3" /> Cancelada</span>;
      default:
        return status;
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch =
      sale.customerId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sale.productId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || sale.status === statusFilter;
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
        <button
          onClick={() => setIsImporterOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Upload className="h-3.5 w-3.5" />
           <span>Importar CSV/Excel de Shopify</span>
        </button>
      </div>

      <SaleImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={(msg) => {
          alert(msg);
          fetchSales();
        }}
      />

      {/* Edit Modal */}
      {isEditModalOpen && editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Editar Venta</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Monto</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleUpdateSale}
              disabled={updating}
              className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

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
                <th className="p-4 text-right">Acciones</th>
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
                    <td className="p-4 text-right"><div className="h-4 w-8 bg-slate-100 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
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
                      <ChannelBadge channel={sale.channel} />
                    </td>
                    <td className="p-4">{getStatusBadge(sale.status)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(sale)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {[15, 30, 50].map((l) => (
            <option key={l} value={l}>{l} ventas por página</option>
          ))}
        </select>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
          <span className="text-slate-500 mr-4">Total: {totalSales} ventas</span>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Anterior
          </button>
          <span className="text-slate-500">Página {currentPage} de {totalPages || 1}</span>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
