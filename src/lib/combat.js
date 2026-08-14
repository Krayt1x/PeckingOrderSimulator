import { getNeighbors } from './board.js';

const OPPOSITE_SIDE = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

// Under the Landing Sickness ruleset (#122), a card stamped with
// `landingSicknessTurn` (the owner's own turn count at the moment it
// landed on the board) can't be captured until the owner's turn count has
// advanced past their very next turn — protected through the rest of the
// turn it landed on and the owner's one turn after that, capturable from
// the turn after. `ownerTurnCounts` is a { [playerId]: number } map, each
// count incremented once every time that specific player's own turn
// begins (see PlayPage.jsx's advanceTurn). Cards from a game where the
// ruleset was off never carry the stamp, so this is always false for them.
export function isLandingSick(card, ownerTurnCounts) {
  if (!card || card.landingSicknessTurn == null || !ownerTurnCounts) {
    return false;
  }
  const ownerTurn = ownerTurnCounts[card.ownerId];
  if (ownerTurn == null) return false;
  return ownerTurn <= card.landingSicknessTurn + 1;
}

// Checks the 4 neighbors of `index` (where `card` was just placed or moved
// to) and captures any adjacent opponent card whose facing side value is
// lower than `card`'s facing side on that edge. Food, the owner's own
// cards, and a still-landing-sick opponent card are never captured.
// Returns { board, captured }, where captured is [{ index, card }] for
// every card that was removed from the board.
export function resolveCaptures(board, index, card, boardSize, ownerTurnCounts) {
  const neighbors = getNeighbors(index, boardSize);
  const next = [...board];
  const captured = [];

  Object.entries(neighbors).forEach(([direction, neighborIndex]) => {
    if (neighborIndex === null) return;
    const target = next[neighborIndex];
    if (!target || target.type === 'food' || target.type === 'terrain') {
      return;
    }
    if (target.ownerId === card.ownerId) return;
    if (isLandingSick(target, ownerTurnCounts)) return;

    const attackValue = card.sides[direction];
    const defendValue = target.sides[OPPOSITE_SIDE[direction]];
    if (attackValue > defendValue) {
      captured.push({ index: neighborIndex, card: target });
      next[neighborIndex] = null;
    }
  });

  return { board: next, captured };
}

// A card may not be placed or moved onto a cell where its facing side is
// lower than or equal to an adjacent card's facing side on that same edge —
// you can only play into a matchup you'd win outright, never one you'd lose
// or tie. Food follows the exact same rule as an opponent card (#98); only
// the owner's own cards never block a placement. Passing allowEqual (the
// "Equal Value Playable" ruleset) relaxes a tie back into a legal placement.
// Terrain has no side values to compare against at all — it only blocks its
// own cell (already excluded from candidate placements), never a neighbor's.
export function canPlaceCard(
  board,
  index,
  card,
  boardSize,
  allowEqual = false,
) {
  const neighbors = getNeighbors(index, boardSize);
  return Object.entries(neighbors).every(([direction, neighborIndex]) => {
    if (neighborIndex === null) return true;
    const target = board[neighborIndex];
    if (!target || target.type === 'terrain') return true;
    if (target.type !== 'food' && target.ownerId === card.ownerId) {
      return true;
    }

    const attackValue = card.sides[direction];
    const defendValue = target.sides[OPPOSITE_SIDE[direction]];
    return allowEqual ? attackValue >= defendValue : attackValue > defendValue;
  });
}
