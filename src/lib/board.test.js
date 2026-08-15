import { describe, it, expect } from 'vitest';
import {
  getNeighbors,
  isPlayableCell,
  getPlayableIndices,
  getAdjacentEmptyIndices,
} from './board.js';

const BOARD_SIZE = { width: 10, height: 10 };

describe('getNeighbors', () => {
  it('returns all 4 neighbors for an interior cell', () => {
    // index 55 = row 5, col 5
    expect(getNeighbors(55, BOARD_SIZE)).toEqual({
      top: 45,
      right: 56,
      bottom: 65,
      left: 54,
    });
  });

  it('nulls out neighbors that would fall off the board', () => {
    // index 0 = row 0, col 0 (top-left corner)
    expect(getNeighbors(0, BOARD_SIZE)).toEqual({
      top: null,
      right: 1,
      bottom: 10,
      left: null,
    });
  });

  it('does not wrap columns across row boundaries', () => {
    // index 9 = row 0, col 9 (top-right corner) — right must be null, not 10
    expect(getNeighbors(9, BOARD_SIZE).right).toBeNull();
    // index 10 = row 1, col 0 — left must be null, not 9
    expect(getNeighbors(10, BOARD_SIZE).left).toBeNull();
  });
});

describe('isPlayableCell', () => {
  it('is false for an already-occupied cell', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'card', ownerId: 'p1' };
    expect(isPlayableCell(board, 55, BOARD_SIZE, 'p2')).toBe(false);
  });

  it('is false for an empty cell with no occupied neighbor', () => {
    const board = Array(100).fill(null);
    expect(isPlayableCell(board, 0, BOARD_SIZE, 'p1')).toBe(false);
  });

  it('is true for an empty cell orthogonally touching Food', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'food', type: 'food' };
    expect(isPlayableCell(board, 45, BOARD_SIZE, 'p1')).toBe(true);
    expect(isPlayableCell(board, 56, BOARD_SIZE, 'p1')).toBe(true);
  });

  it('is true for an empty cell orthogonally touching Terrain (#107)', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'rock', type: 'terrain' };
    expect(isPlayableCell(board, 45, BOARD_SIZE, 'p1')).toBe(true);
    expect(isPlayableCell(board, 56, BOARD_SIZE, 'p1')).toBe(true);
  });

  it('is true for an empty cell orthogonally touching an opponent card', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'card', ownerId: 'p2' };
    expect(isPlayableCell(board, 45, BOARD_SIZE, 'p1')).toBe(true);
  });

  it('is false for an empty cell whose only occupied neighbor is the same owner’s own card', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'card', ownerId: 'p1' };
    expect(isPlayableCell(board, 45, BOARD_SIZE, 'p1')).toBe(false);
  });

  it('is false for a diagonal neighbor of an occupied cell', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'food', type: 'food' };
    expect(isPlayableCell(board, 44, BOARD_SIZE, 'p1')).toBe(false);
  });
});

describe('getPlayableIndices', () => {
  it('returns exactly the 4 orthogonal neighbors of a single Food cell', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'food', type: 'food' };
    const playable = getPlayableIndices(board, BOARD_SIZE, 'p1').sort(
      (a, b) => a - b,
    );
    expect(playable).toEqual([45, 54, 56, 65]);
  });

  it('excludes cells only adjacent to the given owner’s own card', () => {
    const board = Array(100).fill(null);
    board[55] = { id: 'card', ownerId: 'p1' };
    expect(getPlayableIndices(board, BOARD_SIZE, 'p1')).toEqual([]);
    expect(
      getPlayableIndices(board, BOARD_SIZE, 'p2').sort((a, b) => a - b),
    ).toEqual([45, 54, 56, 65]);
  });
});

describe('getAdjacentEmptyIndices', () => {
  it('returns only empty orthogonal neighbors', () => {
    const board = Array(100).fill(null);
    board[56] = { id: 'blocker' };
    const empties = getAdjacentEmptyIndices(board, 55, BOARD_SIZE).sort(
      (a, b) => a - b,
    );
    expect(empties).toEqual([45, 54, 65]);
  });
});
