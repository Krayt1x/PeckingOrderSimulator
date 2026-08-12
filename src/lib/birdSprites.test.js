import { describe, expect, it } from 'vitest';
import { buildBirdSpriteGrid } from './birdSprites.js';

const KNOWN_SPECIES = [
  'sparrow',
  'pigeon',
  'crow',
  'bin-chicken',
  'seagull',
  'pelican',
  'cockatoo',
  'duck',
  'magpie',
  'swan',
];

describe('buildBirdSpriteGrid', () => {
  it('returns a 16x16 grid for every known species', () => {
    KNOWN_SPECIES.forEach((typeId) => {
      const grid = buildBirdSpriteGrid(typeId, 'Test');
      expect(grid).toHaveLength(16);
      grid.forEach((row) => expect(row).toHaveLength(16));
    });
  });

  it('draws at least some pixels for every known species', () => {
    KNOWN_SPECIES.forEach((typeId) => {
      const grid = buildBirdSpriteGrid(typeId, 'Test');
      const filled = grid.flat().filter(Boolean);
      expect(filled.length).toBeGreaterThan(10);
    });
  });

  it('is deterministic for the same type and name', () => {
    expect(buildBirdSpriteGrid('cockatoo', 'Cockatoo')).toEqual(
      buildBirdSpriteGrid('cockatoo', 'Cockatoo'),
    );
  });

  it('falls back to a name-colored generic bird for an unknown type', () => {
    const grid = buildBirdSpriteGrid(undefined, 'Custom Bird');
    expect(grid).toHaveLength(16);
    const filled = grid.flat().filter(Boolean);
    expect(filled.length).toBeGreaterThan(10);
  });

  it('gives different unknown-type names different colors, in general', () => {
    const a = buildBirdSpriteGrid('custom-1', 'Alpha');
    const b = buildBirdSpriteGrid('custom-1', 'Zephyr');
    expect(a).not.toEqual(b);
  });

  it('handles an empty or missing name without throwing', () => {
    expect(() => buildBirdSpriteGrid(undefined, '')).not.toThrow();
    expect(() => buildBirdSpriteGrid(undefined, undefined)).not.toThrow();
  });
});
