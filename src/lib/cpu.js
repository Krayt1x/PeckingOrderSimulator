// Picks a random card from the CPU's hand and a random empty, non-Food
// cell on the board. Returns null if the CPU has no legal move (empty
// hand, or no open cells).
export function pickCpuMove(hand, board) {
  if (hand.length === 0) return null;

  const emptyIndexes = [];
  board.forEach((cell, index) => {
    if (!cell) emptyIndexes.push(index);
  });
  if (emptyIndexes.length === 0) return null;

  const card = hand[Math.floor(Math.random() * hand.length)];
  const cellIndex =
    emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
  return { cardId: card.id, cellIndex };
}
