export interface NormalizedOrderItem {
  itemId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
}

export interface NormalizedOrder {
  orderId: string;
  externalOrderId: string;
  platform: 'mercadolibre' | 'shopify' | 'instagram' | 'facebook';
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  dateCreated: Date;
  buyer: {
    id: string;
    nickname: string;
  };
  items: NormalizedOrderItem[];
  rawOrderData: any; // Keep original for reference
}
