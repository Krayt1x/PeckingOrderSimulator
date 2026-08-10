// Returns { top, right, bottom, left } neighbor indices for a cell on a
// boardSize x boardSize grid, using null for any direction that would fall
// off the board.
export function getNeighbors(index, boardSize) {
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;
  return {
    top: row > 0 ? index - boardSize : null,
    right: col < boardSize - 1 ? index + 1 : null,
    bottom: row < boardSize - 1 ? index + boardSize : null,
    left: col > 0 ? index - 1 : null,
  };
}

// A cell is playable if it's empty and orthogonally touches at least one
// occupied cell (Food or any played card) — cards expand out from Food or
// an existing card rather than landing in open space.
export function isPlayableCell(board, index, boardSize) {
  if (board[index]) return false;
  const neighbors = getNeighbors(index, boardSize);
  return Object.values(neighbors).some(
    (neighborIndex) => neighborIndex !== null && board[neighborIndex],
  );
}

export function getPlayableIndices(board, boardSize) {
  const indices = [];
  board.forEach((_, index) => {
    if (isPlayableCell(board, index, boardSize)) indices.push(index);
  });
  return indices;
}

// Empty cells orthogonally one step away from `index` — the legal
// destinations for a move action.
export function getAdjacentEmptyIndices(board, index, boardSize) {
  const neighbors = getNeighbors(index, boardSize);
  return Object.values(neighbors).filter(
    (neighborIndex) => neighborIndex !== null && !board[neighborIndex],
  );
}
