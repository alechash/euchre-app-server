import {
  Card, Suit, Seat, Team, GamePhase, GameState, HandState, Trick,
  PlayerSlot, HandResult, GameAction, TrumpCallState, BotDifficulty,
  ClientGameState,
} from '../types';
import { createDeck, deal, effectiveSuit, trickWinner, cardsEqual, getLegalPlays } from './deck';
import { seatToTeam, partnerSeat, nextSeat, calculateHandPoints } from './scoring';

/** Generate a 6-character alphanumeric invite code. */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Generate a UUID-like ID. */
export function generateId(): string {
  const hex = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map(len => {
      let s = '';
      for (let i = 0; i < len; i++) s += hex[Math.floor(Math.random() * 16)];
      return s;
    })
    .join('-');
}

/** Create a fresh game state. */
export function createGameState(
  gameId: string,
  creatorId: string,
  creatorName: string,
  options: { pointsToWin?: number; stickTheDealer?: boolean; noTrumpAlone?: boolean } = {},
): GameState {
  const inviteCode = generateInviteCode();

  const players: PlayerSlot[] = [
    { seat: 0, playerId: creatorId, displayName: creatorName, isBot: false, botDifficulty: 'medium', connected: true },
    { seat: 1, playerId: null, displayName: 'Empty', isBot: false, botDifficulty: 'medium', connected: false },
    { seat: 2, playerId: null, displayName: 'Empty', isBot: false, botDifficulty: 'medium', connected: false },
    { seat: 3, playerId: null, displayName: 'Empty', isBot: false, botDifficulty: 'medium', connected: false },
  ];

  return {
    gameId,
    inviteCode,
    phase: 'waiting',
    players,
    scores: [0, 0],
    pointsToWin: options.pointsToWin ?? 10,
    stickTheDealer: options.stickTheDealer ?? false,
    noTrumpAlone: options.noTrumpAlone ?? false,
    hand: null,
    trumpCall: null,
    handHistory: [],
  };
}

/** Add a bot to an empty seat. */
export function addBot(state: GameState, seat: Seat, difficulty: BotDifficulty = 'medium'): GameState {
  const player = state.players[seat];
  if (player.playerId !== null || player.isBot) {
    throw new Error(`Seat ${seat} is already occupied`);
  }

  const botNames = ['Bot Alice', 'Bot Bob', 'Bot Carol', 'Bot Dave'];
  state.players[seat] = {
    seat,
    playerId: null,
    displayName: botNames[seat],
    isBot: true,
    botDifficulty: difficulty,
    connected: true,
  };
  return state;
}

/** Remove a bot from a seat. */
export function removeBot(state: GameState, seat: Seat): GameState {
  const player = state.players[seat];
  if (!player.isBot) {
    throw new Error(`Seat ${seat} is not a bot`);
  }

  state.players[seat] = {
    seat,
    playerId: null,
    displayName: 'Empty',
    isBot: false,
    botDifficulty: 'medium',
    connected: false,
  };
  return state;
}

/** Add a human player to a seat. */
export function addPlayer(state: GameState, playerId: string, displayName: string, preferredSeat?: Seat): Seat {
  // Check if player is already in the game
  const existing = state.players.find(p => p.playerId === playerId);
  if (existing) return existing.seat;

  let seat: Seat | null = null;

  if (preferredSeat !== undefined) {
    const slot = state.players[preferredSeat];
    if (slot.playerId === null && !slot.isBot) {
      seat = preferredSeat;
    }
  }

  if (seat === null) {
    // Find first empty non-bot seat
    for (let i = 0; i < 4; i++) {
      const s = i as Seat;
      if (state.players[s].playerId === null && !state.players[s].isBot) {
        seat = s;
        break;
      }
    }
  }

  if (seat === null) {
    throw new Error('No available seats');
  }

  state.players[seat] = {
    seat,
    playerId,
    displayName,
    isBot: false,
    botDifficulty: 'medium',
    connected: true,
  };

  return seat;
}

/** Remove a human player from the game. */
export function removePlayer(state: GameState, playerId: string): Seat | null {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) return null;

  const seat = player.seat;
  state.players[seat] = {
    seat,
    playerId: null,
    displayName: 'Empty',
    isBot: false,
    botDifficulty: 'medium',
    connected: false,
  };
  return seat;
}

/** Check if all seats are filled (by humans or bots). */
export function allSeatsFilled(state: GameState): boolean {
  return state.players.every(p => p.playerId !== null || p.isBot);
}

/** Start a new game (first hand). */
export function startGame(state: GameState): GameState {
  if (!allSeatsFilled(state)) {
    throw new Error('All seats must be filled before starting');
  }
  if (state.phase !== 'waiting') {
    throw new Error('Game already started');
  }

  // Random first dealer
  const firstDealer = Math.floor(Math.random() * 4) as Seat;
  return startNewHand(state, firstDealer);
}

/** Start a new hand with the given dealer. */
export function startNewHand(state: GameState, dealerSeat: Seat): GameState {
  const deck = createDeck();
  const { hands, kitty } = deal(deck);

  const handNumber = state.handHistory.length + 1;
  const flippedCard = kitty[0]; // Top of kitty is flipped up

  state.phase = 'trump_round1';
  state.hand = {
    handNumber,
    dealerSeat,
    trumpSuit: null,
    calledBySeat: null,
    goingAlone: false,
    aloneSeat: null,
    skippedSeat: null,
    playerHands: new Map([
      [0 as Seat, hands[0]],
      [1 as Seat, hands[1]],
      [2 as Seat, hands[2]],
      [3 as Seat, hands[3]],
    ]),
    kitty,
    flippedCard,
    currentTrick: { leadSeat: 0 as Seat, cards: [], winningSeat: null },
    completedTricks: [],
    tricksWon: [0, 0],
  };

  // Trump calling starts left of dealer
  const firstCaller = nextSeat(dealerSeat);
  state.trumpCall = {
    round: 1,
    currentSeat: firstCaller,
    flippedCard,
    passedSeats: [],
  };

  return state;
}

/** Process a trump call action (pass, order_up, call_trump). */
export function processTrumpAction(
  state: GameState,
  seat: Seat,
  action: GameAction,
): { state: GameState; events: string[] } {
  const events: string[] = [];

  if (!state.hand || !state.trumpCall) {
    throw new Error('Not in trump calling phase');
  }
  if (state.trumpCall.currentSeat !== seat) {
    throw new Error(`Not seat ${seat}'s turn to call trump`);
  }

  const { hand, trumpCall } = state;
  const dealerSeat = hand.dealerSeat;

  if (action.type === 'pass') {
    trumpCall.passedSeats.push(seat);
    events.push(`trump_passed:${seat}`);

    if (trumpCall.round === 1) {
      if (trumpCall.passedSeats.length === 4) {
        // Everyone passed round 1, go to round 2
        trumpCall.round = 2;
        trumpCall.passedSeats = [];
        trumpCall.currentSeat = nextSeat(dealerSeat);
        state.phase = 'trump_round2';
        events.push('trump_round2_start');
      } else {
        trumpCall.currentSeat = nextSeat(seat);
      }
    } else {
      // Round 2
      if (state.stickTheDealer && seat === dealerSeat) {
        throw new Error('Dealer must call trump (stick the dealer)');
      }

      if (trumpCall.passedSeats.length === 3 && nextSeat(seat) === dealerSeat) {
        // If stick the dealer is off and dealer passes too, re-deal
        // Actually we check when dealer would be next
      }

      if (trumpCall.passedSeats.length === 4) {
        // Everyone passed round 2 (only if stick-the-dealer is off) => re-deal
        events.push('misdeal');
        const newDealer = nextSeat(dealerSeat);
        return { state: startNewHand(state, newDealer), events };
      } else {
        trumpCall.currentSeat = nextSeat(seat);
      }
    }
  } else if (action.type === 'order_up') {
    // Round 1 only: order up the flipped card
    if (trumpCall.round !== 1) {
      throw new Error('Can only order up in round 1');
    }

    hand.trumpSuit = trumpCall.flippedCard.suit;
    hand.calledBySeat = seat;
    events.push(`trump_called:${seat}:${hand.trumpSuit}`);

    // Dealer picks up the flipped card and must discard
    const dealerHand = hand.playerHands.get(dealerSeat)!;
    dealerHand.push(trumpCall.flippedCard);
    // Remove flipped card from kitty display
    hand.flippedCard = null;

    state.trumpCall = null;
    state.phase = 'discard'; // Dealer needs to discard
    events.push(`dealer_discard:${dealerSeat}`);
  } else if (action.type === 'call_trump') {
    // Round 2 only: call a suit (cannot be the turned-down suit)
    if (trumpCall.round !== 2) {
      throw new Error('Can only call trump in round 2');
    }
    if (!action.suit) {
      throw new Error('Must specify a suit');
    }
    if (action.suit === trumpCall.flippedCard.suit) {
      throw new Error('Cannot call the turned-down suit');
    }

    hand.trumpSuit = action.suit;
    hand.calledBySeat = seat;
    state.trumpCall = null;
    events.push(`trump_called:${seat}:${hand.trumpSuit}`);

    // No discard in round 2, go straight to play (or alone decision is part of the call)
    state.phase = 'playing';
    setupFirstTrick(state);
    events.push('play_start');
  } else if (action.type === 'go_alone') {
    // Can be combined with ordering up or calling
    hand.goingAlone = true;
    hand.aloneSeat = seat;
    hand.skippedSeat = partnerSeat(seat);
    events.push(`going_alone:${seat}`);
  } else if (action.type === 'play_with_partner') {
    hand.goingAlone = false;
    hand.aloneSeat = null;
    hand.skippedSeat = null;
    events.push(`playing_with_partner:${seat}`);
  }

  return { state, events };
}

/**
 * Process the alone decision along with a trump call.
 * Returns whether we should proceed to alone decision.
 */
export function processTrumpCallWithAlone(
  state: GameState,
  seat: Seat,
  action: GameAction,
  goAlone: boolean,
): { state: GameState; events: string[] } {
  const result = processTrumpAction(state, seat, action);

  if (goAlone && state.hand && state.hand.trumpSuit && !state.noTrumpAlone) {
    state.hand.goingAlone = true;
    state.hand.aloneSeat = seat;
    state.hand.skippedSeat = partnerSeat(seat);
    result.events.push(`going_alone:${seat}`);
  }

  // If we just called trump and need to move to playing
  if (state.hand?.trumpSuit && state.phase === 'playing') {
    setupFirstTrick(state);
  }

  return result;
}

/** Process dealer discard after picking up the flipped card. */
export function processDiscard(state: GameState, seat: Seat, card: Card): { state: GameState; events: string[] } {
  const events: string[] = [];

  if (!state.hand || state.phase !== 'discard') {
    throw new Error('Not in discard phase');
  }
  if (seat !== state.hand.dealerSeat) {
    throw new Error('Only the dealer can discard');
  }

  const dealerHand = state.hand.playerHands.get(seat)!;
  const cardIndex = dealerHand.findIndex(c => cardsEqual(c, card));
  if (cardIndex === -1) {
    throw new Error('Card not in hand');
  }

  // Remove the discarded card
  dealerHand.splice(cardIndex, 1);
  events.push(`discarded:${seat}`);

  // Move to playing phase
  state.phase = 'playing';
  setupFirstTrick(state);
  events.push('play_start');

  return { state, events };
}

/** Set up the first trick of a hand. */
function setupFirstTrick(state: GameState): void {
  if (!state.hand) return;

  // Lead goes to player left of dealer
  let leadSeat = nextSeat(state.hand.dealerSeat);

  // Skip the alone player's partner
  if (state.hand.skippedSeat !== null && leadSeat === state.hand.skippedSeat) {
    leadSeat = nextSeat(leadSeat);
  }

  state.hand.currentTrick = {
    leadSeat: leadSeat,
    cards: [],
    winningSeat: null,
  };
}

/** Get the next seat to play in the current trick, skipping the loner's partner. */
export function getNextTrickSeat(state: GameState): Seat | null {
  if (!state.hand) return null;

  const trick = state.hand.currentTrick;
  const expectedCards = state.hand.goingAlone ? 3 : 4;

  if (trick.cards.length >= expectedCards) {
    return null; // Trick is complete
  }

  if (trick.cards.length === 0) {
    return trick.leadSeat;
  }

  let nextS = nextSeat(trick.cards[trick.cards.length - 1].seat);
  // Skip alone partner
  if (state.hand.skippedSeat !== null && nextS === state.hand.skippedSeat) {
    nextS = nextSeat(nextS);
  }
  return nextS;
}

/** Process playing a card in a trick. */
export function processPlayCard(
  state: GameState,
  seat: Seat,
  card: Card,
): { state: GameState; events: string[] } {
  const events: string[] = [];

  if (!state.hand || state.phase !== 'playing') {
    throw new Error('Not in playing phase');
  }

  const expectedSeat = getNextTrickSeat(state);
  if (expectedSeat !== seat) {
    throw new Error(`Not seat ${seat}'s turn, expected seat ${expectedSeat}`);
  }

  const hand = state.hand.playerHands.get(seat)!;
  const trick = state.hand.currentTrick;

  // Determine led suit
  const ledSuit = trick.cards.length > 0
    ? effectiveSuit(trick.cards[0].card, state.hand.trumpSuit!)
    : null;

  // Validate the play
  const legalPlays = getLegalPlays(hand, ledSuit, state.hand.trumpSuit!);
  if (!legalPlays.some(c => cardsEqual(c, card))) {
    throw new Error('Illegal play: must follow suit if possible');
  }

  // Remove card from hand
  const cardIndex = hand.findIndex(c => cardsEqual(c, card));
  hand.splice(cardIndex, 1);

  // Add to trick
  trick.cards.push({ seat, card });
  events.push(`card_played:${seat}:${card.suit}:${card.rank}`);

  // Check if trick is complete
  const expectedCards = state.hand.goingAlone ? 3 : 4;
  if (trick.cards.length >= expectedCards) {
    // Determine trick winner
    const winnerSeat = trickWinner(trick.cards, state.hand.trumpSuit!) as Seat;
    trick.winningSeat = winnerSeat;
    const winnerTeam = seatToTeam(winnerSeat);

    if (winnerTeam === 1) {
      state.hand.tricksWon[0]++;
    } else {
      state.hand.tricksWon[1]++;
    }

    events.push(`trick_won:${winnerSeat}:${winnerTeam}`);

    // Move trick to completed
    state.hand.completedTricks.push({ ...trick });

    // Check if hand is over (5 tricks played)
    if (state.hand.completedTricks.length >= 5) {
      return finishHand(state, events);
    }

    // Start next trick - winner leads
    let nextLead = winnerSeat;
    if (state.hand.skippedSeat !== null && nextLead === state.hand.skippedSeat) {
      nextLead = nextSeat(nextLead);
    }

    state.hand.currentTrick = {
      leadSeat: nextLead,
      cards: [],
      winningSeat: null,
    };
  }

  return { state, events };
}

/** Finish a hand and calculate scoring. */
function finishHand(state: GameState, events: string[]): { state: GameState; events: string[] } {
  if (!state.hand) throw new Error('No hand in progress');

  const callingTeam = seatToTeam(state.hand.calledBySeat!);
  const { points, awardedTo } = calculateHandPoints(
    state.hand.tricksWon[0],
    state.hand.tricksWon[1],
    callingTeam,
    state.hand.goingAlone,
  );

  // Update scores
  if (awardedTo === 1) {
    state.scores[0] += points;
  } else {
    state.scores[1] += points;
  }

  const handResult: HandResult = {
    handNumber: state.hand.handNumber,
    dealerSeat: state.hand.dealerSeat,
    trumpSuit: state.hand.trumpSuit!,
    calledBySeat: state.hand.calledBySeat!,
    wentAlone: state.hand.goingAlone,
    tricksTeam1: state.hand.tricksWon[0],
    tricksTeam2: state.hand.tricksWon[1],
    pointsAwarded: points,
    pointsToTeam: awardedTo,
  };
  state.handHistory.push(handResult);

  events.push(`hand_result:${points}:team${awardedTo}`);
  events.push(`score_update:${state.scores[0]}:${state.scores[1]}`);

  state.phase = 'hand_over';

  // Check if game is over
  if (state.scores[0] >= state.pointsToWin || state.scores[1] >= state.pointsToWin) {
    state.phase = 'game_over';
    const winningTeam: Team = state.scores[0] >= state.pointsToWin ? 1 : 2;
    events.push(`game_over:team${winningTeam}`);
  }

  return { state, events };
}

/** Advance to the next hand after hand_over. */
export function advanceToNextHand(state: GameState): GameState {
  if (state.phase !== 'hand_over') {
    throw new Error('Can only advance after hand is over');
  }

  const lastDealer = state.hand!.dealerSeat;
  const nextDealer = nextSeat(lastDealer);
  return startNewHand(state, nextDealer);
}

/** Get the seat whose turn it is (for trump calling or playing). */
export function getCurrentTurnSeat(state: GameState): Seat | null {
  if (state.phase === 'trump_round1' || state.phase === 'trump_round2') {
    return state.trumpCall?.currentSeat ?? null;
  }
  if (state.phase === 'discard') {
    return state.hand?.dealerSeat ?? null;
  }
  if (state.phase === 'playing') {
    return getNextTrickSeat(state);
  }
  return null;
}

/** Get valid actions for a given seat. */
export function getValidActions(state: GameState, seat: Seat): { actions: GameAction['type'][]; validCards?: Card[] } {
  const currentTurn = getCurrentTurnSeat(state);
  if (currentTurn !== seat) {
    return { actions: [] };
  }

  if (state.phase === 'trump_round1') {
    const actions: GameAction['type'][] = ['pass', 'order_up'];
    if (!state.noTrumpAlone) {
      actions.push('go_alone');
    }
    return { actions };
  }

  if (state.phase === 'trump_round2') {
    const isDealer = seat === state.hand?.dealerSeat;
    const actions: GameAction['type'][] = [];

    if (!isDealer || !state.stickTheDealer) {
      actions.push('pass');
    }
    actions.push('call_trump');
    if (!state.noTrumpAlone) {
      actions.push('go_alone');
    }
    return { actions };
  }

  if (state.phase === 'discard') {
    const dealerHand = state.hand?.playerHands.get(seat);
    return {
      actions: ['discard'],
      validCards: dealerHand ? [...dealerHand] : [],
    };
  }

  if (state.phase === 'playing') {
    const hand = state.hand?.playerHands.get(seat);
    if (!hand || !state.hand?.trumpSuit) return { actions: [] };

    const trick = state.hand.currentTrick;
    const ledSuit = trick.cards.length > 0
      ? effectiveSuit(trick.cards[0].card, state.hand.trumpSuit)
      : null;

    const legalPlays = getLegalPlays(hand, ledSuit, state.hand.trumpSuit);
    return {
      actions: ['play_card'],
      validCards: legalPlays,
    };
  }

  return { actions: [] };
}

/** Build a client-visible game state (hides other players' cards). */
export function buildClientState(state: GameState, forSeat: Seat): ClientGameState {
  return {
    gameId: state.gameId,
    inviteCode: state.inviteCode,
    phase: state.phase,
    players: state.players,
    scores: state.scores,
    pointsToWin: state.pointsToWin,
    stickTheDealer: state.stickTheDealer,
    noTrumpAlone: state.noTrumpAlone,
    hand: state.hand ? {
      handNumber: state.hand.handNumber,
      dealerSeat: state.hand.dealerSeat,
      trumpSuit: state.hand.trumpSuit,
      calledBySeat: state.hand.calledBySeat,
      goingAlone: state.hand.goingAlone,
      aloneSeat: state.hand.aloneSeat,
      yourCards: state.hand.playerHands.get(forSeat) ?? [],
      flippedCard: state.hand.flippedCard,
      currentTrick: state.hand.currentTrick,
      completedTricks: state.hand.completedTricks,
      tricksWon: state.hand.tricksWon,
      currentTurnSeat: getCurrentTurnSeat(state),
    } : null,
    handHistory: state.handHistory,
  };
}

// ============================================================
// Serialization: GameState uses Map which doesn't JSON.stringify
// ============================================================

export interface SerializedGameState {
  gameId: string;
  inviteCode: string;
  phase: GamePhase;
  players: PlayerSlot[];
  scores: [number, number];
  pointsToWin: number;
  stickTheDealer: boolean;
  noTrumpAlone: boolean;
  hand: (Omit<HandState, 'playerHands'> & { playerHands: [Seat, Card[]][] }) | null;
  trumpCall: TrumpCallState | null;
  handHistory: HandResult[];
}

export function serializeGameState(state: GameState): SerializedGameState {
  return {
    ...state,
    hand: state.hand ? {
      ...state.hand,
      playerHands: Array.from(state.hand.playerHands.entries()),
    } : null,
  };
}

export function deserializeGameState(data: SerializedGameState): GameState {
  return {
    ...data,
    hand: data.hand ? {
      ...data.hand,
      playerHands: new Map(data.hand.playerHands),
    } : null,
  };
}
