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
