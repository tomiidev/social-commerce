'use client';

import api from '@/lib/api';
import React, { useState, useEffect } from 'react';
import BillingReportImporter from '@/components/BillingReportImporter';
import BillingAnalyzer from '@/components/BillingAnalyzer';
import ReconciliationImporter from '@/components/ReconciliationImporter';
import AIResponseDisplay from '@/components/AIResponseDisplay';
import { Upload, Trash2, X, Bot, FileCheck } from 'lucide-react';

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string, text: string } | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    const dateFrom = '2026-08-01T00:00:00Z';
    
    try {
      const response = await api.get(`/mercadolibre/reports?dateFrom=${dateFrom}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching billing summary:', error);
      alert('Error al obtener el resumen de facturación.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;
    try {
      await api.delete(`/mercadolibre/billing/transaction/${id}`);
      fetchSummary();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error al eliminar la transacción.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros de facturación?')) return;
    try {
      await api.delete(`/mercadolibre/billing/all`);
      fetchSummary();
    } catch (error) {
      console.error('Error deleting all transactions:', error);
      alert('Error al eliminar los registros.');
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!data) return <div className="p-6">No se encontraron datos.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">Detalle de Facturación</h1>
        <div className='flex gap-2'>
            <BillingAnalyzer onAnalyzeSuccess={(text) => setAiResult({ title: 'Análisis Financiero', text })} />
            <button 
                onClick={() => setIsReconciliationOpen(true)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
            >
                <FileCheck size={18} /> Conciliar
            </button>
            <button 
                onClick={handleDeleteAll}
                className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
            >
                <Trash2 size={18} /> Borrar Todo
            </button>
            <button 
            onClick={() => setIsImporterOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
            <Upload size={18} className="text-indigo-600" /> Importar Facturación
            </button>
        </div>
      </div>

      {/* Cargos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="p-4 text-lg font-bold text-black border-b border-slate-200">Transacciones</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 uppercase tracking-wider">Fecha</th>
                <th className="p-3 uppercase tracking-wider">Descripción</th>
                <th className="p-3 text-right uppercase tracking-wider">Monto</th>
                <th className="p-3 uppercase tracking-wider">Tipo</th>
                <th className="p-3 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.transactions.length > 0 ? (
                data.transactions.map((t: any) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors text-slate-800">
                    <td className="p-3 font-medium">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-3 font-normal">{t.description}</td>
                    <td className={`p-3 text-right font-mono font-bold ${t.amount < 0 ? 'text-black' : 'text-slate-900'}`}>
                      {t.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </td>
                    <td className="p-3 font-normal capitalize">{t.type === 'charge' ? 'Cargo' : 'Anulación'}</td>
                    <td className="p-3">
                        <button onClick={() => handleDeleteTransaction(t._id)} className='text-rose-500 hover:text-rose-700'>
                            <Trash2 size={16} />
                        </button>
                    </td>
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
            fetchSummary();
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
