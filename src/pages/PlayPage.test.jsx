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

const BOARD_SIZE = 16;

afterEach(() => cleanup());

function neighbors(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const result = [];
  if (row > 0) result.push(index - BOARD_SIZE);
  if (row < BOARD_SIZE - 1) result.push(index + BOARD_SIZE);
  if (col > 0) result.push(index - 1);
  if (col < BOARD_SIZE - 1) result.push(index + 1);
  return result;
}

function isFilled(cell) {
  return cell.className.includes('board-cell-filled');
}

function cardNameOf(cell) {
  const nameEl = cell.querySelector('.card-name');
  if (nameEl) return nameEl.textContent;
  const face = cell.querySelector('.card-on-board');
  return face ? face.getAttribute('title') : null;
}

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

const TOTAL_FOOD_CELLS = DEFAULT_FOOD.shapes.reduce(
  (sum, s) => sum + s.cells.length,
  0,
);

function findFoodIndex(cells) {
  return cells.findIndex((cell) => cell.querySelector('.card-food'));
}

// A single, isolated 1x1 food piece — used by tests that need a
// deterministic, easy-to-reason-about board.
const SINGLE_FOOD = {
  id: 'food',
  name: 'Test Food',
  shapes: [
    {
      id: 'crumb',
      name: 'Crumb',
      emoji: 'CR',
      color: '#57534e',
      cells: [{ row: 0, col: 0 }],
      outsideValue: 1,
      insideValue: 1,
    },
  ],
};

function strongVsWeakDecks() {
  return [
    {
      id: 'deck-weak',
      name: 'Weak',
      size: 4,
      cardTypes: [
        {
          id: 'weak',
          name: 'Weak',
          emoji: 'WK',
          color: '#57534e',
          sides: { top: 1, right: 1, bottom: 1, left: 1 },
        },
      ],
    },
    {
      id: 'deck-strong',
      name: 'Strong',
      size: 4,
      cardTypes: [
        {
          id: 'strong',
          name: 'Strong',
          emoji: 'SG',
          color: '#57534e',
          sides: { top: 9, right: 9, bottom: 9, left: 9 },
        },
      ],
    },
  ];
}

// Plays the first hand card next to the given food-adjacent spot, then
// cycles turns (empty End Turns) until Player 1 is active again with a
// fresh action — since ACTIONS_PER_TURN is 1, a second action on the same
// card requires coming back around to it on a later turn.
function playThenCycleBackToPlayer1(spot) {
  fireEvent.click(
    within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
      'button',
    )[0],
  );
  fireEvent.click(screen.getAllByRole('gridcell')[spot]);
  fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
  fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
}

describe('PlayPage', () => {
  it('deals a starting hand of 4 and shows 1 action remaining', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
    const hand = screen.getByRole('list', { name: 'Your hand' });
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);
  });

  it('renders a 16x16 board with every Food shape placed without overlapping', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    expect(cells.filter((c) => c.querySelector('.card-food'))).toHaveLength(
      TOTAL_FOOD_CELLS,
    );
  });

  it('has no action-mode buttons — playing a card just needs a hand selection and a board click', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Play Card' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move Card' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eat Food' })).toBeNull();
  });

  it('only lets you play a card next to Food or another card', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    // Try a corner cell, guaranteed far from Food (which is placed near
    // the center) and not adjacent to anything.
    fireEvent.click(cells[0]);
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);

    // Now a cell actually adjacent to Food should work.
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    fireEvent.click(cells[adjacentIndex]);
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE - 1);
    expect(isFilled(screen.getAllByRole('gridcell')[adjacentIndex])).toBe(true);
  });

  it('spends the turn’s only action on a play, requiring End Turn afterward', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[adjacentIndex]);

    expect(screen.getByText('Actions: 0/1')).toBeDefined();
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
  });

  it('ending the turn refills the hand and passes to the next player', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    expect(screen.getByText(/Player 2.*turn/)).toBeDefined();
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
    const hand = screen.getByRole('list', { name: 'Your hand' });
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);
  });

  it('captures a weaker adjacent opponent card and discards it to its owner', () => {
    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-weak' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-strong' },
        ]}
        decks={strongVsWeakDecks()}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    // Player 1 (Weak) plays next to Food.
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const weakSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[weakSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Player 2 (Strong) plays next to Player 1's Weak card.
    cells = screen.getAllByRole('gridcell');
    const strongSpot = neighbors(weakSpot).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[strongSpot]);

    // The Weak card should be gone from the board...
    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[weakSpot])).toBe(false);
    expect(isFilled(cells[strongSpot])).toBe(true);

    // ...and sitting in Player 1's discard pile.
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    expect(screen.getByText('Discard: 1')).toBeDefined();
  });

  it("borders a played card with the owner's color and fills it with the deck's color", () => {
    render(
      <PlayPage
        players={[
          {
            id: 'p1',
            name: 'Player 1',
            isCPU: false,
            deckId: DEFAULT_DECKS[0].id,
            color: '#dc2626',
          },
          {
            id: 'p2',
            name: 'Player 2',
            isCPU: false,
            deckId: DEFAULT_DECKS[1].id,
            color: '#2563eb',
          },
        ]}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const spot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[spot]);

    cells = screen.getAllByRole('gridcell');
    const face = cells[spot].querySelector('.card-on-board');
    expect(face.style.getPropertyValue('--card-border')).toBe('#dc2626');
    expect(face.style.getPropertyValue('--card-bg')).toBe(
      DEFAULT_DECKS[0].color,
    );
  });

  it('blocks placing a card next to a stronger opponent card', () => {
    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-strong' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-weak' },
        ]}
        decks={strongVsWeakDecks()}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    // Player 1 (Strong) plays next to Food.
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const strongSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[strongSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Player 2 (Weak) tries to play next to Player 1's Strong card — every
    // side of Weak (1) is lower than every side of Strong (9), so this
    // placement must be rejected entirely rather than merely losing.
    cells = screen.getAllByRole('gridcell');
    const blockedSpot = neighbors(strongSpot).find(
      (i) => i !== foodIndex && !isFilled(cells[i]),
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const handSizeBefore = within(hand).getAllByRole('button').length;
    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[blockedSpot]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[blockedSpot])).toBe(false);
    expect(within(hand).getAllByRole('button')).toHaveLength(handSizeBefore);
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
  });

  it('lets you drag your own card to an adjacent empty cell', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(firstSpot);
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    cells = screen.getAllByRole('gridcell');
    const name = cardNameOf(cells[firstSpot]);
    const destination = neighbors(firstSpot).find(
      (i) => i !== foodIndex && !isFilled(cells[i]),
    );

    fireEvent.dragStart(screen.getAllByRole('gridcell')[firstSpot]);
    fireEvent.drop(screen.getAllByRole('gridcell')[destination]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[firstSpot])).toBe(false);
    expect(cardNameOf(cells[destination])).toBe(name);
    expect(screen.getByText('Actions: 0/1')).toBeDefined();
  });

  it('does not move a card dropped on a non-adjacent or occupied cell', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(firstSpot);

    cells = screen.getAllByRole('gridcell');
    const name = cardNameOf(cells[firstSpot]);
    // A far-away corner cell is never adjacent to firstSpot.
    const farCell = firstSpot < cells.length / 2 ? cells.length - 1 : 0;

    fireEvent.dragStart(screen.getAllByRole('gridcell')[firstSpot]);
    fireEvent.drop(screen.getAllByRole('gridcell')[farCell]);

    cells = screen.getAllByRole('gridcell');
    expect(cardNameOf(cells[firstSpot])).toBe(name);
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
  });

  it('lets you eat a Food piece you have majority control over by tapping it directly', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(birdSpot);
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[foodIndex])).toBe(false);
    expect(isFilled(cells[birdSpot])).toBe(false);
    expect(screen.getByText('Discard: 1')).toBeDefined();
    expect(screen.getByText('Actions: 0/1')).toBeDefined();
  });

  it('cancels the eat-selection if you tap somewhere else instead of a bird', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(birdSpot);

    cells = screen.getAllByRole('gridcell');
    const elsewhere = neighbors(foodIndex).find(
      (i) => i !== birdSpot && !isFilled(cells[i]),
    );

    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[elsewhere]);

    // Nothing was eaten and the action wasn't spent.
    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[foodIndex])).toBe(true);
    expect(isFilled(cells[birdSpot])).toBe(true);
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
  });

  it('shows a Play CPU Turn button for a CPU player and plays for them', () => {
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
    // Food cells, plus the 1 card the CPU's single action lets it play.
    expect(filledCells.length).toBeGreaterThan(TOTAL_FOOD_CELLS);
    expect(filledCells.length).toBeLessThanOrEqual(TOTAL_FOOD_CELLS + 1);
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

  it('opens a modal listing the draw pile cards when tapped', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    const drawCount = Number(
      screen.getByText(/Draw pile: \d+/).textContent.match(/\d+/)[0],
    );

    fireEvent.click(screen.getByText(/Draw pile: \d+/));

    const modal = screen.getByRole('dialog', { name: 'Draw pile' });
    expect(within(modal).getAllByRole('listitem')).toHaveLength(drawCount);

    fireEvent.click(within(modal).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a modal listing the discard pile cards when tapped', () => {
    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-weak' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-strong' },
        ]}
        decks={strongVsWeakDecks()}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    // Player 1 (Weak) plays, then Player 2 (Strong) captures it.
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const weakSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[weakSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    cells = screen.getAllByRole('gridcell');
    const strongSpot = neighbors(weakSpot).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[strongSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    expect(screen.getByText('Discard: 1')).toBeDefined();
    fireEvent.click(screen.getByText('Discard: 1'));

    const modal = screen.getByRole('dialog', { name: 'Discard pile' });
    expect(within(modal).getAllByRole('listitem')).toHaveLength(1);
    expect(within(modal).getByText('Weak')).toBeDefined();
  });
});
