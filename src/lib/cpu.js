import { getNeighbors, getPlayableIndices } from './board.js';
import { canPlaceCard, resolveCaptures } from './combat.js';
import { getEligibleFoodIndices, getAdjacentBirdIndices } from './food.js';
import { rotateSides } from './rotation.js';

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
      row: Math.floor(index / boardSize.width),
      col: index % boardSize.width,
    });
  });
  return positions;
}

// Chebyshev (chessboard) distance from a cell to the nearest Food tile —
// Infinity if there's no Food left on the board at all.
function distanceToNearestFood(positions, index, boardSize) {
  const row = Math.floor(index / boardSize.width);
  const col = index % boardSize.width;
  return positions.reduce(
    (min, { row: foodRow, col: foodCol }) =>
      Math.min(min, Math.max(Math.abs(row - foodRow), Math.abs(col - foodCol))),
    Infinity,
  );
}

// Whether placing the CPU's bird at cellIndex would give it strict
// majority control (and so eating eligibility) over an adjacent Food
// tile it doesn't already control — simulates the vote the new bird adds
// without needing the placement to have actually happened yet.
export function wouldWinFoodMajority(board, boardSize, ownerId, cellIndex) {
  const neighbors = getNeighbors(cellIndex, boardSize);
  return Object.values(neighbors).some((foodIndex) => {
    if (foodIndex === null || board[foodIndex]?.type !== 'food') return false;

    const counts = {};
    Object.values(getNeighbors(foodIndex, boardSize)).forEach((birdIndex) => {
      if (birdIndex === null || birdIndex === cellIndex) return;
      const bird = board[birdIndex];
      // Terrain has no ownerId — left uncounted here it would inflate
      // "others" as a phantom opponent vote (#107 follow-up).
      if (!bird || bird.type === 'food' || bird.type === 'terrain') return;
      counts[bird.ownerId] = (counts[bird.ownerId] ?? 0) + 1;
    });
    const mine = (counts[ownerId] ?? 0) + 1;
    const others = Object.entries(counts).reduce(
      (sum, [owner, count]) => (owner === ownerId ? sum : sum + count),
      0,
    );
    return mine > others;
  });
}

// Whether placing the CPU's bird at cellIndex would break an opponent's
// current strict majority lead on an adjacent Food tile — the crux of
// actually contesting Food rather than just camping near uncontested
// tiles (#91).
export function contestsFoodMajority(board, boardSize, ownerId, cellIndex) {
  const neighbors = getNeighbors(cellIndex, boardSize);
  return Object.values(neighbors).some((foodIndex) => {
    if (foodIndex === null || board[foodIndex]?.type !== 'food') return false;

    const counts = {};
    Object.values(getNeighbors(foodIndex, boardSize)).forEach((birdIndex) => {
      if (birdIndex === null || birdIndex === cellIndex) return;
      const bird = board[birdIndex];
      // Terrain has no ownerId — left uncounted here it would inflate
      // maxOpponent as a phantom opponent vote (#107 follow-up).
      if (!bird || bird.type === 'food' || bird.type === 'terrain') return;
      counts[bird.ownerId] = (counts[bird.ownerId] ?? 0) + 1;
    });

    const mineBefore = counts[ownerId] ?? 0;
    const maxOpponent = Object.entries(counts).reduce(
      (max, [owner, count]) => (owner === ownerId ? max : Math.max(max, count)),
      0,
    );
    return (
      maxOpponent > 0 &&
      mineBefore < maxOpponent &&
      mineBefore + 1 >= maxOpponent
    );
  });
}

// Narrows the legal options down to whichever subset best fits the CPU's
// strategy, falling back to the full set if that subset is empty:
//  - aggressive: always makes whatever progress toward Food is available
//    this turn — never picks a placement farther from Food than the best
//    one on offer, even to snag a capture elsewhere on the board — and
//    uses a capture as a tiebreaker among the closest options, since
//    winning still comes from eating Food and a fight that goes nowhere
//    isn't good enough on its own.
//  - defensive: above all else, contests a Food tile an opponent
//    currently leads on — a placement that breaks their strict majority,
//    with a capture as tiebreaker. Short of that it closes the distance
//    to Food like aggressive does, preferring a capture that denies an
//    opponent's vote among the closest options, instead of stalling out
//    fully random the moment no cell is immediately Food-adjacent.
//  - ruthless: the sharpest of the three. Above all else it takes a
//    placement that immediately wins majority control of a Food tile —
//    the actual win condition, worth more than any single fight — then
//    falls back to aggressive's closest-to-Food-first logic, breaking
//    ties by capturing an opponent bird that was itself voting on Food,
//    denying their claim rather than just winning a fight.
//  - anything else (or unset): no preference, purely random.
function narrowByStrategy(options, strategy) {
  if (strategy === 'aggressive') {
    const minDistance = Math.min(...options.map((o) => o.distanceToFood));
    const closest = options.filter((o) => o.distanceToFood === minDistance);
    const closestCapturing = closest.filter((o) => o.captures);
    return closestCapturing.length > 0 ? closestCapturing : closest;
  }
  if (strategy === 'defensive') {
    const contesting = options.filter((o) => o.contestsFood);
    if (contesting.length > 0) {
      const contestingCapturing = contesting.filter((o) => o.captures);
      return contestingCapturing.length > 0 ? contestingCapturing : contesting;
    }
    const minDistance = Math.min(...options.map((o) => o.distanceToFood));
    const closest = options.filter((o) => o.distanceToFood === minDistance);
    const denying = closest.filter((o) => o.deniesFoodVote);
    return denying.length > 0 ? denying : closest;
  }
  if (strategy === 'ruthless') {
    const winning = options.filter((o) => o.winsFoodMajority);
    if (winning.length > 0) {
      const winningCapturing = winning.filter((o) => o.captures);
      return winningCapturing.length > 0 ? winningCapturing : winning;
    }
    const minDistance = Math.min(...options.map((o) => o.distanceToFood));
    const closest = options.filter((o) => o.distanceToFood === minDistance);
    const denying = closest.filter((o) => o.deniesFoodVote);
    if (denying.length > 0) return denying;
    const closestCapturing = closest.filter((o) => o.captures);
    return closestCapturing.length > 0 ? closestCapturing : closest;
  }
  return options;
}

// Picks a card/cell pair from the CPU's hand and the legal (playable and
// not a losing matchup) cells on the board, favoring options that fit its
// strategy. With Allow Card Rotation on, each card's four facings are
// considered as separate options too — the same freedom a human player
// gets via the rotate arrows — so the CPU can rotate into a legal or
// better-scoring placement instead of only ever playing its dealt
// orientation (#106). `ownerTurnCounts` is threaded into the capture
// preview below so a Landing Sickness-protected target (#122) is never
// mistaken for one the CPU is about to capture — without it, every
// strategy's capture-seeking tiebreakers would chase a "capture" that
// silently fails to happen once the move is actually played. Returns null
// if the CPU has no legal move (empty hand, no cells adjacent to Food/an
// existing card, or every adjacent cell would lose to a stronger opponent
// card in every orientation).
export function pickCpuMove(
  hand,
  board,
  boardSize,
  ownerId,
  strategy,
  allowEqual = false,
  allowRotation = false,
  ownerTurnCounts = null,
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

    const rotationSteps = allowRotation ? [0, 1, 2, 3] : [0];
    let sides = card.sides;
    rotationSteps.forEach((steps) => {
      if (steps > 0) sides = rotateSides(sides, 'cw');
      const placedCard = { ...card, ownerId, sides };
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
          ownerTurnCounts,
        );

        options.push({
          cardId: card.id,
          cellIndex,
          rotationSteps: steps,
          captures: captured.length > 0,
          adjacentToFood: isAdjacentToFood(board, cellIndex, boardSize),
          distanceToFood: distanceToNearestFood(
            positions,
            cellIndex,
            boardSize,
          ),
          winsFoodMajority: wouldWinFoodMajority(
            board,
            boardSize,
            ownerId,
            cellIndex,
          ),
          deniesFoodVote: captured.some((c) =>
            isAdjacentToFood(board, c.index, boardSize),
          ),
          contestsFood: contestsFoodMajority(
            board,
            boardSize,
            ownerId,
            cellIndex,
          ),
        });
      });
    });
  });
  if (options.length === 0) return null;

  const pool = narrowByStrategy(options, strategy);
  const { cardId, cellIndex, rotationSteps } =
    pool[Math.floor(Math.random() * pool.length)];
  return { cardId, cellIndex, rotationSteps };
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
