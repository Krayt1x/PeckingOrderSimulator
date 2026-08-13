import { describe, it, expect, afterEach } from 'vitest';
import { computeFitView, BOARD_SIZE } from './GameBoard.jsx';
import { placeFoodShapes, DEFAULT_FOOD } from '../lib/food.js';

const CELL_GAP = 0;
const DESKTOP_CELL_SIZE = 102;
const MOBILE_CELL_SIZE = 64;
const VIEWPORT_PX = 5 * (DESKTOP_CELL_SIZE + CELL_GAP) - CELL_GAP;

const ORIGINAL_INNER_WIDTH = window.innerWidth;
afterEach(() => {
  window.innerWidth = ORIGINAL_INNER_WIDTH;
});

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
    expect(cellSize).toBe(DESKTOP_CELL_SIZE);
    expect(offset.x).toBeGreaterThanOrEqual(0);
    expect(offset.y).toBeGreaterThanOrEqual(0);
  });

  // The viewport box is a fixed pixel size that doesn't respond to CSS
  // media queries — a box sized for desktop overflowed a narrow phone
  // screen regardless of zoom level, so the default itself has to shrink
  // below the app's mobile breakpoint.
  it('uses a smaller default cell size below the mobile breakpoint, keeping the viewport box narrow enough for a phone screen', () => {
    window.innerWidth = 375;
    const { cellSize } = computeFitView(
      Array(BOARD_SIZE * BOARD_SIZE).fill(null),
    );
    expect(cellSize).toBe(MOBILE_CELL_SIZE);
    // The .page container leaves ~327px of content width on a 375px
    // screen (560px max-width cap doesn't apply this narrow, minus 2 x
    // 1.5rem padding) — the viewport box must fit inside that.
    expect(5 * cellSize).toBeLessThanOrEqual(327);
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
