'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Upload,
  ImageIcon,
  Loader2,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, MeliIcon, ShopifyIcon } from '../../components/SocialIcons';
import ProductImporter from '../../components/ProductImporter';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  sizes: string[];
  colors: string[];
  image: string;
  queriesCount: number;
  channels: ('instagram' | 'facebook' | 'mercadolibre' | 'shopify' | 'import')[];
  status: 'active' | 'inactive';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Channels connection state
  const [availableChannels, setAvailableChannels] = useState<{
    meta: boolean;
    mercadolibre: boolean;
    shopify: boolean;
  }>({ meta: false, mercadolibre: false, shopify: false });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch connections status
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await api.get('/auth/connections');
        setAvailableChannels(res.data);
      } catch (err) {
        console.error('Error fetching connections:', err);
      }
    };
    fetchConnections();
  }, []);

  // Import Meta state
  const [importing, setImporting] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Preguntas Modal State
  const [questionsModalOpen, setQuestionsModalOpen] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Open Questions Modal
  const handleOpenQuestionsModal = async (product: Product) => {
    setQuestionsModalOpen(true);
    setLoadingQuestions(true);
    setCurrentQuestions([]);
    try {
      const res = await api.get(`/mercadolibre/items/${product.sku}/questions`);
      setCurrentQuestions(res.data);
    } catch (err) {
      showToast('error', 'Error al cargar preguntas');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [channels, setChannels] = useState<('instagram' | 'facebook' | 'mercadolibre' | 'import' | 'shopify')[]>(['instagram']);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async (isManual: boolean = false) => {
    if (!isManual && loading) return;

    setLoading(true);
    try {
      let url = `/products?page=${currentPage}&limit=${limit}&`;
      if (debouncedSearch) url += `search=${debouncedSearch}&`;
      if (channelFilter) url += `channel=${channelFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;

      const res = await api.get(url);
      
      setProducts(res.data.products);
      setTotalProducts(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const runFetch = async () => {
      if (isMounted) {
        await fetchProducts(true);
      }
    };
    
    runFetch();
    
    return () => { isMounted = false; };
  }, [debouncedSearch, channelFilter, statusFilter, currentPage, limit]);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice(0);
    setStock(0);
    setSku('');
    setSizes('S, M, L');
    setColors('Negro, Blanco, Gris');
    setImage('https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300');
    setImageFile(null);
    setImagePreview('https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300');
    setChannels(['instagram']);
    setStatus('active');
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(product.price);
    setStock(product.stock);
    setSku(product.sku || '');
    setSizes(product.sizes.join(', '));
    setColors(product.colors.join(', '));
    setImage(product.image || '');
    setImageFile(null);
    setImagePreview(product.image || '');
    setChannels(product.channels || ['instagram']);
    setStatus(product.status || 'active');
    setModalOpen(true);
  };

  // Handle image file selection — generates local preview
  const handleImageFileChange = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price <= 0) {
      showToast('error', 'El nombre y precio son requeridos');
      return;
    }

    let finalImageUrl = image;

    if (imageFile) {
      setImageUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await api.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = uploadRes.data.url;
      } catch (uploadErr) {
        setImageUploading(false);
        const msg = (uploadErr as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al subir imagen';
        showToast('error', msg);
        return;
      }
      setImageUploading(false);
    }

    const payload = {
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      sku,
      sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: colors.split(',').map(c => c.trim()).filter(Boolean),
      image: finalImageUrl,
      channels,
      status
    };

    try {
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct._id}`, payload);
        setProducts(prev => prev.map(p => p._id === editingProduct._id ? res.data : p));
        showToast('success', 'Producto actualizado correctamente');
      } else {
        const res = await api.post('/products', payload);
        setProducts(prev => [res.data, ...prev]);
        showToast('success', 'Producto creado correctamente');
      }
      setModalOpen(false);
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar producto';
      showToast('error', errorMsg);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      showToast('success', 'Producto eliminado correctamente');
    } catch (err) {
      showToast('error', 'Error al eliminar producto');
    }
  };

  // Sync All Providers
  const handleImportAll = async () => {
    setImporting(true);
    try {
      const res = await api.post('/products/import');
      showToast('success', res.data.message);
      fetchProducts();
    } catch (err) {
      showToast('error', 'Error sincronizando productos con proveedores');
    } finally {
      setImporting(false);
    }
  };

  // Channel toggle inside form
  const toggleChannel = (ch: 'instagram' | 'facebook') => {
    if (channels.includes(ch)) {
      setChannels(channels.filter(c => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2.5 px-4.5 py-3 rounded-2xl shadow-lg border text-xs font-semibold animate-slide-in ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Productos</h2>
          <p className="text-xs text-slate-400">Gestioná tu catálogo de productos</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setImporterOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Importar CSV/Excel</span>
          </button>
          <button
            onClick={handleImportAll}
            disabled={importing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${importing ? 'animate-spin' : ''}`} />
            <span>{importing ? 'Sincronizando...' : 'Importar proveedores'}</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-150 hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo producto</span>
          </button>
        </div>
      </div>

      {/* Componente de Importación */}
      <ProductImporter
        isOpen={importerOpen}
        onClose={() => setImporterOpen(false)}
        onImportSuccess={(msg) => {
          showToast('success', msg);
          fetchProducts();
        }}
      />

      {/* Filters Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-600">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="">Todos los canales</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="mercadolibre">Mercado Libre</option>
            <option value="shopify">Shopify</option>
            <option value="import">CVS/Excel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Products list Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold">
                <th className="p-4">Producto</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Consultas (7 días)</th>
                <th className="p-4">Canales</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4 flex items-center space-x-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-lg"></div>
                      <div className="h-4 w-28 bg-slate-100 rounded"></div>
                    </td>
                    <td className="p-4"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-8 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-8 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-16 bg-slate-100 rounded-full"></div></td>
                    <td className="p-4"><div className="h-4 w-8 bg-slate-100 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No se encontraron productos</p>
                    <p className="text-[10px] mt-1">Hacé click en Importar o Nuevo Producto para agregar al catálogo.</p>
                  </td>
                </tr>
              ) : (
                products.map(prod => (
                  <tr key={prod._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 flex items-center space-x-3.5">
                      <img
                        src={prod.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=150'}
                        alt={prod.name}
                        className="h-10 w-10 rounded-lg object-cover border border-slate-100"
                      />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-800">{prod.name}</span>
                        <span className="text-[10px] text-slate-400">{prod.sku || 'Sin SKU'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-800 font-bold">${(prod.price ?? 0).toLocaleString('es-UY')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${prod.stock <= 3 ? 'bg-rose-50 text-rose-600 font-semibold' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {prod.stock} u.
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-500">{prod.queriesCount || 0}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1.5">
                        {prod.channels.includes('instagram') && (
                          <div className="p-1 rounded-md bg-pink-50 text-pink-600" title="Instagram Feed"><InstagramIcon className="h-3.5 w-3.5" /></div>
                        )}
                        {prod.channels.includes('facebook') && (
                          <div className="p-1 rounded-md bg-blue-50 text-blue-600" title="Facebook Page"><FacebookIcon className="h-3.5 w-3.5" /></div>
                        )}
                        {prod.channels.includes('mercadolibre') && (
                          <div className="p-1 rounded-md bg-yellow-50 text-yellow-600" title="Mercado Libre"><MeliIcon className="h-3.5 w-3.5" /></div>
                        )}
                        {prod.channels.includes('shopify') && (
                          <div className="p-1 rounded-md bg-indigo-50 text-indigo-600" title="Shopify"><ShopifyIcon className="h-3.5 w-3.5" /></div>
                        )}
                        {prod.channels.includes('import') && (
                          <div className="p-1 rounded-md bg-slate-100 text-slate-600" title="Importado masivamente"><FileSpreadsheet className="h-3.5 w-3.5" /></div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border ${prod.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                        {prod.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(prod)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {prod.channels.includes('mercadolibre') && (
                          <button
                            onClick={() => handleOpenQuestionsModal(prod)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Ver preguntas"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProduct(prod._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
          {[5, 10, 15, 50].map((l) => (
            <option key={l} value={l}>{l} productos por página</option>
          ))}
        </select>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
          <span className="text-slate-500 mr-4">Total: {totalProducts} productos</span>
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

      {/* CREATE & EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>

          {/* Content container */}
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 mx-4 overflow-hidden animate-slide-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4.5 w-4.5" /></button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs font-semibold text-slate-600 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block mb-1.5">Nombre del producto {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable en ML)</span>}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    readOnly={!!editingProduct?.channels.includes('mercadolibre')}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 ${editingProduct?.channels.includes('mercadolibre') ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/20'}`}
                    placeholder="ej. Campera Nike Cortaviento"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block mb-1.5">Descripción {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable en ML)</span>}</label>
                  <textarea
                    value={description}
                    readOnly={!!editingProduct?.channels.includes('mercadolibre')}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 min-h-[60px] ${editingProduct?.channels.includes('mercadolibre') ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/20'}`}
                    placeholder="Detalles sobre el material, calce, etc..."
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Precio (UYU)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Stock</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">SKU {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable)</span>}</label>
                  <input
                    type="text"
                    value={sku}
                    readOnly={!!editingProduct?.channels.includes('mercadolibre')}
                    onChange={(e) => setSku(e.target.value)}
                    className={`w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 ${editingProduct?.channels.includes('mercadolibre') ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/20'}`}
                    placeholder="ej. NK-CAM-01"
                  />
                </div>

                {/* Image Upload — S3 */}
                <div className="col-span-2">
                  <label className="block mb-1.5">Imagen del producto {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable en ML)</span>}</label>
                  <div
                    className={`relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors group bg-slate-50/30 ${editingProduct?.channels.includes('mercadolibre') ? 'cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!editingProduct?.channels.includes('mercadolibre')) {
                        imageInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => !editingProduct?.channels.includes('mercadolibre') && e.preventDefault()}
                    onDrop={(e) => {
                      if (!editingProduct?.channels.includes('mercadolibre')) {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleImageFileChange(file);
                      }
                    }}
                  >
                    {/* Hidden native file input */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileChange(file);
                      }}
                    />


                    {imagePreview ? (
                      // Preview
                      <div className="relative h-36 w-full">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center text-white transition-opacity">
                            <Upload className="h-5 w-5 mb-1" />
                            <span className="text-[10px] font-semibold">Cambiar imagen</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Empty state
                      <div className="h-36 flex flex-col items-center justify-center space-y-1.5 text-slate-400">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                        <p className="text-[11px] font-semibold text-slate-500">Arrastrá o hacé click para subir</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG, WebP · Máx. 5MB</p>
                      </div>
                    )}
                  </div>
                  {imageFile && (
                    <p className="mt-1 text-[10px] text-indigo-600 font-medium truncate">
                      📎 {imageFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5">Talles (separados por coma) {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable)</span>}</label>
                  <input
                    type="text"
                    value={sizes}
                    readOnly={!!editingProduct?.channels.includes('mercadolibre')}
                    onChange={(e) => setSizes(e.target.value)}
                    className={`w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 ${editingProduct?.channels.includes('mercadolibre') ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/20'}`}
                    placeholder="ej. S, M, L"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Colores (separados por coma) {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable)</span>}</label>
                  <input
                    type="text"
                    value={colors}
                    readOnly={!!editingProduct?.channels.includes('mercadolibre')}
                    onChange={(e) => setColors(e.target.value)}
                    className={`w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 ${editingProduct?.channels.includes('mercadolibre') ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50/20'}`}
                    placeholder="ej. Negro, Azul"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Canales sociales vinculados {editingProduct?.channels.includes('mercadolibre') && <span className="text-[10px] text-slate-400">(No modificable en ML)</span>}</label>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {availableChannels.meta && (
                      <button
                        type="button"
                        disabled={!!editingProduct?.channels.includes('mercadolibre')}
                        onClick={() => toggleChannel('instagram')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${channels.includes('instagram') ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-500 border-slate-200'} ${editingProduct?.channels.includes('mercadolibre') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <InstagramIcon className="h-3.5 w-3.5" /> <span>Instagram</span>
                      </button>
                    )}
                    {availableChannels.meta && (
                      <button
                        type="button"
                        disabled={!!editingProduct?.channels.includes('mercadolibre')}
                        onClick={() => toggleChannel('facebook')}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${channels.includes('facebook') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'} ${editingProduct?.channels.includes('mercadolibre') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FacebookIcon className="h-3.5 w-3.5" /> <span>Facebook</span>
                      </button>
                    )}
                    {availableChannels.shopify && (
                       <button
                       type="button"
                       onClick={() => {
                         const ch = 'shopify';
                         if (channels.includes(ch)) {
                            setChannels(channels.filter(c => c !== ch));
                         } else {
                            setChannels([...channels, ch] as any);
                         }
                       }}
                       className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${channels.includes('shopify') ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                     >
                       <ShopifyIcon className="h-3.5 w-3.5" /> <span>Shopify</span>
                     </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5">Estado</label>
                  <div className="flex items-center space-x-3.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setStatus('active')}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                    >
                      Activo
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('inactive')}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${status === 'inactive' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                    >
                      Inactivo
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Footer Buttons */}
              <div className="pt-5 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={imageUploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition disabled:opacity-60 flex items-center space-x-1.5"
                >
                  {imageUploading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Subiendo imagen...</span></>
                  ) : (
                    <span>{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTIONS MODAL */}
      {questionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setQuestionsModalOpen(false)}></div>

          {/* Content container */}
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 mx-4 overflow-hidden animate-slide-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">Preguntas de Mercado Libre</h3>
              <button onClick={() => setQuestionsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4.5 w-4.5" /></button>
            </div>

            {/* Questions Body */}
            <div className="overflow-y-auto p-5 space-y-4 text-xs font-semibold text-slate-600 flex-1">
              {loadingQuestions ? (
                <div className="flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
              ) : currentQuestions.length === 0 ? (
                <p className="text-center text-slate-400">No hay preguntas para este producto.</p>
              ) : (
                currentQuestions.map((q: { id: string, text: string, answer?: { text: string } }) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <p className="text-slate-800">{q.text}</p>
                    {q.answer && <p className="text-indigo-600">R: {q.answer.text}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
