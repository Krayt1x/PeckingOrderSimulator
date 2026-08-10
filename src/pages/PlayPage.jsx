import { useState } from 'react';
import GameBoard, { BOARD_SIZE } from '../components/GameBoard.jsx';
import Hand from '../components/Hand.jsx';
import { HAND_SIZE, buildDrawPile } from '../lib/decks.js';
import { placeFoodShapes } from '../lib/food.js';
import { pickCpuMove } from '../lib/cpu.js';

// Food is the objective cards the game is anchored around, placed as close
// to the board's center as its shapes allow.
function createInitialBoard(food) {
  const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const foodCells = placeFoodShapes(food, BOARD_SIZE);
  Object.entries(foodCells).forEach(([index, card]) => {
    cells[Number(index)] = card;
  });
  return cells;
}

function dealFrom(deck) {
  const pile = buildDrawPile(deck);
  return { hand: pile.slice(0, HAND_SIZE), drawPile: pile.slice(HAND_SIZE) };
}

export default function PlayPage({ players, decks, food }) {
  const [board, setBoard] = useState(() => createInitialBoard(food));
  const [playerStates, setPlayerStates] = useState(() =>
    players.map((p) => dealFrom(decks.find((d) => d.id === p.deckId))),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState(null);

  const activePlayer = players[activeIndex];
  const activeState = playerStates[activeIndex];

  function placeCard(playerIndex, cardId, cellIndex) {
    setBoard((current) => {
      const card = playerStates[playerIndex].hand.find((c) => c.id === cardId);
      if (!card) return current;
      const next = [...current];
      next[cellIndex] = card;
      return next;
    });
    setPlayerStates((current) =>
      current.map((state, i) =>
        i === playerIndex
          ? { ...state, hand: state.hand.filter((c) => c.id !== cardId) }
          : state,
      ),
    );
  }

  function endTurnFor(playerIndex) {
    setPlayerStates((current) =>
      current.map((state, i) => {
        if (i !== playerIndex) return state;
        const needed = HAND_SIZE - state.hand.length;
        if (needed <= 0) return state;
        return {
          hand: [...state.hand, ...state.drawPile.slice(0, needed)],
          drawPile: state.drawPile.slice(needed),
        };
      }),
    );
    setActiveIndex((current) => (current + 1) % players.length);
    setSelectedCardId(null);
  }

  function handleSelectCard(cardId) {
    if (activePlayer.isCPU) return;
    setSelectedCardId((current) => (current === cardId ? null : cardId));
  }

  function handleCellClick(index) {
    if (activePlayer.isCPU) return;
    if (!selectedCardId || board[index]) return;
    placeCard(activeIndex, selectedCardId, index);
    setSelectedCardId(null);
  }

  function handleEndTurn() {
    endTurnFor(activeIndex);
  }

  function handleCpuTurn() {
    if (!activePlayer.isCPU) return;
    const move = pickCpuMove(activeState.hand, board);
    if (move) placeCard(activeIndex, move.cardId, move.cellIndex);
    endTurnFor(activeIndex);
  }

  const selectedCard =
    activeState.hand.find((c) => c.id === selectedCardId) ?? null;

  return (
    <main className="page">
      <h1>Pecking Order</h1>
      <p>
        Pick a card from your hand, then click an empty square on the board to
        play it. The board is 10x10 — drag it to look around. The 🌾 Food cards
        near the center are the objectives the game is anchored around.{' '}
        <a href="#new-game">Start a new game</a>
      </p>
      <GameBoard
        cells={board}
        selectedCard={selectedCard}
        onCellClick={handleCellClick}
      />

      <div className="hand-header">
        <h2>
          {activePlayer.name}&rsquo;s turn
          {activePlayer.isCPU ? ' (CPU)' : ''}
        </h2>
        <span className="draw-pile-count">
          Draw pile: {activeState.drawPile.length}
        </span>
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
        selectedCardId={selectedCardId}
        onSelectCard={handleSelectCard}
        disabled={activePlayer.isCPU}
      />
    </main>
  );
}
