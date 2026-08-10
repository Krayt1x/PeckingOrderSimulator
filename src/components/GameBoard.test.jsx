import { describe, it, expect } from 'vitest';
import { computeFitView, BOARD_SIZE } from './GameBoard.jsx';
import { placeFoodShapes, DEFAULT_FOOD } from '../lib/food.js';

const CELL_GAP = 8;
const VIEWPORT_PX = 5 * (72 + CELL_GAP) - CELL_GAP;

function buildCells(foodBoard) {
  const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  Object.entries(foodBoard).forEach(([index, card]) => {
    cells[Number(index)] = card;
  });
  return cells;
}

describe('computeFitView', () => {
  it('falls back to the default centered view when there is no Food', () => {
    const { cellSize, offset } = computeFitView(
      Array(BOARD_SIZE * BOARD_SIZE).fill(null),
    );
    expect(cellSize).toBe(72);
    expect(offset.x).toBeGreaterThanOrEqual(0);
    expect(offset.y).toBeGreaterThanOrEqual(0);
  });

  it('fits every Food cell inside the viewport', () => {
    const foodBoard = placeFoodShapes(DEFAULT_FOOD, BOARD_SIZE);
    const cells = buildCells(foodBoard);
    const { cellSize, offset } = computeFitView(cells);
    const pitch = cellSize + CELL_GAP;

    Object.keys(foodBoard).forEach((index) => {
      const row = Math.floor(Number(index) / BOARD_SIZE);
      const col = Number(index) % BOARD_SIZE;
      const left = col * pitch;
      const top = row * pitch;

      expect(left).toBeGreaterThanOrEqual(offset.x);
      expect(left + cellSize).toBeLessThanOrEqual(offset.x + VIEWPORT_PX);
      expect(top).toBeGreaterThanOrEqual(offset.y);
      expect(top + cellSize).toBeLessThanOrEqual(offset.y + VIEWPORT_PX);
    });
  });
});
