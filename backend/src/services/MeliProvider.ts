import { IProduct } from '../models/Product';
import { callApi } from './mercadolibre.service';

export class MeliProvider {
  private accessToken: string | null;

  constructor(accessToken: string | null = null) {
    this.accessToken = accessToken;
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
          channels: ['mercadolibre'],
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

      // 4. Map to IProduct
      return itemsDetails.map((item) => {
        const product = item.body;
        return {
          name: product.title,
          description: product.description || '',
          price: product.price,
          stock: product.available_quantity,
          sku: product.seller_sku || product.id,
          sizes: [], // Needs mapping based on Mercado Libre attributes if needed
          colors: [], // Needs mapping based on Mercado Libre attributes if needed
          image: product.thumbnail,
          channels: ['mercadolibre'],
          status: product.status === 'active' ? 'active' : 'inactive',
        };
      });
    } catch (err: any) {
      console.error('[MeliProvider] Error syncing products from Meli:', err?.message);
      throw new Error('Error al sincronizar productos desde Mercado Libre');
    }
  }
}
