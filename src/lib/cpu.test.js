import { describe, it, expect } from 'vitest';
import { pickCpuMove } from './cpu.js';

describe('pickCpuMove', () => {
  it('returns null when the hand is empty', () => {
    expect(pickCpuMove([], Array(100).fill(null))).toBeNull();
  });

  it('returns null when the board has no empty cells', () => {
    const hand = [{ id: 'c1' }];
    const board = Array(100).fill({ id: 'occupied' });
    expect(pickCpuMove(hand, board)).toBeNull();
  });

  it('picks a card from hand and an empty cell on the board', () => {
    const hand = [{ id: 'c1' }, { id: 'c2' }];
    const board = Array(100).fill(null);
    board[5] = { id: 'food' };

    const move = pickCpuMove(hand, board);

    expect(hand.some((c) => c.id === move.cardId)).toBe(true);
    expect(board[move.cellIndex]).toBeNull();
  });
});
