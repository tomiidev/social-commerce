// Tipo para las filas leídas directamente del archivo Excel/CSV
export interface ExcelProductRow {
  [key: string]: string | number | undefined;
}

// Tipo de negocio principal para nuestro catálogo
export interface ProductDomain {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  sizes: string[];
  colors: string[];
  channels: ('instagram' | 'facebook' | 'mercadolibre' | 'import')[];
  status: 'active' | 'inactive';
}

// Tipo específico para la respuesta de error de la API
export interface BulkImportError {
  index: number;
  name?: string;
  error: string;
}

// Tipo para la respuesta exitosa del backend
export interface BulkImportResponse {
  message: string;
  count: number;
  products: ProductDomain[];
  errors?: BulkImportError[];
}
