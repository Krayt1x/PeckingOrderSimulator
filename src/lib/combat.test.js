import { describe, it, expect } from 'vitest';
import {
  resolveCaptures,
  canPlaceCard,
  resolveFoodCaptures,
} from './combat.js';

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

describe('resolveFoodCaptures', () => {
  it('captures Food when the facing value exactly matches (#90)', () => {
    const board = Array(100).fill(null);
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 3 },
    };

    const card = makeCard('p1', { top: 1, right: 3, bottom: 1, left: 1 });
    const captured = resolveFoodCaptures(board, 55, card, BOARD_SIZE);

    expect(captured).toHaveLength(1);
    expect(captured[0].index).toBe(56);
  });

  it('does not capture Food when the value is higher or lower, only exact', () => {
    const board = Array(100).fill(null);
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 3 },
    };

    const higher = makeCard('p1', { top: 1, right: 9, bottom: 1, left: 1 });
    expect(resolveFoodCaptures(board, 55, higher, BOARD_SIZE)).toHaveLength(0);

    const lower = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 });
    expect(resolveFoodCaptures(board, 55, lower, BOARD_SIZE)).toHaveLength(0);
  });

  it('never captures an opponent bird, only Food', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 3 });

    const card = makeCard('p1', { top: 1, right: 3, bottom: 1, left: 1 });
    expect(resolveFoodCaptures(board, 55, card, BOARD_SIZE)).toHaveLength(0);
  });

  it('captures multiple matching Food neighbors at once', () => {
    const board = Array(100).fill(null);
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 2 },
    };
    board[45] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 2, left: 1 },
    };

    const card = makeCard('p1', { top: 2, right: 2, bottom: 1, left: 1 });
    const captured = resolveFoodCaptures(board, 55, card, BOARD_SIZE);

    const indices = captured.map((c) => c.index).sort((a, b) => a - b);
    expect(indices).toEqual([45, 56]);
  });
});

describe('canPlaceCard', () => {
  it('blocks placement when the facing side is lower than the opponent’s', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 5 });

    const card = makeCard('p1', { top: 1, right: 3, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, card, BOARD_SIZE)).toBe(false);
  });

  it('blocks a tie by default, but allows it strictly higher', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 5 });

    const tie = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, tie, BOARD_SIZE)).toBe(false);

    const winner = makeCard('p1', { top: 1, right: 9, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, winner, BOARD_SIZE)).toBe(true);
  });

  it('allows a tie when the Equal Value Playable ruleset is on', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 5 });

    const tie = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, tie, BOARD_SIZE, true)).toBe(true);
  });

  it('ignores the owner’s own cards and Food when checking legality', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 9 });
    board[45] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 1 },
    };

    const card = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, card, BOARD_SIZE)).toBe(true);
  });

  it('blocks placement if any single edge would lose, even if others win', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 2 }); // right, weak
    board[45] = makeCard('p2', { top: 1, right: 1, bottom: 9, left: 1 }); // top, strong

    const card = makeCard('p1', { top: 5, right: 5, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, card, BOARD_SIZE)).toBe(false);
  });
});
