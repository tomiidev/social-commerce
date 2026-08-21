'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import { Upload, X, Loader2, Sparkles, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface ReconciliationImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onReconcileSuccess: (result: string) => void;
}

export default function ReconciliationImporter({ isOpen, onClose, onReconcileSuccess }: ReconciliationImporterProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

        // Simple send for reconciliation
        const response = await api.post('/mercadolibre/billing/reconcile', { externalData: rawData });
        onReconcileSuccess(response.data.reconciliation);
        onClose();
      } catch (err) {
        console.error(err);
        setError('Error al procesar o conciliar el archivo.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Conciliación con Excel</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/10 p-10 rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4 shadow-sm"
        >
          {loading ? <Loader2 className="animate-spin text-indigo-600" size={48} /> : <Upload className="text-indigo-600" size={48} />}
          <p className="text-sm font-semibold text-slate-700">{loading ? 'Conciliando...' : 'Click para subir archivo XLSX para conciliar'}</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
        </div>
      </div>
    </div>
  );
}
