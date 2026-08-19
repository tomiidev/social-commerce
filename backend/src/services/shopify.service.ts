import axios from 'axios';

export class ShopifyService {
  private static getClient(shopUrl: string, accessToken: string) {
    return axios.create({
      baseURL: `https://${shopUrl}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  static async syncProducts(storeId: string, shopUrl?: string, accessToken?: string) {
    if (!shopUrl || !accessToken) return [];
    
    const client = this.getClient(shopUrl, accessToken);
    const response = await client.get('/products.json');
    
    // Map Shopify products to internal IProduct format
    return response.data.products.map((p: any) => ({
      name: p.title,
      description: p.body_html || '',
      price: p.variants[0]?.price ? parseFloat(p.variants[0].price) : 0,
      stock: p.variants[0]?.inventory_quantity || 0,
      sku: p.variants[0]?.sku || p.id.toString(),
      sizes: [], // Shopify might have options, need parsing if needed
      colors: [],
      image: p.image?.src || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300',
      channels: ['shopify'],
      status: p.status === 'active' ? 'active' : 'inactive',
    }));
  }

  static async createProduct(shopUrl: string, accessToken: string, product: any) {
    const client = this.getClient(shopUrl, accessToken);
    
    const shopifyProduct = {
      product: {
        title: product.name,
        body_html: product.description,
        variants: [{
          price: product.price,
          inventory_quantity: product.stock,
          sku: product.sku,
        }],
        status: product.status === 'active' ? 'active' : 'draft',
      }
    };

    const response = await client.post('/products.json', shopifyProduct);
    return response.data.product;
  }
}
