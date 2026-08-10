import { describe, it, expect } from 'vitest';
import { pickCpuMove, pickCpuEat } from './cpu.js';

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

  it('never offers a Food-derived card as a move — those are only discarded via Use Food', () => {
    const hand = [{ id: 'c1', sides: SIDES, fromFood: true }];
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES };

    expect(pickCpuMove(hand, board, BOARD_SIZE, 'p1')).toBeNull();
  });

  it('never picks a cell whose only adjacency is its own card', () => {
    const hand = [{ id: 'c1', sides: SIDES }];
    const board = Array(100).fill(null);
    // The only occupied cell on the board is the CPU's own card — none of
    // its neighbors touch Food or an opponent, so there's no legal move.
    board[55] = { type: 'bird', ownerId: 'p1', sides: SIDES };

    expect(pickCpuMove(hand, board, BOARD_SIZE, 'p1')).toBeNull();
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

  it('prefers a capturing placement when using the aggressive strategy', () => {
    const strongCard = {
      id: 'c1',
      sides: { top: 9, right: 9, bottom: 9, left: 9 },
    };
    const board = Array(100).fill(null);
    // Food's own neighbors (45, 54, 56, 65) never capture anything. A
    // weak opponent bird at 57 adds its own neighbors (47, 56, 58, 67) as
    // legal cells too, and placing the strong card on any of those
    // captures it — 56 is the only cell in both sets.
    board[55] = { type: 'food', sides: SIDES };
    board[57] = {
      type: 'bird',
      ownerId: 'p2',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    const move = pickCpuMove(
      [strongCard],
      board,
      BOARD_SIZE,
      'p1',
      'aggressive',
    );

    expect([47, 56, 58, 67]).toContain(move.cellIndex);
    expect([45, 54, 65]).not.toContain(move.cellIndex);
  });

  it('prefers a capture near Food over a capture far from it, when aggressive', () => {
    const strongCard = {
      id: 'c1',
      sides: { top: 9, right: 9, bottom: 9, left: 9 },
    };
    const board = Array(100).fill(null);
    // Food's neighbors: 45, 54, 56, 65. A weak opponent bird at 57 makes
    // 56 both a capture AND Food-adjacent.
    board[55] = { type: 'food', sides: SIDES };
    board[57] = {
      type: 'bird',
      ownerId: 'p2',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };
    // A second weak opponent bird far from Food opens up a capturing
    // option (19) that doesn't progress toward Food at all.
    board[20] = {
      type: 'bird',
      ownerId: 'p2',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    const move = pickCpuMove(
      [strongCard],
      board,
      BOARD_SIZE,
      'p1',
      'aggressive',
    );

    // Both 56 and 19 (among others) capture something, but only 56 is
    // also Food-adjacent — aggressive should prefer it.
    expect(move.cellIndex).toBe(56);
  });

  it('falls back to any legal option when aggressive has nothing to capture', () => {
    const hand = [{ id: 'c1', sides: SIDES }];
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES };

    const move = pickCpuMove(hand, board, BOARD_SIZE, 'p1', 'aggressive');

    expect([45, 54, 56, 65]).toContain(move.cellIndex);
  });

  it('prefers a Food-adjacent placement when using the defensive strategy', () => {
    const card = { id: 'c1', sides: SIDES };
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES }; // legal cells: 45, 54, 56, 65
    // A separate opponent bird far from Food opens up unrelated legal
    // cells (10, 19, 21, 30) that aren't adjacent to Food.
    board[20] = {
      type: 'bird',
      ownerId: 'p2',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    const move = pickCpuMove([card], board, BOARD_SIZE, 'p1', 'defensive');

    expect([45, 54, 56, 65]).toContain(move.cellIndex);
  });
});

describe('pickCpuEat', () => {
  function bird(ownerId) {
    return { type: 'bird', ownerId, sides: SIDES };
  }

  it('returns null when the CPU has no Food it is eligible to eat', () => {
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES };
    board[45] = bird('p2');

    expect(pickCpuEat(board, BOARD_SIZE, 'p1')).toBeNull();
  });

  it('picks an eligible Food tile and only ever nominates its own bird, never an opponent’s', () => {
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES };
    board[45] = bird('p1'); // top
    board[54] = bird('p1'); // left
    board[56] = bird('p2'); // right — p1 has majority (2 vs 1)

    const choice = pickCpuEat(board, BOARD_SIZE, 'p1');

    expect(choice.foodIndex).toBe(55);
    expect([45, 54]).toContain(choice.birdIndex);
  });

  it('eats its own bird when that is the only adjacent one', () => {
    const board = Array(100).fill(null);
    board[55] = { type: 'food', sides: SIDES };
    board[45] = bird('p1');

    const choice = pickCpuEat(board, BOARD_SIZE, 'p1');

    expect(choice.foodIndex).toBe(55);
    expect(choice.birdIndex).toBe(45);
  });
});
