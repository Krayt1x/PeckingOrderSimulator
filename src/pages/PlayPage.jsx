import { useEffect, useMemo, useRef, useState } from 'react';
import GameBoard, { BOARD_SIZE } from '../components/GameBoard.jsx';
import Hand from '../components/Hand.jsx';
import StatusTray from '../components/StatusTray.jsx';
import PixelBirdSprite from '../components/PixelBirdSprite.jsx';
import TutorialIntroModal from '../components/TutorialIntroModal.jsx';
import { HAND_SIZE, buildDrawPile, shuffle } from '../lib/decks.js';
import {
  placeFoodShapes,
  getEligibleFoodIndices,
  getAdjacentBirdIndices,
  foodPointValue,
} from '../lib/food.js';
import { placeRandomTerrain } from '../lib/terrain.js';
import {
  isPlayableCell,
  getPlayableIndices,
  getAdjacentEmptyIndices,
} from '../lib/board.js';
import { resolveCaptures, canPlaceCard, isLandingSick } from '../lib/combat.js';
import { pickCpuMove, pickCpuEat } from '../lib/cpu.js';
import { rotateSides, baseSides } from '../lib/rotation.js';
import { playActionTick, playFoodCrunch } from '../lib/sound.js';
import { DEFAULT_RULESET } from '../lib/rulesets.js';
import { TUTORIAL_STEPS } from '../lib/tutorial.js';

const ACTIONS_PER_TURN = 1;
const SIDE_KEYS = ['top', 'left', 'right', 'bottom'];

const PILE_LABELS = {
  draw: 'Draw pile',
  discard: 'Discard pile',
  removed: 'Removed from Play',
  deck: 'Deck List',
};
const CAPTURE_REMOVAL_DELAY_MS = 250;
const GAME_OVER_PRESENTATION_DELAY_MS = 500;
const CONFETTI_COLORS = [
  '#eab308',
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#f97316',
];
const CONFETTI_PIECE_COUNT = 60;

// CPU players carry their strategy as a single-letter suffix wherever
// their name is shown, so it's visible at a glance during play.
const STRATEGY_SUFFIX = { defensive: 'D', ruthless: 'R', aggressive: 'A' };
function displayName(player) {
  if (!player.isCPU) return player.name;
  return `${player.name} (${STRATEGY_SUFFIX[player.cpuStrategy] ?? 'A'})`;
}

// Standard English ordinal suffix — 1st, 2nd, 3rd, 4th, 11th, 21st, etc.
function ordinal(n) {
  const remainder100 = n % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Ranks players by score, descending — tied scores share a place and the
// next distinct score resumes at the count of players ranked above it
// (competition ranking: 1st, 1st, 3rd, not 1st, 1st, 2nd).
function rankPlayers(players, playerStates) {
  const sorted = players
    .map((player, i) => ({ player, score: playerStates[i].score }))
    .sort((a, b) => b.score - a.score);
  let place = 0;
  let previousScore = null;
  return sorted.map((entry, index) => {
    if (entry.score !== previousScore) {
      place = index + 1;
      previousScore = entry.score;
    }
    return { ...entry, place };
  });
}

let nextFoodCardId = 1;
let nextLogId = 1;

// Food is the objective the game is anchored around, placed at a random
// valid spot each game (#101). With Random Terrain on, a handful of
// blocking rocks are scattered across whatever's left over (#107). With
// Double Food on, every selected shape is placed twice instead of once
// (#119) — placeFoodShapes tells the two copies of a shape apart by the
// board position they land on, same as it already does for any two
// pieces of the same shape. Twice as many pieces need much more room to
// all mutually cluster within the default distance, so doubled food gets
// the whole board to spread across rather than risk pieces getting
// silently skipped for having nowhere left to fit.
function createInitialBoard(
  food,
  foodShapeIds,
  allowRandomTerrain,
  doubleFood,
) {
  const selectedShapes = food.shapes.filter((s) => foodShapeIds.includes(s.id));
  const activeFood = {
    ...food,
    shapes: doubleFood
      ? [...selectedShapes, ...selectedShapes]
      : selectedShapes,
  };
  const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const foodCells = placeFoodShapes(
    activeFood,
    BOARD_SIZE,
    doubleFood ? BOARD_SIZE : undefined,
  );
  Object.entries(foodCells).forEach(([index, card]) => {
    cells[Number(index)] = card;
  });
  if (allowRandomTerrain) {
    const foodIndices = Object.keys(foodCells).map(Number);
    const terrainCells = placeRandomTerrain(foodIndices, BOARD_SIZE);
    Object.entries(terrainCells).forEach(([index, card]) => {
      cells[Number(index)] = card;
    });
  }
  return cells;
}

function dealFrom(deck) {
  const pile = buildDrawPile(deck);
  return {
    hand: pile.slice(0, HAND_SIZE),
    drawPile: pile.slice(HAND_SIZE),
    discardPile: [],
    removedFromPlay: [],
    score: 0,
  };
}

// Reshuffles the discard pile back into the draw pile whenever there
// aren't enough cards left to draw — the discard pile is never a dead
// end, just a temporary holding area.
function refillHand(state) {
  const needed = HAND_SIZE - state.hand.length;
  if (needed <= 0) return state;

  let drawPile = state.drawPile;
  let discardPile = state.discardPile;
  if (drawPile.length < needed && discardPile.length > 0) {
    drawPile = [...drawPile, ...shuffle(discardPile)];
    discardPile = [];
  }

  return {
    ...state,
    hand: [...state.hand, ...drawPile.slice(0, needed)],
    drawPile: drawPile.slice(needed),
    discardPile,
  };
}

// A Food tile, once eaten, becomes a card in the eating player's deck —
// it keeps the shape's name/emoji/sides but loses its `type: 'food'`, so
// once played it behaves like any other bird card and never re-registers
// as an objective (the game's remaining-Food count only ever goes down).
function foodToCard(foodCell) {
  return {
    id: `${foodCell.id}-card-${nextFoodCardId++}`,
    name: foodCell.name,
    emoji: foodCell.emoji,
    deckColor: foodCell.color,
    sides: foodCell.sides,
    fromFood: true,
  };
}

export default function PlayPage({
  players,
  decks,
  food,
  foodShapeIds,
  ruleset = DEFAULT_RULESET,
  isTutorial = false,
  onPlayAgain,
}) {
  const shapeIds = foodShapeIds ?? food.shapes.map((s) => s.id);

  const [board, setBoard] = useState(() =>
    createInitialBoard(
      food,
      shapeIds,
      ruleset.allowRandomTerrain,
      ruleset.doubleFood,
    ),
  );
  const [playerStates, setPlayerStates] = useState(() =>
    players.map((p) => dealFrom(decks.find((d) => d.id === p.deckId))),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  // How many of each player's own turns have started so far — players[0]
  // is already on their 1st turn as the game opens; everyone else is on
  // 0 until their own turn first begins. Used by the Landing Sickness
  // ruleset (#122) to know when a card stops being protected.
  const [ownerTurnCounts, setOwnerTurnCounts] = useState(() => {
    const counts = {};
    players.forEach((p) => {
      counts[p.id] = 0;
    });
    counts[players[0].id] = 1;
    return counts;
  });
  const [actionsRemaining, setActionsRemaining] = useState(ACTIONS_PER_TURN);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [eatFoodIndex, setEatFoodIndex] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [pileModal, setPileModal] = useState(null);
  const [zoomedPileCard, setZoomedPileCard] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [hoveredPlayerId, setHoveredPlayerId] = useState(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(isTutorial);
  // Snapshots taken before each move this turn, most recent last — cleared
  // whenever the turn advances, so undo never reaches into a prior turn.
  const [moveHistory, setMoveHistory] = useState([]);
  // Tracks the pending delayed board update from commitBoardAfterCapture so
  // an undo can cancel it — otherwise a capture's removal would still land
  // after the undo restored the pre-capture board.
  const pendingCaptureRemoval = useRef(null);

  const activePlayer = players[activeIndex];
  const activeState = playerStates[activeIndex];
  const activeDeck = decks.find((d) => d.id === activePlayer.deckId);
  const foodRemaining = board.some((cell) => cell?.type === 'food');
  const gameOver = !foodRemaining;
  const canAct = !activePlayer.isCPU && actionsRemaining > 0 && !gameOver;
  // Using a Food-derived card is always free and grants a bonus action,
  // so it stays available even with zero actions remaining.
  const canUseFood = !activePlayer.isCPU && !gameOver;
  // Returning a card to the discard pile is always free, same as Use
  // Food, so it stays available even with zero actions remaining.
  const canReturnToDiscard =
    !activePlayer.isCPU && !gameOver && ruleset.allowReturnToHand;

  function clearSelections() {
    setSelectedCardId(null);
    setEatFoodIndex(null);
    setDragSourceIndex(null);
  }

  // Records an entry in the status tray's action log, most recent first —
  // the whole game's history is kept, since the log is scrollable rather
  // than capped to a few entries (#121).
  function pushLog(text) {
    setActionLog((prev) => [{ id: nextLogId++, text }, ...prev]);
  }

  // `bonus` is true when the action came from playing a Food-derived
  // card from hand — that doesn't cost the turn's action, it grants an
  // extra one instead.
  function spendAction(bonus = false) {
    setActionsRemaining((n) => (bonus ? n + 1 : Math.max(0, n - 1)));
    clearSelections();
  }

  function advanceTurn() {
    const nextIndex = (activeIndex + 1) % players.length;
    setActiveIndex(nextIndex);
    const nextPlayerId = players[nextIndex].id;
    setOwnerTurnCounts((prev) => ({
      ...prev,
      [nextPlayerId]: (prev[nextPlayerId] ?? 0) + 1,
    }));
    setActionsRemaining(ACTIONS_PER_TURN);
    clearSelections();
    setMoveHistory([]);
  }

  // Captures everything a move can change so handleUndo can restore it.
  function snapshotState() {
    return { board, playerStates, actionsRemaining, actionLog };
  }

  function recordMove() {
    setMoveHistory((prev) => [...prev, snapshotState()]);
  }

  function handleUndo() {
    if (moveHistory.length === 0) return;
    if (pendingCaptureRemoval.current) {
      clearTimeout(pendingCaptureRemoval.current);
      pendingCaptureRemoval.current = null;
    }
    const previous = moveHistory[moveHistory.length - 1];
    setBoard(previous.board);
    setPlayerStates(previous.playerStates);
    setActionsRemaining(previous.actionsRemaining);
    setActionLog(previous.actionLog);
    setMoveHistory((prev) => prev.slice(0, -1));
    clearSelections();
  }

  function applyOwnerCaptureBookkeeping(states, capturedList) {
    // Under Triple Triad (#126), a captured card switches teams and stays
    // on the board instead of being removed — its original owner never
    // gets it back in their discard pile, since it was never taken off
    // the board to begin with.
    if (ruleset.tripleTriad) return states;
    return states.map((state, i) => {
      const ownCaptured = capturedList.filter(
        (c) => c.card.ownerId === players[i].id,
      );
      if (ownCaptured.length === 0) return state;
      return {
        ...state,
        discardPile: [...state.discardPile, ...ownCaptured.map((c) => c.card)],
      };
    });
  }

  // Shows the newly placed/moved card right away; if it captured anything,
  // the captured card stays visible on the board for a beat before it's
  // actually removed, instead of vanishing the instant the new card lands.
  function commitBoardAfterCapture(
    preCaptureBoard,
    postCaptureBoard,
    captured,
  ) {
    setBoard(preCaptureBoard);
    if (captured.length > 0) {
      pendingCaptureRemoval.current = setTimeout(() => {
        setBoard(postCaptureBoard);
        pendingCaptureRemoval.current = null;
      }, CAPTURE_REMOVAL_DELAY_MS);
    }
  }

  function handleSelectCard(cardId) {
    if (!canAct) return;
    setEatFoodIndex(null);
    setDragSourceIndex(null);
    setSelectedCardId((current) => (current === cardId ? null : cardId));
  }

  // Removes a food-derived hand card from play directly, without playing
  // it onto the board — free and grants a bonus action, same as playing
  // it would (the point already scored when it was eaten is untouched,
  // since that was banked at eat-time, not tied to this card). It goes to
  // a separate removed-from-play pile, not the discard pile — it's gone
  // for good, never reshuffled back into the draw pile.
  function handleUseFood(cardId) {
    if (!canUseFood) return;
    const card = activeState.hand.find((c) => c.id === cardId && c.fromFood);
    if (!card) return;

    recordMove();
    setPlayerStates(
      playerStates.map((state, i) =>
        i === activeIndex
          ? {
              ...state,
              hand: state.hand.filter((c) => c.id !== cardId),
              removedFromPlay: [...state.removedFromPlay, card],
            }
          : state,
      ),
    );
    spendAction(true);
    pushLog(
      `${displayName(activePlayer)} used ${card.name} for a bonus action`,
    );
  }

  // Spins a selected hand card's side values 90° clockwise or
  // anti-clockwise — free, doesn't spend the turn's action, and keeps the
  // card selected so it can be rotated again or played right after.
  function handleRotateCard(cardId, direction) {
    if (!canAct || !ruleset.allowCardRotation) return;
    const card = activeState.hand.find((c) => c.id === cardId);
    if (!card) return;

    setPlayerStates(
      playerStates.map((state, i) =>
        i === activeIndex
          ? {
              ...state,
              hand: state.hand.map((c) =>
                c.id === cardId
                  ? {
                      ...c,
                      sides: rotateSides(c.sides, direction),
                      // Left unwrapped rather than normalized into
                      // 0-359° — wrapping (e.g. -90 -> 270) made the CSS
                      // transition animate the long way around on the
                      // first anti-clockwise turn (#114). baseSides()
                      // already reduces this mod 360 for computing side
                      // values, so an ever-growing value here is safe.
                      rotation:
                        (c.rotation ?? 0) + (direction === 'cw' ? 90 : -90),
                    }
                  : c,
              ),
            }
          : state,
      ),
    );
  }

  function logCaptureSuffix(captured) {
    if (captured.length === 0) return '';
    const verb = ruleset.tripleTriad ? 'converting' : 'capturing';
    return `, ${verb} ${captured.length} card${captured.length === 1 ? '' : 's'}`;
  }

  function handlePlayCard(cellIndex) {
    const card = activeState.hand.find((c) => c.id === selectedCardId);
    if (!card) return;
    const placedCard = {
      ...card,
      ownerId: activePlayer.id,
      ...(ruleset.landingSickness
        ? { landingSicknessTurn: ownerTurnCounts[activePlayer.id] }
        : {}),
    };

    recordMove();
    const withCard = [...board];
    withCard[cellIndex] = placedCard;
    const { board: nextBoard, captured } = resolveCaptures(
      withCard,
      cellIndex,
      placedCard,
      BOARD_SIZE,
      ownerTurnCounts,
      ruleset.tripleTriad,
    );

    let nextPlayerStates = playerStates.map((state, i) =>
      i === activeIndex
        ? { ...state, hand: state.hand.filter((c) => c.id !== selectedCardId) }
        : state,
    );
    nextPlayerStates = applyOwnerCaptureBookkeeping(nextPlayerStates, captured);

    commitBoardAfterCapture(withCard, nextBoard, captured);
    setPlayerStates(nextPlayerStates);
    spendAction();
    playActionTick();
    pushLog(
      `${displayName(activePlayer)} played ${card.name}${logCaptureSuffix(captured)}`,
    );
  }

  function handleMoveCard(sourceIndex, cellIndex) {
    const card = board[sourceIndex];
    if (!card) return;

    recordMove();
    const withMove = [...board];
    withMove[sourceIndex] = null;
    withMove[cellIndex] = card;
    // Moving a card keeps whatever landingSicknessTurn stamp it already
    // has rather than refreshing it — otherwise shuffling a card back and
    // forth each turn would keep it permanently uncapturable.
    const { board: nextBoard, captured } = resolveCaptures(
      withMove,
      cellIndex,
      card,
      BOARD_SIZE,
      ownerTurnCounts,
      ruleset.tripleTriad,
    );

    const nextPlayerStates = applyOwnerCaptureBookkeeping(
      playerStates,
      captured,
    );

    commitBoardAfterCapture(withMove, nextBoard, captured);
    setPlayerStates(nextPlayerStates);
    spendAction();
    playActionTick();
    pushLog(
      `${displayName(activePlayer)} moved ${card.name}${logCaptureSuffix(captured)}`,
    );
  }

  function handleEatBird(birdIndex) {
    const eatenBird = board[birdIndex];
    const eatenFood = board[eatFoodIndex];
    if (!eatenBird || !eatenFood) return;

    // Counted against the board as it stands right now, before the eaten
    // bird and Food are removed from it — the sacrificed bird was still
    // touching the tile up until the moment it's claimed.
    const points = ruleset.scalingPoints
      ? foodPointValue(board, eatFoodIndex, BOARD_SIZE)
      : 1;

    recordMove();
    const nextBoard = [...board];
    nextBoard[eatFoodIndex] = null;
    nextBoard[birdIndex] = null;

    const foodCard = foodToCard(eatenFood);
    const nextPlayerStates = playerStates.map((state, i) => {
      let next = state;
      if (players[i].id === eatenBird.ownerId) {
        next = { ...next, discardPile: [...next.discardPile, eatenBird] };
      }
      if (i === activeIndex) {
        next = {
          ...next,
          drawPile: shuffle([...next.drawPile, foodCard]),
          score: next.score + points,
        };
      }
      return next;
    });

    setBoard(nextBoard);
    setPlayerStates(nextPlayerStates);
    spendAction();
    playFoodCrunch();
    pushLog(`${displayName(activePlayer)} claimed ${eatenFood.name}`);
  }

  function handleCellClick(index) {
    if (!canAct) return;

    if (eatFoodIndex !== null) {
      if (index === eatFoodIndex) {
        setEatFoodIndex(null);
        return;
      }
      const birdChoices = getAdjacentBirdIndices(
        board,
        eatFoodIndex,
        BOARD_SIZE,
        activePlayer.id,
      );
      if (birdChoices.includes(index)) {
        handleEatBird(index);
      } else {
        setEatFoodIndex(null);
      }
      return;
    }

    if (selectedCardId) {
      const card = activeState.hand.find((c) => c.id === selectedCardId);
      // A Food-derived card can only be discarded via its Use Food badge,
      // never played onto the board.
      if (!card || card.fromFood) return;
      if (!isPlayableCell(board, index, BOARD_SIZE, activePlayer.id)) return;
      const placedCard = { ...card, ownerId: activePlayer.id };
      if (
        !canPlaceCard(
          board,
          index,
          placedCard,
          BOARD_SIZE,
          ruleset.allowEqualValuePlay,
        )
      )
        return;
      handlePlayCard(index);
      return;
    }

    const eligible = getEligibleFoodIndices(board, BOARD_SIZE, activePlayer.id);
    if (eligible.includes(index)) {
      setEatFoodIndex(index);
    }
  }

  function handleCardDragStart(index) {
    if (!(canAct && ruleset.allowMoving) && !canReturnToDiscard) return;
    const card = board[index];
    if (!card || card.type === 'food' || card.ownerId !== activePlayer.id) {
      return;
    }
    setSelectedCardId(null);
    setEatFoodIndex(null);
    setDragSourceIndex(index);
  }

  function handleCardDragEnd() {
    setDragSourceIndex(null);
  }

  function handleCardDrop(destinationIndex) {
    const source = dragSourceIndex;
    setDragSourceIndex(null);
    if (source === null || !canAct || !ruleset.allowMoving) return;

    const destinations = getAdjacentEmptyIndices(board, source, BOARD_SIZE);
    if (!destinations.includes(destinationIndex)) return;
    const card = board[source];
    if (!card) return;
    if (
      !canPlaceCard(
        board,
        destinationIndex,
        card,
        BOARD_SIZE,
        ruleset.allowEqualValuePlay,
      )
    )
      return;
    handleMoveCard(source, destinationIndex);
  }

  // Dropping a dragged card onto your own discard pile tile sends it
  // straight to your discard pile instead of moving it on the board —
  // free (no action cost), unlike a board move.
  function handleReturnToDiscard() {
    const source = dragSourceIndex;
    setDragSourceIndex(null);
    if (source === null || !canReturnToDiscard) return;

    const card = board[source];
    if (!card || card.type === 'food' || card.ownerId !== activePlayer.id) {
      return;
    }

    recordMove();
    const nextBoard = [...board];
    nextBoard[source] = null;

    setBoard(nextBoard);
    setPlayerStates(
      playerStates.map((state, i) =>
        i === activeIndex
          ? { ...state, discardPile: [...state.discardPile, card] }
          : state,
      ),
    );
    clearSelections();
    pushLog(
      `${displayName(activePlayer)} returned ${card.name} to the discard pile`,
    );
  }

  function handleEndTurn() {
    const nextPlayerStates = playerStates.map((state, i) =>
      i === activeIndex ? refillHand(state) : state,
    );
    setPlayerStates(nextPlayerStates);
    advanceTurn();
  }

  function handleCpuTurn() {
    if (!activePlayer.isCPU) return;

    let workingBoard = board;
    let workingHand = activeState.hand;
    let capturedList = [];
    let eatenFoodCards = [];
    let pointsEarned = 0;
    let usedFoodCards = [];
    let remaining = actionsRemaining;
    const newLogEntries = [];

    while (remaining > 0) {
      const eatChoice = pickCpuEat(workingBoard, BOARD_SIZE, activePlayer.id);
      if (eatChoice) {
        const eatenBird = workingBoard[eatChoice.birdIndex];
        const eatenFood = workingBoard[eatChoice.foodIndex];
        // Same as the human path — counted before this claim removes the
        // bird and Food from workingBoard.
        pointsEarned += ruleset.scalingPoints
          ? foodPointValue(workingBoard, eatChoice.foodIndex, BOARD_SIZE)
          : 1;
        const nextBoard = [...workingBoard];
        nextBoard[eatChoice.foodIndex] = null;
        nextBoard[eatChoice.birdIndex] = null;

        workingBoard = nextBoard;
        capturedList = [
          ...capturedList,
          { index: eatChoice.birdIndex, card: eatenBird },
        ];
        eatenFoodCards = [...eatenFoodCards, foodToCard(eatenFood)];
        remaining -= 1;
        playFoodCrunch();
        newLogEntries.push(
          `${displayName(activePlayer)} claimed ${eatenFood.name}`,
        );
        continue;
      }

      // A Food-derived card is never played onto the board — it's
      // discarded via Use Food, same as a human player would, for free
      // plus a bonus action.
      const foodDerivedCard = workingHand.find((c) => c.fromFood);
      if (foodDerivedCard) {
        workingHand = workingHand.filter((c) => c.id !== foodDerivedCard.id);
        usedFoodCards = [...usedFoodCards, foodDerivedCard];
        remaining += 1;
        newLogEntries.push(
          `${displayName(activePlayer)} used ${foodDerivedCard.name} for a bonus action`,
        );
        continue;
      }

      const move = pickCpuMove(
        workingHand,
        workingBoard,
        BOARD_SIZE,
        activePlayer.id,
        activePlayer.cpuStrategy,
        ruleset.allowEqualValuePlay,
        ruleset.allowCardRotation,
        ownerTurnCounts,
      );
      if (!move) break;
      const card = workingHand.find((c) => c.id === move.cardId);
      // Applies whichever facing pickCpuMove settled on — a no-op when
      // Allow Card Rotation is off, since rotationSteps is always 0 then.
      let cardSides = card.sides;
      for (let i = 0; i < move.rotationSteps; i++) {
        cardSides = rotateSides(cardSides, 'cw');
      }
      const placedCard = {
        ...card,
        ownerId: activePlayer.id,
        sides: cardSides,
        rotation: (move.rotationSteps * 90) % 360,
        ...(ruleset.landingSickness
          ? { landingSicknessTurn: ownerTurnCounts[activePlayer.id] }
          : {}),
      };

      const withCard = [...workingBoard];
      withCard[move.cellIndex] = placedCard;
      const { board: afterCaptures, captured } = resolveCaptures(
        withCard,
        move.cellIndex,
        placedCard,
        BOARD_SIZE,
        ownerTurnCounts,
        ruleset.tripleTriad,
      );

      workingBoard = afterCaptures;
      workingHand = workingHand.filter((c) => c.id !== move.cardId);
      capturedList = [...capturedList, ...captured];
      remaining -= 1;
      playActionTick();
      newLogEntries.push(
        `${displayName(activePlayer)} played ${card.name}${logCaptureSuffix(captured)}`,
      );
    }

    if (newLogEntries.length > 0) {
      // newLogEntries is chronological (oldest first) — reverse so the
      // most recent CPU action ends up first, ahead of the older ones.
      const entries = [...newLogEntries]
        .reverse()
        .map((text) => ({ id: nextLogId++, text }));
      setActionLog((prev) => [...entries, ...prev]);
    }

    let nextPlayerStates = playerStates.map((state, i) =>
      i === activeIndex
        ? {
            ...state,
            hand: workingHand,
            removedFromPlay: [...state.removedFromPlay, ...usedFoodCards],
          }
        : state,
    );
    nextPlayerStates = applyOwnerCaptureBookkeeping(
      nextPlayerStates,
      capturedList,
    );
    if (eatenFoodCards.length > 0) {
      nextPlayerStates = nextPlayerStates.map((state, i) =>
        i === activeIndex
          ? {
              ...state,
              drawPile: shuffle([...state.drawPile, ...eatenFoodCards]),
              score: state.score + pointsEarned,
            }
          : state,
      );
    }
    nextPlayerStates = nextPlayerStates.map((state, i) =>
      i === activeIndex ? refillHand(state) : state,
    );

    setBoard(workingBoard);
    setPlayerStates(nextPlayerStates);
    advanceTurn();
  }

  // CPU turns play themselves — a short delay keeps each turn's board
  // update visible instead of chaining every CPU turn through instantly.
  useEffect(() => {
    if (!activePlayer.isCPU || gameOver) return;
    const timer = setTimeout(() => handleCpuTurn(), 600);
    return () => clearTimeout(timer);
  }, [activeIndex, gameOver]);

  // Holds the board reveal a beat before the Game Over modal covers it.
  useEffect(() => {
    if (!gameOver) {
      setGameOverVisible(false);
      return;
    }
    const timer = setTimeout(
      () => setGameOverVisible(true),
      GAME_OVER_PRESENTATION_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [gameOver]);

  function openPileModal(type) {
    if (type === 'deck') {
      // The full deck, wherever each card currently sits — hand, draw
      // pile, discard pile, removed-from-play, and any of the player's
      // own birds still out on the board — sorted by name rather than
      // shuffled, since this is a reference list, not a randomized pile.
      const onBoard = board.filter(
        (card) => card && card.ownerId === activePlayer.id,
      );
      const wholeDeck = [
        ...activeState.hand,
        ...activeState.drawPile,
        ...activeState.discardPile,
        ...activeState.removedFromPlay,
        ...onBoard,
      ].sort((a, b) => a.name.localeCompare(b.name));
      setPileModal({ type, cards: wholeDeck });
      setZoomedPileCard(null);
      return;
    }
    const pile =
      type === 'draw'
        ? activeState.drawPile
        : type === 'removed'
          ? activeState.removedFromPlay
          : activeState.discardPile;
    setPileModal({ type, cards: shuffle(pile) });
    setZoomedPileCard(null);
  }

  function closePileModal() {
    setPileModal(null);
    setZoomedPileCard(null);
  }

  function computeBoardHighlights() {
    const none = {
      highlighted: new Set(),
      claimable: new Set(),
      selected: null,
    };
    if (!canAct) return none;

    if (selectedCardId) {
      const card = activeState.hand.find((c) => c.id === selectedCardId);
      if (!card || card.fromFood) return none;
      const placedCard = { ...card, ownerId: activePlayer.id };
      const indices = getPlayableIndices(
        board,
        BOARD_SIZE,
        activePlayer.id,
      ).filter((i) =>
        canPlaceCard(
          board,
          i,
          placedCard,
          BOARD_SIZE,
          ruleset.allowEqualValuePlay,
        ),
      );
      return {
        highlighted: new Set(indices),
        claimable: new Set(),
        selected: null,
      };
    }

    if (eatFoodIndex !== null) {
      return {
        highlighted: new Set(
          getAdjacentBirdIndices(
            board,
            eatFoodIndex,
            BOARD_SIZE,
            activePlayer.id,
          ),
        ),
        claimable: new Set(),
        selected: eatFoodIndex,
      };
    }

    if (dragSourceIndex !== null) {
      const card = board[dragSourceIndex];
      const indices = card
        ? getAdjacentEmptyIndices(board, dragSourceIndex, BOARD_SIZE).filter(
            (i) =>
              canPlaceCard(
                board,
                i,
                card,
                BOARD_SIZE,
                ruleset.allowEqualValuePlay,
              ),
          )
        : [];
      return {
        highlighted: new Set(indices),
        claimable: new Set(),
        selected: dragSourceIndex,
      };
    }

    // Idle turn state — flash every Food tile the active player currently
    // has majority control over in their own color, so it's obvious at a
    // glance that it's ready to eat (#73).
    return {
      highlighted: new Set(),
      claimable: new Set(
        getEligibleFoodIndices(board, BOARD_SIZE, activePlayer.id),
      ),
      selected: null,
    };
  }

  const { highlighted, claimable, selected } = computeBoardHighlights();
  const playerColors = Object.fromEntries(players.map((p) => [p.id, p.color]));
  // Every board cell still protected by Landing Sickness (#122), for the
  // small badge GameBoard shows on top of them.
  const sickIndices = new Set(
    board
      .map((card, i) => (isLandingSick(card, ownerTurnCounts) ? i : null))
      .filter((i) => i !== null),
  );

  // Under the Scaling Points ruleset (#125), every Food tile shows a star
  // with its current point value — how many birds are touching it right
  // now (minimum 1) — so players can see what claiming it would be worth
  // before they commit to it.
  const foodPointsByIndex = new Map();
  if (ruleset.scalingPoints) {
    board.forEach((card, i) => {
      if (card?.type === 'food') {
        foodPointsByIndex.set(i, foodPointValue(board, i, BOARD_SIZE));
      }
    });
  }

  const draggableIndices = new Set();
  if ((canAct && ruleset.allowMoving) || canReturnToDiscard) {
    board.forEach((cell, i) => {
      if (cell && cell.type !== 'food' && cell.ownerId === activePlayer.id) {
        draggableIndices.add(i);
      }
    });
  }

  const maxScore = Math.max(...playerStates.map((s) => s.score));
  const winners = gameOver
    ? players.filter((p, i) => playerStates[i].score === maxScore)
    : [];
  const standings = gameOver ? rankPlayers(players, playerStates) : [];
  // A human player among the winners gets the celebratory heading and
  // confetti; an all-CPU win stays a plain "Game Over".
  const humanWon = gameOver && winners.some((player) => !player.isCPU);
  // Regenerated once per game-over event (not per render) so the burst
  // doesn't reshuffle itself on every re-render while it's animating.
  const confettiPieces = useMemo(() => {
    if (!humanWon) return [];
    return Array.from({ length: CONFETTI_PIECE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 110 + Math.random() * 170;
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rot: Math.random() * 360,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.08,
      };
    });
  }, [humanWon]);
  const activeSkin = ruleset.allowCustomSkins ? ruleset.skin : 'alpha';

  return (
    <main className="page" data-skin={activeSkin}>
      {showIntroModal ? (
        <TutorialIntroModal onDismiss={() => setShowIntroModal(false)} />
      ) : null}
      {gameOverVisible && !gameOverDismissed ? (
        <div
          className="color-modal-backdrop"
          onClick={() => setGameOverDismissed(true)}
        >
          {humanWon ? (
            <div className="confetti-burst" aria-hidden="true">
              {confettiPieces.map((piece, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    '--dx': `${piece.dx}px`,
                    '--dy': `${piece.dy}px`,
                    '--rot': `${piece.rot}deg`,
                    backgroundColor: piece.color,
                    animationDelay: `${piece.delay}s`,
                  }}
                />
              ))}
            </div>
          ) : null}
          <div
            className="pile-modal game-over-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{humanWon ? 'Congratulations!' : 'Game Over'}</h2>
            <p>
              {winners.length === 1
                ? `${displayName(winners[0])} wins with ${maxScore} point${maxScore === 1 ? '' : 's'}!`
                : `It's a tie between ${winners.map(displayName).join(' and ')} at ${maxScore} points!`}
            </p>
            <ol className="game-over-standings">
              {standings.map(({ player, score, place }) => (
                <li key={player.id} className="game-over-standing">
                  <span className="game-over-standing-place">
                    {ordinal(place)}
                  </span>
                  <span className="game-over-standing-name">
                    {displayName(player)}
                  </span>
                  <span className="game-over-standing-score">
                    {score} point{score === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ol>
            <div className="game-over-actions">
              <button
                type="button"
                className="board-recenter"
                onClick={() => setGameOverDismissed(true)}
              >
                View Board
              </button>
              {onPlayAgain ? (
                <button
                  type="button"
                  className="board-recenter"
                  onClick={onPlayAgain}
                >
                  Play Again
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {/* On a wide desktop screen, the board runs the full page width,
          rectangular instead of a fixed square, with everything that used
          to sit below it — status tray, scores, hand, piles — arranged in
          two columns underneath it instead of a single stack (#128).
          Below the desktop breakpoint this is just a plain vertical
          stack, unchanged from before. */}
      <div className="play-layout">
        <div className="play-board-col">
          <GameBoard
            cells={board}
            highlightedIndices={highlighted}
            claimableIndices={claimable}
            claimColor={activePlayer.color}
            selectedIndex={selected}
            onCellClick={handleCellClick}
            playerColors={playerColors}
            draggableIndices={draggableIndices}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            onCardDrop={handleCardDrop}
            hoveredOwnerId={hoveredPlayerId}
            sickIndices={sickIndices}
            foodPointsByIndex={foodPointsByIndex}
          />
          {/* Floats over the board's own bottom edge, centered, on a wide
              desktop screen instead of taking a slot in the two-column
              area below (#128) — below the desktop breakpoint this is
              just a plain block like everything else in the stack. */}
          {isTutorial &&
          !tutorialDismissed &&
          tutorialStep < TUTORIAL_STEPS.length ? (
            <div className="tutorial-banner">
              <div className="tutorial-banner-header">
                <span>
                  Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}
                </span>
                <button
                  type="button"
                  className="tutorial-banner-skip"
                  onClick={() => setTutorialDismissed(true)}
                >
                  Skip Tutorial
                </button>
              </div>
              <p className="tutorial-banner-body">
                {TUTORIAL_STEPS[tutorialStep]}
              </p>
              <div className="tutorial-banner-actions">
                <button
                  type="button"
                  className="end-turn-btn"
                  onClick={() => setTutorialStep((s) => s + 1)}
                >
                  Got it
                </button>
              </div>
            </div>
          ) : null}
          {/* Overlays the board's own bottom corners on a wide desktop
              screen instead of taking a slot below it, matching the Zoom/
              Recenter pill's own treatment (#128) — below the desktop
              breakpoint this is just a plain block, unchanged, with the
              score board back in the two-column area below rather than
              between these two groups. */}
          <div className="hand-header">
            {/* Whose turn it is now reads from the bright border on their
            score pill (#101) — kept here only for assistive tech, since a
            border alone isn't perceivable non-visually. */}
            <h2 className="sr-only">
              {displayName(activePlayer)}&rsquo;s turn
              {activePlayer.isCPU ? ' (CPU)' : ''}
            </h2>
            <div className="hand-header-left">
              {!activePlayer.isCPU && !gameOver ? (
                <span className="draw-pile-count">
                  Actions: {actionsRemaining}/{ACTIONS_PER_TURN}
                </span>
              ) : null}
            </div>
            <ul className="score-board">
              {players.map((p, i) => {
                const score = playerStates[i].score;
                const isLeader = maxScore > 0 && score === maxScore;
                return (
                  <li
                    key={p.id}
                    className={`score-entry${p.id === activePlayer.id ? ' score-entry-active' : ''}`}
                    style={{ '--player-color': p.color }}
                    onMouseEnter={() => setHoveredPlayerId(p.id)}
                    onMouseLeave={() =>
                      setHoveredPlayerId((current) =>
                        current === p.id ? null : current,
                      )
                    }
                  >
                    <span
                      className={`score-value${isLeader ? ' score-leader' : ''}`}
                    >
                      {score}
                    </span>
                    <span className="score-name">{displayName(p)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="hand-header-right">
              {gameOver ? null : activePlayer.isCPU ? (
                <span className="draw-pile-count">CPU is playing&hellip;</span>
              ) : (
                <div className="turn-controls">
                  <button
                    type="button"
                    className="undo-move-btn"
                    onClick={handleUndo}
                    disabled={moveHistory.length === 0}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className="end-turn-btn"
                    onClick={handleEndTurn}
                  >
                    End Turn
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="play-side-col">
          <StatusTray
            players={players}
            food={food}
            foodShapeIds={shapeIds}
            ruleset={ruleset}
            actionLog={actionLog}
          />

          <div className="hand-row">
            <div className="draw-stack">
              <button
                type="button"
                className="card card-back"
                style={{
                  '--card-border': activePlayer.color,
                  '--card-bg': activeDeck?.color,
                }}
                aria-label="Deck List: every card in your deck"
                onClick={() => openPileModal('deck')}
              >
                <span className="card-back-label">Deck List</span>
              </button>
              <button
                type="button"
                className="card card-back"
                style={{
                  '--card-border': activePlayer.color,
                  '--card-bg': activeDeck?.color,
                }}
                aria-label={`Draw pile: ${activeState.drawPile.length} cards`}
                onClick={() => openPileModal('draw')}
              >
                <span className="card-back-label">Draw Pile</span>
                <span className="card-back-deck">{activeDeck?.name}</span>
              </button>
            </div>
            <Hand
              cards={activeState.hand}
              selectedCardId={selectedCardId}
              onSelectCard={handleSelectCard}
              onUseFood={handleUseFood}
              onRotateCard={handleRotateCard}
              allowRotation={ruleset.allowCardRotation}
              playerColor={activePlayer.color}
              disabled={!canAct}
              useFoodDisabled={!canUseFood}
            />
            <div className="discard-stack">
              <button
                type="button"
                className="card card-back removed-pile"
                style={{
                  '--card-border': activePlayer.color,
                  '--card-bg': activeDeck?.color,
                }}
                aria-label={`Removed from Play: ${activeState.removedFromPlay.length} cards`}
                onClick={() => openPileModal('removed')}
              >
                <span className="card-back-label">Removed</span>
              </button>
              <button
                type="button"
                className="card card-back"
                style={{
                  '--card-border': activePlayer.color,
                  '--card-bg': activeDeck?.color,
                }}
                aria-label={`Discard pile: ${activeState.discardPile.length} cards`}
                onClick={() => openPileModal('discard')}
                onDragOver={(event) => {
                  if (ruleset.allowReturnToHand) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleReturnToDiscard();
                }}
              >
                <span className="card-back-label">Discard Pile</span>
                <span className="card-back-deck">{activeDeck?.name}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {pileModal ? (
        <div className="color-modal-backdrop" onClick={closePileModal}>
          <div
            className="pile-modal"
            role="dialog"
            aria-modal="true"
            aria-label={PILE_LABELS[pileModal.type]}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>
              {PILE_LABELS[pileModal.type]} ({pileModal.cards.length})
            </h3>
            {pileModal.cards.length === 0 ? (
              <p className="hand-empty">Empty</p>
            ) : (
              <ul className="pile-modal-list">
                {pileModal.cards.map((card, i) => (
                  <li key={`${card.id}-${i}`}>
                    <button
                      type="button"
                      className="pile-modal-card"
                      style={{
                        '--card-border': activePlayer.color,
                        '--card-bg': card.deckColor,
                      }}
                      onClick={() => setZoomedPileCard(card)}
                    >
                      <span>{card.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="board-recenter"
              onClick={closePileModal}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      {zoomedPileCard ? (
        <div
          className="color-modal-backdrop"
          onClick={() => setZoomedPileCard(null)}
        >
          <div
            className="pile-modal pile-card-zoom"
            role="dialog"
            aria-modal="true"
            aria-label={zoomedPileCard.name}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="card pile-card-zoom-face"
              style={{
                '--card-border': activePlayer.color,
                '--card-bg': zoomedPileCard.deckColor,
              }}
            >
              <span
                className="card-face"
                style={
                  zoomedPileCard.rotation
                    ? { transform: `rotate(${zoomedPileCard.rotation}deg)` }
                    : undefined
                }
              >
                {zoomedPileCard.sides ? (
                  <span className="card-sides">
                    {SIDE_KEYS.map((side) => (
                      <span
                        key={side}
                        className={`card-side card-side-${side}`}
                      >
                        {
                          baseSides(
                            zoomedPileCard.sides,
                            zoomedPileCard.rotation ?? 0,
                          )[side]
                        }
                      </span>
                    ))}
                  </span>
                ) : null}
                {zoomedPileCard.sides && !zoomedPileCard.fromFood ? (
                  <PixelBirdSprite
                    typeId={zoomedPileCard.typeId}
                    name={zoomedPileCard.name}
                    size={64}
                  />
                ) : null}
                <span className="card-name">{zoomedPileCard.name}</span>
              </span>
            </div>
            <button
              type="button"
              className="board-recenter"
              onClick={() => setZoomedPileCard(null)}
            >
              Back
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
