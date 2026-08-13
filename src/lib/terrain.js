// Terrain tiles are the Random Terrain ruleset's impassable obstacles —
// scattered across the board at the start of a game, they have no side
// values and are never captured or removed. They just take up their own
// cell, purely blocking a card from being placed there.
export const MIN_TERRAIN_COUNT = 1;
export const MAX_TERRAIN_COUNT = 5;

// Local Fisher-Yates rather than importing decks.js's copy, so terrain
// placement (a board-layout concern) doesn't depend on the deck module.
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Scatters 1-5 terrain tiles across a boardSize x boardSize board, skipping
// any index already in occupiedIndices (e.g. Food) — returns a
// { [boardIndex]: cardFace } map, the same shape placeFoodShapes returns.
export function placeRandomTerrain(occupiedIndices, boardSize) {
  const occupied = new Set(occupiedIndices);
  const empty = [];
  for (let i = 0; i < boardSize * boardSize; i++) {
    if (!occupied.has(i)) empty.push(i);
  }

  const spread = MAX_TERRAIN_COUNT - MIN_TERRAIN_COUNT + 1;
  const count = Math.min(
    empty.length,
    MIN_TERRAIN_COUNT + Math.floor(Math.random() * spread),
  );

  const board = {};
  shuffle(empty)
    .slice(0, count)
    .forEach((index) => {
      board[index] = {
        id: `terrain-${index}`,
        type: 'terrain',
        name: 'Rock',
      };
    });
  return board;
}
