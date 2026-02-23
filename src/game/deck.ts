import { Card, Suit, Rank } from '../types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

/** Build a standard 24-card Euchre deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle (in-place). */
export function shuffle(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Deal 5 cards to each of 4 players, return hands + 4-card kitty. */
export function deal(deck: Card[]): { hands: [Card[], Card[], Card[], Card[]]; kitty: Card[] } {
  const shuffled = shuffle([...deck]);
  return {
    hands: [
      shuffled.slice(0, 5),
      shuffled.slice(5, 10),
      shuffled.slice(10, 15),
      shuffled.slice(15, 20),
    ],
    kitty: shuffled.slice(20, 24),
  };
}

/** Get the suit that is the same color as the given suit. */
export function sameColorSuit(suit: Suit): Suit {
  switch (suit) {
    case 'hearts': return 'diamonds';
    case 'diamonds': return 'hearts';
    case 'clubs': return 'spades';
    case 'spades': return 'clubs';
  }
}

/**
 * Get the effective suit of a card, accounting for the left bower.
 * The left bower (jack of same-color suit) counts as the trump suit.
 */
export function effectiveSuit(card: Card, trumpSuit: Suit): Suit {
  if (card.rank === 'J' && card.suit === sameColorSuit(trumpSuit)) {
    return trumpSuit; // left bower
  }
  return card.suit;
}

/**
 * Card strength for comparison. Higher = stronger.
 * Trump cards are always stronger than non-trump.
 * Right bower > Left bower > A > K > Q > 10 > 9 of trump
 * For non-trump led suit: A > K > Q > J > 10 > 9
 */
export function cardStrength(card: Card, trumpSuit: Suit, ledSuit: Suit): number {
  const eSuit = effectiveSuit(card, trumpSuit);
  const isTrump = eSuit === trumpSuit;
  const isLedSuit = eSuit === ledSuit;

  // Base rank values
  const rankValues: Record<Rank, number> = {
    '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6,
  };

  if (isTrump) {
    // Right bower (jack of trump suit)
    if (card.rank === 'J' && card.suit === trumpSuit) {
      return 200;
    }
    // Left bower (jack of same-color suit)
    if (card.rank === 'J' && card.suit === sameColorSuit(trumpSuit)) {
      return 190;
    }
    // Other trump: 100 + rank
    return 100 + rankValues[card.rank];
  }

  if (isLedSuit) {
    // Led suit: 10 + rank
    return 10 + rankValues[card.rank];
  }

  // Off-suit: worth nothing in trick evaluation
  return 0;
}

/** Determine the winner of a trick. */
export function trickWinner(
  trick: { seat: number; card: Card }[],
  trumpSuit: Suit,
): number {
  if (trick.length === 0) throw new Error('Empty trick');
  const ledSuit = effectiveSuit(trick[0].card, trumpSuit);
  let best = trick[0];
  let bestStrength = cardStrength(best.card, trumpSuit, ledSuit);

  for (let i = 1; i < trick.length; i++) {
    const strength = cardStrength(trick[i].card, trumpSuit, ledSuit);
    if (strength > bestStrength) {
      best = trick[i];
      bestStrength = strength;
    }
  }
  return best.seat;
}

/** Check if two cards are the same. */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** Check if a player can legally play a card given what was led. */
export function isLegalPlay(
  card: Card,
  hand: Card[],
  ledSuit: Suit | null,
  trumpSuit: Suit,
): boolean {
  // If no card has been led yet, anything is legal
  if (ledSuit === null) return true;

  const effectiveLedSuit = ledSuit; // Already effective suit from lead card
  const hasLedSuit = hand.some(c => effectiveSuit(c, trumpSuit) === effectiveLedSuit);

  if (!hasLedSuit) {
    // Can play anything if you don't have the led suit
    return true;
  }

  // Must follow suit
  return effectiveSuit(card, trumpSuit) === effectiveLedSuit;
}

/** Get all legal plays from a hand. */
export function getLegalPlays(
  hand: Card[],
  ledSuit: Suit | null,
  trumpSuit: Suit,
): Card[] {
  return hand.filter(c => isLegalPlay(c, hand, ledSuit, trumpSuit));
}
