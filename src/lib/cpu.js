import { getNeighbors, getPlayableIndices } from './board.js';
import { canPlaceCard, resolveCaptures } from './combat.js';
import { getEligibleFoodIndices, getAdjacentBirdIndices } from './food.js';

function isAdjacentToFood(board, index, boardSize) {
  const neighbors = getNeighbors(index, boardSize);
  return Object.values(neighbors).some(
    (neighborIndex) =>
      neighborIndex !== null && board[neighborIndex]?.type === 'food',
  );
}

// Narrows the legal options down to whichever subset best fits the CPU's
// strategy, falling back to the full set if that subset is empty:
//  - aggressive: prefers a placement that captures an opponent's card.
//  - defensive: prefers a placement next to Food, claiming ground that
//    denies opponents majority control of it.
//  - anything else (or unset): no preference, purely random.
function narrowByStrategy(options, strategy) {
  if (strategy === 'aggressive') {
    const capturing = options.filter((o) => o.captures);
    if (capturing.length > 0) return capturing;
  }
  if (strategy === 'defensive') {
    const foodAdjacent = options.filter((o) => o.adjacentToFood);
    if (foodAdjacent.length > 0) return foodAdjacent;
  }
  return options;
}

// Picks a card/cell pair from the CPU's hand and the legal (playable and
// not a losing matchup) cells on the board, favoring options that fit its
// strategy. Returns null if the CPU has no legal move (empty hand, no
// cells adjacent to Food/an existing card, or every adjacent cell would
// lose to a stronger opponent card).
export function pickCpuMove(hand, board, boardSize, ownerId, strategy) {
  if (hand.length === 0) return null;

  const playableIndexes = getPlayableIndices(board, boardSize, ownerId);
  if (playableIndexes.length === 0) return null;

  const options = [];
  hand.forEach((card) => {
    // A Food-derived card can only be discarded via Use Food, never
    // played onto the board.
    if (card.fromFood) return;
    const placedCard = { ...card, ownerId };
    playableIndexes.forEach((cellIndex) => {
      if (!canPlaceCard(board, cellIndex, placedCard, boardSize)) return;

      const withCard = [...board];
      withCard[cellIndex] = placedCard;
      const { captured } = resolveCaptures(
        withCard,
        cellIndex,
        placedCard,
        boardSize,
      );

      options.push({
        cardId: card.id,
        cellIndex,
        captures: captured.length > 0,
        adjacentToFood: isAdjacentToFood(board, cellIndex, boardSize),
      });
    });
  });
  if (options.length === 0) return null;

  const pool = narrowByStrategy(options, strategy);
  const { cardId, cellIndex } = pool[Math.floor(Math.random() * pool.length)];
  return { cardId, cellIndex };
}

// Picks a Food tile the CPU currently has majority control over to eat,
// and which of its own adjacent birds to sacrifice for it — only the
// CPU's own birds are ever legal choices. Returns null if the CPU isn't
// eligible to eat any Food right now.
export function pickCpuEat(board, boardSize, ownerId) {
  const eligible = getEligibleFoodIndices(board, boardSize, ownerId);
  if (eligible.length === 0) return null;

  const foodIndex = eligible[Math.floor(Math.random() * eligible.length)];
  const birdChoices = getAdjacentBirdIndices(
    board,
    foodIndex,
    boardSize,
    ownerId,
  );
  const birdIndex = birdChoices[Math.floor(Math.random() * birdChoices.length)];

  return { foodIndex, birdIndex };
}
