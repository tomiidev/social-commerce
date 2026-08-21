'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import {
  Upload,
  X,
  CheckCircle,
  AlertTriangle,
  Play,
  Plus,
  Trash2,
  FileSpreadsheet,
  Loader2,
  Info
} from 'lucide-react';

interface BillingReportData {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'charge' | 'refund';
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
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileParsed(false);
    setRows([]);
    setFileName('');
    setError(null);
    setImportStatus(null);
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
    const bstr = evt.target?.result as string;
    const workbook = XLSX.read(bstr, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Obtener todos los datos como array de arrays
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    // Buscar la fila de encabezados (la fila que contiene "Fecha del cargo")
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
              
              // Improved logic: Check for 'Anulación' in description, or negative amount
              const isRefund = String(description).toLowerCase().includes('anulación') || 
                               String(description).toLowerCase().includes('anulacion') ||
                               parseFloat(row[valorIdx]) < 0;

              return {
                id: `temp-${rIdx}-${Date.now()}`,
                date: row[fechaIdx],
                description: description,
                amount: Math.abs(parseFloat(row[valorIdx] || '0')), // Store amount as positive
                type: isRefund ? 'refund' : 'charge',
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
        setError('Error al procesar el archivo. Asegúrate de que tenga los encabezados esperados.');
      }
    };
    reader.readAsBinaryString(file);
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
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Importar Reporte de Facturación</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition"><X className="h-5 w-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs flex items-center gap-2"><AlertTriangle /> {error}</div>}
          
          {!fileParsed ? (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/10 p-10 rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4 shadow-sm"
            >
                <Upload className="text-indigo-600" size={48} />
                <p className="text-sm font-semibold text-slate-700">Click para subir archivo Excel/CSV</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          ) : (
            <div className="space-y-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col max-h-[50vh]">
              <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs text-slate-400 font-bold">{fileName}</span>
                  <button onClick={handleReset} className="text-xs text-rose-600 font-bold">Cambiar archivo</button>
              </div>
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-100">
                        <tr>
                            <th className="p-3 w-[100px]">Fecha</th>
                            <th className="p-3 w-[200px]">Descripción</th>
                            <th className="p-3 w-[100px]">Monto</th>
                            <th className="p-3 w-[100px]">Tipo</th>
                            <th className="p-3 w-[120px]">Factura</th>
                            <th className="p-3 w-[120px]">Cargo #</th>
                            <th className="p-3 w-[120px]">Venta #</th>
                            <th className="p-3 w-[200px]">Publicación</th>
                            <th className="p-3 w-[80px]">Acciones</th>
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
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.invoiceNumber} onChange={e => handleFieldChange(row.id, 'invoiceNumber', e.target.value)} /></td>
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.chargeNumber} onChange={e => handleFieldChange(row.id, 'chargeNumber', e.target.value)} /></td>
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.saleNumber} onChange={e => handleFieldChange(row.id, 'saleNumber', e.target.value)} /></td>
                                <td className="p-2"><input className="border p-1 w-full rounded" value={row.publicationTitle} onChange={e => handleFieldChange(row.id, 'publicationTitle', e.target.value)} /></td>
                                <td className="p-2 text-center"><button onClick={() => handleDeleteRow(row.id)} className="text-rose-500"><Trash2 className="h-4 w-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-semibold">Cancelar</button>
            <button onClick={handleBulkSubmit} disabled={loading || !fileParsed} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Play size={16} />} Guardar Datos
            </button>
        </div>
      </div>
    </div>
  );
}
