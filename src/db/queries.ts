import { PlayerRow, GameRow, GamePlayerRow, Seat, BotDifficulty } from '../types';

/** Create a new player account. */
export async function createPlayer(
  db: D1Database,
  id: string,
  displayName: string,
  authToken: string,
): Promise<PlayerRow> {
  await db.prepare(
    `INSERT INTO players (id, display_name, auth_token) VALUES (?, ?, ?)`,
  ).bind(id, displayName, authToken).run();

  return {
    id,
    display_name: displayName,
    auth_token: authToken,
    created_at: new Date().toISOString(),
    games_played: 0,
    games_won: 0,
  };
}

/** Find a player by auth token. */
export async function getPlayerByToken(db: D1Database, token: string): Promise<PlayerRow | null> {
  const result = await db.prepare(
    `SELECT * FROM players WHERE auth_token = ?`,
  ).bind(token).first<PlayerRow>();
  return result ?? null;
}

/** Find a player by ID. */
export async function getPlayerById(db: D1Database, id: string): Promise<PlayerRow | null> {
  const result = await db.prepare(
    `SELECT * FROM players WHERE id = ?`,
  ).bind(id).first<PlayerRow>();
  return result ?? null;
}

/** Update player display name. */
export async function updatePlayerName(db: D1Database, id: string, displayName: string): Promise<void> {
  await db.prepare(
    `UPDATE players SET display_name = ? WHERE id = ?`,
  ).bind(displayName, id).run();
}

/** Create a game record in D1. */
export async function createGameRecord(
  db: D1Database,
  gameId: string,
  inviteCode: string,
  createdBy: string,
  config: { pointsToWin: number; stickTheDealer: boolean; noTrumpAlone: boolean },
): Promise<GameRow> {
  await db.prepare(
    `INSERT INTO games (id, invite_code, status, created_by, config_points_to_win, config_stick_the_dealer, config_no_trump_alone)
     VALUES (?, ?, 'waiting', ?, ?, ?, ?)`,
  ).bind(
    gameId, inviteCode, createdBy,
    config.pointsToWin, config.stickTheDealer ? 1 : 0, config.noTrumpAlone ? 1 : 0,
  ).run();

  const row = await db.prepare(`SELECT * FROM games WHERE id = ?`).bind(gameId).first<GameRow>();
  return row!;
}

/** Find a game by invite code. */
export async function getGameByInviteCode(db: D1Database, inviteCode: string): Promise<GameRow | null> {
  const result = await db.prepare(
    `SELECT * FROM games WHERE invite_code = ? AND status IN ('waiting', 'in_progress')`,
  ).bind(inviteCode.toUpperCase()).first<GameRow>();
  return result ?? null;
}

/** Get a game by ID. */
export async function getGameById(db: D1Database, id: string): Promise<GameRow | null> {
  const result = await db.prepare(
    `SELECT * FROM games WHERE id = ?`,
  ).bind(id).first<GameRow>();
  return result ?? null;
}

/** Update game status. */
export async function updateGameStatus(db: D1Database, gameId: string, status: string): Promise<void> {
  const updates: string[] = [`status = '${status}'`];
  if (status === 'in_progress') {
    updates.push(`started_at = datetime('now')`);
  }
  await db.prepare(
    `UPDATE games SET ${updates.join(', ')} WHERE id = ?`,
  ).bind(gameId).run();
}

/** Add a player to a game's persistent record. */
export async function addGamePlayer(
  db: D1Database,
  gameId: string,
  seat: Seat,
  playerId: string | null,
  isBot: boolean,
  botDifficulty: BotDifficulty = 'medium',
): Promise<void> {
  await db.prepare(
    `INSERT OR REPLACE INTO game_players (game_id, seat, player_id, is_bot, bot_difficulty)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(gameId, seat, playerId, isBot ? 1 : 0, botDifficulty).run();
}

/** Get a player's active games. */
export async function getPlayerActiveGames(db: D1Database, playerId: string): Promise<GameRow[]> {
  const result = await db.prepare(
    `SELECT g.* FROM games g
     JOIN game_players gp ON g.id = gp.game_id
     WHERE gp.player_id = ? AND g.status IN ('waiting', 'in_progress')
     ORDER BY g.created_at DESC`,
  ).bind(playerId).all<GameRow>();
  return result.results ?? [];
}

/** Get a player's game history. */
export async function getPlayerGameHistory(
  db: D1Database,
  playerId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<GameRow[]> {
  const result = await db.prepare(
    `SELECT g.* FROM games g
     JOIN game_players gp ON g.id = gp.game_id
     WHERE gp.player_id = ? AND g.status = 'completed'
     ORDER BY g.completed_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(playerId, limit, offset).all<GameRow>();
  return result.results ?? [];
}

/** Get players in a game. */
export async function getGamePlayers(db: D1Database, gameId: string): Promise<GamePlayerRow[]> {
  const result = await db.prepare(
    `SELECT * FROM game_players WHERE game_id = ? ORDER BY seat`,
  ).bind(gameId).all<GamePlayerRow>();
  return result.results ?? [];
}
