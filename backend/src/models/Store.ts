import { Schema, model, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  plan: string;
  logo?: string;
  // Meta (Facebook / Instagram) OAuth credentials
  metaConnected: boolean;
  metaPageId?: string;
  metaPageAccessToken?: string;       // Long-lived Page Access Token
  instagramAccountId?: string;        // IG Business Account ID linked to the page
  metaWebhookVerifyToken?: string;    // Custom token used for webhook challenge verification
  // Mercado Libre OAuth credentials
  meliConnected: boolean;
  meliAccessToken?: string;
  meliRefreshToken?: string;
  meliTokenExpiresAt?: Date;
  // Shopify credentials
  shopifyConnected: boolean;
  shopifyShopUrl?: string;
  shopifyAccessToken?: string;
  // AI Token Usage
  aiTokensUsed: number;
  aiTokenLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    plan: { type: String, default: 'Plan Pro' },
    logo: { type: String, default: '' },
    // Meta credentials (stored after OAuth flow)
    metaConnected: { type: Boolean, default: false },
    metaPageId: { type: String, default: '' },
    metaPageAccessToken: { type: String, default: '' },
    instagramAccountId: { type: String, default: '' },
    metaWebhookVerifyToken: { type: String, default: '' },
    // Mercado Libre credentials (stored after OAuth flow)
    meliConnected: { type: Boolean, default: false },
    meliAccessToken: { type: String, default: '' },
    meliRefreshToken: { type: String, default: '' },
    meliTokenExpiresAt: { type: Date },
    // Shopify credentials
    shopifyConnected: { type: Boolean, default: false },
    shopifyShopUrl: { type: String, default: '' },
    shopifyAccessToken: { type: String, default: '' },
    // AI Token Usage
    aiTokensUsed: { type: Number, default: 0 },
    aiTokenLimit: { type: Number, default: 500000 },
  },
  { timestamps: true }
);

export const Store = model<IStore>('Store', StoreSchema);
