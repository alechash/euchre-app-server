import { Team, Seat } from '../types';

/** Determine which team a seat belongs to. Seats 0,2 = Team 1; Seats 1,3 = Team 2. */
export function seatToTeam(seat: Seat): Team {
  return (seat % 2 === 0) ? 1 : 2;
}

/** Get the partner seat. */
export function partnerSeat(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

/** Get the next seat in clockwise order. */
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

/**
 * Calculate points awarded for a hand.
 *
 * Rules:
 * - Calling team wins 3-4 tricks: 1 point
 * - Calling team wins all 5 tricks (march): 2 points
 * - Calling team is euchred (wins 0-2 tricks): 2 points to defending team
 * - Going alone and winning all 5 tricks: 4 points
 * - Going alone and winning 3-4 tricks: 1 point
 * - Going alone and euchred: 2 points to defending team
 */
export function calculateHandPoints(
  tricksTeam1: number,
  tricksTeam2: number,
  callingTeam: Team,
  wentAlone: boolean,
): { points: number; awardedTo: Team } {
  const callingTeamTricks = callingTeam === 1 ? tricksTeam1 : tricksTeam2;

  if (callingTeamTricks >= 5) {
    // March (all 5 tricks)
    if (wentAlone) {
      return { points: 4, awardedTo: callingTeam };
    }
    return { points: 2, awardedTo: callingTeam };
  }

  if (callingTeamTricks >= 3) {
    // Won the hand
    return { points: 1, awardedTo: callingTeam };
  }

  // Euchred
  const defendingTeam: Team = callingTeam === 1 ? 2 : 1;
  return { points: 2, awardedTo: defendingTeam };
}
