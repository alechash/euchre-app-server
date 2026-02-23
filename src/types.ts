// ============================================================
// Core Types for Euchre Game Server
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Seat = 0 | 1 | 2 | 3; // 0=south, 1=west, 2=north, 3=east

export type Team = 1 | 2; // Seats 0,2 = Team 1; Seats 1,3 = Team 2

export type GamePhase =
  | 'waiting'       // Lobby, waiting for players
  | 'dealing'       // Cards being dealt
  | 'trump_round1'  // Flipped card: pass or order up
  | 'trump_round2'  // Pick a suit (dealer can be stuck)
  | 'discard'       // Dealer discards after picking up
  | 'playing'       // Trick-taking
  | 'hand_over'     // Hand finished, scoring
  | 'game_over';    // Game finished

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface PlayerSlot {
  seat: Seat;
  playerId: string | null; // null for bots
  displayName: string;
  isBot: boolean;
  botDifficulty: BotDifficulty;
  connected: boolean;
}

export interface TrumpCallState {
  round: 1 | 2;
  currentSeat: Seat;
  flippedCard: Card;
  passedSeats: Seat[];
}

export interface Trick {
  leadSeat: Seat;
  cards: { seat: Seat; card: Card }[];
  winningSeat: Seat | null;
}

export interface HandState {
  handNumber: number;
  dealerSeat: Seat;
  trumpSuit: Suit | null;
  calledBySeat: Seat | null;
  goingAlone: boolean;
  aloneSeat: Seat | null;
  skippedSeat: Seat | null; // partner of alone player
  playerHands: Map<Seat, Card[]>;
  kitty: Card[];          // remaining 4 cards after deal
  flippedCard: Card | null;
  currentTrick: Trick;
  completedTricks: Trick[];
  tricksWon: [number, number]; // [team1, team2]
}

export interface GameState {
  gameId: string;
  inviteCode: string;
  phase: GamePhase;
  players: PlayerSlot[];
  scores: [number, number]; // [team1, team2]
  pointsToWin: number;
  stickTheDealer: boolean;
  noTrumpAlone: boolean;
  hand: HandState | null;
  trumpCall: TrumpCallState | null;
  handHistory: HandResult[];
}

export interface HandResult {
  handNumber: number;
  dealerSeat: Seat;
  trumpSuit: Suit;
  calledBySeat: Seat;
  wentAlone: boolean;
  tricksTeam1: number;
  tricksTeam2: number;
  pointsAwarded: number;
  pointsToTeam: Team;
}

// ---------- API Types ----------

export interface CreateGameRequest {
  pointsToWin?: number;       // default 10
  stickTheDealer?: boolean;   // default false
  noTrumpAlone?: boolean;     // default false
}

export interface JoinGameRequest {
  inviteCode: string;
  preferredSeat?: Seat;
}

export interface GameAction {
  type: 'pass' | 'order_up' | 'call_trump' | 'play_card' | 'discard' | 'go_alone' | 'play_with_partner';
  card?: Card;
  suit?: Suit;
}

// ---------- WebSocket Message Types ----------

export type ServerMessage =
  | { type: 'game_state'; state: ClientGameState }
  | { type: 'player_joined'; seat: Seat; displayName: string; isBot: boolean }
  | { type: 'player_left'; seat: Seat }
  | { type: 'hand_dealt'; yourCards: Card[]; dealerSeat: Seat; flippedCard: Card }
  | { type: 'trump_round'; round: 1 | 2; currentSeat: Seat; flippedCard: Card }
  | { type: 'trump_called'; seat: Seat; suit: Suit; alone: boolean }
  | { type: 'trump_passed'; seat: Seat }
  | { type: 'dealer_discard'; dealerSeat: Seat }
  | { type: 'card_played'; seat: Seat; card: Card }
  | { type: 'trick_won'; seat: Seat; team: Team }
  | { type: 'hand_result'; result: HandResult }
  | { type: 'score_update'; scores: [number, number] }
  | { type: 'game_over'; winningTeam: Team; scores: [number, number] }
  | { type: 'your_turn'; validActions: GameAction['type'][]; validCards?: Card[] }
  | { type: 'error'; message: string }
  | { type: 'chat'; seat: Seat; displayName: string; message: string };

export type ClientMessage =
  | { type: 'action'; action: GameAction }
  | { type: 'start_game' }
  | { type: 'add_bot'; seat: Seat; difficulty?: BotDifficulty }
  | { type: 'remove_bot'; seat: Seat }
  | { type: 'chat'; message: string };

// Client-visible game state (hides other players' cards)
export interface ClientGameState {
  gameId: string;
  inviteCode: string;
  phase: GamePhase;
  players: PlayerSlot[];
  scores: [number, number];
  pointsToWin: number;
  stickTheDealer: boolean;
  noTrumpAlone: boolean;
  hand: {
    handNumber: number;
    dealerSeat: Seat;
    trumpSuit: Suit | null;
    calledBySeat: Seat | null;
    goingAlone: boolean;
    aloneSeat: Seat | null;
    yourCards: Card[];
    flippedCard: Card | null;
    currentTrick: Trick;
    completedTricks: Trick[];
    tricksWon: [number, number];
    currentTurnSeat: Seat | null;
  } | null;
  handHistory: HandResult[];
}

// ---------- DB Row Types ----------

export interface PlayerRow {
  id: string;
  display_name: string;
  auth_token: string;
  created_at: string;
  games_played: number;
  games_won: number;
}

export interface GameRow {
  id: string;
  invite_code: string | null;
  status: string;
  created_by: string;
  team1_score: number;
  team2_score: number;
  winning_team: number | null;
  config_points_to_win: number;
  config_stick_the_dealer: number;
  config_no_trump_alone: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface GamePlayerRow {
  game_id: string;
  seat: number;
  player_id: string | null;
  is_bot: number;
  bot_difficulty: string;
}

// ---------- Env Bindings ----------

export interface Env {
  DB: D1Database;
  GAME_ROOM: DurableObjectNamespace;
}

/** Hono app environment with bindings and context variables. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    player: PlayerRow;
  };
};
