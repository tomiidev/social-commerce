import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/meta/auth/callback
 *
 * Meta redirects here (frontend domain) after the user grants permissions.
 * This Next.js server route forwards the code + state to the Express backend,
 * which handles the token exchange, DB persistence, and final redirect.
 *
 * Environment variable required (set in Vercel frontend project):
 *   BACKEND_URL = https://social-commerce-teal.vercel.app
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Server-side only env var — not exposed to the browser
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

  // Build the backend callback URL, forwarding every query param Meta sent
  const backendCallbackUrl = new URL('/api/meta/auth/callback', backendUrl);

  if (error) backendCallbackUrl.searchParams.set('error', error);
  if (code) backendCallbackUrl.searchParams.set('code', code);
  if (state) backendCallbackUrl.searchParams.set('state', state);

  // Redirect the browser to the Express handler.
  // The backend will do all token-exchange logic and then redirect to
  // /settings?meta=connected  (or ?meta=error&reason=...).
  return NextResponse.redirect(backendCallbackUrl.toString());
}
