import { Hono } from 'hono';
import { AppEnv, Seat } from '../types';
import {
  createGameRecord, getGameByInviteCode, getGameById,
  addGamePlayer, getPlayerActiveGames, getPlayerGameHistory,
  getGamePlayers,
} from '../db/queries';

function generateId(): string {
  const chars = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments.map(len => {
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
  }).join('-');
}

const gameRoutes = new Hono<AppEnv>();

/**
 * POST /api/games
 * Create a new game.
 * Body: { pointsToWin?: number, stickTheDealer?: boolean, noTrumpAlone?: boolean }
 */
gameRoutes.post('/', async (c) => {
  const player = c.get('player');

  interface CreateBody {
    pointsToWin?: number;
    stickTheDealer?: boolean;
    noTrumpAlone?: boolean;
  }

  const body: CreateBody = await c.req.json<CreateBody>().catch(() => ({}));

  const gameId = generateId();
  const pointsToWin = body.pointsToWin ?? 10;
  const stickTheDealer = body.stickTheDealer ?? false;
  const noTrumpAlone = body.noTrumpAlone ?? false;

  // Create the Durable Object game room
  const roomId = c.env.GAME_ROOM.idFromName(gameId);
  const room = c.env.GAME_ROOM.get(roomId);

  const createResp = await room.fetch(new Request('http://internal/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId,
      playerId: player.id,
      displayName: player.display_name,
      pointsToWin,
      stickTheDealer,
      noTrumpAlone,
    }),
  }));

  if (!createResp.ok) {
    const err = await createResp.json() as { error: string };
    return c.json({ error: err.error }, 500);
  }

  const createResult = await createResp.json() as { gameId: string; inviteCode: string; seat: number };

  // Persist to D1
  await createGameRecord(c.env.DB, gameId, createResult.inviteCode, player.id, {
    pointsToWin,
    stickTheDealer,
    noTrumpAlone,
  });
  await addGamePlayer(c.env.DB, gameId, 0 as Seat, player.id, false);

  return c.json({
    gameId: createResult.gameId,
    inviteCode: createResult.inviteCode,
    seat: createResult.seat,
  }, 201);
});

/**
 * GET /api/games/history
 * Get player's game history.
 * NOTE: Must be registered before /:gameId to avoid route collision.
 */
gameRoutes.get('/history', async (c) => {
  const player = c.get('player');

  const limit = parseInt(c.req.query('limit') ?? '20');
  const offset = parseInt(c.req.query('offset') ?? '0');

  const games = await getPlayerGameHistory(c.env.DB, player.id, limit, offset);

  return c.json({
    games: games.map(g => ({
      gameId: g.id,
      scores: [g.team1_score, g.team2_score],
      winningTeam: g.winning_team,
      completedAt: g.completed_at,
    })),
  });
});

/**
 * POST /api/games/join
 * Join a game by invite code.
 * Body: { inviteCode: string, preferredSeat?: Seat }
 */
gameRoutes.post('/join', async (c) => {
  const player = c.get('player');

  const body = await c.req.json<{ inviteCode: string; preferredSeat?: Seat }>();

  if (!body.inviteCode) {
    return c.json({ error: 'inviteCode is required' }, 400);
  }

  const code = body.inviteCode.toUpperCase().trim();

  const game = await getGameByInviteCode(c.env.DB, code);
  if (!game) {
    return c.json({ error: 'Game not found or already started' }, 404);
  }

  // Join through the Durable Object
  const roomId = c.env.GAME_ROOM.idFromName(game.id);
  const room = c.env.GAME_ROOM.get(roomId);

  const joinResp = await room.fetch(new Request('http://internal/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: player.id,
      displayName: player.display_name,
      preferredSeat: body.preferredSeat,
    }),
  }));

  if (!joinResp.ok) {
    const err = await joinResp.json() as { error: string };
    return c.json({ error: err.error }, joinResp.status as 400 | 404);
  }

  const joinResult = await joinResp.json() as { seat: number };

  // Persist to D1
  await addGamePlayer(c.env.DB, game.id, joinResult.seat as Seat, player.id, false);

  return c.json({
    gameId: game.id,
    inviteCode: code,
    seat: joinResult.seat,
  });
});

/**
 * WebSocket upgrade endpoint.
 * GET /api/games/:gameId/ws
 */
gameRoutes.get('/:gameId/ws', async (c) => {
  const player = c.get('player');

  const gameId = c.req.param('gameId');
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const game = await getGameById(c.env.DB, gameId);
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }

  const gamePlayers = await getGamePlayers(c.env.DB, gameId);
  const myEntry = gamePlayers.find(p => p.player_id === player.id);
  if (!myEntry) {
    return c.json({ error: 'Not in this game' }, 403);
  }

  // Forward WebSocket upgrade to Durable Object
  const roomId = c.env.GAME_ROOM.idFromName(gameId);
  const room = c.env.GAME_ROOM.get(roomId);

  const url = new URL(c.req.url);
  url.pathname = '/ws';
  url.searchParams.set('playerId', player.id);
  url.searchParams.set('seat', myEntry.seat.toString());

  // Preserve the browser's WS upgrade headers explicitly.
  const wsHeaders = new Headers(c.req.raw.headers);
  wsHeaders.set('Connection', 'Upgrade');
  wsHeaders.set('Upgrade', 'websocket');

  return room.fetch(new Request(url.toString(), {
    method: 'GET',
    headers: wsHeaders,
  }));
});


/**
 * GET /api/games/:gameId
 * Get game details.
 */
gameRoutes.get('/:gameId', async (c) => {
  const player = c.get('player');

  const gameId = c.req.param('gameId');
  const game = await getGameById(c.env.DB, gameId);

  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }

  const players = await getGamePlayers(c.env.DB, gameId);
  const myEntry = players.find(p => p.player_id === player.id);

  if (game.status === 'waiting' || game.status === 'in_progress') {
    const roomId = c.env.GAME_ROOM.idFromName(gameId);
    const room = c.env.GAME_ROOM.get(roomId);

    const seat = myEntry?.seat ?? 0;
    const stateResp = await room.fetch(
      new Request(`http://internal/state?seat=${seat}`),
    );

    if (stateResp.ok) {
      const liveState = await stateResp.json();
      return c.json(liveState);
    }
  }

  return c.json({
    gameId: game.id,
    inviteCode: game.invite_code,
    status: game.status,
    scores: [game.team1_score, game.team2_score],
    winningTeam: game.winning_team,
    players: players.map(p => ({
      seat: p.seat,
      playerId: p.player_id,
      isBot: !!p.is_bot,
    })),
    createdAt: game.created_at,
    completedAt: game.completed_at,
  });
});

/**
 * GET /api/games
 * Get player's active games.
 */
gameRoutes.get('/', async (c) => {
  const player = c.get('player');

  const games = await getPlayerActiveGames(c.env.DB, player.id);

  return c.json({
    games: games.map(g => ({
      gameId: g.id,
      inviteCode: g.invite_code,
      status: g.status,
      scores: [g.team1_score, g.team2_score],
      createdAt: g.created_at,
    })),
  });
});

export { gameRoutes };
