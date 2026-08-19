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
    
    let tagsString = undefined;
    if (product.tags) {
      tagsString = Array.isArray(product.tags) ? product.tags.join(', ') : product.tags;
    }

    // Generate variants based on combinations of sizes and colors
    const variants: any[] = [];
    const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['Default'];
    const colors = product.colors && product.colors.length > 0 ? product.colors : ['Default'];

    for (const size of sizes) {
      for (const color of colors) {
        const variant: any = {
          price: product.price,
          inventory_quantity: Math.floor(product.stock / (sizes.length * colors.length)) || 1,
          sku: `${product.sku}-${size}-${color}`,
          option1: size,
          option2: color,
        };

        if (product.compareAtPrice !== undefined && product.compareAtPrice !== null) {
          variant.compare_at_price = product.compareAtPrice;
        }
        if (product.weight !== undefined && product.weight !== null) {
          variant.weight = product.weight;
        }
        if (product.weightUnit) {
          variant.weight_unit = product.weightUnit;
        }
        if (product.barcode) {
          variant.barcode = product.barcode;
        }
        variants.push(variant);
      }
    }

    const shopifyProduct = {
      product: {
        title: product.name,
        body_html: product.description,
        vendor: product.vendor || undefined,
        product_type: product.productType || undefined,
        tags: tagsString,
        options: [
          { name: 'Size', values: sizes },
          { name: 'Color', values: colors }
        ],
        variants: variants,
        status: product.status === 'active' ? 'active' : 'draft',
      }
    };

    const response = await client.post('/products.json', shopifyProduct);
    return response.data.product;
  }
}
