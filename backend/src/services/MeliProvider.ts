import { IProduct } from '../models/Product';
import { NormalizedOrder } from '../types/order';
import { callApi, refreshToken } from './mercadolibre.service';
import { StoreConnections } from '../models/StoreConnections';
import mongoose from 'mongoose';

export class MeliProvider {
  private accessToken: string | null;
  private refreshTokenVal: string | null;
  private storeId: mongoose.Types.ObjectId | null;

  constructor(
    accessToken: string | null = null,
    refreshTokenVal: string | null = null,
    storeId: mongoose.Types.ObjectId | null = null
  ) {
    this.accessToken = accessToken;
    this.refreshTokenVal = refreshTokenVal;
    this.storeId = storeId;
  }

  private async ensureValidToken() {
    if (this.accessToken && this.storeId) {
      // Check if token is expired (simplified, should check meliTokenExpiresAt)
      // For now, if we get 401, we will refresh
    }
  }

  // Wrapper para manejar 401 y refrescar
  private async authenticatedCall<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    params?: any
  ): Promise<T> {
    try {
      return await callApi(path, method, this.accessToken!, data, params);
    } catch (err: any) {
      if (err.response?.status === 401 && this.refreshTokenVal && this.storeId) {
        console.log('[MeliProvider] Token expired, refreshing...');
        const newTokens = await refreshToken(this.refreshTokenVal);

        await StoreConnections.findOneAndUpdate(
          { storeId: this.storeId },
          {
            meliAccessToken: newTokens.access_token,
            meliRefreshToken: newTokens.refresh_token,
            meliTokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          }
        );

        this.accessToken = newTokens.access_token;
        this.refreshTokenVal = newTokens.refresh_token;

        return await callApi(path, method, this.accessToken, data, params);
      }
      throw err;
    }
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

  async getOrders(sellerId: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    try {
      const response: { results: any[] } = await callApi(
        `/orders/search`,
        'GET',
        this.accessToken,
        undefined,
        { seller: sellerId, sort: 'date_desc', limit: 20 }
      );
      return response.results || [];
    } catch (err: any) {
      console.error(`[MeliProvider] Error fetching orders for seller ${sellerId}:`, err?.message);
      throw new Error(`Error al obtener órdenes de Mercado Libre: ${err?.response?.data?.message || err?.message}`);
    }
  }

  normalizeOrder(order: any): NormalizedOrder {
    // Determine status: prioritizes order status, could be refined to look at payments
    let status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' = 'pending';

    if (order.status === 'cancelled') {
      status = 'cancelled';
    } else if (order.status === 'paid' || order.status === 'confirmed') {
      status = 'confirmed';
    } else if (order.payments && order.payments.length > 0) {
      // Check payment status as fallback
      const paymentStatus = order.payments[0].status;
      if (paymentStatus === 'refunded') status = 'refunded';
      else if (paymentStatus === 'approved') status = 'confirmed';
    }

    return {
      orderId: order.id.toString(),
      externalOrderId: order.id.toString(),
      platform: 'mercadolibre',
      totalAmount: order.total_amount,
      currency: order.currency_id,
      status: status,
      dateCreated: new Date(order.date_created),
      buyer: {
        id: order.buyer.id.toString(),
        nickname: order.buyer.nickname,
      },
      items: order.order_items.map((item: any) => ({
        itemId: item.item.id,
        title: item.item.title,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        sku: item.item.seller_sku,
      })),
      rawOrderData: order,
    };
  }

  async getBillingSummaryDetails(dateFrom: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    // Convertir dateFrom a period_key (YYYY-MM-01)
    const d = new Date(dateFrom);
    const periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

    try {
      const response = await this.authenticatedCall(
        `/billing/integration/periods/key/${periodKey}/summary/details`,
        'GET',
        undefined,
        {
          group: 'ML', // Obligatorio: 'ML' o 'MP'
          document_type: 'BILL' // Obligatorio según el error 422
        }
      );
      return response;
    } catch (err: any) {
      console.error(`[MeliProvider] Error fetching billing summary details:`, err?.response?.data || err?.message);
      throw new Error(`Error al obtener detalles de facturación: ${err?.response?.data?.message || err?.message}`);
    }
  }

  async getBillingReportStatus(reportId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    try {
      const response = await this.authenticatedCall(
        `/billing/integration/reports/${reportId}`,
        'GET'
      );
      return response;
    } catch (err: any) {
      console.error(`[MeliProvider] Error fetching billing report status:`, err?.response?.data || err?.message);
      throw new Error(`Error al consultar estado del reporte: ${err?.response?.data?.message || err?.message}`);
    }
  }

  async downloadBillingReport(reportId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    try {
      // Nota: authenticatedCall no maneja stream, mantener implementación directa con refresh
      const baseUrl = 'https://api.mercadolibre.com';
      try {
        const response = await import('axios').then(a => a.default.get(`${baseUrl}/billing/integration/reports/${reportId}/download`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          responseType: 'stream'
        }));
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 401 && this.refreshTokenVal && this.storeId) {
          // Refrescar y reintentar
          const newTokens = await refreshToken(this.refreshTokenVal);
          await StoreConnections.findOneAndUpdate(
            { storeId: this.storeId },
            {
              meliAccessToken: newTokens.access_token,
              meliRefreshToken: newTokens.refresh_token,
              meliTokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
            }
          );
          this.accessToken = newTokens.access_token;

          const response = await import('axios').then(a => a.default.get(`${baseUrl}/billing/integration/reports/${reportId}/download`, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
            responseType: 'stream'
          }));
          return response.data;
        }
        throw err;
      }
    } catch (err: any) {
      console.error(`[MeliProvider] Error downloading billing report:`, err?.response?.data || err?.message);
      throw new Error(`Error al descargar reporte: ${err?.response?.data?.message || err?.message}`);
    }
  }


  async createProduct(product: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No hay token de acceso para Mercado Libre');
    }

    try {
      const payload = {
        title: product.name,
        category_id: product.category_id || 'MLA3530',
        price: product.price,
        currency_id: 'UYU',
        available_quantity: product.stock,
        buying_mode: 'buy_it_now',
        listing_type_id: 'gold_special',
        condition: product.condition || 'new',
        description: { plain_text: product.description },
        pictures: [{ source: product.image }],
        seller_sku: product.sku,
        attributes: product.attributes || [],
        shipping: product.shipping || { mode: 'me2', local_pick_up: false, free_shipping: false }
      };

      const response = await callApi('/items', 'POST', this.accessToken, payload);
      return response;
    } catch (err: any) {
      console.error(`[MeliProvider] Error creating product on Meli:`, err?.response?.data || err?.message);
      throw new Error(`Error al publicar producto en Mercado Libre: ${err?.response?.data?.message || err?.message}`);
    }
  }


  async updateProduct(meliItemId: string, data: any, description?: string): Promise<void> {
    if (!this.accessToken) {
      console.log(`[MeliProvider] Skipping remote update for ${meliItemId} (no token)`);
      return;
    }

    try {
      if (data && Object.keys(data).length > 0) {
        console.log(`[MeliProvider] Updating item ${meliItemId} with payload:`, JSON.stringify(data));
        await callApi(`/items/${meliItemId}`, 'PUT', this.accessToken, data);
        console.log(`[MeliProvider] Successfully updated item ${meliItemId} on Mercado Libre`);
      }

      if (description !== undefined) {
        console.log(`[MeliProvider] Updating description for item ${meliItemId}`);
        await callApi(`/items/${meliItemId}/description`, 'PUT', this.accessToken, { plain_text: description });
        console.log(`[MeliProvider] Successfully updated description for item ${meliItemId} on Mercado Libre`);
      }
    } catch (err: any) {
      console.error(`[MeliProvider] Error updating item ${meliItemId} on Meli:`, err?.response?.data || err?.message);
      throw new Error(`Error al actualizar producto en Mercado Libre: ${err?.response?.data?.message || err?.message}`);
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
          channels: ['mercadolibre'] as ('instagram' | 'facebook' | 'mercadolibre' | 'import')[],
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
          meliItemId: product.id,
        };
      }));

      return productsMapped;
    } catch (err: any) {
      console.error('[MeliProvider] Error syncing products from Meli:', err?.message);
      throw new Error('Error al sincronizar productos desde Mercado Libre');
    }
  }
}
