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
    if (!target || target.type === 'food') return;
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

// Only relevant when the "Equal Value Playable" ruleset is on: a card
// whose facing side exactly matches an adjacent Food tile's facing value
// captures that Food outright — an alternate way to claim it besides
// winning majority control of its neighbors. Returns the list of
// { index, card } Food cells captured this way; doesn't mutate the board
// itself, same as resolveCaptures.
export function resolveFoodCaptures(board, index, card, boardSize) {
  const neighbors = getNeighbors(index, boardSize);
  const captured = [];

  Object.entries(neighbors).forEach(([direction, neighborIndex]) => {
    if (neighborIndex === null) return;
    const target = board[neighborIndex];
    if (!target || target.type !== 'food') return;

    const attackValue = card.sides[direction];
    const defendValue = target.sides[OPPOSITE_SIDE[direction]];
    if (attackValue === defendValue) {
      captured.push({ index: neighborIndex, card: target });
    }
  });

  return captured;
}

// A card may not be placed or moved onto a cell where its facing side is
// lower than or equal to an adjacent opponent card's facing side on that
// same edge — you can only play into a matchup you'd win outright, never
// one you'd lose or tie. Food and the owner's own cards never block a
// placement. Passing allowEqual (the "Equal Value Playable" ruleset)
// relaxes a tie back into a legal placement.
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
    if (!target || target.type === 'food') return true;
    if (target.ownerId === card.ownerId) return true;

    const attackValue = card.sides[direction];
    const defendValue = target.sides[OPPOSITE_SIDE[direction]];
    return allowEqual ? attackValue >= defendValue : attackValue > defendValue;
  });
}
