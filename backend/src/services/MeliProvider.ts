import { IProduct } from '../models/Product';
import { callApi } from './mercadolibre.service';

export class MeliProvider {
  private accessToken: string | null;

  constructor(accessToken: string | null = null) {
    this.accessToken = accessToken;
  }

  async getQuestions(itemId: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    try {
      // Endpoint to search questions for an item
      const response: { questions: any[] } = await callApi(
        `/questions/search`,
        'GET',
        this.accessToken,
        undefined,
        { item_id: itemId }
      );

      return response.questions || [];
    } catch (err: any) {
      console.error(`[MeliProvider] Error fetching questions for item ${itemId}:`, err?.message);
      throw new Error(`Error al obtener preguntas de Mercado Libre: ${err?.response?.data?.message || err?.message}`);
    }
  }

  async createProduct(product: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    try {
      const payload = {
        title: product.name,
        category_id: 'MLA3530', // Default category ID for testing - needs mapping in production
        price: product.price,
        currency_id: 'UYU',
        available_quantity: product.stock,
        buying_mode: 'buy_it_now',
        listing_type_id: 'gold_special',
        condition: 'new',
        description: { plain_text: product.description },
        pictures: [{ source: product.image }]
      };

      const response = await callApi('/items', 'POST', this.accessToken, payload);
      return response;
    } catch (err: any) {
      console.error(`[MeliProvider] Error creating product on Meli:`, err?.response?.data || err?.message);
      throw new Error(`Error al publicar producto en Mercado Libre: ${err?.response?.data?.message || err?.message}`);
    }
  }

  async syncProducts(_storeId: string): Promise<Partial<IProduct>[]> {
    // ── FALLBACK (development / no token) ───────────────────────────
    if (!this.accessToken) {
      console.log('[MeliProvider] syncProducts → using simulated data (no Meli token)');
      return [
        {
          name: 'Remera Básica Mercado Libre',
          description: 'Remera de algodón peinado importada',
          price: 1590,
          stock: 20,
          sku: 'REM-BAS-MELI',
          sizes: ['S', 'M', 'L'],
          colors: ['Blanco', 'Gris'],
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300',
          channels: ['mercadolibre'] as ('instagram' | 'facebook' | 'mercadolibre'| 'import')[],
          status: 'active',
        },
      ];
    }

    // ── REAL MODE ──────────────────────────────────────────────────────────
    try {
      // 1. Get the current user ID
      const me: { id: string } = await callApi('/users/me', 'GET', this.accessToken);
      
      // 2. Search for items for this user
      const search: { results: string[] } = await callApi(
        `/users/${me.id}/items/search`,
        'GET',
        this.accessToken
      );

      if (!search.results || search.results.length === 0) {
        return [];
      }

      // 3. Get details for each item (limiting to 10 for performance)
      const itemIds = search.results.slice(0, 10).join(',');
      const itemsDetails: { body: any }[] = await callApi(
        '/items',
        'GET',
        this.accessToken,
        undefined,
        { ids: itemIds }
      );

      // 4. Map to IProduct and fetch descriptions
      const productsMapped = await Promise.all(itemsDetails.map(async (item) => {
        const product = item.body;
        
        // Fetch description separately
        let description = '';
        if (this.accessToken) {
          try {
            const desc: { plain_text: string } = await callApi(`/items/${product.id}/description`, 'GET', this.accessToken);
            description = desc.plain_text;
          } catch (e) {
            console.warn(`[MeliProvider] Could not fetch description for ${product.id}`);
          }
        }

        return {
          name: product.title,
          description: description,
          price: product.price,
          stock: product.available_quantity,
          sku: product.seller_sku || product.id,
          sizes: [], // Needs mapping
          colors: [], // Needs mapping
          image: product.thumbnail,
          channels: ['mercadolibre'] as ('instagram' | 'facebook' | 'mercadolibre')[],
          status: (product.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
        };
      }));

      return productsMapped;
    } catch (err: any) {
      console.error('[MeliProvider] Error syncing products from Meli:', err?.message);
      throw new Error('Error al sincronizar productos desde Mercado Libre');
    }
  }
}
