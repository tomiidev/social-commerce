/**
 * mercadolibre.service.ts
 * Base service for all Mercado Libre API interactions.
 *
 * Responsibilities:
 *  - Build the Mercado Libre OAuth URL
 *  - Exchange the auth code for an access token
 *  - Generic API wrapper (axios)
 */

import axios, { AxiosRequestConfig } from 'axios';

const CLIENT_ID = process.env.MERCADOLIBRE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.MERCADOLIBRE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.MERCADOLIBRE_REDIRECT_URI || 'http://localhost:5000/api/mercadolibre/auth/callback';
const BASE_URL = 'https://api.mercadolibre.com';

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Returns the URL the user must visit to grant permissions to the Mercado Libre App.
 */
export function getOAuthUrl(state: string): string {
  if (!CLIENT_ID) {
    throw new Error('MERCADOLIBRE_CLIENT_ID no configurado en variables de entorno');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
  });

  return `https://auth.mercadolibre.com.uy/authorization?${params.toString()}`;
}

/**
 * Exchanges the one-time auth `code` for an access token.
 */
export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await axios.post<{ access_token: string; refresh_token: string; expires_in: number }>(
    `${BASE_URL}/oauth/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  return res.data;
}

// ---------------------------------------------------------------------------
// Generic API wrapper
// ---------------------------------------------------------------------------

/**
 * Generic wrapper around the Mercado Libre API.
 */
export async function callApi<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  token: string,
  data?: Record<string, unknown>,
  params?: Record<string, unknown>
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const config: AxiosRequestConfig = {
    url,
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    params,
    data,
    timeout: 15000,
  };

  const response = await axios(config);
  return response.data as T;
}
