import { describe, it, expect } from 'vitest';
import { pickCpuMove } from './cpu.js';

const BOARD_SIZE = 10;

const SIDES = { top: 1, right: 1, bottom: 1, left: 1 };

describe('pickCpuMove', () => {
  it('returns null when the hand is empty', () => {
    expect(pickCpuMove([], Array(100).fill(null), BOARD_SIZE, 'p1')).toBeNull();
  });

  it('returns null when no cell is adjacent to an occupied cell', () => {
    const hand = [{ id: 'c1', sides: SIDES }];
    const board = Array(100).fill(null);
    expect(pickCpuMove(hand, board, BOARD_SIZE, 'p1')).toBeNull();
  });

  it('picks a card from hand and a cell adjacent to the occupied one', () => {
    const hand = [
      { id: 'c1', sides: SIDES },
      { id: 'c2', sides: SIDES },
    ];
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES }; // row 5, col 5

    const move = pickCpuMove(hand, board, BOARD_SIZE, 'p1');

    expect(hand.some((c) => c.id === move.cardId)).toBe(true);
    expect(board[move.cellIndex]).toBeNull();
    // One of the 4 orthogonal neighbors of index 55.
    expect([45, 65, 54, 56]).toContain(move.cellIndex);
  });

  it('never picks a cell that would lose to a stronger adjacent opponent card', () => {
    const hand = [
      { id: 'c1', sides: { top: 1, right: 1, bottom: 1, left: 1 } },
    ];
    const board = Array(100).fill(null);
    // The only occupied cell is a strong opponent card, so every playable
    // cell (its 4 neighbors) would be a losing matchup for the weak hand.
    board[55] = {
      type: 'bird',
      ownerId: 'p2',
      sides: { top: 9, right: 9, bottom: 9, left: 9 },
    };

    expect(pickCpuMove(hand, board, BOARD_SIZE, 'p1')).toBeNull();
  });
});
