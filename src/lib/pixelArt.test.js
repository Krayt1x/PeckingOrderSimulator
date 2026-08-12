import { describe, expect, it } from 'vitest';
import { generatePixelGrid, colorForName } from './pixelArt.js';

describe('generatePixelGrid', () => {
  it('is deterministic for the same name', () => {
    expect(generatePixelGrid('Ginger')).toEqual(generatePixelGrid('Ginger'));
  });

  it('produces different grids for different names', () => {
    expect(generatePixelGrid('Ginger')).not.toEqual(generatePixelGrid('Rocky'));
  });

  it('is mirrored left-to-right', () => {
    const grid = generatePixelGrid('Babs');
    grid.forEach((row) => {
      const mirrored = [...row].reverse();
      expect(row).toEqual(mirrored);
    });
  });

  it('returns a square grid of booleans', () => {
    const grid = generatePixelGrid('Bunty');
    expect(grid.length).toBeGreaterThan(0);
    grid.forEach((row) => {
      expect(row.length).toBe(grid.length);
      row.forEach((cell) => expect(typeof cell).toBe('boolean'));
    });
  });

  it('handles an empty or missing name without throwing', () => {
    expect(() => generatePixelGrid('')).not.toThrow();
    expect(() => generatePixelGrid(undefined)).not.toThrow();
    expect(generatePixelGrid('')).toEqual(generatePixelGrid(undefined));
  });
});

describe('colorForName', () => {
  it('is deterministic for the same name', () => {
    expect(colorForName('Mac')).toBe(colorForName('Mac'));
  });

  it('produces different colors for different names, in general', () => {
    expect(colorForName('Mac')).not.toBe(colorForName('Fowler'));
  });

  it('returns an HSL color string', () => {
    expect(colorForName('Mr. Tweedy')).toMatch(/^hsl\(\d+deg 65% 45%\)$/);
  });

  it('handles an empty or missing name without throwing', () => {
    expect(() => colorForName('')).not.toThrow();
    expect(() => colorForName(undefined)).not.toThrow();
  });
});
