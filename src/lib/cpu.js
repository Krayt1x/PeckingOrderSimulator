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

function foodPositions(board, boardSize) {
  const positions = [];
  board.forEach((cell, index) => {
    if (cell?.type !== 'food') return;
    positions.push({
      row: Math.floor(index / boardSize),
      col: index % boardSize,
    });
  });
  return positions;
}

// Chebyshev (chessboard) distance from a cell to the nearest Food tile —
// Infinity if there's no Food left on the board at all.
function distanceToNearestFood(positions, index, boardSize) {
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;
  return positions.reduce(
    (min, { row: foodRow, col: foodCol }) =>
      Math.min(min, Math.max(Math.abs(row - foodRow), Math.abs(col - foodCol))),
    Infinity,
  );
}

// Narrows the legal options down to whichever subset best fits the CPU's
// strategy, falling back to the full set if that subset is empty:
//  - aggressive: always makes whatever progress toward Food is available
//    this turn — never picks a placement farther from Food than the best
//    one on offer, even to snag a capture elsewhere on the board — and
//    uses a capture as a tiebreaker among the closest options, since
//    winning still comes from eating Food and a fight that goes nowhere
//    isn't good enough on its own.
//  - defensive: prefers a placement next to Food, claiming ground that
//    denies opponents majority control of it.
//  - anything else (or unset): no preference, purely random.
function narrowByStrategy(options, strategy) {
  if (strategy === 'aggressive') {
    const minDistance = Math.min(...options.map((o) => o.distanceToFood));
    const closest = options.filter((o) => o.distanceToFood === minDistance);
    const closestCapturing = closest.filter((o) => o.captures);
    return closestCapturing.length > 0 ? closestCapturing : closest;
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
export function pickCpuMove(
  hand,
  board,
  boardSize,
  ownerId,
  strategy,
  allowEqual = false,
) {
  if (hand.length === 0) return null;

  const playableIndexes = getPlayableIndices(board, boardSize, ownerId);
  if (playableIndexes.length === 0) return null;

  const positions = foodPositions(board, boardSize);
  const options = [];
  hand.forEach((card) => {
    // A Food-derived card can only be discarded via Use Food, never
    // played onto the board.
    if (card.fromFood) return;
    const placedCard = { ...card, ownerId };
    playableIndexes.forEach((cellIndex) => {
      if (!canPlaceCard(board, cellIndex, placedCard, boardSize, allowEqual))
        return;

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
        distanceToFood: distanceToNearestFood(positions, cellIndex, boardSize),
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
