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
  Loader2
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, MeliIcon } from '../../components/SocialIcons';

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
  channels: ('instagram' | 'facebook' | 'mercadolibre')[];
  status: 'active' | 'inactive';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Import Meta state
  const [importing, setImporting] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
  const [channels, setChannels] = useState<('instagram' | 'facebook' | 'mercadolibre')[]>(['instagram']);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/products?';
      if (search) url += `search=${search}&`;
      if (channelFilter) url += `channel=${channelFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;

      const res = await api.get(url);
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [search, channelFilter, statusFilter]);

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

    // If a new file was selected, upload it to S3 first
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
      sizes: sizes.split(',').map(s => s.trim()).filter(s => s.length > 0),
      colors: colors.split(',').map(c => c.trim()).filter(c => c.length > 0),
      image: finalImageUrl,
      channels,
      status
    };

    try {
      if (editingProduct) {
        // Edit Mode
        const res = await api.put(`/products/${editingProduct._id}`, payload);
        setProducts(prev => prev.map(p => p._id === editingProduct._id ? res.data : p));
        showToast('success', 'Producto actualizado correctamente');
      } else {
        // Create Mode
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
            onClick={handleImportAll}
            disabled={importing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${importing ? 'animate-spin' : ''}`} />
            <span>{importing ? 'Sincronizando...' : 'Importar productos'}</span>
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
          {/* Channel */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="">Todos los canales</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="mercadolibre">Mercado Libre</option>
          </select>

          {/* Status */}
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
                    <td className="p-4 text-slate-800 font-bold">${prod.price.toLocaleString('es-UY')}</td>
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
                  <label className="block mb-1.5">Nombre del producto</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                    placeholder="ej. Campera Nike Cortaviento"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block mb-1.5">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20 min-h-[60px]"
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
                  <label className="block mb-1.5">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                    placeholder="ej. NK-CAM-01"
                  />
                </div>

                {/* Image Upload — S3 */}
                <div className="col-span-2">
                  <label className="block mb-1.5">Imagen del producto</label>
                  <div
                    className="relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors group bg-slate-50/30"
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFileChange(file);
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
                  <label className="block mb-1.5">Talles (separados por coma)</label>
                  <input
                    type="text"
                    value={sizes}
                    onChange={(e) => setSizes(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                    placeholder="ej. S, M, L"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Colores (separados por coma)</label>
                  <input
                    type="text"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/20"
                    placeholder="ej. Negro, Azul"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">Canales sociales vinculados</label>
                  <div className="flex items-center space-x-3.5 mt-2">
                    <button
                      type="button"
                      onClick={() => toggleChannel('instagram')}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${channels.includes('instagram') ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                    >
                      <InstagramIcon className="h-3.5 w-3.5" /> <span>Instagram</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChannel('facebook')}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${channels.includes('facebook') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                    >
                      <FacebookIcon className="h-3.5 w-3.5" /> <span>Facebook</span>
                    </button>
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
    </div>
  );
}
