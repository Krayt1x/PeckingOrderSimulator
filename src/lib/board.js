// Returns { top, right, bottom, left } neighbor indices for a cell on a
// boardSize.width x boardSize.height grid, using null for any direction
// that would fall off the board.
export function getNeighbors(index, boardSize) {
  const { width, height } = boardSize;
  const row = Math.floor(index / width);
  const col = index % width;
  return {
    top: row > 0 ? index - width : null,
    right: col < width - 1 ? index + 1 : null,
    bottom: row < height - 1 ? index + width : null,
    left: col > 0 ? index - 1 : null,
  };
}

// A cell is playable if it's empty and orthogonally touches Food or an
// opponent's card — cards expand out from Food or into contested ground,
// never simply outward through a player's own cluster (that alone isn't
// enough to unlock a new cell).
export function isPlayableCell(board, index, boardSize, ownerId) {
  if (board[index]) return false;
  const neighbors = getNeighbors(index, boardSize);
  return Object.values(neighbors).some((neighborIndex) => {
    if (neighborIndex === null) return false;
    const neighbor = board[neighborIndex];
    if (!neighbor) return false;
    return neighbor.type === 'food' || neighbor.ownerId !== ownerId;
  });
}

export function getPlayableIndices(board, boardSize, ownerId) {
  const indices = [];
  board.forEach((_, index) => {
    if (isPlayableCell(board, index, boardSize, ownerId)) indices.push(index);
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
