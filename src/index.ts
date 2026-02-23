import { Hono } from 'hono';
import { AppEnv } from './types';
import { authRoutes } from './api/auth';
import { gameRoutes } from './api/games';
import { authMiddleware, corsMiddleware } from './api/middleware';
import { renderPlayPage } from './play-page';

// Re-export Durable Object
export { GameRoom } from './durable-objects/game-room';

const app = new Hono<AppEnv>();

// Global CORS
app.use('*', corsMiddleware);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Euchre Game Server',
    version: '1.0.0',
    status: 'ok',
  });
});

// Lightweight browser client for quickly playing against the API
app.get('/play', (c) => {
  return c.html(renderPlayPage());
});

// Public auth route: registration
app.route('/api/auth', authRoutes);

// Protected routes - require auth token
app.use('/api/auth/me', authMiddleware);
app.use('/api/games/*', authMiddleware);
app.route('/api/games', gameRoutes);

// 404 fallback
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
