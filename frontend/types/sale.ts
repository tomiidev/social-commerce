export interface Product {
  _id: string;
  name: string;
  price: number;
}

export interface Customer {
  _id: string;
  name: string;
}

export interface Sale {
  _id: string;
  customerId: Customer;
  productId: Product;
  amount: number;
  date: string;
  channel: 'instagram' | 'facebook' | 'mercadolibre' | 'shopify';
  status: 'pending' | 'confirmed' | 'cancelled';
  rawOrderData?: any;
}
