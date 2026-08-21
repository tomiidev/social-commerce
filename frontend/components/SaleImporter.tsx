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
  Trash2,
  FileSpreadsheet,
  Download,
  Loader2,
  Info,
  Plus
} from 'lucide-react';

interface SaleImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (message: string) => void;
}

export default function SaleImporter({ isOpen, onClose, onImportSuccess }: SaleImporterProps) {
  const [fileParsed, setFileParsed] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileParsed(false);
    setSales([]);
    setFileName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const normalizeHeader = (h: string | number | undefined): string => {
    if (h === undefined || h === null) return '';
    return String(h)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);

        if (rawRows.length === 0) {
          setError('El archivo está vacío.');
          return;
        }

        const headers = Object.keys(rawRows[0]);
        const findCol = (aliases: string[]) => {
          return headers.find((h) => {
            const normalized = normalizeHeader(h);
            return aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized));
          });
        };

        const idKey = findCol(['name', 'id', 'orden']);
        const emailKey = findCol(['email']);
        const amountKey = findCol(['total', 'monto']);
        const dateKey = findCol(['created at', 'fecha']);
        const lineItemNameKey = findCol(['lineitem name', 'producto']);

        const parsedList = rawRows.map((row, rIdx) => {
          return {
            id: `temp-${rIdx}-${Date.now()}`,
            amount: parseFloat(String(row['Total'] || row['total'] || '0')),
            date: row['Created at'] || row['created at'] || new Date().toISOString(),
            status: (row['Financial Status'] || row['financial status'] || '') === 'paid' ? 'confirmed' : 'pending',
            channel: 'shopify',
            customerEmail: row['Email'] || row['email'] || '',
            productName: row['Lineitem name'] || row['lineitem name'] || 'Producto importado',
            orderName: row['Name'] || '',
            billingName: row['Billing Name'] || '',
            shippingAddress: row['Shipping Street'] || row['Shipping Address1'] || '',
            paymentMethod: row['Payment Method'] || '',
            notes: row['Notes'] || '',
            shippingMethod: row['Shipping Method'] || '',
            rawRow: row // Keep original data
          };
        });

        setSales(parsedList);
        setFileParsed(true);
      } catch (err: unknown) {
        console.error('Error parsing spreadsheet:', err);
        setError('Error al procesar el archivo. Asegúrate de que sea un archivo CSV o Excel válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFieldChange = (id: string, field: string, value: string | number) => {
    setSales((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (field === 'amount') return { ...s, amount: Number(value) };
        return { ...s, [field]: value };
      })
    );
  };

  const handleAddRow = () => {
    setSales((prev) => [...prev, {
      id: `temp-added-${Date.now()}`,
      amount: 0,
      date: new Date().toISOString(),
      status: 'pending',
      channel: 'shopify',
      customerEmail: '',
      productName: '',
      orderName: '',
      billingName: '',
      shippingAddress: '',
      paymentMethod: '',
      notes: '',
      shippingMethod: ''
    }]);
  };

  const handleDeleteRow = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBulkSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const formattedSales = sales.map(s => ({
        amount: s.amount,
        date: s.date,
        status: s.status,
        channel: s.channel,
        rawOrderData: {
          ...s.rawRow,
          customer: { email: s.customerEmail },
          line_items: [{ name: s.productName }],
          order_name: s.orderName,
          billing_name: s.billingName,
          shipping_address: s.shippingAddress,
          payment_method: s.paymentMethod,
          notes: s.notes,
          shipping_method: s.shippingMethod
        }
      }));

      await api.post('/sales/import-csv', { sales: formattedSales });
      onImportSuccess(`Se importaron ${sales.length} ventas correctamente.`);
      onClose();
      handleReset();
    } catch (err: unknown) {
      setError('Error al guardar las ventas en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-250">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Importación Masiva de Ventas</h3>
              <p className="text-xs text-slate-400">Importa tus ventas desde archivos CSV o planillas Excel (.xlsx, .xls)</p>
            </div>
          </div>
          <button 
            onClick={() => { onClose(); handleReset(); }}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {!fileParsed ? (
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/10 p-10 rounded-3xl text-center cursor-pointer max-w-xl mx-auto transition duration-200 group flex flex-col items-center justify-center space-y-4 shadow-sm">
              <div className="bg-indigo-50 group-hover:bg-indigo-100/50 p-4 rounded-full text-indigo-600 transition duration-200">
                <Upload className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Arrastra tu exportación de ventas aquí</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx" className="hidden" />
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col max-h-[60vh]">
              <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-500">Se han detectado {sales.length} ventas.</p>
                <div className="flex items-center space-x-2">
                  <button onClick={handleAddRow} className="px-3 py-1 bg-indigo-100 border border-indigo-200 text-indigo-700 hover:bg-indigo-200 rounded-xl text-xs font-bold transition">Agregar fila</button>
                  <button onClick={handleReset} className="px-3 py-1 bg-rose-100 border border-rose-200 text-rose-700 hover:bg-rose-200 rounded-xl text-xs font-bold transition">Cambiar archivo</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-indigo-50/10 rounded-2xl border border-indigo-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-50 text-indigo-900 font-bold sticky top-0 border-b border-indigo-100 z-10">
                      <th className="p-3">Producto</th>
                      <th className="p-3">Email Cliente</th>
                      <th className="p-3">Monto</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Billing Name</th>
                      <th className="p-3">Dirección</th>
                      <th className="p-3">Pago</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50">
                    {sales.map((s) => (
                      <tr key={s.id} className="hover:bg-indigo-50/30">
                        <td className="p-2"><input type="text" value={s.productName} onChange={(e) => handleFieldChange(s.id, 'productName', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"/></td>
                        <td className="p-2"><input type="text" value={s.customerEmail} onChange={(e) => handleFieldChange(s.id, 'customerEmail', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"/></td>
                        <td className="p-2"><input type="number" value={s.amount} onChange={(e) => handleFieldChange(s.id, 'amount', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"/></td>
                        <td className="p-2">
                          <input 
                            type="date" 
                            value={
                              s.date instanceof Date 
                                ? s.date.toISOString().split('T')[0]
                                : typeof s.date === 'string' && s.date.includes('T')
                                  ? s.date.split('T')[0]
                                  : s.date || new Date().toISOString().split('T')[0]
                            }
                            onChange={(e) => handleFieldChange(s.id, 'date', e.target.value)} 
                            className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                            <select value={s.status} onChange={(e) => handleFieldChange(s.id, 'status', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900">
                                <option value="pending">Pendiente</option>
                                <option value="confirmed">Confirmada</option>
                                <option value="cancelled">Cancelada</option>
                            </select>
                        </td>
                        <td className="p-2"><input type="text" value={s.billingName || ''} onChange={(e) => handleFieldChange(s.id, 'billingName', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"/></td>
                        <td className="p-2"><input type="text" value={s.shippingAddress || ''} onChange={(e) => handleFieldChange(s.id, 'shippingAddress', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"/></td>
                        <td className="p-2"><input type="text" value={s.paymentMethod || ''} onChange={(e) => handleFieldChange(s.id, 'paymentMethod', e.target.value)} className="w-full bg-white border border-indigo-200 rounded p-1.5 text-slate-900"/></td>
                        <td className="p-2 text-center"><button onClick={() => handleDeleteRow(s.id)} className="text-rose-600 hover:text-rose-800"><Trash2 className="h-5 w-5"/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div>
            {fileParsed && (
              <span className="text-xs text-slate-400 font-medium">
                Listo para enviar {sales.length} ventas a la base de datos.
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => { onClose(); handleReset(); }} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150 rounded-xl text-xs font-semibold transition">Cancelar</button>
            {fileParsed && (
              <button onClick={handleBulkSubmit} disabled={loading} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-150 rounded-xl text-xs font-bold transition flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-3.5 w-3.5"/> Guardar e Importar</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
