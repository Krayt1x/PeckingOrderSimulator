import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOOD,
  MIN_FOOD_DISTANCE,
  computeShapeCells,
  placeFoodShapes,
  getEligibleFoodIndices,
  getAdjacentBirdIndices,
} from './food.js';

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
    expect(cells[0].sides).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
  });

  it('gives a 2x1 shape one inside edge per cell, outside elsewhere', () => {
    const cells = computeShapeCells(potatoCake);
    expect(cells).toHaveLength(2);

    const left = cells.find((c) => c.col === 0);
    const right = cells.find((c) => c.col === 1);
    expect(left.sides).toEqual({ top: 2, right: 1, bottom: 2, left: 2 });
    expect(right.sides).toEqual({ top: 2, right: 2, bottom: 2, left: 1 });
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
    const board = placeFoodShapes(DEFAULT_FOOD, 10);
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

  it('keeps every placed cell within the board bounds', () => {
    const boardSize = 10;
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
    expect(placeFoodShapes(food, 10)).toEqual({});
  });

  it('keeps every pair of distinct food pieces more than MIN_FOOD_DISTANCE tiles apart', () => {
    const board = placeFoodShapes(DEFAULT_FOOD, 10);
    const byShape = new Map();
    Object.entries(board).forEach(([index, card]) => {
      const row = Math.floor(Number(index) / 10);
      const col = Number(index) % 10;
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

  it('skips a piece entirely rather than violating the minimum distance', () => {
    // A board too small for two 1x1 pieces to be more than
    // MIN_FOOD_DISTANCE apart — the second piece should be skipped.
    const food = {
      ...DEFAULT_FOOD,
      shapes: [
        { ...chip, id: 'a', cells: [{ row: 0, col: 0 }] },
        { ...chip, id: 'b', cells: [{ row: 0, col: 0 }] },
      ],
    };
    const board = placeFoodShapes(food, 2);
    expect(Object.keys(board)).toHaveLength(1);
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
  it('returns only bird-occupied neighbors, not food or empty ones', () => {
    const board = Array(100).fill(null);
    board[55] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    board[45] = bird('p1');
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    expect(getAdjacentBirdIndices(board, 55, BOARD_SIZE)).toEqual([45]);
  });
});
