import { Schema, model, Document } from 'mongoose';

export interface IStoreConnections extends Document {
  storeId: Schema.Types.ObjectId;
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
}

const StoreConnectionsSchema = new Schema<IStoreConnections>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true, index: true },
    // Meta credentials
    metaConnected: { type: Boolean, default: false },
    metaPageId: { type: String, default: '' },
    metaPageAccessToken: { type: String, default: '' },
    instagramAccountId: { type: String, default: '' },
    metaWebhookVerifyToken: { type: String, default: '' },
    // Mercado Libre credentials
    meliConnected: { type: Boolean, default: false },
    meliAccessToken: { type: String, default: '' },
    meliRefreshToken: { type: String, default: '' },
    meliTokenExpiresAt: { type: Date },
    // Shopify credentials
    shopifyConnected: { type: Boolean, default: false },
    shopifyShopUrl: { type: String, default: '' },
    shopifyAccessToken: { type: String, default: '' },
  },
  { timestamps: true }
);

export const StoreConnections = model<IStoreConnections>('StoreConnections', StoreConnectionsSchema);
