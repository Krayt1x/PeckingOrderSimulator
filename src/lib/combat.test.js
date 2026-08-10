import { describe, it, expect } from 'vitest';
import { resolveCaptures } from './combat.js';

const BOARD_SIZE = 10;

function makeCard(ownerId, sides, type) {
  return { ownerId, sides, type };
}

describe('resolveCaptures', () => {
  it('captures an opponent card when the attacking side is higher', () => {
    const board = Array(100).fill(null);
    // Opponent card at 56 (right of 55), its left side is 3.
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 3 });

    const attacker = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    const { board: next, captured } = resolveCaptures(
      board,
      55,
      attacker,
      BOARD_SIZE,
    );

    expect(captured).toHaveLength(1);
    expect(captured[0].index).toBe(56);
    expect(next[56]).toBeNull();
  });

  it('does not capture when the attacking side is lower or equal', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 5 });

    const attacker = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    const { board: next, captured } = resolveCaptures(
      board,
      55,
      attacker,
      BOARD_SIZE,
    );

    expect(captured).toHaveLength(0);
    expect(next[56]).toBe(board[56]);
  });

  it('never captures the owner’s own cards', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 });

    const attacker = makeCard('p1', { top: 1, right: 9, bottom: 1, left: 1 });
    const { captured } = resolveCaptures(board, 55, attacker, BOARD_SIZE);

    expect(captured).toHaveLength(0);
  });

  it('never captures Food', () => {
    const board = Array(100).fill(null);
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    const attacker = makeCard('p1', { top: 1, right: 9, bottom: 1, left: 1 });
    const { captured } = resolveCaptures(board, 55, attacker, BOARD_SIZE);

    expect(captured).toHaveLength(0);
  });

  it('captures multiple neighbors in a single placement', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 2 }); // right
    board[45] = makeCard('p2', { top: 1, right: 1, bottom: 2, left: 1 }); // top

    const attacker = makeCard('p1', { top: 5, right: 5, bottom: 1, left: 1 });
    const { captured } = resolveCaptures(board, 55, attacker, BOARD_SIZE);

    const indices = captured.map((c) => c.index).sort((a, b) => a - b);
    expect(indices).toEqual([45, 56]);
  });
});
