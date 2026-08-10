import { getPlayableIndices } from './board.js';
import { canPlaceCard } from './combat.js';
import { getEligibleFoodIndices, getAdjacentBirdIndices } from './food.js';

// Picks a random card/cell pair from the CPU's hand and the legal
// (playable and not a losing matchup) cells on the board. Returns null if
// the CPU has no legal move (empty hand, no cells adjacent to Food/an
// existing card, or every adjacent cell would lose to a stronger
// opponent card).
export function pickCpuMove(hand, board, boardSize, ownerId) {
  if (hand.length === 0) return null;

  const playableIndexes = getPlayableIndices(board, boardSize, ownerId);
  if (playableIndexes.length === 0) return null;

  const options = [];
  hand.forEach((card) => {
    const placedCard = { ...card, ownerId };
    playableIndexes.forEach((cellIndex) => {
      if (canPlaceCard(board, cellIndex, placedCard, boardSize)) {
        options.push({ cardId: card.id, cellIndex });
      }
    });
  });
  if (options.length === 0) return null;

  return options[Math.floor(Math.random() * options.length)];
}

// Picks a Food tile the CPU currently has majority control over to eat,
// and which adjacent bird to remove with it — preferring an opponent's
// bird (denying them a card) over the CPU's own when both are options.
// Returns null if the CPU isn't eligible to eat any Food right now.
export function pickCpuEat(board, boardSize, ownerId) {
  const eligible = getEligibleFoodIndices(board, boardSize, ownerId);
  if (eligible.length === 0) return null;

  const foodIndex = eligible[Math.floor(Math.random() * eligible.length)];
  const birdChoices = getAdjacentBirdIndices(board, foodIndex, boardSize);
  const opponentBirds = birdChoices.filter((i) => board[i].ownerId !== ownerId);
  const pool = opponentBirds.length > 0 ? opponentBirds : birdChoices;
  const birdIndex = pool[Math.floor(Math.random() * pool.length)];

  return { foodIndex, birdIndex };
}
