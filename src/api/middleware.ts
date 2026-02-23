import { Context, Next } from 'hono';
import { AppEnv } from '../types';
import { getPlayerByToken } from '../db/queries';

/**
 * Authentication middleware.
 * Extracts Bearer token from Authorization header and loads the player.
 * Sets `player` in context.
 */
export async function authMiddleware(c: Context<AppEnv>, next: Next): Promise<void | Response> {
  const authHeader = c.req.header('Authorization');
  const url = new URL(c.req.url);
  const queryToken = url.searchParams.get('authToken');

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken ?? '';

  if (!token) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  const player = await getPlayerByToken(c.env.DB, token);

  if (!player) {
    return c.json({ error: 'Invalid auth token' }, 401);
  }

  c.set('player', player);
  await next();
}

/**
 * CORS middleware for allowing cross-origin requests from mobile apps and web.
 */
export async function corsMiddleware(c: Context<AppEnv>, next: Next): Promise<void | Response> {
  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
