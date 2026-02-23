import { Hono } from 'hono';
import { AppEnv } from '../types';
import { createPlayer, updatePlayerName } from '../db/queries';

function generateToken(): string {
  const chars = '0123456789abcdef';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * 16)];
  }
  return token;
}

function generateId(): string {
  const chars = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments.map(len => {
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
  }).join('-');
}

const authRoutes = new Hono<AppEnv>();

/**
 * POST /api/auth/register
 * Body: { displayName: string }
 * Returns: { playerId, authToken, displayName }
 *
 * Creates a new anonymous player account.
 * The client stores the authToken and uses it for all future requests.
 */
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ displayName: string }>();

  if (!body.displayName || body.displayName.trim().length === 0) {
    return c.json({ error: 'displayName is required' }, 400);
  }

  const displayName = body.displayName.trim().slice(0, 30);
  const id = generateId();
  const token = generateToken();

  const player = await createPlayer(c.env.DB, id, displayName, token);

  return c.json({
    playerId: player.id,
    authToken: player.auth_token,
    displayName: player.display_name,
  }, 201);
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Returns player profile.
 */
authRoutes.get('/me', async (c) => {
  const player = c.get('player');

  return c.json({
    playerId: player.id,
    displayName: player.display_name,
    gamesPlayed: player.games_played,
    gamesWon: player.games_won,
    createdAt: player.created_at,
  });
});

/**
 * PATCH /api/auth/me
 * Header: Authorization: Bearer <token>
 * Body: { displayName: string }
 */
authRoutes.patch('/me', async (c) => {
  const player = c.get('player');

  const body = await c.req.json<{ displayName?: string }>();

  if (body.displayName) {
    const name = body.displayName.trim().slice(0, 30);
    await updatePlayerName(c.env.DB, player.id, name);
  }

  return c.json({ success: true });
});

export { authRoutes };
