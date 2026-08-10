import { describe, it, expect } from 'vitest';
import { pickCpuMove } from './cpu.js';

const BOARD_SIZE = 10;

describe('pickCpuMove', () => {
  it('returns null when the hand is empty', () => {
    expect(pickCpuMove([], Array(100).fill(null), BOARD_SIZE)).toBeNull();
  });

  it('returns null when no cell is adjacent to an occupied cell', () => {
    const hand = [{ id: 'c1' }];
    const board = Array(100).fill(null);
    expect(pickCpuMove(hand, board, BOARD_SIZE)).toBeNull();
  });

  it('picks a card from hand and a cell adjacent to the occupied one', () => {
    const hand = [{ id: 'c1' }, { id: 'c2' }];
    const board = Array(100).fill(null);
    board[55] = { id: 'food' }; // row 5, col 5

    const move = pickCpuMove(hand, board, BOARD_SIZE);

    expect(hand.some((c) => c.id === move.cardId)).toBe(true);
    expect(board[move.cellIndex]).toBeNull();
    // One of the 4 orthogonal neighbors of index 55.
    expect([45, 65, 54, 56]).toContain(move.cellIndex);
  });
});
