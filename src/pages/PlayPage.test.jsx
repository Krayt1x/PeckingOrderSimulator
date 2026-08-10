import { describe, it, expect, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import PlayPage from './PlayPage.jsx';
import { DEFAULT_DECKS, HAND_SIZE } from '../lib/decks.js';
import { DEFAULT_FOOD } from '../lib/food.js';

afterEach(() => cleanup());

function twoPlayers({ cpuSecond = false } = {}) {
  return [
    { id: 'p1', name: 'Player 1', isCPU: false, deckId: DEFAULT_DECKS[0].id },
    {
      id: 'p2',
      name: 'Player 2',
      isCPU: cpuSecond,
      deckId: DEFAULT_DECKS[1].id,
    },
  ];
}

function cardNameOf(button) {
  const nameEl = button.querySelector('.card-name');
  if (nameEl) return nameEl.textContent;
  return button.querySelector('.card-on-board').getAttribute('title');
}

const TOTAL_FOOD_CELLS = DEFAULT_FOOD.shapes.reduce(
  (sum, s) => sum + s.cells.length,
  0,
);

function findFoodCells(cells) {
  return cells.filter((cell) => cell.querySelector('.card-food'));
}

function findFirstFoodIndex(cells) {
  return cells.findIndex((cell) => cell.querySelector('.card-food'));
}

describe('PlayPage', () => {
  it('deals a starting hand of 4 for the active player and names whose turn it is', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    const hand = screen.getByRole('list', { name: 'Your hand' });
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);
  });

  it('renders a 10x10 board with every Food shape placed without overlapping', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(100);

    const foodCells = findFoodCells(cells);
    expect(foodCells).toHaveLength(TOTAL_FOOD_CELLS);

    const foodNames = new Set(foodCells.map((cell) => cardNameOf(cell)));
    DEFAULT_FOOD.shapes.forEach((shape) =>
      expect(foodNames.has(shape.name)).toBe(true),
    );
  });

  it('plays a card from hand and ends the turn, advancing to the next player', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const firstCard = within(hand).getAllByRole('button')[0];
    const name = cardNameOf(firstCard);

    fireEvent.click(firstCard);
    fireEvent.click(screen.getAllByRole('gridcell')[0]);

    expect(cardNameOf(screen.getAllByRole('gridcell')[0])).toBe(name);
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE - 1);

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByText(/Player 2.*turn/)).toBeDefined();
  });

  it('does not let you play a card onto a Food objective cell', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const foodIndex = findFirstFoodIndex(screen.getAllByRole('gridcell'));

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);

    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);
  });

  it('shows a Play CPU Turn button for a CPU player and plays a move for them', () => {
    render(
      <PlayPage
        players={twoPlayers({ cpuSecond: true })}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByText(/Player 2.*turn.*CPU/)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Play CPU Turn' }));

    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    const filledCells = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.className.includes('board-cell-filled'));
    // Every Food cell plus the one card the CPU just played.
    expect(filledCells).toHaveLength(TOTAL_FOOD_CELLS + 1);
  });

  it("disables the hand while it is a CPU player's turn", () => {
    render(
      <PlayPage
        players={twoPlayers({ cpuSecond: true })}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    const hand = screen.getByRole('list', { name: 'Your hand' });
    within(hand)
      .getAllByRole('button')
      .forEach((button) => expect(button.disabled).toBe(true));
  });
});
