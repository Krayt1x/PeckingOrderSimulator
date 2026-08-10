import { getPlayableIndices } from './board.js';

// Picks a random card from the CPU's hand and a random legal (playable)
// cell on the board. Returns null if the CPU has no legal move (empty
// hand, or no cells adjacent to Food/an existing card).
export function pickCpuMove(hand, board, boardSize) {
  if (hand.length === 0) return null;

  const playableIndexes = getPlayableIndices(board, boardSize);
  if (playableIndexes.length === 0) return null;

  const card = hand[Math.floor(Math.random() * hand.length)];
  const cellIndex =
    playableIndexes[Math.floor(Math.random() * playableIndexes.length)];
  return { cardId: card.id, cellIndex };
}
