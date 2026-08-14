import { getNeighbors } from './board.js';

export const FOOD_GRID_SIZE = 4;

export const DEFAULT_FOOD = {
  id: 'food',
  name: 'Standard Food',
  shapes: [
    {
      id: 'chip',
      name: 'Chip',
      emoji: 'CH',
      color: '#eab308',
      cells: [{ row: 0, col: 0 }],
      outsideValue: 0,
      insideValue: 0,
    },
    {
      id: 'potato-cake',
      name: 'Potato Cake',
      emoji: 'PC',
      color: '#eab308',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      outsideValue: 1,
      insideValue: 0,
    },
    {
      id: 'burger',
      name: 'Burger',
      emoji: 'BG',
      color: '#eab308',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ],
      outsideValue: 2,
      insideValue: 1,
    },
  ],
};

let nextFoodShapeId = 1;

export function createFoodShape() {
  const id = `custom-food-${Date.now()}-${nextFoodShapeId++}`;
  return {
    id,
    name: 'New Food',
    emoji: 'NF',
    color: '#eab308',
    cells: [{ row: 0, col: 0 }],
    outsideValue: 1,
    insideValue: 1,
  };
}

function hasCell(cells, row, col) {
  return cells.some((c) => c.row === row && c.col === col);
}

// For each cell in the shape, computes its top/right/bottom/left values —
// an edge touching another cell of the same shape uses insideValue,
// otherwise it's on the shape's perimeter and uses outsideValue.
export function computeShapeCells(shape) {
  const cells = shape?.cells ?? [];
  return cells.map(({ row, col }) => ({
    row,
    col,
    sides: {
      top: hasCell(cells, row - 1, col)
        ? shape.insideValue
        : shape.outsideValue,
      right: hasCell(cells, row, col + 1)
        ? shape.insideValue
        : shape.outsideValue,
      bottom: hasCell(cells, row + 1, col)
        ? shape.insideValue
        : shape.outsideValue,
      left: hasCell(cells, row, col - 1)
        ? shape.insideValue
        : shape.outsideValue,
    },
  }));
}

function shapeBounds(shape) {
  const cells = shape?.cells ?? [];
  if (cells.length === 0) return { width: 0, height: 0 };
  return {
    width: Math.max(...cells.map((c) => c.col)) + 1,
    height: Math.max(...cells.map((c) => c.row)) + 1,
  };
}

// Minimum Chebyshev (chessboard) distance required between cells of two
// *different* food pieces — placements any closer than this are rejected.
export const MIN_FOOD_DISTANCE = 2;

// A newly placed piece must land within this Chebyshev distance of every
// piece already placed (at least one cell each), so every pair of Food
// pieces ends up close together rather than just chained through whatever
// was placed immediately before it (#108). Only applies once something
// has already been placed — the first (biggest) piece can go anywhere
// valid.
export const MAX_FOOD_DISTANCE = 4;

// Food may not spawn within this many tiles of the board's outer edge —
// every food cell needs at least this much clearance from row/col 0 and
// from the last row/col.
export const EDGE_MARGIN = 3;

function chebyshevDistance(rowA, colA, rowB, colB) {
  return Math.max(Math.abs(rowA - rowB), Math.abs(colA - colB));
}

// Fisher-Yates — local rather than importing decks.js's copy, so food
// placement (a board-layout concern) doesn't depend on the deck module.
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Places every shape in food.shapes onto a boardSize x boardSize board, at
// a random valid position each time (#101) — without overlapping, without
// any two distinct pieces landing within MIN_FOOD_DISTANCE tiles of each
// other, without any piece landing more than maxDistance tiles from the
// nearest already-placed piece (#108, defaults to MAX_FOOD_DISTANCE), and
// without any cell landing within EDGE_MARGIN tiles of the board's edge.
// Bigger shapes are placed first so smaller ones can fill in around them.
// Returns a { [boardIndex]: cardFace } map. A shape that can't find any
// valid spot is silently skipped rather than placed anyway — callers
// placing more shapes than the default clustering distance can
// comfortably fit (e.g. Double Food, #119) should widen maxDistance so
// every shape still finds room somewhere on the board.
export function placeFoodShapes(
  food,
  boardSize,
  maxDistance = MAX_FOOD_DISTANCE,
) {
  const shapes = food?.shapes ?? [];
  const occupied = new Set();
  const placedCells = []; // [{ row, col }] across every shape placed so far
  const placedGroups = []; // [{ row, col }][] — one entry per shape placed so far
  const board = {};

  const minCoord = EDGE_MARGIN;
  const maxCoord = boardSize - 1 - EDGE_MARGIN;

  const anchors = [];
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      anchors.push({ row, col });
    }
  }
  const shuffledAnchors = shuffle(anchors);

  const bySize = [...shapes].sort((a, b) => b.cells.length - a.cells.length);

  bySize.forEach((shape) => {
    if (shape.cells.length === 0) return;
    const { width, height } = shapeBounds(shape);

    const anchor = shuffledAnchors.find(({ row, col }) => {
      if (row + height > boardSize || col + width > boardSize) return false;

      const cellPositions = shape.cells.map((cell) => ({
        r: row + cell.row,
        c: col + cell.col,
      }));

      const fits = cellPositions.every(({ r, c }) => {
        if (r < minCoord || r > maxCoord || c < minCoord || c > maxCoord) {
          return false;
        }
        if (occupied.has(r * boardSize + c)) return false;
        return placedCells.every(
          (other) =>
            chebyshevDistance(r, c, other.row, other.col) > MIN_FOOD_DISTANCE,
        );
      });
      if (!fits) return false;

      // Every already-placed piece — not just the most recent one — must
      // have a cell within maxDistance of this piece.
      return placedGroups.every((group) =>
        cellPositions.some(({ r, c }) =>
          group.some(
            (other) =>
              chebyshevDistance(r, c, other.row, other.col) <= maxDistance,
          ),
        ),
      );
    });
    if (!anchor) return;

    const thisGroup = [];
    computeShapeCells(shape).forEach(({ row, col, sides }) => {
      const boardRow = anchor.row + row;
      const boardCol = anchor.col + col;
      const index = boardRow * boardSize + boardCol;
      occupied.add(index);
      placedCells.push({ row: boardRow, col: boardCol });
      thisGroup.push({ row: boardRow, col: boardCol });
      board[index] = {
        id: `${shape.id}-${boardRow}-${boardCol}`,
        type: 'food',
        name: shape.name,
        emoji: shape.emoji,
        color: shape.color,
        sides,
      };
    });
    placedGroups.push(thisGroup);
  });

  return board;
}

// A food cell is "eatable" by a player when, of the birds orthogonally
// touching it, that player owns strictly more than every other player
// combined — a tied count is never eatable, regardless of ruleset. Each
// food cell/tile is evaluated independently — a multi-cell piece like
// Burger doesn't need to be controlled as a whole.
export function getEligibleFoodIndices(board, boardSize, activePlayerId) {
  const eligible = [];

  board.forEach((cell, index) => {
    if (!cell || cell.type !== 'food') return;

    const neighbors = getNeighbors(index, boardSize);
    const counts = {};
    Object.values(neighbors).forEach((neighborIndex) => {
      if (neighborIndex === null) return;
      const neighbor = board[neighborIndex];
      // Terrain has no ownerId, so left uncounted here it would land in
      // counts[undefined] and inflate "others" — an unowned rock acting
      // as a phantom opponent vote against every player (#107 follow-up).
      if (
        !neighbor ||
        neighbor.type === 'food' ||
        neighbor.type === 'terrain'
      ) {
        return;
      }
      counts[neighbor.ownerId] = (counts[neighbor.ownerId] ?? 0) + 1;
    });

    const mine = counts[activePlayerId] ?? 0;
    const others = Object.entries(counts).reduce(
      (sum, [ownerId, count]) =>
        ownerId === activePlayerId ? sum : sum + count,
      0,
    );
    if (mine > others) eligible.push(index);
  });

  return eligible;
}

// The bird cells orthogonally touching a given food index that belong to
// the eating player — the choices available when eating that food. Only
// your own birds can be nominated; an opponent's bird is never a legal
// choice, no matter how the food is being eaten.
export function getAdjacentBirdIndices(board, foodIndex, boardSize, ownerId) {
  const neighbors = getNeighbors(foodIndex, boardSize);
  return Object.values(neighbors).filter(
    (neighborIndex) =>
      neighborIndex !== null &&
      board[neighborIndex] &&
      board[neighborIndex].type !== 'food' &&
      board[neighborIndex].ownerId === ownerId,
  );
}

// How many birds — of any owner — orthogonally touch a Food index right
// now. Used by the Scaling Points ruleset (#125): claiming a tile is worth
// this many points (never fewer than 1), so it counts the crowd around the
// tile as a whole rather than just the claiming player's own birds.
export function countAdjacentBirds(board, foodIndex, boardSize) {
  const neighbors = getNeighbors(foodIndex, boardSize);
  return Object.values(neighbors).filter((neighborIndex) => {
    if (neighborIndex === null) return false;
    const neighbor = board[neighborIndex];
    return (
      Boolean(neighbor) &&
      neighbor.type !== 'food' &&
      neighbor.type !== 'terrain'
    );
  }).length;
}

// Points a Food tile is currently worth, per the Scaling Points ruleset —
// the adjacent-bird count, but never fewer than 1 so a completely
// uncontested tile is still worth claiming.
export function foodPointValue(board, foodIndex, boardSize) {
  return Math.max(1, countAdjacentBirds(board, foodIndex, boardSize));
}
