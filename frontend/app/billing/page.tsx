'use client';

import api from '@/lib/api';
import React, { useState, useEffect } from 'react';
import BillingReportImporter from '@/components/BillingReportImporter';
import BillingAnalyzer from '@/components/BillingAnalyzer';
import ReconciliationImporter from '@/components/ReconciliationImporter';
import AIResponseDisplay from '@/components/AIResponseDisplay';
import MarginDashboard from '@/components/MarginDashboard';
import { Upload, Trash2, X, Bot, FileCheck, TrendingUp, Loader2, Tag } from 'lucide-react';

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string, text: string } | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchSummary = async (pageToFetch = 1, limitToFetch = limit) => {
    setLoading(true);
    setSelectedTransactions([]); // Reset selection on page change
    
    try {
      const response = await api.get(`/mercadolibre/reports?page=${pageToFetch}&limit=${limitToFetch}`);
      setData(response.data);
      setPagination(response.data.pagination);
      setPage(pageToFetch);
    } catch (error) {
      console.error('Error fetching billing summary:', error);
      alert('Error al obtener el resumen de facturación.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTransactions(prev => 
        prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`¿Estás seguro de eliminar ${selectedTransactions.length} transacciones seleccionadas?`)) return;
    try {
      for (const id of selectedTransactions) {
        await api.delete(`/mercadolibre/billing/transaction/${id}`);
      }
      setSelectedTransactions([]);
      fetchSummary(1, limit);
    } catch (error) {
      console.error('Error deleting transactions:', error);
      alert('Error al eliminar las transacciones.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros de facturación?')) return;
    try {
      await api.delete(`/mercadolibre/billing/all`);
      fetchSummary(1, limit);
    } catch (error) {
      console.error('Error deleting all transactions:', error);
      alert('Error al eliminar los registros.');
    }
  };

  const handleGetForecast = async () => {
    setLoadingForecast(true);
    try {
        const response = await api.get('/mercadolibre/billing/forecast');
        setAiResult({ title: 'Pronóstico de Flujo de Caja', text: response.data.forecast });
    } catch (error) {
        console.error('Error getting forecast:', error);
        alert('Error al generar el pronóstico.');
    } finally {
        setLoadingForecast(false);
    }
  };

  const handleGetPricing = async () => {
    setLoadingPricing(true);
    try {
        const response = await api.get('/mercadolibre/billing/pricing');
        setAiResult({ title: 'Recomendaciones de Precios', text: response.data.recommendations });
    } catch (error) {
        console.error('Error getting pricing:', error);
        alert('Error al generar las recomendaciones.');
    } finally {
        setLoadingPricing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading && !data) return <div className="p-6">Cargando...</div>;
  if (!data) return <div className="p-6">No se encontraron datos.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-black">Detalle de Facturación</h1>
        
        {/* Botones en una sola fila */}
        <div className="flex flex-wrap gap-2 items-center">
            <BillingAnalyzer onAnalyzeSuccess={(text) => setAiResult({ title: 'Análisis Financiero', text })} />
            <button 
                onClick={handleGetForecast}
                disabled={loadingForecast}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors"
            >
                {loadingForecast ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} />} Pronóstico
            </button>
            <button 
                onClick={handleGetPricing}
                disabled={loadingPricing}
                className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors"
            >
                {loadingPricing ? <Loader2 className="animate-spin" size={18} /> : <Tag size={18} />} Precios
            </button>
            <button 
                onClick={() => setIsReconciliationOpen(true)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
            >
                <FileCheck size={18} /> Conciliar
            </button>
            
            {selectedTransactions.length > 0 && (
                <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
                >
                    <Trash2 size={18} /> Eliminar Seleccionados ({selectedTransactions.length})
                </button>
            )}

            <div className="flex-grow"></div>

            <button 
                onClick={() => setIsImporterOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Upload size={18} className="text-indigo-600" /> Importar Facturación
            </button>
        </div>
      </div>

      <MarginDashboard />

      {/* Cargos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-black">Transacciones</h2>
            <button 
                onClick={handleDeleteAll}
                className="text-xs text-rose-600 font-semibold hover:text-rose-800 flex items-center gap-1"
            >
                <Trash2 size={14} /> Eliminar Todo
            </button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" onChange={(e) => e.target.checked ? setSelectedTransactions(data.transactions.map((t:any) => t._id)) : setSelectedTransactions([])} checked={selectedTransactions.length === data.transactions.length && data.transactions.length > 0} /></th>
                <th className="p-3 uppercase tracking-wider">Fecha</th>
                <th className="p-3 uppercase tracking-wider">Descripción</th>
                <th className="p-3 text-right uppercase tracking-wider">Monto</th>
                <th className="p-3 uppercase tracking-wider">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.transactions.length > 0 ? (
                data.transactions.map((t: any) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors text-slate-800">
                    <td className="p-3"><input type="checkbox" checked={selectedTransactions.includes(t._id)} onChange={() => handleToggleSelect(t._id)} /></td>
                    <td className="p-3 font-medium">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-3 font-normal">{t.description}</td>
                    <td className={`p-3 text-right font-mono font-bold ${t.amount < 0 ? 'text-black' : 'text-slate-900'}`}>
                      {t.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </td>
                    <td className="p-3 font-normal capitalize">{t.type === 'charge' ? 'Cargo' : 'Anulación'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No hay transacciones registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
            <div className="flex items-center gap-2 text-sm text-black font-medium">
                <span>Mostrar</span>
                <select 
                    value={limit} 
                    onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        setLimit(newLimit);
                        fetchSummary(1, newLimit);
                    }}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-black"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
                <span>transacciones</span>
            </div>
            
            <div className="flex items-center gap-1">
                <button 
                    disabled={page === 1}
                    onClick={() => fetchSummary(1, limit)}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 text-black"
                >
                    «
                </button>
                <button 
                    disabled={page === 1}
                    onClick={() => fetchSummary(page - 1, limit)}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 text-black"
                >
                    Anterior
                </button>
                <span className="px-4 py-1 text-sm font-medium text-black">
                    Página {page} de {pagination.pages || 1}
                </span>
                <button 
                    disabled={page >= (pagination.pages || 1)}
                    onClick={() => fetchSummary(page + 1, limit)}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 text-black"
                >
                    Siguiente
                </button>
                <button 
                    disabled={page >= (pagination.pages || 1)}
                    onClick={() => fetchSummary(pagination.pages || 1, limit)}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 text-black"
                >
                    »
                </button>
            </div>
        </div>
      </div>

      {/* Resumen Final */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Resumen</h2>
        <div className="space-y-3 text-sm">
            <div className="flex justify-between font-medium text-slate-900"><span>Total Cargos:</span> <span>{data.summary.totalCharges.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span></div>
            <div className="flex justify-between font-medium text-slate-900"><span>Total Anulaciones:</span> <span>{data.summary.totalRefunds.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span></div>
            <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-200"><span>Balance Total:</span> <span>{data.summary.balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span></div>
        </div>
      </div>

      {/* AI Result Modal */}
      {aiResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 border border-slate-100 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Bot size={20} className='text-indigo-600'/> {aiResult.title}</h3>
                    <button onClick={() => setAiResult(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <AIResponseDisplay text={aiResult.text} />
            </div>
        </div>
      )}

      <BillingReportImporter 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
        onImportSuccess={() => {
            alert('Importado exitosamente');
            fetchSummary(1, limit);
        }} 
      />
      <ReconciliationImporter
        isOpen={isReconciliationOpen}
        onClose={() => setIsReconciliationOpen(false)}
        onReconcileSuccess={(text) => setAiResult({ title: 'Resultado de Conciliación', text })}
      />
    </div>
  );
}
