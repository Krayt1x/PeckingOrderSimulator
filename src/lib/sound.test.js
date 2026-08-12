import { describe, it, expect } from 'vitest';
import { playActionTick, playFoodCrunch } from './sound.js';

describe('sound', () => {
  it('does not throw when no AudioContext is available (e.g. in tests)', () => {
    expect(() => playActionTick()).not.toThrow();
    expect(() => playFoodCrunch()).not.toThrow();
  });
});
