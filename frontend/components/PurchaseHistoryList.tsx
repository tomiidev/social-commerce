import React, { useState } from 'react';
import { ShoppingBag, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { InstagramIcon, FacebookIcon, ShopifyIcon, MeliIcon } from './SocialIcons';

interface Sale {
  _id: string;
  channel: 'instagram' | 'facebook' | 'mercadolibre' | 'shopify';
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  amount: number;
  date: string;
  productId: { name: string; price: number; image: string };
  rawOrderData: any;
}

const getChannelIcon = (channel: Sale['channel']) => {
  switch (channel) {
    case 'instagram': return <InstagramIcon className="h-3 w-3" />;
    case 'facebook': return <FacebookIcon className="h-3 w-3" />;
    case 'mercadolibre': return <MeliIcon className="h-3 w-3" />;
    case 'shopify': return <ShopifyIcon className="h-3 w-3" />;
    default: return <ShoppingBag className="h-3 w-3" />;
  }
};

const getStatusConfig = (status: Sale['status']) => {
  switch (status) {
    case 'confirmed': return { label: 'Confirmada', color: 'text-emerald-600', icon: CheckCircle2 };
    case 'cancelled': return { label: 'Cancelada', color: 'text-rose-600', icon: AlertCircle };
    case 'refunded': return { label: 'Reembolsada', color: 'text-amber-600', icon: AlertCircle };
    default: return { label: 'Pendiente', color: 'text-slate-500', icon: Clock };
  }
};

const PurchaseItem: React.FC<{ sale: Sale }> = ({ sale }) => {
  const [isOpen, setIsOpen] = useState(false);
  const status = getStatusConfig(sale.status);
  const StatusIcon = status.icon;

  let product = null;
  if (sale.productId) {
    product = sale.productId;
  } else if (sale.channel === 'mercadolibre' && sale.rawOrderData?.order_items?.[0]?.item) {
    const item = sale.rawOrderData.order_items[0].item;
    product = {
      name: item.title || 'Producto sin nombre',
      price: sale.amount, 
      image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=150',
    };
  } else if (sale.channel === 'shopify' && sale.rawOrderData?.line_items?.[0]) {
    const item = sale.rawOrderData.line_items[0];
    product = {
      name: item.name || 'Producto Shopify',
      price: sale.amount, 
      image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=150',
    };
  }

  const finalProduct = product || {
    name: 'Producto desconocido',
    price: sale.amount,
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=150',
  };
// Extract extra details
let paymentMethod = 'N/A';
if (sale.channel === 'mercadolibre') {
    paymentMethod = sale.rawOrderData?.payments?.[0]?.payment_method_id || 'N/A';
} else if (sale.channel === 'shopify') {
    paymentMethod = sale.rawOrderData?.payment_gateway_names?.[0] || 'N/A';
}

const shippingCost = sale.rawOrderData?.shipping_cost || 0;
const rawId = sale.rawOrderData?.id || 'N/A';


  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden shrink-0">
            <img src={finalProduct.image} alt={finalProduct.name} className="h-full w-full object-cover" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{finalProduct.name}</h4>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 capitalize">
                {getChannelIcon(sale.channel)}
                <span>{sale.channel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
            <div className="text-right">
                <p className="text-xs font-bold text-slate-800">${sale.amount.toFixed(2)}</p>
                <p className={`text-[10px] font-semibold flex items-center justify-end ${status.color}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
                </p>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 text-[10px] space-y-2">
            <div className="grid grid-cols-2 gap-4 text-slate-600">
                <p><span className="font-bold text-slate-400">Fecha:</span> {format(new Date(sale.date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p><span className="font-bold text-slate-400">Método de Pago:</span> {paymentMethod}</p>
                <p><span className="font-bold text-slate-400">Costo Envío:</span> ${shippingCost}</p>
                <p><span className="font-bold text-slate-400">ID Orden:</span> {rawId}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export const PurchaseHistoryList: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  if (sales.length === 0) return <p className="text-xs text-slate-400 p-4">No hay compras registradas.</p>;

  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <PurchaseItem key={sale._id} sale={sale} />
      ))}
    </div>
  );
};
