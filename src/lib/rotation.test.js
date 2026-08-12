import { describe, it, expect } from 'vitest';
import { rotateSides, baseSides } from './rotation.js';

const SIDES = { top: 1, right: 2, bottom: 3, left: 4 };

describe('rotateSides', () => {
  it('spins clockwise: each side takes its counter-clockwise neighbor’s value', () => {
    expect(rotateSides(SIDES, 'cw')).toEqual({
      top: 4,
      right: 1,
      bottom: 2,
      left: 3,
    });
  });

  it('spins anti-clockwise: each side takes its clockwise neighbor’s value', () => {
    expect(rotateSides(SIDES, 'ccw')).toEqual({
      top: 2,
      right: 3,
      bottom: 4,
      left: 1,
    });
  });

  it('four clockwise turns return to the original values', () => {
    let result = SIDES;
    for (let i = 0; i < 4; i++) result = rotateSides(result, 'cw');
    expect(result).toEqual(SIDES);
  });
});

describe('baseSides', () => {
  it('is a no-op at rotation 0', () => {
    expect(baseSides(SIDES, 0)).toEqual(SIDES);
  });

  it('undoes the exact rotation that produced the given sides', () => {
    const rotated = rotateSides(SIDES, 'cw');
    expect(baseSides(rotated, 90)).toEqual(SIDES);

    let rotated180 = rotateSides(rotateSides(SIDES, 'cw'), 'cw');
    expect(baseSides(rotated180, 180)).toEqual(SIDES);
  });

  it('normalizes negative and over-360 rotation values the same way', () => {
    const rotated = rotateSides(SIDES, 'cw');
    expect(baseSides(rotated, -270)).toEqual(SIDES);
    expect(baseSides(rotated, 450)).toEqual(SIDES);
  });
});
