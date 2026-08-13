import { describe, it, expect } from 'vitest';
import { buildTerrainSpriteGrid } from './terrainSprite.js';

describe('buildTerrainSpriteGrid', () => {
  it('returns a square grid', () => {
    const grid = buildTerrainSpriteGrid();
    expect(grid.length).toBeGreaterThan(0);
    grid.forEach((row) => expect(row.length).toBe(grid.length));
  });

  it('is deterministic — same output every call', () => {
    expect(buildTerrainSpriteGrid()).toEqual(buildTerrainSpriteGrid());
  });

  it('leaves every corner transparent (a rounded silhouette, not a filled square)', () => {
    const grid = buildTerrainSpriteGrid();
    const last = grid.length - 1;
    expect(grid[0][0]).toBeNull();
    expect(grid[0][last]).toBeNull();
    expect(grid[last][0]).toBeNull();
    expect(grid[last][last]).toBeNull();
  });

  it('fills the center with a non-transparent color', () => {
    const grid = buildTerrainSpriteGrid();
    const mid = Math.floor(grid.length / 2);
    expect(grid[mid][mid]).not.toBeNull();
  });
});
