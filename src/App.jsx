import { useState } from 'react';
import GameBoard, { BOARD_SIZE } from './components/GameBoard.jsx';
import Hand from './components/Hand.jsx';

function getInitialTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

const STARTING_HAND = [
  { id: 'c1', name: 'Card 1', emoji: '🐔', color: '#d97706' },
  { id: 'c2', name: 'Card 2', emoji: '🐓', color: '#dc2626' },
  { id: 'c3', name: 'Card 3', emoji: '🐤', color: '#eab308' },
  { id: 'c4', name: 'Card 4', emoji: '🐣', color: '#65a30d' },
];

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

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [hand, setHand] = useState(STARTING_HAND);
  const [board, setBoard] = useState(createInitialBoard);
  const [selectedCardId, setSelectedCardId] = useState(null);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  function handleSelectCard(cardId) {
    setSelectedCardId((current) => (current === cardId ? null : cardId));
  }

  function handleCellClick(index) {
    if (!selectedCardId || board[index]) return;

    const card = hand.find((c) => c.id === selectedCardId);
    setBoard((current) => {
      const next = [...current];
      next[index] = card;
      return next;
    });
    setHand((current) => current.filter((c) => c.id !== selectedCardId));
    setSelectedCardId(null);
  }

  const selectedCard = hand.find((c) => c.id === selectedCardId) ?? null;

  return (
    <div>
      <header className="topnav">
        <div className="topnav-left">
          <strong>Pecking Order</strong>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>
      <main className="page">
        <h1>Pecking Order</h1>
        <p>
          Pick a card from your hand, then click an empty square on the board to
          play it. The board is 10x10 — drag it to look around. The 🌾 Food
          cards near the center are the objectives the game is anchored around.
        </p>
        <GameBoard
          cells={board}
          selectedCard={selectedCard}
          onCellClick={handleCellClick}
        />
        <h2>Your hand</h2>
        <Hand
          cards={hand}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
        />
      </main>
    </div>
  );
}
