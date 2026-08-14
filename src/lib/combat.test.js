import { describe, it, expect } from 'vitest';
import { resolveCaptures, canPlaceCard, isLandingSick } from './combat.js';

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

  it('never captures Terrain', () => {
    const board = Array(100).fill(null);
    board[56] = { type: 'terrain' };

    const attacker = makeCard('p1', { top: 1, right: 9, bottom: 1, left: 1 });
    const { board: next, captured } = resolveCaptures(
      board,
      55,
      attacker,
      BOARD_SIZE,
    );

    expect(captured).toHaveLength(0);
    expect(next[56]).toBe(board[56]);
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

  it('does not capture a landing-sick target even when the attacking side is higher (#122)', () => {
    const board = Array(100).fill(null);
    board[56] = {
      ...makeCard('p2', { top: 1, right: 1, bottom: 1, left: 3 }),
      landingSicknessTurn: 4,
    };

    const attacker = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    const { board: next, captured } = resolveCaptures(
      board,
      55,
      attacker,
      BOARD_SIZE,
      { p2: 4 },
    );

    expect(captured).toHaveLength(0);
    expect(next[56]).toBe(board[56]);
  });

  it('captures a target once its owner’s following turn has begun (#122)', () => {
    const board = Array(100).fill(null);
    board[56] = {
      ...makeCard('p2', { top: 1, right: 1, bottom: 1, left: 3 }),
      landingSicknessTurn: 4,
    };

    const attacker = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    const { captured } = resolveCaptures(board, 55, attacker, BOARD_SIZE, {
      p2: 5,
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].index).toBe(56);
  });
});

describe('resolveCaptures with convertOwnership (Triple Triad, #126)', () => {
  it('flips a captured card’s ownerId instead of removing it from the board', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 3 });

    const attacker = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    const { board: next, captured } = resolveCaptures(
      board,
      55,
      attacker,
      BOARD_SIZE,
      undefined,
      true,
    );

    expect(captured).toHaveLength(1);
    // captured[].card is always the pre-capture card — still p2 here.
    expect(captured[0].card.ownerId).toBe('p2');
    // But the board itself now shows the flipped card, not a removal.
    expect(next[56]).not.toBeNull();
    expect(next[56].ownerId).toBe('p1');
    expect(next[56].sides).toEqual(board[56].sides);
  });

  it('does not flip anything when convertOwnership is off (the default)', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 3 });

    const attacker = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    const { board: next } = resolveCaptures(board, 55, attacker, BOARD_SIZE);

    expect(next[56]).toBeNull();
  });
});

describe('isLandingSick', () => {
  it('is false for a card with no landingSicknessTurn stamp', () => {
    const card = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 });
    expect(isLandingSick(card, { p1: 1 })).toBe(false);
  });

  it('is true through the rest of the landing turn and every opponent turn until the owner’s own next turn', () => {
    const card = {
      ...makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 }),
      landingSicknessTurn: 2,
    };
    expect(isLandingSick(card, { p1: 2 })).toBe(true);
  });

  it('is false as soon as the owner’s following turn begins', () => {
    const card = {
      ...makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 }),
      landingSicknessTurn: 2,
    };
    expect(isLandingSick(card, { p1: 3 })).toBe(false);
    expect(isLandingSick(card, { p1: 4 })).toBe(false);
  });

  it('is false without a card, or without an ownerTurnCounts map', () => {
    const card = {
      ...makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 }),
      landingSicknessTurn: 2,
    };
    expect(isLandingSick(null, { p1: 2 })).toBe(false);
    expect(isLandingSick(card, undefined)).toBe(false);
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

  it('ignores the owner’s own cards when checking legality', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 9 });

    const card = makeCard('p1', { top: 1, right: 1, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, card, BOARD_SIZE)).toBe(true);
  });

  it('blocks placement next to Food the same way it would an opponent card (#98)', () => {
    const board = Array(100).fill(null);
    board[56] = {
      type: 'food',
      sides: { top: 1, right: 1, bottom: 1, left: 5 },
    };

    const tooWeak = makeCard('p1', { top: 1, right: 3, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, tooWeak, BOARD_SIZE)).toBe(false);

    const tie = makeCard('p1', { top: 1, right: 5, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, tie, BOARD_SIZE)).toBe(false);
    expect(canPlaceCard(board, 55, tie, BOARD_SIZE, true)).toBe(true);

    const winner = makeCard('p1', { top: 1, right: 9, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, winner, BOARD_SIZE)).toBe(true);
  });

  it('blocks placement if any single edge would lose, even if others win', () => {
    const board = Array(100).fill(null);
    board[56] = makeCard('p2', { top: 1, right: 1, bottom: 1, left: 2 }); // right, weak
    board[45] = makeCard('p2', { top: 1, right: 1, bottom: 9, left: 1 }); // top, strong

    const card = makeCard('p1', { top: 5, right: 5, bottom: 1, left: 1 });
    expect(canPlaceCard(board, 55, card, BOARD_SIZE)).toBe(false);
  });

  it('never blocks placement next to Terrain — it has no side values to compare (#107)', () => {
    const board = Array(100).fill(null);
    board[56] = { type: 'terrain' };

    // Even a facing value of 0 should still be legal next to Terrain,
    // since Terrain isn't a matchup you win or lose — it just has no
    // side values at all to compare against.
    const weakest = makeCard('p1', { top: 0, right: 0, bottom: 0, left: 0 });
    expect(canPlaceCard(board, 55, weakest, BOARD_SIZE)).toBe(true);
  });
});
