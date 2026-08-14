import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOOD,
  MIN_FOOD_DISTANCE,
  MAX_FOOD_DISTANCE,
  EDGE_MARGIN,
  computeShapeCells,
  placeFoodShapes,
  getEligibleFoodIndices,
  getAdjacentBirdIndices,
  countAdjacentBirds,
  foodPointValue,
} from './food.js';

// Real board size the app uses — large enough that DEFAULT_FOOD's shapes
// fit inside the EDGE_MARGIN-restricted interior along with MIN_FOOD_DISTANCE
// spacing between them.
const REAL_BOARD_SIZE = 16;

const BOARD_SIZE = 10;

function bird(ownerId) {
  return {
    ownerId,
    type: 'bird',
    sides: { top: 1, right: 1, bottom: 1, left: 1 },
  };
}

const [chip, potatoCake, burger] = DEFAULT_FOOD.shapes;

describe('computeShapeCells', () => {
  it('gives a 1x1 shape all outside edges', () => {
    const cells = computeShapeCells(chip);
    expect(cells).toHaveLength(1);
    expect(cells[0].sides).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('gives a 2x1 shape one inside edge per cell, outside elsewhere', () => {
    const cells = computeShapeCells(potatoCake);
    expect(cells).toHaveLength(2);

    const left = cells.find((c) => c.col === 0);
    const right = cells.find((c) => c.col === 1);
    expect(left.sides).toEqual({ top: 1, right: 0, bottom: 1, left: 1 });
    expect(right.sides).toEqual({ top: 1, right: 1, bottom: 1, left: 0 });
  });

  it('gives a 2x2 shape two inside edges and two outside edges per cell', () => {
    const cells = computeShapeCells(burger);
    expect(cells).toHaveLength(4);
    cells.forEach(({ sides }) => {
      const values = Object.values(sides);
      expect(values.filter((v) => v === burger.insideValue)).toHaveLength(2);
      expect(values.filter((v) => v === burger.outsideValue)).toHaveLength(2);
    });

    const topLeft = cells.find((c) => c.row === 0 && c.col === 0);
    expect(topLeft.sides).toEqual({ top: 2, right: 1, bottom: 1, left: 2 });
  });
});

describe('placeFoodShapes', () => {
  it('places every cell of every shape without overlapping', () => {
    const board = placeFoodShapes(DEFAULT_FOOD, REAL_BOARD_SIZE);
    const totalCells = DEFAULT_FOOD.shapes.reduce(
      (sum, s) => sum + s.cells.length,
      0,
    );
    expect(Object.keys(board)).toHaveLength(totalCells);

    const names = new Set(Object.values(board).map((card) => card.name));
    DEFAULT_FOOD.shapes.forEach((shape) =>
      expect(names.has(shape.name)).toBe(true),
    );
  });

  // Placement used to always pack shapes as close to the board's center
  // as possible, so every new game put Food in the same spot — now it
  // should land somewhere different each time (#101).
  it('places Food at a random valid position instead of always the same spot', () => {
    const food = { ...DEFAULT_FOOD, shapes: [chip] };
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      const board = placeFoodShapes(food, REAL_BOARD_SIZE);
      positions.add(Object.keys(board)[0]);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('keeps every placed cell within the board bounds', () => {
    const boardSize = REAL_BOARD_SIZE;
    const board = placeFoodShapes(DEFAULT_FOOD, boardSize);
    Object.keys(board).forEach((index) => {
      expect(Number(index)).toBeGreaterThanOrEqual(0);
      expect(Number(index)).toBeLessThan(boardSize * boardSize);
    });
  });

  it('skips shapes with no cells selected', () => {
    const food = {
      ...DEFAULT_FOOD,
      shapes: [{ ...chip, cells: [] }],
    };
    expect(placeFoodShapes(food, REAL_BOARD_SIZE)).toEqual({});
  });

  it('keeps every pair of distinct food pieces more than MIN_FOOD_DISTANCE tiles apart', () => {
    const board = placeFoodShapes(DEFAULT_FOOD, REAL_BOARD_SIZE);
    const byShape = new Map();
    Object.entries(board).forEach(([index, card]) => {
      const row = Math.floor(Number(index) / REAL_BOARD_SIZE);
      const col = Number(index) % REAL_BOARD_SIZE;
      const list = byShape.get(card.name) ?? [];
      list.push({ row, col });
      byShape.set(card.name, list);
    });

    const groups = [...byShape.values()];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        groups[i].forEach((a) => {
          groups[j].forEach((b) => {
            const distance = Math.max(
              Math.abs(a.row - b.row),
              Math.abs(a.col - b.col),
            );
            expect(distance).toBeGreaterThan(MIN_FOOD_DISTANCE);
          });
        });
      }
    }
  });

  it('keeps every pair of distinct pieces within MAX_FOOD_DISTANCE tiles of each other (#108)', () => {
    // Run several times — a piece being close to whichever piece was
    // placed right before it doesn't guarantee it's close to every piece,
    // only checking every pairing catches that (a real bug once: Chip and
    // Potato Cake could each be near Burger but far from each other).
    for (let trial = 0; trial < 20; trial++) {
      const board = placeFoodShapes(DEFAULT_FOOD, REAL_BOARD_SIZE);
      const byShape = new Map();
      Object.entries(board).forEach(([index, card]) => {
        const row = Math.floor(Number(index) / REAL_BOARD_SIZE);
        const col = Number(index) % REAL_BOARD_SIZE;
        const list = byShape.get(card.name) ?? [];
        list.push({ row, col });
        byShape.set(card.name, list);
      });

      const groups = [...byShape.values()];
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const closest = Math.min(
            ...groups[i].flatMap((a) =>
              groups[j].map((b) =>
                Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)),
              ),
            ),
          );
          expect(closest).toBeLessThanOrEqual(MAX_FOOD_DISTANCE);
        }
      }
    }
  });

  it('keeps every placed cell at least EDGE_MARGIN tiles from the board edge', () => {
    const boardSize = REAL_BOARD_SIZE;
    const board = placeFoodShapes(DEFAULT_FOOD, boardSize);
    Object.keys(board).forEach((index) => {
      const row = Math.floor(Number(index) / boardSize);
      const col = Number(index) % boardSize;
      expect(row).toBeGreaterThanOrEqual(EDGE_MARGIN);
      expect(row).toBeLessThanOrEqual(boardSize - 1 - EDGE_MARGIN);
      expect(col).toBeGreaterThanOrEqual(EDGE_MARGIN);
      expect(col).toBeLessThanOrEqual(boardSize - 1 - EDGE_MARGIN);
    });
  });

  it('skips a piece entirely rather than violating the minimum distance', () => {
    // A board whose EDGE_MARGIN-restricted interior is a single cell —
    // only one of two identical 1x1 pieces can fit, so the second must be
    // skipped rather than overlapping or violating the edge margin.
    const boardSize = EDGE_MARGIN * 2 + 1;
    const food = {
      ...DEFAULT_FOOD,
      shapes: [
        { ...chip, id: 'a', cells: [{ row: 0, col: 0 }] },
        { ...chip, id: 'b', cells: [{ row: 0, col: 0 }] },
      ],
    };
    const board = placeFoodShapes(food, boardSize);
    expect(Object.keys(board)).toHaveLength(1);
  });

  it('skips a shape entirely when the board is too small to have a valid interior', () => {
    // With boardSize smaller than 2*EDGE_MARGIN + 1, no cell is ever
    // EDGE_MARGIN tiles from every edge — nothing can be placed.
    const board = placeFoodShapes(DEFAULT_FOOD, EDGE_MARGIN * 2);
    expect(board).toEqual({});
  });
});

describe('getEligibleFoodIndices', () => {
  it('is eligible for a player with strictly more adjacent birds than everyone else combined', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1'); // top
    board[54] = bird('p1'); // left
    board[56] = bird('p2'); // right — p1 has 2, p2 has 1: p1 qualifies

    expect(getEligibleFoodIndices(board, BOARD_SIZE, 'p1')).toEqual([55]);
    expect(getEligibleFoodIndices(board, BOARD_SIZE, 'p2')).toEqual([]);
  });

  it('is not eligible on a tie', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1');
    board[56] = bird('p2');

    expect(getEligibleFoodIndices(board, BOARD_SIZE, 'p1')).toEqual([]);
  });

  it('stays ineligible on a tie regardless of any extra arguments passed', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1');
    board[56] = bird('p2');

    // The Equal Value Playable ruleset only relaxes card placement — it
    // never affects Food-eating majority control (#82).
    expect(getEligibleFoodIndices(board, BOARD_SIZE, 'p1', true)).toEqual([]);
  });

  it('ignores adjacent Terrain when computing majority control (#107 follow-up)', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1'); // top — p1's only neighbor
    board[54] = { id: 'terrain-54', type: 'terrain', name: 'Rock' }; // left
    board[56] = { id: 'terrain-56', type: 'terrain', name: 'Rock' }; // right

    // Terrain has no ownerId — it must not count as opposing votes, or a
    // single bird could never reach majority next to two rocks.
    expect(getEligibleFoodIndices(board, BOARD_SIZE, 'p1')).toEqual([55]);
  });

  it('evaluates each food tile of a multi-cell piece independently', () => {
    const board = Array(100).fill(null);
    // Two food cells side by side; p1 controls only the left one.
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1'); // touches 55 only

    const eligible = getEligibleFoodIndices(board, BOARD_SIZE, 'p1');
    expect(eligible).toEqual([55]);
  });
});

describe('getAdjacentBirdIndices', () => {
  it('returns only the given owner’s bird-occupied neighbors, not food, empty, or opponent-owned ones', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1');
    board[54] = bird('p2');
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    expect(getAdjacentBirdIndices(board, 55, BOARD_SIZE, 'p1')).toEqual([45]);
  });
});

describe('countAdjacentBirds (#125)', () => {
  it('counts birds of every owner, not just one player’s', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1');
    board[54] = bird('p1');
    board[56] = bird('p2');

    expect(countAdjacentBirds(board, 55, BOARD_SIZE)).toBe(3);
  });

  it('ignores Food and Terrain neighbors, only counting birds', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = {
      type: 'food',
      sides: { top: 0, right: 0, bottom: 0, left: 0 },
    };
    board[54] = { type: 'terrain' };
    board[56] = bird('p1');

    expect(countAdjacentBirds(board, 55, BOARD_SIZE)).toBe(1);
  });

  it('is 0 when no bird touches the tile', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    expect(countAdjacentBirds(board, 55, BOARD_SIZE)).toBe(0);
  });
});

describe('foodPointValue (#125)', () => {
  it('matches the adjacent bird count when at least one bird touches the tile', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1');
    board[54] = bird('p2');

    expect(foodPointValue(board, 55, BOARD_SIZE)).toBe(2);
  });

  it('is never less than 1, even with no adjacent birds', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    expect(foodPointValue(board, 55, BOARD_SIZE)).toBe(1);
  });
});
