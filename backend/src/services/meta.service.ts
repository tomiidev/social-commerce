/**
 * meta.service.ts
 * Base service for all Meta (Facebook / Instagram) Graph API interactions.
 *
 * Responsibilities:
 *  - Build the Meta OAuth URL for the user to authorize
 *  - Exchange the auth code for a short-lived user token
 *  - Exchange the short-lived token for a long-lived token
 *  - Retrieve the list of pages the user manages
 *  - Retrieve the Instagram Business Account linked to a page
 *  - Generic Graph API wrapper (axios)
 *  - HMAC-SHA256 webhook signature verification
 */

import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

const API_VERSION = process.env.META_API_VERSION || 'v26.0';
const APP_ID = process.env.META_APP_ID || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:5000/api/meta/auth/callback';

export interface IMetaCredentials {
  pageId: string;
  pageAccessToken: string;
  instagramAccountId: string;
}

export interface IMetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Returns the URL the user must visit to grant permissions to the Meta App.
 * Scopes requested:
 *   - pages_messaging              (send/receive Facebook Messenger messages)
 *   - pages_manage_metadata        (subscribe page to webhooks)
 *   - pages_read_engagement        (read page posts, likes, comments)
 *   - instagram_business_basic     (read IG profile)
 *   - instagram_business_manage_messages  (send/receive IG DMs)
 *   - instagram_manage_comments    (private replies to post comments)
 */
export function getOAuthUrl(state: string): string {
  if (!APP_ID) {
    throw new Error('META_APP_ID no configurado en variables de entorno');
  }

  const scopes = [
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_manage_comments',
  ].join(',');

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

/**
 * Exchanges the one-time auth `code` (from the OAuth callback) for a
 * short-lived user access token.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await callGraphAPI<{ access_token: string }>(
    '/oauth/access_token',
    'GET',
    {
      client_id: APP_ID,
      client_secret: APP_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }
  );
  return res.access_token;
}

/**
 * Converts a short-lived (~1h) user access token into a long-lived (~60d)
 * user access token.
 */
export async function getLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const res = await callGraphAPI<{ access_token: string }>(
    '/oauth/access_token',
    'GET',
    {
      grant_type: 'fb_exchange_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: shortLivedToken,
    }
  );
  return res.access_token;
}

/**
 * Returns the list of Facebook Pages managed by the user represented by the
 * given user access token. Each page object includes its own page access token
 * and — when present — the linked Instagram Business Account ID.
 */
export async function getManagedPages(userAccessToken: string): Promise<IMetaPage[]> {
  const res = await callGraphAPI<{ data: IMetaPage[] }>(
    '/me/accounts',
    'GET',
    { fields: 'id,name,access_token,instagram_business_account' },
    userAccessToken
  );
  return res.data;
}

/**
 * Given a Page ID and its Page Access Token, resolves the linked Instagram
 * Business Account ID (returns empty string when none is linked).
 */
export async function getInstagramAccountId(
  pageId: string,
  pageAccessToken: string
): Promise<string> {
  try {
    const res = await callGraphAPI<{ instagram_business_account?: { id: string } }>(
      `/${pageId}`,
      'GET',
      { fields: 'instagram_business_account' },
      pageAccessToken
    );
    return res.instagram_business_account?.id ?? '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

/**
 * Sends a Direct Message to an Instagram user (identified by their IGSID).
 * Requires an Instagram Business Account ID and its associated Page Access Token.
 *
 * Meta only allows replies within the 24h window after the last incoming
 * message from that user. Calls outside this window will return a 403.
 */
export async function sendInstagramMessage(
  igAccountId: string,
  recipientIgsid: string,
  text: string,
  pageAccessToken: string
): Promise<boolean> {
  await callGraphAPI(
    `/${igAccountId}/messages`,
    'POST',
    {},
    pageAccessToken,
    {
      recipient: { id: recipientIgsid },
      message: { text },
    },
    'https://graph.instagram.com'
  );
  return true;
}

/**
 * Sends a message to a Facebook Messenger user (identified by their PSID)
 * on behalf of a Facebook Page.
 */
export async function sendFacebookMessage(
  pageId: string,
  recipientPsid: string,
  text: string,
  pageAccessToken: string
): Promise<boolean> {
  await callGraphAPI(
    `/${pageId}/messages`,
    'POST',
    {},
    pageAccessToken,
    {
      recipient: { id: recipientPsid },
      message: { text },
      messaging_type: 'RESPONSE',
    }
  );
  return true;
}

// ---------------------------------------------------------------------------
// Media / Posts
// ---------------------------------------------------------------------------

export interface IMetaMediaItem {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  comments_count?: number;
  like_count?: number;
  permalink?: string;
}

/**
 * Fetches the latest media (posts/reels) from an Instagram Business Account.
 */
export async function getInstagramMedia(
  igAccountId: string,
  pageAccessToken: string,
  limit = 20
): Promise<IMetaMediaItem[]> {
  const res = await callGraphAPI<{ data: IMetaMediaItem[] }>(
    `/${igAccountId}/media`,
    'GET',
    {
      fields: 'id,caption,media_url,thumbnail_url,timestamp,comments_count,like_count,permalink',
      limit,
    },
    pageAccessToken,
    undefined,
    'https://graph.instagram.com'
  );
  return res.data;
}

export interface IMetaPostItem {
  id: string;
  message?: string;
  story?: string;
  full_picture?: string;
  permalink_url?: string;
  created_time: string;
  comments?: { summary?: { total_count: number } };
  reactions?: { summary?: { total_count: number } };
}

/**
 * Fetches recent posts from a Facebook Page feed.
 */
export async function getFacebookPosts(
  pageId: string,
  pageAccessToken: string,
  limit = 20
): Promise<IMetaPostItem[]> {
  const res = await callGraphAPI<{ data: IMetaPostItem[] }>(
    `/${pageId}/feed`,
    'GET',
    {
      fields:
        'id,message,story,full_picture,permalink_url,created_time,comments.summary(true),reactions.summary(true)',
      limit,
    },
    pageAccessToken
  );
  return res.data;
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verifies that an incoming webhook POST truly originates from Meta.
 * Meta signs the raw request body with HMAC-SHA256 using the App Secret and
 * sends the signature in the `X-Hub-Signature-256` header as `sha256=<hash>`.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string
): boolean {
  if (!APP_SECRET || !signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Generic Graph API wrapper
// ---------------------------------------------------------------------------

/**
 * Generic wrapper around the Meta Graph API.
 * @param path     - e.g. `/me/accounts` or `/{page-id}/messages`
 * @param method   - HTTP method
 * @param params   - Query params (GET) or additional params (POST)
 * @param token    - Access token to add to the request
 * @param body     - Optional explicit body for POST requests
 * @param baseUrl  - Defaults to graph.facebook.com; use graph.instagram.com for IG endpoints
 */
export async function callGraphAPI<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  params: Record<string, unknown> = {},
  token?: string,
  body?: Record<string, unknown>,
  baseUrl = 'https://graph.facebook.com'
): Promise<T> {
  const url = `${baseUrl}/${API_VERSION}${path}`;

  const queryParams: Record<string, unknown> = { ...params };
  if (token) queryParams['access_token'] = token;

  const config: AxiosRequestConfig = {
    url,
    method,
    timeout: 15000,
  };

  if (method === 'GET') {
    config.params = queryParams;
  } else {
    config.params = { access_token: token };
    config.data = body;
  }

  const response = await axios(config);
  return response.data as T;
}
