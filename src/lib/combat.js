import { getNeighbors } from './board.js';

const OPPOSITE_SIDE = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

// Checks the 4 neighbors of `index` (where `card` was just placed or moved
// to) and captures any adjacent opponent card whose facing side value is
// lower than `card`'s facing side on that edge. Food and the owner's own
// cards are never captured. Returns { board, captured }, where captured is
// [{ index, card }] for every card that was removed from the board.
export function resolveCaptures(board, index, card, boardSize) {
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
