import { useState } from 'react';
import GameBoard, { BOARD_SIZE } from '../components/GameBoard.jsx';
import Hand from '../components/Hand.jsx';
import { HAND_SIZE, buildDrawPile } from '../lib/decks.js';
import {
  placeFoodShapes,
  getEligibleFoodIndices,
  getAdjacentBirdIndices,
} from '../lib/food.js';
import {
  isPlayableCell,
  getPlayableIndices,
  getAdjacentEmptyIndices,
} from '../lib/board.js';
import { resolveCaptures, canPlaceCard } from '../lib/combat.js';
import { pickCpuMove } from '../lib/cpu.js';

const ACTIONS_PER_TURN = 2;

// Food is the objective the game is anchored around, placed as close to
// the board's center as the chosen shapes allow.
function createInitialBoard(food, foodShapeIds) {
  const activeFood = {
    ...food,
    shapes: food.shapes.filter((s) => foodShapeIds.includes(s.id)),
  };
  const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const foodCells = placeFoodShapes(activeFood, BOARD_SIZE);
  Object.entries(foodCells).forEach(([index, card]) => {
    cells[Number(index)] = card;
  });
  return cells;
}

function dealFrom(deck) {
  const pile = buildDrawPile(deck);
  return {
    hand: pile.slice(0, HAND_SIZE),
    drawPile: pile.slice(HAND_SIZE),
    discardPile: [],
  };
}

function refillHand(state) {
  const needed = HAND_SIZE - state.hand.length;
  if (needed <= 0) return state;
  return {
    ...state,
    hand: [...state.hand, ...state.drawPile.slice(0, needed)],
    drawPile: state.drawPile.slice(needed),
  };
}

export default function PlayPage({ players, decks, food, foodShapeIds }) {
  const shapeIds = foodShapeIds ?? food.shapes.map((s) => s.id);

  const [board, setBoard] = useState(() => createInitialBoard(food, shapeIds));
  const [playerStates, setPlayerStates] = useState(() =>
    players.map((p) => dealFrom(decks.find((d) => d.id === p.deckId))),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [actionsRemaining, setActionsRemaining] = useState(ACTIONS_PER_TURN);
  const [mode, setMode] = useState('play');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [moveSource, setMoveSource] = useState(null);
  const [eatFoodIndex, setEatFoodIndex] = useState(null);

  const activePlayer = players[activeIndex];
  const activeState = playerStates[activeIndex];
  const canAct = !activePlayer.isCPU && actionsRemaining > 0;

  function clearSelections() {
    setSelectedCardId(null);
    setMoveSource(null);
    setEatFoodIndex(null);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    clearSelections();
  }

  function spendAction() {
    setActionsRemaining((n) => Math.max(0, n - 1));
    setMode('play');
    clearSelections();
  }

  function advanceTurn() {
    setActiveIndex((current) => (current + 1) % players.length);
    setActionsRemaining(ACTIONS_PER_TURN);
    setMode('play');
    clearSelections();
  }

  function applyOwnerCaptureBookkeeping(states, capturedList) {
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

  function handleSelectCard(cardId) {
    if (!canAct) return;
    setMode('play');
    setMoveSource(null);
    setEatFoodIndex(null);
    setSelectedCardId((current) => (current === cardId ? null : cardId));
  }

  function handlePlayCard(cellIndex) {
    const card = activeState.hand.find((c) => c.id === selectedCardId);
    if (!card) return;
    const placedCard = { ...card, ownerId: activePlayer.id };

    const withCard = [...board];
    withCard[cellIndex] = placedCard;
    const { board: nextBoard, captured } = resolveCaptures(
      withCard,
      cellIndex,
      placedCard,
      BOARD_SIZE,
    );

    let nextPlayerStates = playerStates.map((state, i) =>
      i === activeIndex
        ? { ...state, hand: state.hand.filter((c) => c.id !== selectedCardId) }
        : state,
    );
    nextPlayerStates = applyOwnerCaptureBookkeeping(nextPlayerStates, captured);

    setBoard(nextBoard);
    setPlayerStates(nextPlayerStates);
    spendAction();
  }

  function handleMoveCard(cellIndex) {
    const card = board[moveSource];
    if (!card) return;

    const withMove = [...board];
    withMove[moveSource] = null;
    withMove[cellIndex] = card;
    const { board: nextBoard, captured } = resolveCaptures(
      withMove,
      cellIndex,
      card,
      BOARD_SIZE,
    );

    setBoard(nextBoard);
    setPlayerStates(applyOwnerCaptureBookkeeping(playerStates, captured));
    spendAction();
  }

  function handleEatBird(birdIndex) {
    const eatenBird = board[birdIndex];
    if (!eatenBird) return;

    const nextBoard = [...board];
    nextBoard[eatFoodIndex] = null;
    nextBoard[birdIndex] = null;

    const nextPlayerStates = playerStates.map((state, i) =>
      players[i].id === eatenBird.ownerId
        ? { ...state, discardPile: [...state.discardPile, eatenBird] }
        : state,
    );

    setBoard(nextBoard);
    setPlayerStates(nextPlayerStates);
    spendAction();
  }

  function handleCellClick(index) {
    if (!canAct) return;

    if (mode === 'play') {
      if (!selectedCardId || !isPlayableCell(board, index, BOARD_SIZE)) return;
      const card = activeState.hand.find((c) => c.id === selectedCardId);
      if (!card) return;
      const placedCard = { ...card, ownerId: activePlayer.id };
      if (!canPlaceCard(board, index, placedCard, BOARD_SIZE)) return;
      handlePlayCard(index);
      return;
    }

    if (mode === 'move') {
      if (moveSource === null) {
        const card = board[index];
        if (card && card.type !== 'food' && card.ownerId === activePlayer.id) {
          setMoveSource(index);
        }
        return;
      }
      if (index === moveSource) {
        setMoveSource(null);
        return;
      }
      const destinations = getAdjacentEmptyIndices(
        board,
        moveSource,
        BOARD_SIZE,
      );
      if (!destinations.includes(index)) return;
      if (!canPlaceCard(board, index, board[moveSource], BOARD_SIZE)) return;
      handleMoveCard(index);
      return;
    }

    if (mode === 'eat') {
      if (eatFoodIndex === null) {
        const eligible = getEligibleFoodIndices(
          board,
          BOARD_SIZE,
          activePlayer.id,
        );
        if (eligible.includes(index)) setEatFoodIndex(index);
        return;
      }
      if (index === eatFoodIndex) {
        setEatFoodIndex(null);
        return;
      }
      const birdChoices = getAdjacentBirdIndices(
        board,
        eatFoodIndex,
        BOARD_SIZE,
      );
      if (birdChoices.includes(index)) handleEatBird(index);
    }
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
    let remaining = actionsRemaining;

    while (remaining > 0) {
      const move = pickCpuMove(
        workingHand,
        workingBoard,
        BOARD_SIZE,
        activePlayer.id,
      );
      if (!move) break;
      const card = workingHand.find((c) => c.id === move.cardId);
      const placedCard = { ...card, ownerId: activePlayer.id };

      const withCard = [...workingBoard];
      withCard[move.cellIndex] = placedCard;
      const { board: afterCaptures, captured } = resolveCaptures(
        withCard,
        move.cellIndex,
        placedCard,
        BOARD_SIZE,
      );

      workingBoard = afterCaptures;
      workingHand = workingHand.filter((c) => c.id !== move.cardId);
      capturedList = [...capturedList, ...captured];
      remaining -= 1;
    }

    let nextPlayerStates = playerStates.map((state, i) =>
      i === activeIndex ? { ...state, hand: workingHand } : state,
    );
    nextPlayerStates = applyOwnerCaptureBookkeeping(
      nextPlayerStates,
      capturedList,
    );
    nextPlayerStates = nextPlayerStates.map((state, i) =>
      i === activeIndex ? refillHand(state) : state,
    );

    setBoard(workingBoard);
    setPlayerStates(nextPlayerStates);
    advanceTurn();
  }

  function computeBoardHighlights() {
    const none = { highlighted: new Set(), selected: null };
    if (!canAct) return none;

    if (mode === 'play') {
      if (!selectedCardId) return none;
      const card = activeState.hand.find((c) => c.id === selectedCardId);
      if (!card) return none;
      const placedCard = { ...card, ownerId: activePlayer.id };
      const indices = getPlayableIndices(board, BOARD_SIZE).filter((i) =>
        canPlaceCard(board, i, placedCard, BOARD_SIZE),
      );
      return { highlighted: new Set(indices), selected: null };
    }

    if (mode === 'move') {
      if (moveSource === null) {
        const ownIndices = [];
        board.forEach((cell, i) => {
          if (
            cell &&
            cell.type !== 'food' &&
            cell.ownerId === activePlayer.id
          ) {
            ownIndices.push(i);
          }
        });
        return { highlighted: new Set(ownIndices), selected: null };
      }
      const indices = getAdjacentEmptyIndices(
        board,
        moveSource,
        BOARD_SIZE,
      ).filter((i) => canPlaceCard(board, i, board[moveSource], BOARD_SIZE));
      return {
        highlighted: new Set(indices),
        selected: moveSource,
      };
    }

    if (mode === 'eat') {
      if (eatFoodIndex === null) {
        return {
          highlighted: new Set(
            getEligibleFoodIndices(board, BOARD_SIZE, activePlayer.id),
          ),
          selected: null,
        };
      }
      return {
        highlighted: new Set(
          getAdjacentBirdIndices(board, eatFoodIndex, BOARD_SIZE),
        ),
        selected: eatFoodIndex,
      };
    }

    return none;
  }

  const { highlighted, selected } = computeBoardHighlights();
  const playerColors = Object.fromEntries(players.map((p) => [p.id, p.color]));

  return (
    <main className="page">
      <h1>Pecking Order</h1>
      <p>
        Each turn you get {ACTIONS_PER_TURN} actions to spend on playing a card,
        moving one of your cards, or eating a piece of Food you control. New
        cards and moves must land next to Food or another card.{' '}
        <a href="#new-game">Start a new game</a>
      </p>
      <GameBoard
        cells={board}
        highlightedIndices={highlighted}
        selectedIndex={selected}
        onCellClick={handleCellClick}
        playerColors={playerColors}
      />

      <div className="hand-header">
        <h2>
          {activePlayer.name}&rsquo;s turn
          {activePlayer.isCPU ? ' (CPU)' : ''}
        </h2>
        {!activePlayer.isCPU ? (
          <span className="draw-pile-count">
            Actions: {actionsRemaining}/{ACTIONS_PER_TURN}
          </span>
        ) : null}
        <span className="draw-pile-count">
          Draw pile: {activeState.drawPile.length}
        </span>
        <span className="draw-pile-count">
          Discard: {activeState.discardPile.length}
        </span>
        {canAct ? (
          <div className="action-mode-group" role="group" aria-label="Action">
            <button
              type="button"
              className={`action-mode-btn${mode === 'play' ? ' active' : ''}`}
              onClick={() => switchMode('play')}
            >
              Play Card
            </button>
            <button
              type="button"
              className={`action-mode-btn${mode === 'move' ? ' active' : ''}`}
              onClick={() => switchMode('move')}
            >
              Move Card
            </button>
            <button
              type="button"
              className={`action-mode-btn${mode === 'eat' ? ' active' : ''}`}
              onClick={() => switchMode('eat')}
            >
              Eat Food
            </button>
          </div>
        ) : null}
        {activePlayer.isCPU ? (
          <button
            type="button"
            className="end-turn-btn"
            onClick={handleCpuTurn}
          >
            Play CPU Turn
          </button>
        ) : (
          <button
            type="button"
            className="end-turn-btn"
            onClick={handleEndTurn}
          >
            End Turn
          </button>
        )}
      </div>
      <Hand
        cards={activeState.hand}
        selectedCardId={mode === 'play' ? selectedCardId : null}
        onSelectCard={handleSelectCard}
        playerColor={activePlayer.color}
        disabled={!canAct || mode !== 'play'}
      />
    </main>
  );
}
