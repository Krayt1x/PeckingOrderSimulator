import { useState } from 'react';
import GameBoard, { BOARD_SIZE } from '../components/GameBoard.jsx';
import Hand from '../components/Hand.jsx';
import { HAND_SIZE, buildDrawPile } from '../lib/decks.js';

// Food is the objective cards the game is anchored around — a few fixed
// spots near the center of the board for now, until real placement rules
// are defined.
const FOOD_POSITIONS = [44, 45, 54, 55];

function createInitialBoard() {
  const cells = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  FOOD_POSITIONS.forEach((index, i) => {
    cells[index] = {
      id: `food-${i}`,
      type: 'food',
      name: 'Food',
      emoji: '🌾',
      color: '#16a34a',
    };
  });
  return cells;
}

function dealFrom(deck) {
  const pile = buildDrawPile(deck);
  return { hand: pile.slice(0, HAND_SIZE), drawPile: pile.slice(HAND_SIZE) };
}

export default function PlayPage({ decks }) {
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id ?? null);
  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? decks[0];

  const [board, setBoard] = useState(createInitialBoard);
  const [game, setGame] = useState(() => dealFrom(selectedDeck));
  const [selectedCardId, setSelectedCardId] = useState(null);

  function handleDeckChange(id) {
    setSelectedDeckId(id);
    setGame(dealFrom(decks.find((d) => d.id === id)));
    setSelectedCardId(null);
  }

  function reshuffle() {
    setGame(dealFrom(selectedDeck));
    setSelectedCardId(null);
  }

  function handleSelectCard(cardId) {
    setSelectedCardId((current) => (current === cardId ? null : cardId));
  }

  function handleCellClick(index) {
    if (!selectedCardId || board[index]) return;

    const card = game.hand.find((c) => c.id === selectedCardId);
    setBoard((current) => {
      const next = [...current];
      next[index] = card;
      return next;
    });
    setGame((current) => ({
      ...current,
      hand: current.hand.filter((c) => c.id !== selectedCardId),
    }));
    setSelectedCardId(null);
  }

  function handleEndTurn() {
    setGame((current) => {
      const needed = HAND_SIZE - current.hand.length;
      if (needed <= 0) return current;
      return {
        hand: [...current.hand, ...current.drawPile.slice(0, needed)],
        drawPile: current.drawPile.slice(needed),
      };
    });
  }

  const selectedCard = game.hand.find((c) => c.id === selectedCardId) ?? null;

  return (
    <main className="page">
      <h1>Pecking Order</h1>
      <p>
        Pick a card from your hand, then click an empty square on the board to
        play it. The board is 10x10 — drag it to look around. The 🌾 Food cards
        near the center are the objectives the game is anchored around.
      </p>
      <GameBoard
        cells={board}
        selectedCard={selectedCard}
        onCellClick={handleCellClick}
      />

      <div className="hand-header">
        <h2>Your hand</h2>
        <label className="deck-picker">
          Deck
          <select
            value={selectedDeckId ?? ''}
            onChange={(event) => handleDeckChange(event.target.value)}
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </label>
        <span className="draw-pile-count">
          Draw pile: {game.drawPile.length}
        </span>
        <button type="button" className="board-recenter" onClick={reshuffle}>
          New hand
        </button>
        <button type="button" className="end-turn-btn" onClick={handleEndTurn}>
          End Turn
        </button>
      </div>
      <Hand
        cards={game.hand}
        selectedCardId={selectedCardId}
        onSelectCard={handleSelectCard}
      />
    </main>
  );
}
