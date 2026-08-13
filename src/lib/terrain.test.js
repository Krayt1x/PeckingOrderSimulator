import { describe, it, expect } from 'vitest';
import {
  placeRandomTerrain,
  MIN_TERRAIN_COUNT,
  MAX_TERRAIN_COUNT,
} from './terrain.js';

const BOARD_SIZE = 16;

describe('placeRandomTerrain', () => {
  it('places between MIN_TERRAIN_COUNT and MAX_TERRAIN_COUNT tiles', () => {
    const board = placeRandomTerrain([], BOARD_SIZE);
    const count = Object.keys(board).length;
    expect(count).toBeGreaterThanOrEqual(MIN_TERRAIN_COUNT);
    expect(count).toBeLessThanOrEqual(MAX_TERRAIN_COUNT);
  });

  it('never lands on an already-occupied index', () => {
    const occupied = [10, 11, 12, 13, 14, 15, 16, 17];
    for (let i = 0; i < 20; i++) {
      const board = placeRandomTerrain(occupied, BOARD_SIZE);
      Object.keys(board).forEach((index) => {
        expect(occupied).not.toContain(Number(index));
      });
    }
  });

  it('gives every tile type "terrain" and no side values', () => {
    const board = placeRandomTerrain([], BOARD_SIZE);
    Object.values(board).forEach((card) => {
      expect(card.type).toBe('terrain');
      expect(card.sides).toBeUndefined();
    });
  });

  it('places every tile within the board bounds', () => {
    const board = placeRandomTerrain([], BOARD_SIZE);
    Object.keys(board).forEach((index) => {
      expect(Number(index)).toBeGreaterThanOrEqual(0);
      expect(Number(index)).toBeLessThan(BOARD_SIZE * BOARD_SIZE);
    });
  });

  it('caps the count at however many empty cells remain, without erroring', () => {
    // Leave only 2 cells free on a tiny board.
    const occupied = Array.from({ length: 14 }, (_, i) => i);
    const board = placeRandomTerrain(occupied, 4);
    expect(Object.keys(board).length).toBeLessThanOrEqual(2);
  });

  it('places nothing when every cell is already occupied', () => {
    const occupied = Array.from({ length: 16 }, (_, i) => i);
    const board = placeRandomTerrain(occupied, 4);
    expect(board).toEqual({});
  });
});
