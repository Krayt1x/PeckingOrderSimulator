import { useEffect, useState } from 'react';
import GameBoard, { BOARD_SIZE } from '../components/GameBoard.jsx';
import Hand from '../components/Hand.jsx';
import { HAND_SIZE, buildDrawPile, shuffle } from '../lib/decks.js';
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
import { pickCpuMove, pickCpuEat } from '../lib/cpu.js';

const ACTIONS_PER_TURN = 1;
const CAPTURE_REMOVAL_DELAY_MS = 250;

// Matches NewGamePage's DEFAULT_RULESET — used when PlayPage is rendered
// without an explicit ruleset (e.g. directly in tests).
const DEFAULT_RULESET = {
  allowMoving: false,
  allowReturnToHand: false,
  allowCardRotation: false,
  allowCustomSkins: false,
  skin: 'alpha',
};

// Rotating a card 90° spins which edge each side value faces — physically
// equivalent to turning the card itself.
function rotateSides(sides, direction) {
  if (direction === 'cw') {
    return {
      top: sides.left,
      right: sides.top,
      bottom: sides.right,
      left: sides.bottom,
    };
  }
  return {
    top: sides.right,
    right: sides.bottom,
    bottom: sides.left,
    left: sides.top,
  };
}

// CPU players carry their strategy as a "(A)"/"(D)" suffix wherever their
// name is shown, so it's visible at a glance during play.
function displayName(player) {
  if (!player.isCPU) return player.name;
  return `${player.name} (${player.cpuStrategy === 'defensive' ? 'D' : 'A'})`;
}

let nextFoodCardId = 1;

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
}) {
  const shapeIds = foodShapeIds ?? food.shapes.map((s) => s.id);

  const [board, setBoard] = useState(() => createInitialBoard(food, shapeIds));
  const [playerStates, setPlayerStates] = useState(() =>
    players.map((p) => dealFrom(decks.find((d) => d.id === p.deckId))),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [actionsRemaining, setActionsRemaining] = useState(ACTIONS_PER_TURN);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [eatFoodIndex, setEatFoodIndex] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [pileModal, setPileModal] = useState(null);

  const activePlayer = players[activeIndex];
  const activeState = playerStates[activeIndex];
  const activeDeck = decks.find((d) => d.id === activePlayer.deckId);
  const foodRemaining = board.some((cell) => cell?.type === 'food');
  const gameOver = !foodRemaining;
  const canAct = !activePlayer.isCPU && actionsRemaining > 0 && !gameOver;

  function clearSelections() {
    setSelectedCardId(null);
    setEatFoodIndex(null);
    setDragSourceIndex(null);
  }

  // `bonus` is true when the action came from playing a Food-derived
  // card from hand — that doesn't cost the turn's action, it grants an
  // extra one instead.
  function spendAction(bonus = false) {
    setActionsRemaining((n) => (bonus ? n + 1 : Math.max(0, n - 1)));
    clearSelections();
  }

  function advanceTurn() {
    setActiveIndex((current) => (current + 1) % players.length);
    setActionsRemaining(ACTIONS_PER_TURN);
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
      setTimeout(() => setBoard(postCaptureBoard), CAPTURE_REMOVAL_DELAY_MS);
    }
  }

  function handleSelectCard(cardId) {
    if (!canAct) return;
    setEatFoodIndex(null);
    setDragSourceIndex(null);
    setSelectedCardId((current) => (current === cardId ? null : cardId));
  }

  // Discards a food-derived hand card directly, without playing it onto
  // the board — free and grants a bonus action, same as playing it would
  // (the point already scored when it was eaten is untouched, since that
  // was banked at eat-time, not tied to this card).
  function handleUseFood(cardId) {
    if (!canAct) return;
    const card = activeState.hand.find((c) => c.id === cardId && c.fromFood);
    if (!card) return;

    setPlayerStates(
      playerStates.map((state, i) =>
        i === activeIndex
          ? {
              ...state,
              hand: state.hand.filter((c) => c.id !== cardId),
              discardPile: [...state.discardPile, card],
            }
          : state,
      ),
    );
    spendAction(true);
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
                      rotation:
                        ((c.rotation ?? 0) +
                          (direction === 'cw' ? 90 : -90) +
                          360) %
                        360,
                    }
                  : c,
              ),
            }
          : state,
      ),
    );
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

    commitBoardAfterCapture(withCard, nextBoard, captured);
    setPlayerStates(nextPlayerStates);
    spendAction();
  }

  function handleMoveCard(sourceIndex, cellIndex) {
    const card = board[sourceIndex];
    if (!card) return;

    const withMove = [...board];
    withMove[sourceIndex] = null;
    withMove[cellIndex] = card;
    const { board: nextBoard, captured } = resolveCaptures(
      withMove,
      cellIndex,
      card,
      BOARD_SIZE,
    );

    commitBoardAfterCapture(withMove, nextBoard, captured);
    setPlayerStates(applyOwnerCaptureBookkeeping(playerStates, captured));
    spendAction();
  }

  function handleEatBird(birdIndex) {
    const eatenBird = board[birdIndex];
    const eatenFood = board[eatFoodIndex];
    if (!eatenBird || !eatenFood) return;

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
          score: next.score + 1,
        };
      }
      return next;
    });

    setBoard(nextBoard);
    setPlayerStates(nextPlayerStates);
    spendAction();
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
      if (!canPlaceCard(board, index, placedCard, BOARD_SIZE)) return;
      handlePlayCard(index);
      return;
    }

    const eligible = getEligibleFoodIndices(board, BOARD_SIZE, activePlayer.id);
    if (eligible.includes(index)) {
      setEatFoodIndex(index);
    }
  }

  function handleCardDragStart(index) {
    if (!canAct) return;
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
    if (!canPlaceCard(board, destinationIndex, card, BOARD_SIZE)) return;
    handleMoveCard(source, destinationIndex);
  }

  // Dropping a dragged card onto your own discard pile tile sends it
  // straight to your discard pile instead of moving it on the board —
  // free (no action cost), unlike a board move.
  function handleReturnToDiscard() {
    const source = dragSourceIndex;
    setDragSourceIndex(null);
    if (source === null || !canAct || !ruleset.allowReturnToHand) return;

    const card = board[source];
    if (!card || card.type === 'food' || card.ownerId !== activePlayer.id) {
      return;
    }

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
    let usedFoodCards = [];
    let remaining = actionsRemaining;

    while (remaining > 0) {
      const eatChoice = pickCpuEat(workingBoard, BOARD_SIZE, activePlayer.id);
      if (eatChoice) {
        const eatenBird = workingBoard[eatChoice.birdIndex];
        const eatenFood = workingBoard[eatChoice.foodIndex];
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
        continue;
      }

      const move = pickCpuMove(
        workingHand,
        workingBoard,
        BOARD_SIZE,
        activePlayer.id,
        activePlayer.cpuStrategy,
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
      i === activeIndex
        ? {
            ...state,
            hand: workingHand,
            discardPile: [...state.discardPile, ...usedFoodCards],
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
              score: state.score + eatenFoodCards.length,
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

  function openPileModal(type) {
    const pile =
      type === 'draw' ? activeState.drawPile : activeState.discardPile;
    setPileModal({ type, cards: shuffle(pile) });
  }

  function computeBoardHighlights() {
    const none = { highlighted: new Set(), selected: null };
    if (!canAct) return none;

    if (selectedCardId) {
      const card = activeState.hand.find((c) => c.id === selectedCardId);
      if (!card || card.fromFood) return none;
      const placedCard = { ...card, ownerId: activePlayer.id };
      const indices = getPlayableIndices(
        board,
        BOARD_SIZE,
        activePlayer.id,
      ).filter((i) => canPlaceCard(board, i, placedCard, BOARD_SIZE));
      return { highlighted: new Set(indices), selected: null };
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
        selected: eatFoodIndex,
      };
    }

    if (dragSourceIndex !== null) {
      const card = board[dragSourceIndex];
      const indices = card
        ? getAdjacentEmptyIndices(board, dragSourceIndex, BOARD_SIZE).filter(
            (i) => canPlaceCard(board, i, card, BOARD_SIZE),
          )
        : [];
      return { highlighted: new Set(indices), selected: dragSourceIndex };
    }

    return {
      highlighted: new Set(
        getEligibleFoodIndices(board, BOARD_SIZE, activePlayer.id),
      ),
      selected: null,
    };
  }

  const { highlighted, selected } = computeBoardHighlights();
  const playerColors = Object.fromEntries(players.map((p) => [p.id, p.color]));

  const draggableIndices = new Set();
  if (canAct && (ruleset.allowMoving || ruleset.allowReturnToHand)) {
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
  const activeSkin = ruleset.allowCustomSkins ? ruleset.skin : 'alpha';

  return (
    <main className="page" data-skin={activeSkin}>
      {gameOver ? (
        <div className="game-over-banner">
          <h2>Game Over</h2>
          <p>
            {winners.length === 1
              ? `${displayName(winners[0])} wins with ${maxScore} point${maxScore === 1 ? '' : 's'}!`
              : `It's a tie between ${winners.map(displayName).join(' and ')} at ${maxScore} points!`}
          </p>
        </div>
      ) : null}
      <GameBoard
        cells={board}
        highlightedIndices={highlighted}
        selectedIndex={selected}
        onCellClick={handleCellClick}
        playerColors={playerColors}
        draggableIndices={draggableIndices}
        onCardDragStart={handleCardDragStart}
        onCardDragEnd={handleCardDragEnd}
        onCardDrop={handleCardDrop}
      />

      <ul className="score-board">
        {players.map((p, i) => {
          const score = playerStates[i].score;
          const isLeader = maxScore > 0 && score === maxScore;
          return (
            <li
              key={p.id}
              className="score-entry"
              style={{ '--player-color': p.color }}
            >
              <span className="score-name">{displayName(p)}</span>:{' '}
              <span className={`score-value${isLeader ? ' score-leader' : ''}`}>
                {score}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="hand-header">
        <h2>
          {displayName(activePlayer)}&rsquo;s turn
          {activePlayer.isCPU ? ' (CPU)' : ''}
        </h2>
        {!activePlayer.isCPU && !gameOver ? (
          <span className="draw-pile-count">
            Actions: {actionsRemaining}/{ACTIONS_PER_TURN}
          </span>
        ) : null}
        {gameOver ? null : activePlayer.isCPU ? (
          <span className="draw-pile-count">CPU is playing&hellip;</span>
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
      <div className="hand-row">
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
        <Hand
          cards={activeState.hand}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
          onUseFood={handleUseFood}
          onRotateCard={handleRotateCard}
          allowRotation={ruleset.allowCardRotation}
          playerColor={activePlayer.color}
          disabled={!canAct}
        />
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
      {pileModal ? (
        <div
          className="color-modal-backdrop"
          onClick={() => setPileModal(null)}
        >
          <div
            className="pile-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              pileModal.type === 'draw' ? 'Draw pile' : 'Discard pile'
            }
            onClick={(event) => event.stopPropagation()}
          >
            <h3>
              {pileModal.type === 'draw' ? 'Draw pile' : 'Discard pile'} (
              {pileModal.cards.length})
            </h3>
            {pileModal.cards.length === 0 ? (
              <p className="hand-empty">Empty</p>
            ) : (
              <ul className="pile-modal-list">
                {pileModal.cards.map((card, i) => (
                  <li
                    key={`${card.id}-${i}`}
                    className="pile-modal-card"
                    style={{
                      '--card-border': activePlayer.color,
                      '--card-bg': card.deckColor,
                    }}
                  >
                    <span className="card-emoji">{card.emoji}</span>
                    <span>{card.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="board-recenter"
              onClick={() => setPileModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
