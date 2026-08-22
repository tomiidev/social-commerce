'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import {
  Upload,
  X,
  Play,
  Trash2,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

interface BillingReportData {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'charge' | 'refund';
  category: string;
  invoiceNumber: string;
  chargeNumber: string;
  saleNumber: string;
  publicationTitle: string;
}

interface BillingReportImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (message: string) => void;
}

export default function BillingReportImporter({ isOpen, onClose, onImportSuccess }: BillingReportImporterProps) {
  const [fileParsed, setFileParsed] = useState(false);
  const [rows, setRows] = useState<BillingReportData[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const handleReset = () => {
    setFileParsed(false);
    setRows([]);
    setFileName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        
        // Use read with array type to prevent encoding/compression errors
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        let headerIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
          if (rawData[i] && Array.isArray(rawData[i]) && rawData[i].includes('Fecha del cargo')) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          setError('No se pudo encontrar el encabezado esperado ("Fecha del cargo").');
          return;
        }

        const headers = rawData[headerIndex];
        const rowsData = rawData.slice(headerIndex + 1);

        const fechaIdx = headers.indexOf('Fecha del cargo');
        const detalleIdx = headers.indexOf('Detalle');
        const valorIdx = headers.indexOf('Valor del cargo');
        const facturaIdx = headers.indexOf('N° de factura fiscal');
        const cargoNumIdx = headers.indexOf('Número del cargo');
        const ventaNumIdx = headers.indexOf('Número de venta');
        const tituloPubIdx = headers.indexOf('Título de publicación');

        const parsedList: BillingReportData[] = rowsData
          .filter(row => row[fechaIdx])
          .map((row, rIdx) => {
            const description = row[detalleIdx] || 'Sin descripción';
            const isRefund = String(description).toLowerCase().includes('anulación') || 
                             String(description).toLowerCase().includes('anulacion') ||
                             parseFloat(row[valorIdx]) < 0;

            return {
              id: `temp-${rIdx}-${Date.now()}`,
              date: row[fechaIdx],
              description: description,
              amount: Math.abs(parseFloat(row[valorIdx] || '0')),
              type: isRefund ? 'refund' : 'charge',
              category: 'Otros',
              invoiceNumber: row[facturaIdx] || '',
              chargeNumber: row[cargoNumIdx] || '',
              saleNumber: row[ventaNumIdx] || '',
              publicationTitle: row[tituloPubIdx] || ''
            };
          });

        setRows(parsedList);
        setFileParsed(true);
      } catch (err) {
        console.error(err);
        setError('Error al procesar el archivo.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFieldChange = (id: string, field: keyof BillingReportData, value: string | number) => {
    setRows((prev) => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleBulkSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/mercadolibre/billing/import', { rows });
      onImportSuccess('Reporte importado correctamente.');
      onClose();
      handleReset();
    } catch (err) {
      setError('Error al guardar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Importar Reporte</h3>
          <button onClick={handleClose} className="p-1.5 hover:bg-slate-50 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {!fileParsed ? (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white p-10 rounded-3xl text-center cursor-pointer transition"
            >
                <Upload className="text-indigo-600 mx-auto" size={48} />
                <p className="text-sm font-semibold text-slate-700 mt-4">Click para subir archivo</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          ) : (
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-100 bg-white">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-100">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Descripción</th>
                            <th className="p-3">Monto</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map(row => (
                            <tr key={row.id}>
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.date} onChange={e => handleFieldChange(row.id, 'date', e.target.value)} /></td>
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.description} onChange={e => handleFieldChange(row.id, 'description', e.target.value)} /></td>
                                <td className="p-2"><input className="border p-1 w-full rounded" type="number" value={row.amount} onChange={e => handleFieldChange(row.id, 'amount', parseFloat(e.target.value))} /></td>
                                <td className="p-2">
                                    <select className="border p-1 w-full rounded" value={row.type} onChange={e => handleFieldChange(row.id, 'type', e.target.value as any)}>
                                        <option value="charge">Cargo</option>
                                        <option value="refund">Anulación</option>
                                    </select>
                                </td>
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.category} onChange={e => handleFieldChange(row.id, 'category', e.target.value)} /></td>
                                <td className="p-2 text-center"><button onClick={() => handleDeleteRow(row.id)} className="text-rose-500"><Trash2 className="h-4 w-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-semibold">Cancelar</button>
            <button onClick={handleBulkSubmit} disabled={loading || !fileParsed} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Play size={16} />} Guardar
            </button>
        </div>
      </div>
    </div>
  );
}
