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
  Download,
  Loader2,
  Info
} from 'lucide-react';
import { ProductDomain, BulkImportResponse } from '../types/product';

interface ProductImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (message: string) => void;
}

export default function ProductImporter({ isOpen, onClose, onImportSuccess }: ProductImporterProps) {
  const [fileParsed, setFileParsed] = useState(false);
  const [products, setProducts] = useState<ProductDomain[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset state
  const handleReset = () => {
    setFileParsed(false);
    setProducts([]);
    setFileName('');
    setError(null);
    setImportStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Safe string normalize for column mapping
  const normalizeHeader = (h: string | number | undefined): string => {
    if (h === undefined || h === null) return '';
    return String(h)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  };

  // Excel / CSV File Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a array de objetos con control estricto de tipos
        const rawRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);

        if (rawRows.length === 0) {
          setError('El archivo está vacío.');
          return;
        }

        const headers = Object.keys(rawRows[0]);

        if (!headers || headers.length === 0) {
          setError('No se encontraron encabezados en el archivo.');
          return;
        }

        // Map columns smartly
        const findCol = (aliases: string[]) => {
          return headers.find((h) => {
            const normalized = normalizeHeader(h);
            return aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized));
          });
        };

        const nameKey = findCol(['nombre', 'titulo', 'producto', 'name', 'title', 'product']);
        const priceKey = findCol(['precio', 'price', 'valor', 'costo', 'monto']);
        const stockKey = findCol(['stock', 'cantidad', 'cant', 'inventory', 'inventario']);
        const descKey = findCol(['descripcion', 'description', 'detalle', 'details', 'desc']);
        const skuKey = findCol(['sku', 'codigo', 'cod', 'reference', 'ref']);
        const sizesKey = findCol(['sizes', 'talles', 'talle', 'size', 'tallas']);
        const colorsKey = findCol(['colors', 'colores', 'color', 'tono']);

        // Check if we at least matched some relevant columns
        if (!nameKey && !priceKey) {
          setError(
            'No se pudieron identificar las columnas requeridas de forma automática. Asegúrate de incluir encabezados claros como "Nombre" y "Precio".'
          );
        }

        const parsedList: ProductDomain[] = rawRows
          .map((row, rIdx) => {
            // Extract with fallback
            const name = nameKey ? String(row[nameKey] || '').trim() : '';
            const description = descKey ? String(row[descKey] || '').trim() : '';
            const sku = skuKey ? String(row[skuKey] || '').trim() : '';
            
            // Handle numeric parsing
            const priceRaw = priceKey ? row[priceKey] : 0;
            const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw) || '0');
            
            const stockRaw = stockKey ? row[stockKey] : 0;
            const stock = typeof stockRaw === 'number' ? stockRaw : parseInt(String(stockRaw) || '0', 10);

            // Handle arrays
            let sizes: string[] = [];
            if (sizesKey && row[sizesKey]) {
              sizes = String(row[sizesKey])
                .split(/[,;|]/)
                .map((s) => s.trim())
                .filter(Boolean);
            }

            let colors: string[] = [];
            if (colorsKey && row[colorsKey]) {
              colors = String(row[colorsKey])
                .split(/[,;|]/)
                .map((s) => s.trim())
                .filter(Boolean);
            }

            // Skip row if completely empty
            if (!name && !price && !sku) return null;

            return {
              id: `temp-${rIdx}-${Date.now()}`,
              name,
              description,
              price: isNaN(price) ? 0 : price,
              stock: isNaN(stock) ? 0 : stock,
              sku,
              sizes,
              colors,
              channels: ['import'],
              status: 'active'
            };
          })
          .filter((item): item is ProductDomain => item !== null);

        setProducts(parsedList);
        setFileParsed(true);
      } catch (err: unknown) {
        console.error('Error parsing spreadsheet:', err);
        setError('Error al procesar el archivo. Asegúrate de que sea un archivo CSV o Excel válido.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Inline Editing Helpers
  const handleFieldChange = (id: string, field: keyof ProductDomain, value: string | number) => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== id) return prod;
        
        if (field === 'price' || field === 'stock') {
          const num = Number(value);
          return { ...prod, [field]: isNaN(num) ? 0 : num };
        }
        if (field === 'sizes' || field === 'colors') {
          const arr = String(value)
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter(Boolean);
          return { ...prod, [field]: arr };
        }
        
        // Ensure string fields are trimmed
        if (typeof value === 'string') {
          return { ...prod, [field]: value.trim() };
        }
        
        return { ...prod, [field]: value };
      })
    );
  };

  // Row Manipulation
  const handleAddRow = () => {
    const newProd: ProductDomain = {
      id: `temp-added-${Date.now()}`,
      name: '', // Start empty to force user entry
      description: '',
      price: 0,
      stock: 0,
      sku: '',
      sizes: [],
      colors: [],
      channels: ['instagram'],
      status: 'active',
    };
    setProducts((prev) => [...prev, newProd]);
  };

  const handleDeleteRow = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Trigger Bulk Save to MongoDB
  const handleBulkSubmit = async () => {
    // Clean and validate products before sending
    const cleanedProducts = products.map(p => ({
      ...p,
      name: p.name.trim(),
      sku: p.sku.trim(),
      description: p.description.trim()
    }));

    const invalidProducts = cleanedProducts.filter((p) => p.name === '' || p.price <= 0);
    if (invalidProducts.length > 0) {
      setError(`Hay ${invalidProducts.length} productos con errores (nombre vacío o precio menor/igual a 0). Corrígelos antes de guardar.`);
      return;
    }

    if (cleanedProducts.length === 0) {
      setError('No hay productos para importar.');
      return;
    }

    setLoading(true);
    setError(null);
    setImportStatus(null);

    try {
      const response = await api.post('/products/bulk', { products: cleanedProducts });
      
      setImportStatus({
        success: true,
        message: response.data.message || `Se importaron ${response.data.count} productos correctamente.`
      });
      
      // Call the success callback to refresh parent list
      setTimeout(() => {
        onImportSuccess(response.data.message || `Importación masiva exitosa. Se agregaron ${response.data.count} productos.`);
        onClose();
        handleReset();
      }, 1500);

    } catch (err: unknown) {
      console.error('Error bulk uploading products:', err);
      const errorMessage = (err instanceof Error) ? err.message : 'Error al conectar con el servidor para guardar los productos.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Download a template
  const downloadTemplate = () => {
    const headers = [['Nombre', 'Precio', 'Stock', 'SKU', 'Descripcion', 'Talles', 'Colores']];
    const sampleRows = [
      ['Remera Oversize Algodón', 25000, 15, 'REM-OV-A1', 'Remera premium de algodón peinado oversize', 'S, M, L, XL', 'Negro, Blanco, Gris'],
      ['Jeans Cargo Negro', 45000, 8, 'JEAN-CRG-N1', 'Pantalón cargo de jean rígido color negro', '38, 40, 42, 44', 'Negro'],
      ['Buzo Hoodie Classic', 38000, 20, 'HD-CLS-01', 'Buzo hoodie de frisa premium con capucha', 'M, L, XL', 'Gris Melange, Beige, Azul']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Productos_Plantilla');
    XLSX.writeFile(wb, 'plantilla_importacion_productos.xlsx');
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
              <h3 className="text-lg font-bold text-slate-800">Importación Masiva de Productos</h3>
              <p className="text-xs text-slate-400">Importa tus productos desde archivos CSV o planillas Excel (.xlsx, .xls)</p>
            </div>
          </div>
          <button 
            onClick={() => { onClose(); handleReset(); }}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Error en la importación:</span>
                <p className="mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {importStatus && (
            <div className={`border p-4 rounded-2xl text-xs flex items-start space-x-3 ${
              importStatus.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{importStatus.success ? 'Éxito' : 'Error'}</span>
                <p className="mt-1">{importStatus.message}</p>
              </div>
            </div>
          )}

          {/* Step 1: Upload File */}
          {!fileParsed ? (
            <div className="max-w-xl mx-auto space-y-6 py-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/10 p-10 rounded-3xl text-center cursor-pointer transition duration-200 group flex flex-col items-center justify-center space-y-4 shadow-sm"
              >
                <div className="bg-indigo-50 group-hover:bg-indigo-100/50 p-4 rounded-full text-indigo-600 transition duration-200">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Arrastra tu archivo aquí o haz clic para buscar</p>
                  <p className="text-xs text-slate-400 mt-1">Soporta archivos .xlsx, .xls y .csv de cualquier software contable u hoja de cálculo</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden" 
                />
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
                    <Info className="h-4 w-4 text-indigo-500" />
                    <span>¿Cómo debe estar estructurado el archivo?</span>
                  </div>
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Descargar Plantilla</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  El sistema mapea las columnas automáticamente por sus nombres. Asegúrate de que las columnas tengan nombres claros en la primera fila como:
                </p>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-700">Nombre (requerido):</span> &quot;Nombre&quot;, &quot;Name&quot; o &quot;Producto&quot;
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Precio (requerido):</span> &quot;Precio&quot;, &quot;Price&quot; o &quot;Valor&quot;
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Stock (opcional):</span> &quot;Stock&quot;, &quot;Cantidad&quot; o &quot;Inventario&quot;
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">SKU / Código (opcional):</span> &quot;SKU&quot;, &quot;Codigo&quot; o &quot;Ref&quot;
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Talles (opcional):</span> Separados por coma (ej: S, M, L)
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Colores (opcional):</span> Separados por coma (ej: Rojo, Azul)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Edit & Review Imported Data */
            <div className="space-y-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col max-h-[60vh]">
              <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {fileName}
                  </span>
                  <span className="text-xs text-slate-400">
                    Se detectaron <strong className="text-slate-600 font-bold">{products.length}</strong> productos listos para importar.
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddRow}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar fila</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Cambiar archivo</span>
                  </button>
                </div>
              </div>

              {/* Editable Table */}
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-100 z-10">
                      <th className="p-3 w-1/4">Nombre *</th>
                      <th className="p-3 w-1/12">SKU</th>
                      <th className="p-3 w-1/12">Precio *</th>
                      <th className="p-3 w-1/12">Stock</th>
                      <th className="p-3 w-1/6">Talles</th>
                      <th className="p-3 w-1/6">Colores</th>
                      <th className="p-3 w-1/4">Descripción</th>
                      <th className="p-3 w-[60px] text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod) => {
                      const isNameError = !prod.name;
                      const isPriceError = prod.price <= 0;

                      return (
                        <tr key={prod.id} className={`hover:bg-slate-50/50 transition-colors ${
                          isNameError || isPriceError ? 'bg-rose-50/20' : ''
                        }`}>
                          {/* Name */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={prod.name}
                              placeholder="Ej: Camisa Slim Fit"
                              onChange={(e) => handleFieldChange(prod.id, 'name', e.target.value)}
                              className={`w-full py-1.5 px-2.5 bg-transparent border-0 focus:ring-1 rounded text-xs text-slate-900 transition ${
                                isNameError 
                                  ? 'ring-1 ring-rose-500/50 bg-rose-500/5 focus:ring-rose-500 focus:bg-white' 
                                  : 'focus:ring-indigo-500 focus:bg-white hover:bg-slate-100/50'
                              }`}
                            />
                          </td>

                          {/* SKU */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={prod.sku}
                              placeholder="Ej: CAM-SLIM"
                              onChange={(e) => handleFieldChange(prod.id, 'sku', e.target.value)}
                              className="w-full py-1.5 px-2.5 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white rounded text-xs text-slate-900 transition hover:bg-slate-100/50"
                            />
                          </td>

                          {/* Price */}
                          <td className="p-2">
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-slate-400 font-medium">$</span>
                              <input
                                type="number"
                                value={prod.price || ''}
                                placeholder="0"
                                onChange={(e) => handleFieldChange(prod.id, 'price', e.target.value)}
                                className={`w-full py-1.5 pl-6 pr-2 bg-transparent border-0 focus:ring-1 rounded text-xs text-slate-900 transition ${
                                  isPriceError 
                                    ? 'ring-1 ring-rose-500/50 bg-rose-500/5 focus:ring-rose-500 focus:bg-white' 
                                    : 'focus:ring-indigo-500 focus:bg-white hover:bg-slate-100/50'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Stock */}
                          <td className="p-2">
                            <input
                              type="number"
                              value={prod.stock || ''}
                              placeholder="0"
                              onChange={(e) => handleFieldChange(prod.id, 'stock', e.target.value)}
                              className="w-full py-1.5 px-2.5 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white rounded text-xs text-slate-900 transition hover:bg-slate-100/50"
                            />
                          </td>

                          {/* Sizes */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={prod.sizes.join(', ')}
                              placeholder="Ej: S, M, L"
                              onChange={(e) => handleFieldChange(prod.id, 'sizes', e.target.value)}
                              className="w-full py-1.5 px-2.5 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white rounded text-xs text-slate-900 transition hover:bg-slate-100/50"
                            />
                          </td>

                          {/* Colors */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={prod.colors.join(', ')}
                              placeholder="Ej: Negro, Blanco"
                              onChange={(e) => handleFieldChange(prod.id, 'colors', e.target.value)}
                              className="w-full py-1.5 px-2.5 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white rounded text-xs text-slate-900 transition hover:bg-slate-100/50"
                            />
                          </td>

                          {/* Description */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={prod.description}
                              placeholder="Ej: Remera premium..."
                              onChange={(e) => handleFieldChange(prod.id, 'description', e.target.value)}
                              className="w-full py-1.5 px-2.5 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white rounded text-xs text-slate-900 transition hover:bg-slate-100/50"
                            />
                          </td>

                          {/* Actions */}
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteRow(prod.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Eliminar fila"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1 shrink-0">
                <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>Campos obligatorios marcados con asterisco (*). Puedes editar cualquier celda haciendo clic sobre ella. Separa los talles y colores con comas.</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div>
            {fileParsed && (
              <span className="text-xs text-slate-400 font-medium">
                Listo para enviar {products.length} productos a la base de datos de MongoDB.
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => { onClose(); handleReset(); }}
              disabled={loading}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            
            {fileParsed && (
              <button
                onClick={handleBulkSubmit}
                disabled={loading}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-150 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando en MongoDB...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Guardar e Importar {products.length} Productos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}