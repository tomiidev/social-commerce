/**
 * SocialProvider.ts
 *
 * Abstract provider pattern for Instagram and Facebook integrations.
 *
 * Each concrete provider (Instagram / Facebook) has two modes:
 *
 *  1. REAL MODE   — When `credentials` are supplied (pageId, pageAccessToken,
 *                   instagramAccountId obtained via OAuth), the provider calls
 *                   the actual Meta Graph API v26.0 endpoints.
 *
 *  2. FALLBACK    — When `credentials` is null (no Meta account connected, or
 *                   NODE_ENV=development without real tokens), the provider
 *                   returns hardcoded demo data so the rest of the app keeps
 *                   working normally without any API access.
 *
 * The fallback is selected automatically — no conditional logic needed in
 * controllers. Just pass `null` as credentials and the hardcoded data flows.
 */

import { IProduct } from '../models/Product';
import { IPost } from '../models/Post';
import {
  IMetaCredentials,
  sendInstagramMessage,
  sendFacebookMessage,
  getInstagramMedia,
  getFacebookPosts,
} from './meta.service';

export { IMetaCredentials };

export interface ISocialMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface ISocialConversation {
  id: string;
  customerName: string;
  channel: 'instagram' | 'facebook';
  messages: ISocialMessage[];
}

// ---------------------------------------------------------------------------
// Abstract base
// ---------------------------------------------------------------------------

export abstract class SocialProvider {
  protected credentials: IMetaCredentials | null;

  constructor(credentials: IMetaCredentials | null = null) {
    this.credentials = credentials;
  }

  /** Returns true when this provider has real Meta credentials configured. */
  get isConnected(): boolean {
    return (
      !!this.credentials?.pageAccessToken &&
      !!this.credentials?.pageId
    );
  }

  abstract syncProducts(storeId: string): Promise<Partial<IProduct>[]>;
  abstract syncPosts(storeId: string): Promise<Partial<IPost>[]>;
  abstract sendMessage(storeId: string, conversationId: string, text: string, recipientExternalId?: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Instagram Provider
// ---------------------------------------------------------------------------

export class InstagramProvider extends SocialProvider {
  constructor(credentials: IMetaCredentials | null = null) {
    super(credentials);
  }

  async syncProducts(_storeId: string): Promise<Partial<IProduct>[]> {
    // Instagram does not expose a direct product catalogue API in the
    // Business Messaging scope; products are managed via the Commerce Manager.
    // For now this always returns demo data as a placeholder.
    return [
      {
        name: 'Remera Básica Instagram',
        description: 'Remera de algodón peinado importada',
        price: 1290,
        stock: 15,
        sku: 'REM-BAS-IG',
        sizes: ['S', 'M', 'L'],
        colors: ['Blanco', 'Negro'],
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300',
        channels: ['instagram'],
        status: 'active',
      },
    ];
  }

  async syncPosts(_storeId: string): Promise<Partial<IPost>[]> {
    // ── REAL MODE ──────────────────────────────────────────────────────────
    if (this.isConnected && this.credentials) {
      const { instagramAccountId, pageAccessToken } = this.credentials;

      // No IG Business account linked — valid state, skip silently
      if (!instagramAccountId) {
        console.log('[InstagramProvider] No instagramAccountId configured, skipping IG sync.');
        return [];
      }

      try {
        const mediaItems = await getInstagramMedia(instagramAccountId, pageAccessToken);

        return mediaItems.map((item) => ({
          caption: item.caption ?? '',
          image: item.media_url ?? item.thumbnail_url ?? '',
          channel: 'instagram' as const,
          commentsCount: item.comments_count ?? 0,
          queriesCount: 0,
          date: new Date(item.timestamp),
        }));
      } catch (err: any) {
        // Extract Meta Graph API error details if available
        const apiError = err?.response?.data?.error;
        const detail = apiError
          ? `[${apiError.code}] ${apiError.message}`
          : err?.message;
        console.error('[InstagramProvider] Meta Graph API error:', detail);
        throw new Error(`Error al obtener publicaciones de Instagram: ${detail}`);
      }
    }

    // ── FALLBACK (development / no credentials) ───────────────────────────
    console.log('[InstagramProvider] syncPosts → using simulated data (no Meta credentials)');
    return [
      {
        caption: 'Nueva remera básica disponible en todos los talles! Envianos un mensaje privado para comprar. 📩',
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300',
        channel: 'instagram',
        commentsCount: 15,
        queriesCount: 8,
        date: new Date(),
      },
    ];
  }

  async sendMessage(
    _storeId: string,
    conversationId: string,
    text: string,
    recipientExternalId?: string
  ): Promise<boolean> {
    // ── REAL MODE ──────────────────────────────────────────────────────────
    if (this.isConnected && this.credentials && recipientExternalId) {
      try {
        const { instagramAccountId, pageAccessToken } = this.credentials;
        return await sendInstagramMessage(instagramAccountId, recipientExternalId, text, pageAccessToken);
      } catch (err: any) {
        console.error('[InstagramProvider] sendMessage real API failed:', err?.message);
        // Return false so the caller knows delivery failed
        return false;
      }
    }

    // ── FALLBACK ──────────────────────────────────────────────────────────
    console.log(
      `[InstagramProvider] sendMessage → simulated delivery to conversation ${conversationId}: "${text}"`
    );
    return true;
  }
}

// ---------------------------------------------------------------------------
// Facebook Provider
// ---------------------------------------------------------------------------

export class FacebookProvider extends SocialProvider {
  constructor(credentials: IMetaCredentials | null = null) {
    super(credentials);
  }

  async syncProducts(_storeId: string): Promise<Partial<IProduct>[]> {
    // Facebook Catalogue sync via Commerce Manager API is outside current scope.
    return [
      {
        name: 'Campera Bomber Facebook',
        description: 'Campera de abrigo tipo bomber clásica',
        price: 3490,
        stock: 5,
        sku: 'CAM-BOM-FB',
        sizes: ['M', 'L', 'XL'],
        colors: ['Verde Oliva', 'Negro'],
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=300',
        channels: ['facebook'],
        status: 'active',
      },
    ];
  }

  async syncPosts(_storeId: string): Promise<Partial<IPost>[]> {
    // ── REAL MODE ──────────────────────────────────────────────────────────
    if (this.isConnected && this.credentials) {
      const { pageId, pageAccessToken } = this.credentials;

      try {
        const posts = await getFacebookPosts(pageId, pageAccessToken);

        return posts.map((post) => ({
          caption: post.message ?? post.story ?? '',
          image: post.full_picture ?? '',
          channel: 'facebook' as const,
          commentsCount: post.comments?.summary?.total_count ?? 0,
          queriesCount: 0,
          date: new Date(post.created_time),
        }));
      } catch (err: any) {
        // Extract Meta Graph API error details if available
        const apiError = err?.response?.data?.error;
        const detail = apiError
          ? `[${apiError.code}] ${apiError.message}`
          : err?.message;
        console.error('[FacebookProvider] Meta Graph API error:', detail);
        throw new Error(`Error al obtener publicaciones de Facebook: ${detail}`);
      }
    }

    // ── FALLBACK ──────────────────────────────────────────────────────────
    console.log('[FacebookProvider] syncPosts → using simulated data (no Meta credentials)');
    return [
      {
        caption: 'Abrigarte con estilo nunca fue tan fácil. Campera Bomber en stock limitado. Comentá abajo para más info!',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=300',
        channel: 'facebook',
        commentsCount: 22,
        queriesCount: 11,
        date: new Date(),
      },
    ];
  }

  async sendMessage(
    _storeId: string,
    conversationId: string,
    text: string,
    recipientExternalId?: string
  ): Promise<boolean> {
    // ── REAL MODE ──────────────────────────────────────────────────────────
    if (this.isConnected && this.credentials && recipientExternalId) {
      try {
        const { pageId, pageAccessToken } = this.credentials;
        return await sendFacebookMessage(pageId, recipientExternalId, text, pageAccessToken);
      } catch (err: any) {
        console.error('[FacebookProvider] sendMessage real API failed:', err?.message);
        return false;
      }
    }

    // ── FALLBACK ──────────────────────────────────────────────────────────
    console.log(
      `[FacebookProvider] sendMessage → simulated delivery to conversation ${conversationId}: "${text}"`
    );
    return true;
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Creates the correct provider for a given channel with the supplied credentials.
 * Pass `null` for credentials to use the simulated fallback (development mode).
 */
export function createProvider(
  channel: 'instagram' | 'facebook',
  credentials: IMetaCredentials | null
): SocialProvider {
  return channel === 'instagram'
    ? new InstagramProvider(credentials)
    : new FacebookProvider(credentials);
}
