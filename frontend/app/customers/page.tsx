'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  ChevronRight,
  ShoppingBag,
  MessageCircle,
  MapPin,
  X,
  FileText,
  Tag,
  ChevronDown
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, ShopifyIcon, MeliIcon } from '../../components/SocialIcons';

interface Customer {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  channel: 'instagram' | 'facebook';
  lastInteraction: string;
  conversationsCount: number;
  purchasesCount: number;
  tags: string[];
  notes: string;
  city: string;
}

interface Sale {
  _id: string;
  productId: { name: string; price: number };
  amount: number;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Drawer/Detail states
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [selectedCustSales, setSelectedCustSales] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Collapsed sales state
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});

  const toggleSaleExpand = (saleId: string) => {
    setExpandedSales(prev => ({
      ...prev,
      [saleId]: !prev[saleId]
    }));
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers`);
      // API returns an array directly
      setCustomers(res.data);
      setTotalCustomers(res.data.length);
      setTotalPages(Math.ceil(res.data.length / limit));
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []); // Remove dependency on page/limit since we are not using server-side pagination now

  const handleOpenDetail = async (cust: Customer) => {
    setSelectedCust(cust);
    setDrawerOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/customers/${cust._id}`);
      setSelectedCustSales(res.data.sales);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Paginated customers for display
  const paginatedCustomers = (customers || []).slice((currentPage - 1) * limit, currentPage * limit);

  // Filtered customers (client-side)
  const filteredCustomers = (paginatedCustomers || []).filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 relative h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Clientes</h2>
          <p className="text-xs text-slate-400">Administrá los contactos capturados de tus canales</p>
        </div>
        <button
        onClick={async () => {
          setLoading(true);
          try {
            await api.post('/mercadolibre/customers/import');
            await api.post('/shopify/customers/import');
            await fetchCustomers();
          } catch (err) {
            console.error('Error importing customers:', err);
            alert('Error al importar clientes.');
          } finally {
            setLoading(false);
          }
        }}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-amber-600 shadow-sm hover:bg-amber-50 transition-colors"
        >
        <span>Importar clientes</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold">
                <th className="p-4">Cliente</th>
                <th className="p-4">Canal</th>
                <th className="p-4">Ciudad</th>
                <th className="p-4">Conversaciones</th>
                <th className="p-4">Compras</th>
                <th className="p-4">Etiquetas</th>
                <th className="p-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4 flex items-center space-x-3.5">
                      <div className="h-9 w-9 bg-slate-100 rounded-full"></div>
                      <div className="h-4 w-28 bg-slate-100 rounded"></div>
                    </td>
                    <td className="p-4"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-8 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-8 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-6 bg-slate-100 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : (customers || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No se encontraron clientes</p>
                  </td>
                </tr>
              ) : (
                customers.map(cust => {
                  let ChannelIcon;
                  let channelClasses = '';
                  
                  if (cust.channel === 'instagram') {
                    ChannelIcon = InstagramIcon;
                    channelClasses = 'bg-pink-50 text-pink-600 border-pink-100';
                  } else if (cust.channel === 'facebook') {
                    ChannelIcon = FacebookIcon;
                    channelClasses = 'bg-blue-50 text-blue-600 border-blue-100';
                  } else if (cust.channel === 'shopify') {
                    ChannelIcon = ShopifyIcon;
                    channelClasses = 'bg-slate-100 text-slate-800 border-slate-200';
                  } else if (cust.channel === 'mercadolibre') {
                    ChannelIcon = MeliIcon;
                    channelClasses = 'bg-yellow-50 text-yellow-600 border-yellow-100';
                  } else {
                    ChannelIcon = Users;
                    channelClasses = 'bg-slate-50 text-slate-600 border-slate-200';
                  }

                  return (
                    <tr
                      key={cust._id}
                      onClick={() => handleOpenDetail(cust)}
                      className="hover:bg-slate-50/50 transition cursor-pointer"
                    >
                      <td className="p-4 flex items-center space-x-3.5">
                        <img
                          src={cust.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'}
                          alt={cust.name}
                          className="h-9 w-9 rounded-full object-cover border border-slate-100"
                        />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-slate-800">{cust.name}</span>
                          <span className="text-[10px] text-slate-400">@{cust.username}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center space-x-1 w-fit border ${channelClasses}`}>
                          <ChannelIcon className="h-3 w-3" />
                          <span className="capitalize">{cust.channel}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-semibold">{cust.city || 'Montevideo'}</td>
                      <td className="p-4 text-slate-500 font-bold">{cust.conversationsCount || 1}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cust.purchasesCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {cust.purchasesCount} compras
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(cust.tags || []).slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-semibold border border-indigo-100">{tag}</span>
                          ))}
                          {(cust.tags || []).length > 2 && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-semibold">+{cust.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
                      </td>
                    </tr>
                  );
                })
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
            <option key={l} value={l}>{l} clientes por página</option>
          ))}
        </select>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
          <span className="text-slate-500 mr-4">Total: {totalCustomers} clientes</span>
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

      {/* CUSTOMER DETAIL DRAWER */}
      {drawerOpen && selectedCust && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          
          {/* Drawer Body */}
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in border-l border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">Detalle del Cliente</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4.5 w-4.5" /></button>
            </div>

            {/* Content info */}
            <div className="flex-1 p-5 space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-slate-100">
                <img
                  src={selectedCust.avatar}
                  alt={selectedCust.name}
                  className="h-16 w-16 rounded-full object-cover border border-slate-200 shadow-sm"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{selectedCust.name}</h4>
                  <p className="text-xs text-slate-400">@{selectedCust.username}</p>
                </div>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                 /*    handleGoToChat(selectedCust._id); */
                  }}
                  className="flex items-center space-x-1.5 px-4.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-150 hover:bg-indigo-700 transition"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  <span>Ver Conversación</span>
                </button>
              </div>

              {/* Data parameters */}
              <div className="space-y-4 text-xs">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Información General</h5>
                
                <div className="flex items-center space-x-3 text-slate-600">
                  <MapPin className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400">Ciudad</span>
                    <span className="font-semibold text-slate-800">{selectedCust.city || 'Montevideo'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600">
                  <MessageCircle className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400">Conversaciones</span>
                    <span className="font-semibold text-slate-800">{selectedCust.conversationsCount || 1} chats</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600">
                  <ShoppingBag className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400">Compras totales</span>
                    <span className="font-semibold text-slate-800">{selectedCust.purchasesCount || 0} compras</span>
                  </div>
                </div>
              </div>

              {/* Tags display */}
              <div className="space-y-3.5 border-t border-slate-100 pt-5">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Etiquetas</h5>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedCust.tags || []).map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-[10px]">{tag}</span>
                  ))}
                  {(selectedCust.tags || []).length === 0 && (
                    <span className="text-slate-400 text-xs italic">Sin etiquetas</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3.5 border-t border-slate-100 pt-5">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>Notas del vendedor</span>
                </h5>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl min-h-[60px] italic leading-relaxed">
                  {selectedCust.notes || 'No se han agregado notas de venta para este cliente.'}
                </p>
              </div>

              {/* Purchases history */}
              <div className="space-y-3.5 border-t border-slate-100 pt-5">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Historial de compras</h5>
                {loadingDetail ? (
                  <div className="h-10 bg-slate-50 animate-pulse rounded-lg"></div>
                ) : selectedCustSales.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No registra compras todavía.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedCustSales.map(sale => {
                      const isExpanded = !!expandedSales[sale._id];
                      
                      // Try to extract rich product info from rawOrderData if available
                      const orderItem = sale.rawOrderData?.order_items?.[0] || sale.rawOrderData?.order_request;
                      const productTitle = orderItem?.item?.title || sale.productId?.name || 'Producto sin registrar';
                      const productQuantity = orderItem?.quantity || 1;
                      const unitPrice = orderItem?.unit_price || sale.amount;
                      const currency = sale.rawOrderData?.currency_id || 'UYU';
                      
                      // Payment and cancel details
                      const paymentMethod = sale.rawOrderData?.payments?.[0]?.payment_method_id || 'N/A';
                      const paymentStatus = sale.rawOrderData?.payments?.[0]?.status_detail || sale.status;
                      const cancelReason = sale.rawOrderData?.cancel_detail?.description || null;

                      // Placeholder image for products
                      const productImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=150';

                      return (
                        <div key={sale._id} className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden text-xs shadow-sm">
                          {/* Main Row / Header */}
                          <div className="p-3 flex items-start space-x-3">
                            <img
                              src={productImage}
                              alt={productTitle}
                              className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                            />
                            <div className="flex-1 min-w-0">
                              <h6 className="font-bold text-slate-800 truncate" title={productTitle}>{productTitle}</h6>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[10px] text-slate-400">
                                  {new Date(sale.date).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-500 font-semibold capitalize">
                                  {sale.channel || 'Canal'}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1.5">
                              <span className="font-bold text-slate-800">
                                {currency === 'UYU' ? '$' : currency} {sale.amount.toLocaleString()}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                sale.status === 'confirmed' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : sale.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                                  : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}>
                                {sale.status}
                              </span>
                            </div>
                          </div>

                          {/* Secondary Detail Dropdown Trigger */}
                          <button
                            onClick={() => toggleSaleExpand(sale._id)}
                            className="w-full bg-slate-100/50 hover:bg-slate-100 px-3 py-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-bold text-slate-500 transition-colors"
                          >
                            <span>Detalle de la orden</span>
                            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Expanded Secondary Details */}
                          {isExpanded && (
                            <div className="p-3 bg-white border-t border-slate-100 text-[10px] text-slate-600 space-y-2 leading-relaxed">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-slate-400 font-medium">Cantidad</span>
                                  <span className="font-bold text-slate-800">{productQuantity} unidades</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-medium">Precio Unitario</span>
                                  <span className="font-bold text-slate-800">{currency === 'UYU' ? '$' : currency} {unitPrice.toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-medium">Método de Pago</span>
                                  <span className="font-semibold text-slate-700 capitalize">{paymentMethod.replace('_', ' ')}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-medium">Estado del Pago</span>
                                  <span className="font-semibold text-slate-700 capitalize">{paymentStatus.replace('_', ' ')}</span>
                                </div>
                              </div>
                              {sale.rawOrderData?.shipping?.id && (
                                <div className="pt-1.5 border-t border-slate-50">
                                  <span className="block text-slate-400 font-medium">ID de Envío</span>
                                  <span className="font-bold text-slate-800">{sale.rawOrderData.shipping.id}</span>
                                </div>
                              )}
                              {cancelReason && (
                                <div className="pt-1.5 border-t border-slate-50 bg-rose-50/40 p-2 rounded-lg border border-rose-100/30">
                                  <span className="block text-rose-500 font-bold uppercase tracking-wider text-[8px]">Motivo de Cancelación</span>
                                  <span className="font-semibold text-rose-700">{cancelReason}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
