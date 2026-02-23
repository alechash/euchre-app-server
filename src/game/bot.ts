import {
  Card, Suit, Seat, GameState, GameAction, BotDifficulty,
} from '../types';
import {
  effectiveSuit, cardStrength, getLegalPlays, sameColorSuit,
} from './deck';
import { seatToTeam, partnerSeat } from './scoring';
import { getCurrentTurnSeat } from './engine';

/**
 * Bot AI for Euchre.
 *
 * Difficulty levels:
 *  - easy:   Random legal play, calls trump loosely
 *  - medium: Basic heuristics (lead strong, follow with low off-suit)
 *  - hard:   Counts cards, considers partner, strategic trump calls
 */
export function getBotAction(state: GameState, seat: Seat): GameAction | null {
  const phase = state.phase;
  const currentTurn = getCurrentTurnSeat(state);
  if (currentTurn !== seat) return null;

  const player = state.players[seat];
  if (!player.isBot) return null;

  const difficulty = player.botDifficulty;

  if (phase === 'trump_round1') {
    return botTrumpRound1(state, seat, difficulty);
  }
  if (phase === 'trump_round2') {
    return botTrumpRound2(state, seat, difficulty);
  }
  if (phase === 'discard') {
    return botDiscard(state, seat, difficulty);
  }
  if (phase === 'playing') {
    return botPlay(state, seat, difficulty);
  }

  return null;
}

// ============================================================
// Trump Calling
// ============================================================

function countSuit(hand: Card[], suit: Suit, trumpSuit?: Suit): number {
  if (trumpSuit) {
    return hand.filter(c => effectiveSuit(c, trumpSuit) === suit).length;
  }
  // Pre-trump: count natural suits but include left bower potential
  return hand.filter(c => c.suit === suit).length;
}

function countTrumpStrength(hand: Card[], trumpSuit: Suit): number {
  let strength = 0;
  for (const card of hand) {
    const eSuit = effectiveSuit(card, trumpSuit);
    if (eSuit === trumpSuit) {
      strength++;
      // Bonus for high trump
      if (card.rank === 'J' && card.suit === trumpSuit) strength += 2;       // right bower
      else if (card.rank === 'J' && card.suit === sameColorSuit(trumpSuit)) strength += 1.5; // left bower
      else if (card.rank === 'A') strength += 1;
      else if (card.rank === 'K') strength += 0.5;
    } else if (card.rank === 'A') {
      strength += 0.5; // off-ace is good
    }
  }
  return strength;
}

function botTrumpRound1(state: GameState, seat: Seat, difficulty: BotDifficulty): GameAction {
  const hand = state.hand!.playerHands.get(seat)!;
  const flippedSuit = state.trumpCall!.flippedCard.suit;
  const isDealer = seat === state.hand!.dealerSeat;
  const isPartnerDealing = partnerSeat(seat) === state.hand!.dealerSeat;

  const trumpStrength = countTrumpStrength(hand, flippedSuit);

  let threshold: number;
  switch (difficulty) {
    case 'easy': threshold = 4; break;
    case 'medium': threshold = 3; break;
    case 'hard': threshold = 2.5; break;
  }

  // Lower threshold if partner is dealer (they pick it up)
  if (isPartnerDealing) threshold -= 0.5;
  // Lower threshold if we're dealer (we get the card)
  if (isDealer) threshold -= 1;

  if (trumpStrength >= threshold) {
    // Consider going alone with very strong hand
    const aloneThreshold = difficulty === 'hard' ? 6 : 7;
    if (trumpStrength >= aloneThreshold && !state.noTrumpAlone) {
      return { type: 'order_up' };
      // The alone decision will be handled separately
    }
    return { type: 'order_up' };
  }

  return { type: 'pass' };
}

function botTrumpRound2(state: GameState, seat: Seat, difficulty: BotDifficulty): GameAction {
  const hand = state.hand!.playerHands.get(seat)!;
  const turnedDownSuit = state.trumpCall!.flippedCard.suit;
  const isDealer = seat === state.hand!.dealerSeat;
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

  let bestSuit: Suit | null = null;
  let bestStrength = 0;

  for (const suit of suits) {
    if (suit === turnedDownSuit) continue; // Can't call turned-down suit

    const strength = countTrumpStrength(hand, suit);
    if (strength > bestStrength) {
      bestStrength = strength;
      bestSuit = suit;
    }
  }

  let threshold: number;
  switch (difficulty) {
    case 'easy': threshold = 3.5; break;
    case 'medium': threshold = 2.5; break;
    case 'hard': threshold = 2; break;
  }

  // Stick the dealer: must call
  if (isDealer && state.stickTheDealer) {
    if (bestSuit) {
      return { type: 'call_trump', suit: bestSuit };
    }
    // Pick next best suit
    const fallback = suits.find(s => s !== turnedDownSuit)!;
    return { type: 'call_trump', suit: fallback };
  }

  if (bestSuit && bestStrength >= threshold) {
    return { type: 'call_trump', suit: bestSuit };
  }

  return { type: 'pass' };
}

/** Should the bot go alone? Call this after trump is called. */
export function shouldBotGoAlone(state: GameState, seat: Seat): boolean {
  if (state.noTrumpAlone) return false;

  const hand = state.hand!.playerHands.get(seat)!;
  const trumpSuit = state.hand!.trumpSuit!;
  const difficulty = state.players[seat].botDifficulty;

  const strength = countTrumpStrength(hand, trumpSuit);
  const threshold = difficulty === 'hard' ? 5.5 : difficulty === 'medium' ? 6.5 : 8;

  return strength >= threshold;
}

// ============================================================
// Discard
// ============================================================

function botDiscard(state: GameState, seat: Seat, difficulty: BotDifficulty): GameAction {
  const hand = state.hand!.playerHands.get(seat)!;
  const trumpSuit = state.hand!.trumpSuit!;

  if (difficulty === 'easy') {
    // Discard random non-trump, or weakest card
    const nonTrump = hand.filter(c => effectiveSuit(c, trumpSuit) !== trumpSuit);
    if (nonTrump.length > 0) {
      return { type: 'discard', card: nonTrump[0] };
    }
    return { type: 'discard', card: hand[0] };
  }

  // Medium/Hard: discard weakest card
  let weakest = hand[0];
  let weakestStr = cardStrength(hand[0], trumpSuit, trumpSuit);

  for (let i = 1; i < hand.length; i++) {
    // Evaluate with a dummy led suit to get relative strength
    const str = cardStrength(hand[i], trumpSuit, trumpSuit);
    if (str < weakestStr) {
      weakestStr = str;
      weakest = hand[i];
    }
  }

  return { type: 'discard', card: weakest };
}

// ============================================================
// Card Play
// ============================================================

function botPlay(state: GameState, seat: Seat, difficulty: BotDifficulty): GameAction {
  const hand = state.hand!.playerHands.get(seat)!;
  const trumpSuit = state.hand!.trumpSuit!;
  const trick = state.hand!.currentTrick;
  const isLeading = trick.cards.length === 0;
  const ledSuit = !isLeading
    ? effectiveSuit(trick.cards[0].card, trumpSuit)
    : null;

  const legalPlays = getLegalPlays(hand, ledSuit, trumpSuit);

  if (legalPlays.length === 1) {
    return { type: 'play_card', card: legalPlays[0] };
  }

  if (difficulty === 'easy') {
    return botPlayEasy(legalPlays);
  }

  if (isLeading) {
    return botPlayLead(legalPlays, trumpSuit, difficulty, state, seat);
  }

  return botPlayFollow(legalPlays, trumpSuit, ledSuit!, trick, difficulty, state, seat);
}

function botPlayEasy(legalPlays: Card[]): GameAction {
  const idx = Math.floor(Math.random() * legalPlays.length);
  return { type: 'play_card', card: legalPlays[idx] };
}

function botPlayLead(
  legalPlays: Card[],
  trumpSuit: Suit,
  difficulty: BotDifficulty,
  state: GameState,
  seat: Seat,
): GameAction {
  // Strategy: lead off-aces, then strong trump to pull trump
  const offAces = legalPlays.filter(
    c => c.rank === 'A' && effectiveSuit(c, trumpSuit) !== trumpSuit,
  );
  if (offAces.length > 0) {
    return { type: 'play_card', card: offAces[0] };
  }

  // If we have many trump, lead with one to pull out opponents' trump
  const trumpCards = legalPlays.filter(c => effectiveSuit(c, trumpSuit) === trumpSuit);
  const nonTrump = legalPlays.filter(c => effectiveSuit(c, trumpSuit) !== trumpSuit);

  if (difficulty === 'hard' && trumpCards.length >= 2) {
    // Lead strongest trump
    const sorted = trumpCards.sort(
      (a, b) => cardStrength(b, trumpSuit, trumpSuit) - cardStrength(a, trumpSuit, trumpSuit),
    );
    return { type: 'play_card', card: sorted[0] };
  }

  // Lead a strong non-trump card
  if (nonTrump.length > 0) {
    const sorted = nonTrump.sort(
      (a, b) => cardStrength(b, trumpSuit, b.suit) - cardStrength(a, trumpSuit, a.suit),
    );
    return { type: 'play_card', card: sorted[0] };
  }

  // All trump - lead weakest to preserve strong ones
  const sorted = trumpCards.sort(
    (a, b) => cardStrength(a, trumpSuit, trumpSuit) - cardStrength(b, trumpSuit, trumpSuit),
  );
  return { type: 'play_card', card: sorted[0] };
}

function botPlayFollow(
  legalPlays: Card[],
  trumpSuit: Suit,
  ledSuit: Suit,
  trick: { leadSeat: Seat; cards: { seat: Seat; card: Card }[]; winningSeat: Seat | null },
  difficulty: BotDifficulty,
  state: GameState,
  seat: Seat,
): GameAction {
  const myTeam = seatToTeam(seat);
  const partner = partnerSeat(seat);

  // Find current winning card in trick
  let bestStrength = 0;
  let winningSeat: Seat | null = null;
  for (const played of trick.cards) {
    const str = cardStrength(played.card, trumpSuit, ledSuit);
    if (str > bestStrength) {
      bestStrength = str;
      winningSeat = played.seat;
    }
  }

  const partnerIsWinning = winningSeat !== null && seatToTeam(winningSeat) === myTeam;
  const isLastToPlay = state.hand!.goingAlone
    ? trick.cards.length === 2
    : trick.cards.length === 3;

  // If partner is winning and we're last (or medium/hard), play low
  if (partnerIsWinning && (isLastToPlay || difficulty !== 'easy')) {
    // Play weakest legal card
    const sorted = legalPlays.sort(
      (a, b) => cardStrength(a, trumpSuit, ledSuit) - cardStrength(b, trumpSuit, ledSuit),
    );
    return { type: 'play_card', card: sorted[0] };
  }

  // Try to win the trick
  const winningPlays = legalPlays.filter(
    c => cardStrength(c, trumpSuit, ledSuit) > bestStrength,
  );

  if (winningPlays.length > 0) {
    if (difficulty === 'hard') {
      // Win with the weakest winning card (conserve strong cards)
      const sorted = winningPlays.sort(
        (a, b) => cardStrength(a, trumpSuit, ledSuit) - cardStrength(b, trumpSuit, ledSuit),
      );
      return { type: 'play_card', card: sorted[0] };
    }
    // Medium: play strongest winner
    const sorted = winningPlays.sort(
      (a, b) => cardStrength(b, trumpSuit, ledSuit) - cardStrength(a, trumpSuit, ledSuit),
    );
    return { type: 'play_card', card: sorted[0] };
  }

  // Can't win: play weakest card
  const sorted = legalPlays.sort(
    (a, b) => cardStrength(a, trumpSuit, ledSuit) - cardStrength(b, trumpSuit, ledSuit),
  );
  return { type: 'play_card', card: sorted[0] };
}
