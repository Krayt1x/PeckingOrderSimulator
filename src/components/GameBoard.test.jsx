import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import GameBoard, { computeFitView, BOARD_SIZE } from './GameBoard.jsx';
import { placeFoodShapes, DEFAULT_FOOD } from '../lib/food.js';

const CELL_GAP = 0;
const VIEWPORT_SIZE = 5;
const PAGE_MAX_WIDTH_PX = 560;
const PAGE_HORIZONTAL_PADDING_PX = 48;
const DESKTOP_CELL_SIZE = Math.floor(
  (PAGE_MAX_WIDTH_PX - PAGE_HORIZONTAL_PADDING_PX) / VIEWPORT_SIZE,
);
const VIEWPORT_PX = VIEWPORT_SIZE * (DESKTOP_CELL_SIZE + CELL_GAP) - CELL_GAP;

// Mirrors .page's own content-width math for a given screen width.
function expectedCellSizeFor(innerWidth) {
  const pageWidth = Math.min(innerWidth, PAGE_MAX_WIDTH_PX);
  const contentWidth = pageWidth - PAGE_HORIZONTAL_PADDING_PX;
  return Math.floor(contentWidth / VIEWPORT_SIZE);
}

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
  // screen regardless of zoom level. The default cell size is derived
  // from the actual screen width (mirroring .page's own content-width
  // math) rather than a couple of hardcoded breakpoint sizes, which
  // either overflowed narrower phones or left wider ones with a board
  // smaller than it had room for.
  it.each([320, 360, 375, 390, 412, 428])(
    'fills the available content width on a %ipx-wide phone screen without overflowing it',
    (innerWidth) => {
      window.innerWidth = innerWidth;
      const { cellSize } = computeFitView(
        Array(BOARD_SIZE * BOARD_SIZE).fill(null),
      );
      expect(cellSize).toBe(expectedCellSizeFor(innerWidth));
      expect(5 * cellSize).toBeLessThanOrEqual(
        innerWidth - PAGE_HORIZONTAL_PADDING_PX,
      );
    },
  );

  it('reverts to the desktop cell size once the screen is wide enough for .page’s max-width cap to apply', () => {
    window.innerWidth = 1440;
    const { cellSize } = computeFitView(
      Array(BOARD_SIZE * BOARD_SIZE).fill(null),
    );
    expect(cellSize).toBe(DESKTOP_CELL_SIZE);
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

  // A background painted on .board (e.g. the pixel-art skin's grass
  // checker) only covers .board's own box — if that box were left to
  // auto-size instead of matching the full grid, the background would
  // stop partway across the panned grid instead of covering all of it
  // (#103). Pinning the explicit size here catches that regression.
  it("sizes .board to the full grid (BOARD_SIZE * cellSize), not just its auto-fit width", () => {
    const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
    const { cellSize } = computeFitView(cells);
    const { container } = render(<GameBoard cells={cells} />);
    const board = container.querySelector('.board');
    expect(board.style.width).toBe(`${BOARD_SIZE * cellSize}px`);
    expect(board.style.height).toBe(`${BOARD_SIZE * cellSize}px`);
  });
});

describe('rendering a Terrain cell (#107)', () => {
  it('renders it as a pixel-art rock sprite, with no side values or name shown', () => {
    const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
    cells[0] = { id: 'terrain-0', type: 'terrain', name: 'Rock' };
    const { container } = render(<GameBoard cells={cells} />);

    const terrainCard = container.querySelector('.card-terrain');
    expect(terrainCard).not.toBeNull();
    expect(terrainCard.querySelector('.card-sides')).toBeNull();
    expect(terrainCard.querySelector('.card-name')).toBeNull();
    expect(terrainCard.querySelector('canvas.card-terrain-sprite')).not
      .toBeNull();
  });
});
