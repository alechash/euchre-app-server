import {
  Seat, GameAction, GameState, ServerMessage, ClientMessage, Env,
  BotDifficulty, Card, Suit,
} from '../types';
import {
  createGameState, addBot, removeBot, addPlayer, removePlayer,
  startGame, processTrumpAction, processDiscard, processPlayCard,
  advanceToNextHand, getCurrentTurnSeat, getValidActions, buildClientState,
  serializeGameState, deserializeGameState, allSeatsFilled,
  SerializedGameState, generateId,
} from '../game/engine';
import { getBotAction, shouldBotGoAlone } from '../game/bot';
import { partnerSeat } from '../game/scoring';
import { getPlayerByToken } from '../db/queries';

interface PlayerConnection {
  playerId: string;
  seat: Seat;
  ws: WebSocket;
}

interface WebSocketAttachment {
  playerId: string;
  seat: Seat;
}

/**
 * GameRoom Durable Object
 *
 * Each game room is a single Durable Object instance that:
 * - Manages WebSocket connections for real-time play
 * - Holds authoritative game state in memory + persisted to storage
 * - Processes game actions and broadcasts updates
 * - Runs bot turns automatically
 */
export class GameRoom {
  private state: DurableObjectState;
  private env: Env;
  private gameState: GameState | null = null;
  private connections: Map<string, PlayerConnection> = new Map();
  private initialized = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.restoreConnectionsFromHibernation();
  }

  private restoreConnectionsFromHibernation(): void {
    const sockets = this.state.getWebSockets();

    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
      if (!attachment) {
        ws.close(1011, 'Missing websocket attachment');
        continue;
      }

      this.connections.set(attachment.playerId, {
        playerId: attachment.playerId,
        seat: attachment.seat,
        ws,
      });
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Initialize game state from storage if needed
      if (!this.initialized) {
        await this.loadState();
        this.initialized = true;
      }

      // WebSocket upgrade
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        return await this.handleWebSocket(request, url);
      }

      // REST endpoints for the Durable Object
      if (path === '/create' && request.method === 'POST') {
        return this.handleCreate(request);
      }

      if (path === '/state' && request.method === 'GET') {
        return this.handleGetState(request);
      }

      if (path === '/join' && request.method === 'POST') {
        return this.handleJoinRest(request);
      }

      return new Response('Not found', { status: 404 });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ============================================================
  // State Persistence
  // ============================================================

  private async loadState(): Promise<void> {
    const stored = await this.state.storage.get<SerializedGameState>('gameState');
    if (stored) {
      this.gameState = deserializeGameState(stored);
    }
  }

  private async saveState(): Promise<void> {
    if (this.gameState) {
      await this.state.storage.put('gameState', serializeGameState(this.gameState));
    }
  }

  // ============================================================
  // REST Handlers
  // ============================================================

  private async handleCreate(request: Request): Promise<Response> {
    const body = await request.json() as {
      gameId: string;
      playerId: string;
      displayName: string;
      pointsToWin?: number;
      stickTheDealer?: boolean;
      noTrumpAlone?: boolean;
    };

    if (this.gameState) {
      return Response.json({ error: 'Game already exists' }, { status: 409 });
    }

    this.gameState = createGameState(body.gameId, body.playerId, body.displayName, {
      pointsToWin: body.pointsToWin,
      stickTheDealer: body.stickTheDealer,
      noTrumpAlone: body.noTrumpAlone,
    });

    await this.saveState();

    return Response.json({
      gameId: this.gameState.gameId,
      inviteCode: this.gameState.inviteCode,
      seat: 0,
    });
  }

  private async handleGetState(request: Request): Promise<Response> {
    if (!this.gameState) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const seat = parseInt(url.searchParams.get('seat') ?? '0') as Seat;

    return Response.json(buildClientState(this.gameState, seat));
  }

  private async handleJoinRest(request: Request): Promise<Response> {
    const body = await request.json() as {
      playerId: string;
      displayName: string;
      preferredSeat?: Seat;
    };

    if (!this.gameState) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    if (this.gameState.phase !== 'waiting') {
      // Allow reconnect if player was already in the game
      const existing = this.gameState.players.find(p => p.playerId === body.playerId);
      if (!existing) {
        return Response.json({ error: 'Game already in progress' }, { status: 400 });
      }
      return Response.json({ seat: existing.seat });
    }

    const seat = addPlayer(this.gameState, body.playerId, body.displayName, body.preferredSeat);
    await this.saveState();

    // Broadcast player joined
    this.broadcast({
      type: 'player_joined',
      seat,
      displayName: body.displayName,
      isBot: false,
    });

    return Response.json({ seat });
  }

  // ============================================================
  // WebSocket Handler
  // ============================================================

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    const queryToken = url.searchParams.get('authToken');

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : queryToken ?? '';

    if (!token) {
      return new Response('Missing auth token', { status: 401 });
    }

    if (!this.gameState) {
      return new Response('Game not found', { status: 404 });
    }

    const dbPlayer = await getPlayerByToken(this.env.DB, token);
    if (!dbPlayer) {
      return new Response('Invalid auth token', { status: 401 });
    }

    const seatIndex = this.gameState.players.findIndex(p => p.playerId === dbPlayer.id);
    if (seatIndex < 0 || seatIndex > 3) {
      return new Response('Not in this game', { status: 403 });
    }

    const seat = seatIndex as Seat;
    const playerId = dbPlayer.id;

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Replace any previous websocket for this player (reconnect case)
    const existingConnection = this.connections.get(playerId);
    if (existingConnection) {
      try {
        existingConnection.ws.close(1000, 'Replaced by a newer connection');
      } catch {
        // Existing socket may already be closed.
      }
    }

    this.state.acceptWebSocket(server, [playerId]);
    server.serializeAttachment({ playerId, seat } satisfies WebSocketAttachment);

    // Store connection
    this.connections.set(playerId, { playerId, seat, ws: server });
    this.gameState.players[seat].connected = true;

    // Send current game state
    this.sendToPlayer(seat, {
      type: 'game_state',
      state: buildClientState(this.gameState, seat),
    });

    // If it's this player's turn, send valid actions
    const turnSeat = getCurrentTurnSeat(this.gameState);
    if (turnSeat === seat) {
      const validActions = getValidActions(this.gameState, seat);
      this.sendToPlayer(seat, {
        type: 'your_turn',
        validActions: validActions.actions,
        validCards: validActions.validCards,
      });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      if (!this.initialized) { await this.loadState(); this.initialized = true; }
      const data = JSON.parse(message as string) as ClientMessage;
      const conn = this.findConnection(ws);
      if (!conn) return;

      await this.handleClientMessage(conn, data);
    } catch (err: any) {
      this.sendToWs(ws, { type: 'error', message: err.message });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    if (!this.initialized) { await this.loadState(); this.initialized = true; }
    const conn = this.findConnection(ws);
    if (conn && this.gameState) {
      this.gameState.players[conn.seat].connected = false;
      this.connections.delete(conn.playerId);
      this.broadcast({ type: 'player_left', seat: conn.seat });
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ============================================================
  // Client Message Handling
  // ============================================================

  private async handleClientMessage(conn: PlayerConnection, msg: ClientMessage): Promise<void> {
    if (!this.gameState) return;

    switch (msg.type) {
      case 'start_game':
        await this.handleStartGame(conn);
        break;
      case 'add_bot':
        await this.handleAddBot(conn, msg.seat, msg.difficulty);
        break;
      case 'remove_bot':
        await this.handleRemoveBot(conn, msg.seat);
        break;
      case 'action':
        await this.handleAction(conn, msg.action);
        break;
      case 'chat':
        this.broadcast({
          type: 'chat',
          seat: conn.seat,
          displayName: this.gameState.players[conn.seat].displayName,
          message: msg.message,
        });
        break;
      case 'ping':
        this.sendToWs(conn.ws, { type: 'pong', ts: msg.ts });
        break;
    }
  }

  private async handleStartGame(conn: PlayerConnection): Promise<void> {
    if (!this.gameState) return;

    // Only the creator (seat 0) can start
    if (conn.seat !== 0) {
      this.sendToPlayer(conn.seat, { type: 'error', message: 'Only the game creator can start' });
      return;
    }

    if (!allSeatsFilled(this.gameState)) {
      this.sendToPlayer(conn.seat, { type: 'error', message: 'All seats must be filled' });
      return;
    }

    this.gameState = startGame(this.gameState);
    await this.saveState();

    // Send each player their hand
    this.broadcastGameState();
    this.broadcastTurnNotification();

    // If it's a bot's turn, process it
    await this.processBotTurns();
  }

  private async handleAddBot(conn: PlayerConnection, seat: Seat, difficulty?: BotDifficulty): Promise<void> {
    if (!this.gameState || this.gameState.phase !== 'waiting') return;
    if (conn.seat !== 0) {
      this.sendToPlayer(conn.seat, { type: 'error', message: 'Only the game creator can add bots' });
      return;
    }

    addBot(this.gameState, seat, difficulty ?? 'medium');
    await this.saveState();
    this.broadcast({
      type: 'player_joined',
      seat,
      displayName: this.gameState.players[seat].displayName,
      isBot: true,
    });
  }

  private async handleRemoveBot(conn: PlayerConnection, seat: Seat): Promise<void> {
    if (!this.gameState || this.gameState.phase !== 'waiting') return;
    if (conn.seat !== 0) {
      this.sendToPlayer(conn.seat, { type: 'error', message: 'Only the game creator can remove bots' });
      return;
    }

    removeBot(this.gameState, seat);
    await this.saveState();
    this.broadcast({ type: 'player_left', seat });
  }

  private async handleAction(conn: PlayerConnection, action: GameAction): Promise<void> {
    if (!this.gameState || !this.gameState.hand) return;

    const seat = conn.seat;
    const currentTurn = getCurrentTurnSeat(this.gameState);

    if (currentTurn !== seat) {
      this.sendToPlayer(seat, { type: 'error', message: 'Not your turn' });
      return;
    }

    try {
      await this.processAction(seat, action);
    } catch (err: any) {
      this.sendToPlayer(seat, { type: 'error', message: err.message });
    }
  }

  // ============================================================
  // Action Processing
  // ============================================================

  private async processAction(seat: Seat, action: GameAction): Promise<void> {
    if (!this.gameState) return;

    const phase = this.gameState.phase;

    if (phase === 'trump_round1' || phase === 'trump_round2') {
      // Handle combined alone decision
      let goAlone = false;
      if (action.type === 'go_alone') {
        // go_alone is a modifier - need to also order_up or call_trump
        // Client should send the actual action; go_alone is tracked separately
        goAlone = true;
        // For simplicity, treat go_alone as order_up (round 1) or require a follow-up
        if (phase === 'trump_round1') {
          action = { type: 'order_up' };
        } else {
          this.sendToPlayer(seat, { type: 'error', message: 'Must specify a suit with go_alone' });
          return;
        }
      }

      const result = processTrumpAction(this.gameState, seat, action);
      this.gameState = result.state;

      // Handle alone after trump is called
      if (goAlone && this.gameState.hand?.trumpSuit && !this.gameState.noTrumpAlone) {
        this.gameState.hand.goingAlone = true;
        this.gameState.hand.aloneSeat = seat;
        this.gameState.hand.skippedSeat = partnerSeat(seat);
      }

      // Broadcast based on events
      for (const event of result.events) {
        if (event.startsWith('trump_passed:')) {
          const passedSeat = parseInt(event.split(':')[1]) as Seat;
          this.broadcast({ type: 'trump_passed', seat: passedSeat });
        } else if (event.startsWith('trump_called:')) {
          const parts = event.split(':');
          this.broadcast({
            type: 'trump_called',
            seat: parseInt(parts[1]) as Seat,
            suit: parts[2] as Suit,
            alone: this.gameState.hand?.goingAlone ?? false,
          });
        } else if (event.startsWith('dealer_discard:')) {
          const dealerSeat = parseInt(event.split(':')[1]) as Seat;
          this.broadcast({ type: 'dealer_discard', dealerSeat: dealerSeat as Seat });
        }
      }

    } else if (phase === 'discard') {
      if (!action.card) {
        throw new Error('Must specify a card to discard');
      }
      const result = processDiscard(this.gameState, seat, action.card);
      this.gameState = result.state;

    } else if (phase === 'playing') {
      if (!action.card) {
        throw new Error('Must specify a card to play');
      }
      const result = processPlayCard(this.gameState, seat, action.card);
      this.gameState = result.state;

      // Broadcast card played
      this.broadcast({ type: 'card_played', seat, card: action.card });

      // Process events
      for (const event of result.events) {
        if (event.startsWith('trick_won:')) {
          const parts = event.split(':');
          this.broadcast({
            type: 'trick_won',
            seat: parseInt(parts[1]) as Seat,
            team: parseInt(parts[2]) as 1 | 2,
          });
        } else if (event.startsWith('hand_result:')) {
          const lastResult = this.gameState.handHistory[this.gameState.handHistory.length - 1];
          this.broadcast({ type: 'hand_result', result: lastResult });
          this.broadcast({ type: 'score_update', scores: this.gameState.scores });
        } else if (event.startsWith('game_over:')) {
          const winningTeam = this.gameState.scores[0] >= this.gameState.pointsToWin ? 1 : 2;
          this.broadcast({
            type: 'game_over',
            winningTeam: winningTeam as 1 | 2,
            scores: this.gameState.scores,
          });
          await this.persistGameResult();
        }
      }
    }

    await this.saveState();

    // Handle hand-over -> next hand transition
    if (this.gameState.phase === 'hand_over') {
      // Brief pause before next hand (handled client-side, we advance immediately)
      this.gameState = advanceToNextHand(this.gameState);
      await this.saveState();
    }

    // Broadcast updated state and turn notifications
    this.broadcastGameState();
    this.broadcastTurnNotification();

    // Process bot turns
    await this.processBotTurns();
  }

  // ============================================================
  // Bot Turn Processing
  // ============================================================

  private async processBotTurns(): Promise<void> {
    if (!this.gameState) return;

    // Process bot turns in a loop (bots play immediately)
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    while (iterations < maxIterations) {
      iterations++;

      if (this.gameState.phase === 'game_over' || this.gameState.phase === 'waiting') {
        break;
      }

      // Handle hand-over -> next hand
      if (this.gameState.phase === 'hand_over') {
        this.gameState = advanceToNextHand(this.gameState);
        await this.saveState();
        this.broadcastGameState();
      }

      const currentTurn = getCurrentTurnSeat(this.gameState);
      if (currentTurn === null) break;

      const player = this.gameState.players[currentTurn];
      if (!player.isBot) break;

      const botAction = getBotAction(this.gameState, currentTurn);
      if (!botAction) break;

      // Small delay simulation for bot "thinking" (not actual delay on server)
      // The client can animate this

      await this.processAction(currentTurn, botAction);

      // Check if bot should go alone after calling trump
      if (this.gameState.hand?.trumpSuit &&
          this.gameState.hand.calledBySeat === currentTurn &&
          !this.gameState.hand.goingAlone &&
          shouldBotGoAlone(this.gameState, currentTurn)) {
        this.gameState.hand.goingAlone = true;
        this.gameState.hand.aloneSeat = currentTurn;
        this.gameState.hand.skippedSeat = partnerSeat(currentTurn);
        await this.saveState();
      }
    }
  }

  // ============================================================
  // Persistence to D1
  // ============================================================

  private async persistGameResult(): Promise<void> {
    if (!this.gameState || this.gameState.phase !== 'game_over') return;

    try {
      const winningTeam = this.gameState.scores[0] >= this.gameState.pointsToWin ? 1 : 2;

      await this.env.DB.prepare(
        `UPDATE games SET status = 'completed', team1_score = ?, team2_score = ?, winning_team = ?, completed_at = datetime('now') WHERE id = ?`,
      ).bind(this.gameState.scores[0], this.gameState.scores[1], winningTeam, this.gameState.gameId).run();

      // Update player stats
      for (const player of this.gameState.players) {
        if (player.playerId && !player.isBot) {
          const won = (winningTeam === 1 && (player.seat === 0 || player.seat === 2)) ||
                      (winningTeam === 2 && (player.seat === 1 || player.seat === 3));

          await this.env.DB.prepare(
            `UPDATE players SET games_played = games_played + 1, games_won = games_won + ? WHERE id = ?`,
          ).bind(won ? 1 : 0, player.playerId).run();
        }
      }

      // Persist hand history
      for (const hand of this.gameState.handHistory) {
        await this.env.DB.prepare(
          `INSERT INTO game_hands (game_id, hand_number, dealer_seat, trump_suit, called_by_seat, went_alone, tricks_team1, tricks_team2, points_awarded, points_to_team)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          this.gameState.gameId, hand.handNumber, hand.dealerSeat, hand.trumpSuit,
          hand.calledBySeat, hand.wentAlone ? 1 : 0, hand.tricksTeam1, hand.tricksTeam2,
          hand.pointsAwarded, hand.pointsToTeam,
        ).run();
      }
    } catch (err) {
      console.error('Failed to persist game result:', err);
    }
  }

  // ============================================================
  // Broadcasting
  // ============================================================

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      try {
        conn.ws.send(data);
      } catch {
        // Connection may be closed
      }
    }
  }

  private sendToPlayer(seat: Seat, msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      if (conn.seat === seat) {
        try {
          conn.ws.send(data);
        } catch {
          // Connection may be closed
        }
      }
    }
  }

  private sendToWs(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Connection may be closed
    }
  }

  private broadcastGameState(): void {
    if (!this.gameState) return;

    for (const conn of this.connections.values()) {
      this.sendToPlayer(conn.seat, {
        type: 'game_state',
        state: buildClientState(this.gameState, conn.seat),
      });
    }
  }

  private broadcastTurnNotification(): void {
    if (!this.gameState) return;

    const currentTurn = getCurrentTurnSeat(this.gameState);
    if (currentTurn === null) return;

    const player = this.gameState.players[currentTurn];
    if (player.isBot) return; // Don't notify bots

    const validActions = getValidActions(this.gameState, currentTurn);
    this.sendToPlayer(currentTurn, {
      type: 'your_turn',
      validActions: validActions.actions,
      validCards: validActions.validCards,
    });
  }

  private findConnection(ws: WebSocket): PlayerConnection | undefined {
    for (const conn of this.connections.values()) {
      if (conn.ws === ws) return conn;
    }
    return undefined;
  }
}
