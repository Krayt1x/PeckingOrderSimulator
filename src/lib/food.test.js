import { describe, it, expect } from 'vitest';
import { DEFAULT_FOOD, computeShapeCells, placeFoodShapes } from './food.js';

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
});
