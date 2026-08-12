import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import PlayPage from './PlayPage.jsx';
import { DEFAULT_DECKS, HAND_SIZE } from '../lib/decks.js';
import { DEFAULT_FOOD } from '../lib/food.js';
import { playActionTick, playFoodCrunch } from '../lib/sound.js';

vi.mock('../lib/sound.js', () => ({
  playActionTick: vi.fn(),
  playFoodCrunch: vi.fn(),
}));

const BOARD_SIZE = 16;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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

// The score board's name and score sit in separate spans now (so each can
// be styled independently), so their combined text isn't a single text
// node getByText can match — read the whole entry's textContent instead.
function scoreEntryText(name) {
  const entry = Array.from(document.querySelectorAll('.score-entry')).find(
    (li) => li.querySelector('.score-name')?.textContent === name,
  );
  return entry?.textContent;
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

// The pile tiles show their card count only via aria-label (the visible
// face just says "Draw Pile"/"Discard Pile" plus the deck name).
function pileCount(type) {
  const label =
    type === 'draw' ? /Draw pile: \d+ cards/ : /Discard pile: \d+ cards/;
  return Number(
    screen
      .getByRole('button', { name: label })
      .getAttribute('aria-label')
      .match(/\d+/)[0],
  );
}

// A single, isolated 1x1 food piece — used by tests that need a
// deterministic, easy-to-reason-about board. Zero-valued on every side (like
// the real Chip shape) so any card can always legally play next to it —
// Food now blocks a too-weak placement the same way an opponent card would
// (#98), and most of these tests aren't about that value comparison.
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
      outsideValue: 0,
      insideValue: 0,
    },
  ],
};

// Two isolated 1x1 food pieces — used by tests that need to eat Food
// without immediately ending the game (which SINGLE_FOOD, with only one
// piece, always does now that eating the last Food ends the game).
const TWO_FOOD = {
  id: 'food',
  name: 'Test Food',
  shapes: [
    {
      id: 'crumb-a',
      name: 'Crumb A',
      emoji: 'CA',
      color: '#57534e',
      cells: [{ row: 0, col: 0 }],
      outsideValue: 0,
      insideValue: 0,
    },
    {
      id: 'crumb-b',
      name: 'Crumb B',
      emoji: 'CB',
      color: '#57534e',
      cells: [{ row: 0, col: 0 }],
      outsideValue: 0,
      insideValue: 0,
    },
  ],
};

function strongVsWeakDecks() {
  return [
    {
      id: 'deck-weak',
      name: 'Weak',
      cardTypes: [
        {
          id: 'weak',
          name: 'Weak',
          emoji: 'WK',
          color: '#57534e',
          quantity: 4,
          sides: { top: 1, right: 1, bottom: 1, left: 1 },
        },
      ],
    },
    {
      id: 'deck-strong',
      name: 'Strong',
      cardTypes: [
        {
          id: 'strong',
          name: 'Strong',
          emoji: 'SG',
          color: '#57534e',
          quantity: 4,
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
        food={SINGLE_FOOD}
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

  it('plays a tick sound when a card is played, using an action (#74)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    expect(playActionTick).not.toHaveBeenCalled();
    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(cells[adjacentIndex]);

    expect(playActionTick).toHaveBeenCalledTimes(1);
    expect(playFoodCrunch).not.toHaveBeenCalled();
  });

  it('does not let you play a card whose only adjacency is your own card', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(firstSpot);
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    cells = screen.getAllByRole('gridcell');
    const filledIndices = cells
      .map((c, i) => (isFilled(c) ? i : null))
      .filter((i) => i !== null);
    // A neighbor of our own card whose only filled neighbor is that card
    // itself — not Food, not an opponent card.
    const ownOnlySpot = neighbors(firstSpot).find((i) => {
      if (isFilled(cells[i])) return false;
      return !neighbors(i).some(
        (n) => n !== firstSpot && filledIndices.includes(n),
      );
    });
    expect(ownOnlySpot).toBeDefined();

    const hand = screen.getByRole('list', { name: 'Your hand' });
    const handCountBefore = within(hand).getAllByRole('button').length;
    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[ownOnlySpot]);

    expect(within(hand).getAllByRole('button')).toHaveLength(handCountBefore);
    expect(isFilled(screen.getAllByRole('gridcell')[ownOnlySpot])).toBe(false);
  });

  it('spends the turn’s only action on a play, requiring End Turn afterward', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
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

  it('undoes a play, restoring the hand, board, and action count', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
      />,
    );
    expect(screen.getByRole('button', { name: 'Undo' }).disabled).toBe(true);

    const hand = screen.getByRole('list', { name: 'Your hand' });
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    const handCountBefore = within(hand).getAllByRole('button').length;
    const playedCardName = within(hand)
      .getAllByRole('button')[0]
      .querySelector('.card-name').textContent;

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[adjacentIndex]);

    expect(screen.getByText('Actions: 0/1')).toBeDefined();
    expect(isFilled(screen.getAllByRole('gridcell')[adjacentIndex])).toBe(true);
    expect(within(hand).getAllByRole('button')).toHaveLength(
      handCountBefore - 1,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('Actions: 1/1')).toBeDefined();
    expect(isFilled(screen.getAllByRole('gridcell')[adjacentIndex])).toBe(
      false,
    );
    const handAfterUndo = within(hand).getAllByRole('button');
    expect(handAfterUndo).toHaveLength(handCountBefore);
    expect(
      handAfterUndo.some(
        (btn) => btn.querySelector('.card-name').textContent === playedCardName,
      ),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Undo' }).disabled).toBe(true);
  });

  it('clears the undo history once the turn ends', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[adjacentIndex]);
    expect(screen.getByRole('button', { name: 'Undo' }).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    expect(screen.getByText(/Player 2.*turn/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Undo' }).disabled).toBe(true);
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

  it('captures a weaker adjacent opponent card and discards it to its owner', async () => {
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

    // The captured card stays briefly visible before it's actually
    // removed from the board (a 250ms delay), but the new card lands
    // immediately.
    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[strongSpot])).toBe(true);
    await waitFor(
      () =>
        expect(isFilled(screen.getAllByRole('gridcell')[weakSpot])).toBe(false),
      { timeout: 2000 },
    );

    // ...and sitting in Player 1's discard pile.
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Discard pile: 1 cards' }),
    ).toBeDefined();
  });

  it('blocks a tied-value placement by default, but allows it with Equal Value Playable', () => {
    function tiedDecks() {
      return [
        {
          id: 'deck-p1',
          name: 'P1',
          cardTypes: [
            {
              id: 'p1card',
              name: 'P1Card',
              emoji: 'P1',
              color: '#57534e',
              quantity: 2,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
        {
          id: 'deck-p2',
          name: 'P2',
          cardTypes: [
            {
              id: 'p2card',
              name: 'P2Card',
              emoji: 'P2',
              color: '#57534e',
              quantity: 2,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
      ];
    }

    const { unmount } = render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-p1' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-p2' },
        ]}
        decks={tiedDecks()}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const p1Spot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[p1Spot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Player 2's card is a 1-1-1-1 tie against Player 1's card on every
    // shared edge — blocked by default.
    cells = screen.getAllByRole('gridcell');
    const p2Spot = neighbors(p1Spot).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[p2Spot]);
    expect(isFilled(screen.getAllByRole('gridcell')[p2Spot])).toBe(false);
    unmount();

    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-p1' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-p2' },
        ]}
        decks={tiedDecks()}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
        ruleset={{ allowMoving: false, allowEqualValuePlay: true }}
      />,
    );
    cells = screen.getAllByRole('gridcell');
    const foodIndex2 = findFoodIndex(cells);
    const p1Spot2 = neighbors(foodIndex2).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[p1Spot2]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    cells = screen.getAllByRole('gridcell');
    const p2Spot2 = neighbors(p1Spot2).find((i) => !isFilled(cells[i]));
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[p2Spot2]);
    expect(isFilled(screen.getAllByRole('gridcell')[p2Spot2])).toBe(true);
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
        ruleset={{ allowMoving: true, allowReturnToHand: false }}
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

  it('does not let you drag a card when the Allow Moving ruleset is disabled', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
        ruleset={{ allowMoving: false, allowReturnToHand: false }}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(firstSpot);

    cells = screen.getAllByRole('gridcell');
    const destination = neighbors(firstSpot).find(
      (i) => i !== foodIndex && !isFilled(cells[i]),
    );

    fireEvent.dragStart(screen.getAllByRole('gridcell')[firstSpot]);
    fireEvent.drop(screen.getAllByRole('gridcell')[destination]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[firstSpot])).toBe(true);
    expect(isFilled(cells[destination])).toBe(false);
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
  });

  it('lets you return your own card to the discard pile for free when Allow Return to Hand is enabled', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
        ruleset={{ allowMoving: true, allowReturnToHand: true }}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(firstSpot);
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    const discardTile = screen.getByRole('button', {
      name: /Discard pile: \d+ cards/,
    });

    fireEvent.dragStart(screen.getAllByRole('gridcell')[firstSpot]);
    fireEvent.drop(discardTile);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[firstSpot])).toBe(false);
    // Free — the action wasn't spent.
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Discard pile: 1 cards' }),
    ).toBeDefined();
  });

  it('does not return a card to the discard pile when Allow Return to Hand is disabled', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
        ruleset={{ allowMoving: true, allowReturnToHand: false }}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(firstSpot);

    const discardTile = screen.getByRole('button', {
      name: /Discard pile: \d+ cards/,
    });

    fireEvent.dragStart(screen.getAllByRole('gridcell')[firstSpot]);
    fireEvent.drop(discardTile);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[firstSpot])).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Discard pile: 0 cards' }),
    ).toBeDefined();
  });

  it('does not show rotate arrows when Allow Card Rotation is disabled', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    fireEvent.click(within(hand).getAllByRole('button')[0]);

    expect(
      screen.queryByRole('button', { name: 'Rotate clockwise' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Rotate anti-clockwise' }),
    ).toBeNull();
  });

  it('spins the whole card face visually without re-shuffling its printed numbers', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        ruleset={{
          allowMoving: true,
          allowReturnToHand: false,
          allowCardRotation: true,
        }}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    fireEvent.click(within(hand).getAllByRole('button')[0]);

    const selectedCard = document.querySelector('.hand .card-selected');
    expect(selectedCard).not.toBeNull();
    const face = selectedCard.querySelector('.card-face');
    const readSides = () => ({
      top: selectedCard.querySelector('.card-side-top').textContent,
      right: selectedCard.querySelector('.card-side-right').textContent,
      bottom: selectedCard.querySelector('.card-side-bottom').textContent,
      left: selectedCard.querySelector('.card-side-left').textContent,
    });
    const before = readSides();
    expect(face.style.transform).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Rotate clockwise' }));
    // The printed numbers stay put in their fixed slots — it's the whole
    // face (name + numbers together) that visually turns via transform,
    // not a second data-level shuffle on top of the first.
    expect(readSides()).toEqual(before);
    expect(face.style.transform).toBe('rotate(90deg)');

    fireEvent.click(screen.getByRole('button', { name: 'Rotate clockwise' }));
    expect(face.style.transform).toBe('rotate(180deg)');

    fireEvent.click(
      screen.getByRole('button', { name: 'Rotate anti-clockwise' }),
    );
    expect(face.style.transform).toBe('rotate(90deg)');
  });

  it('carries a rotated card’s visual spin onto the board once played (#92)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        ruleset={{
          allowMoving: true,
          allowReturnToHand: false,
          allowCardRotation: true,
        }}
      />,
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });
    fireEvent.click(within(hand).getAllByRole('button')[0]);

    const selectedCard = document.querySelector('.hand .card-selected');
    const before = {
      top: selectedCard.querySelector('.card-side-top').textContent,
      right: selectedCard.querySelector('.card-side-right').textContent,
      bottom: selectedCard.querySelector('.card-side-bottom').textContent,
      left: selectedCard.querySelector('.card-side-left').textContent,
    };

    fireEvent.click(screen.getByRole('button', { name: 'Rotate clockwise' }));

    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    fireEvent.click(screen.getAllByRole('gridcell')[adjacentIndex]);

    const placedCell = screen.getAllByRole('gridcell')[adjacentIndex];
    const placedFace = placedCell.querySelector('.card-face');
    expect(placedFace.style.transform).toBe('rotate(90deg)');
    // The printed numbers stay at their fixed (rotation-0) slots on the
    // board too — the CSS transform is what turns the whole face, not a
    // second data-level shuffle stacked on top of it.
    expect({
      top: placedCell.querySelector('.card-side-top').textContent,
      right: placedCell.querySelector('.card-side-right').textContent,
      bottom: placedCell.querySelector('.card-side-bottom').textContent,
      left: placedCell.querySelector('.card-side-left').textContent,
    }).toEqual(before);
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

  it('flashes a Food tile once it becomes claimable (#73)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    // Before anyone has a bird there, the tile isn't claimable by anyone.
    expect(cells[foodIndex].querySelector('.card-claimable')).toBeNull();

    playThenCycleBackToPlayer1(birdSpot);

    cells = screen.getAllByRole('gridcell');
    expect(cells[foodIndex].querySelector('.card-claimable')).not.toBeNull();
  });

  it('lets you eat a Food piece you have majority control over by tapping it directly', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));
    const drawPileBefore = pileCount('draw');

    playThenCycleBackToPlayer1(birdSpot);
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[foodIndex])).toBe(false);
    expect(isFilled(cells[birdSpot])).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Discard pile: 1 cards' }),
    ).toBeDefined();
    expect(screen.getByText('Actions: 0/1')).toBeDefined();
    expect(scoreEntryText('Player 1')).toBe('Player 1: 1');

    // Draw pile lost 1 card refilling the hand after the earlier play, and
    // gained 1 back as the eaten Food's card — net unchanged.
    const drawPileAfter = pileCount('draw');
    expect(drawPileAfter).toBe(drawPileBefore);
  });

  it('plays a crunch sound, not a tick, when Food is claimed (#74)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(birdSpot);
    vi.clearAllMocks();

    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);

    expect(playFoodCrunch).toHaveBeenCalledTimes(1);
    expect(playActionTick).not.toHaveBeenCalled();
  });

  it('ends the game and announces a winner when the last Food is eaten', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(birdSpot);

    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);

    expect(screen.getByText('Game Over')).toBeDefined();
    expect(screen.getByText(/Player 1 wins with 1 point/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'End Turn' })).toBeNull();
  });

  it('shows the game-over announcement as a modal in front of the board, dismissible via View Board (#100)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const birdSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(birdSpot);
    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);

    expect(document.querySelector('.color-modal-backdrop')).not.toBeNull();
    expect(
      document.querySelector('.color-modal-backdrop .game-over-modal'),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'View Board' }));
    expect(document.querySelector('.color-modal-backdrop')).toBeNull();
  });

  it("puts a gold circle behind the current leader's score, not a tied/trailing one", () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );
    const scoreLeaderClass = (name) =>
      Array.from(document.querySelectorAll('.score-entry'))
        .find((li) => li.querySelector('.score-name')?.textContent === name)
        .querySelector('.score-value').className;

    // 0-0 at the start — nobody is "leading" yet.
    expect(scoreLeaderClass('Player 1')).not.toContain('score-leader');
    expect(scoreLeaderClass('Player 2')).not.toContain('score-leader');

    const cells = screen.getAllByRole('gridcell');
    const [foodA] = cells
      .map((c, i) => (c.querySelector('.card-food') ? i : -1))
      .filter((i) => i >= 0);
    const birdSpot = neighbors(foodA).find((i) => !isFilled(cells[i]));

    playThenCycleBackToPlayer1(birdSpot);
    fireEvent.click(screen.getAllByRole('gridcell')[foodA]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);

    // Player 1 is now 1-0 and takes the gold circle; Player 2 doesn't.
    expect(scoreLeaderClass('Player 1')).toContain('score-leader');
    expect(scoreLeaderClass('Player 2')).not.toContain('score-leader');
  });

  it("hovering a player's score pill highlights their cards on the board, not an opponent's (#93)", () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const spot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[spot]);

    const placedCard = () =>
      screen.getAllByRole('gridcell')[spot].querySelector('.card');
    expect(placedCard().className).not.toContain('card-owner-highlighted');

    const player1Pill = Array.from(
      document.querySelectorAll('.score-entry'),
    ).find((li) => li.querySelector('.score-name')?.textContent === 'Player 1');
    const player2Pill = Array.from(
      document.querySelectorAll('.score-entry'),
    ).find((li) => li.querySelector('.score-name')?.textContent === 'Player 2');

    fireEvent.mouseEnter(player1Pill);
    expect(placedCard().className).toContain('card-owner-highlighted');

    fireEvent.mouseLeave(player1Pill);
    expect(placedCard().className).not.toContain('card-owner-highlighted');

    fireEvent.mouseEnter(player2Pill);
    expect(placedCard().className).not.toContain('card-owner-highlighted');
  });

  it('shows an (A)/(D) suffix on CPU player names based on their strategy', () => {
    render(
      <PlayPage
        players={[
          {
            id: 'p1',
            name: 'Player 1',
            isCPU: false,
            deckId: DEFAULT_DECKS[0].id,
          },
          {
            id: 'p2',
            name: 'Player 2',
            isCPU: true,
            cpuStrategy: 'defensive',
            deckId: DEFAULT_DECKS[1].id,
          },
        ]}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    // Human players get no suffix; the CPU gets its strategy's letter.
    expect(scoreEntryText('Player 1')).toBe('Player 1: 0');
    expect(scoreEntryText('Player 2 (D)')).toBe('Player 2 (D): 0');
  });

  it('marks the active player’s score pill instead of showing a "Player N’s turn" heading (#101)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    const entries = Array.from(document.querySelectorAll('.score-entry'));
    const player1Entry = entries.find(
      (li) => li.querySelector('.score-name')?.textContent === 'Player 1',
    );
    const player2Entry = entries.find(
      (li) => li.querySelector('.score-name')?.textContent === 'Player 2',
    );
    expect(player1Entry.classList.contains('score-entry-active')).toBe(true);
    expect(player2Entry.classList.contains('score-entry-active')).toBe(false);

    // The turn announcement still exists for assistive tech, just visually
    // hidden — not removed from the accessibility tree entirely.
    expect(
      screen.getByText(/Player 1.*turn/).classList.contains('sr-only'),
    ).toBe(true);
  });

  it('lets the CPU eat Food once it has majority control, not just play cards', async () => {
    render(
      <PlayPage
        players={twoPlayers({ cpuSecond: true })}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    // Player 1 never acts. Player 2 (CPU) auto-plays two of its own turns:
    // the first plays a bird next to Food (0 vs 0 adjacent birds isn't
    // eligible to eat yet), the second now has majority (1 vs 0) and
    // should eat instead of playing another card.
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    await waitFor(
      () => expect(screen.getByText(/Player 1.*turn/)).toBeDefined(),
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    // With SINGLE_FOOD, eating the only Food ends the game.
    await waitFor(() => expect(screen.getByText('Game Over')).toBeDefined(), {
      timeout: 3000,
    });
    expect(screen.getByText(/Player 2 \(A\) wins with 1 point/)).toBeDefined();
  });

  it('never lets a Food-derived card be played onto the board (only discarded via Use Food)', () => {
    function tinyDecks() {
      return [
        {
          id: 'deck-p1',
          name: 'P1Deck',
          cardTypes: [
            {
              id: 'p1card',
              name: 'P1Card',
              emoji: 'P1',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
        {
          id: 'deck-p2',
          name: 'P2Deck',
          cardTypes: [
            {
              id: 'p2card',
              name: 'P2Card',
              emoji: 'P2',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
      ];
    }

    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-p1' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-p2' },
        ]}
        decks={tinyDecks()}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );

    let cells = screen.getAllByRole('gridcell');
    const foodIndices = cells
      .map((c, i) => (c.querySelector('.card-food') ? i : -1))
      .filter((i) => i >= 0);
    const [foodA, foodB] = foodIndices;
    const birdSpot = neighbors(foodA).find((i) => !isFilled(cells[i]));

    // Player 1 plays their only card next to Food A.
    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' })); // -> Player 2
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' })); // Player 2 passes -> Player 1 turn 2

    // Player 1 eats Food A (majority: 1 vs 0, since no opponent bird is
    // adjacent) — this sacrifices their own bird there (into their
    // discard pile) and removes Food A, so Food B is the only occupied
    // cell left afterward. Their deck is otherwise empty, so refilling
    // draws the eaten Food's card and reshuffles the just-discarded
    // P1Card back in alongside it.
    fireEvent.click(screen.getAllByRole('gridcell')[foodA]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' })); // refills hand -> Player 2
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' })); // Player 2 passes -> Player 1 turn 3

    const hand = screen.getByRole('list', { name: 'Your hand' });
    // A food-derived card's "Use Food" badge is its own button, so filter
    // to just the card-selection buttons here.
    const handButtons = within(hand)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('card'));
    expect(handButtons).toHaveLength(2);
    const foodCardButton = handButtons.find((b) =>
      b.textContent.includes('Crumb A'),
    );
    expect(foodCardButton).toBeDefined();
    // A food-derived card is never a real bird — it shouldn't get a
    // procedurally-generated bird sprite (#100).
    expect(foodCardButton.querySelector('.card-pixel-sprite')).toBeNull();

    cells = screen.getAllByRole('gridcell');
    const destination = neighbors(foodB).find((i) => !isFilled(cells[i]));

    // Selecting the Food-derived card highlights no board cells, and
    // clicking a cell that would otherwise be a legal placement does
    // nothing — the card stays in hand, untouched.
    fireEvent.click(foodCardButton);
    expect(document.querySelectorAll('.board-cell-droppable')).toHaveLength(0);
    fireEvent.click(screen.getAllByRole('gridcell')[destination]);

    expect(
      within(screen.getByRole('list', { name: 'Your hand' }))
        .getAllByRole('button')
        .filter((b) => b.classList.contains('card')),
    ).toHaveLength(2);
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[destination])).toBe(false);
  });

  it('discards a food-derived card via its Use Food badge, for free plus a bonus action, without touching the banked score', () => {
    function tinyDecks() {
      return [
        {
          id: 'deck-p1',
          name: 'P1Deck',
          cardTypes: [
            {
              id: 'p1card',
              name: 'P1Card',
              emoji: 'P1',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
        {
          id: 'deck-p2',
          name: 'P2Deck',
          cardTypes: [
            {
              id: 'p2card',
              name: 'P2Card',
              emoji: 'P2',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
      ];
    }

    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-p1' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-p2' },
        ]}
        decks={tinyDecks()}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );

    let cells = screen.getAllByRole('gridcell');
    const foodIndices = cells
      .map((c, i) => (c.querySelector('.card-food') ? i : -1))
      .filter((i) => i >= 0);
    const [foodA] = foodIndices;
    const birdSpot = neighbors(foodA).find((i) => !isFilled(cells[i]));

    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Eating Food A banks the score immediately, independent of whatever
    // later happens to the card it produces.
    fireEvent.click(screen.getAllByRole('gridcell')[foodA]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    expect(scoreEntryText('Player 1')).toBe('Player 1: 1');
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    const hand = screen.getByRole('list', { name: 'Your hand' });
    const useFoodBadge = within(hand).getByRole('button', {
      name: 'Use Food',
    });

    fireEvent.click(useFoodBadge);

    // The food card is gone from hand, no action was spent (a bonus one
    // was granted instead), and the score from eating is unaffected
    // either way.
    expect(
      within(screen.getByRole('list', { name: 'Your hand' }))
        .getAllByRole('button')
        .filter((b) => b.classList.contains('card')),
    ).toHaveLength(1);
    expect(screen.getByText('Actions: 2/1')).toBeDefined();
    expect(scoreEntryText('Player 1')).toBe('Player 1: 1');
    // Used via the badge, so it's removed from play — not discarded.
    expect(
      screen.getByRole('button', { name: 'Removed from Play: 1 cards' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Discard pile: 0 cards' }),
    ).toBeDefined();
  });

  it('lets you use a Food-derived card even with zero actions remaining', () => {
    function tinyDecks() {
      return [
        {
          id: 'deck-p1',
          name: 'P1Deck',
          cardTypes: [
            {
              id: 'p1card',
              name: 'P1Card',
              emoji: 'P1',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
        {
          id: 'deck-p2',
          name: 'P2Deck',
          cardTypes: [
            {
              id: 'p2card',
              name: 'P2Card',
              emoji: 'P2',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
      ];
    }

    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-p1' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-p2' },
        ]}
        decks={tinyDecks()}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );

    let cells = screen.getAllByRole('gridcell');
    const [foodA] = cells
      .map((c, i) => (c.querySelector('.card-food') ? i : -1))
      .filter((i) => i >= 0);
    const birdSpot = neighbors(foodA).find((i) => !isFilled(cells[i]));

    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Eat Food A — sacrificing the bird there discards P1Card and banks a
    // Food-derived card, both of which come back into hand on the next
    // refill (same cascade as the Use Food badge test above): hand ends
    // up with exactly the Food-derived card plus the reshuffled P1Card.
    fireEvent.click(screen.getAllByRole('gridcell')[foodA]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Spend the fresh turn's action playing the ordinary P1Card next to
    // Food B, leaving 0 actions remaining while the Food-derived card is
    // still sitting in hand.
    cells = screen.getAllByRole('gridcell');
    // Food A was already eaten, so only Food B's index remains.
    const [foodB] = cells
      .map((c, i) => (c.querySelector('.card-food') ? i : -1))
      .filter((i) => i >= 0);
    const otherSpot = neighbors(foodB).find((i) => !isFilled(cells[i]));
    const hand = screen.getByRole('list', { name: 'Your hand' });
    const nonFoodCard = within(hand)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('card'))
      .find((b) => !within(b).queryByText('Use Food'));
    fireEvent.click(nonFoodCard);
    fireEvent.click(screen.getAllByRole('gridcell')[otherSpot]);

    expect(screen.getByText('Actions: 0/1')).toBeDefined();

    const useFoodBadge = within(
      screen.getByRole('list', { name: 'Your hand' }),
    ).getByRole('button', { name: 'Use Food' });
    fireEvent.click(useFoodBadge);

    // Using it granted a bonus action despite starting at 0.
    expect(screen.getByText('Actions: 1/1')).toBeDefined();
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

  it('only lets you select your own bird when eating Food, never an opponent’s', () => {
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
    const [spotA, spotB, spotC] = neighbors(foodIndex).filter(
      (i) => !isFilled(cells[i]),
    );
    const hand = screen.getByRole('list', { name: 'Your hand' });

    // Turn 1: Player 1 plays a bird at spotA.
    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[spotA]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Turn 2: Player 2 plays a bird at spotB.
    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[spotB]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Turn 3: Player 1 plays a second bird at spotC — now 2 vs 1, majority
    // control of the Food for Player 1.
    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[spotC]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Turn 4: Player 2 passes.
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    // Selecting Food then tapping Player 2's bird (spotB) does nothing —
    // it's not a legal choice, just cancels the eat-selection.
    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[spotB]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[foodIndex])).toBe(true);
    expect(isFilled(cells[spotB])).toBe(true);
    expect(screen.getByText('Actions: 1/1')).toBeDefined();

    // But selecting one of Player 1's own birds (spotA) works.
    fireEvent.click(screen.getAllByRole('gridcell')[foodIndex]);
    fireEvent.click(screen.getAllByRole('gridcell')[spotA]);

    cells = screen.getAllByRole('gridcell');
    expect(isFilled(cells[foodIndex])).toBe(false);
    expect(isFilled(cells[spotA])).toBe(false);
    // Player 2's bird is untouched.
    expect(isFilled(cells[spotB])).toBe(true);
  });

  it("automatically plays a CPU player's turn", async () => {
    render(
      <PlayPage
        players={twoPlayers({ cpuSecond: true })}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(screen.getByText(/Player 2.*turn.*CPU/)).toBeDefined();
    expect(screen.getByText('CPU is playing…')).toBeDefined();

    await waitFor(
      () => expect(screen.getByText(/Player 1.*turn/)).toBeDefined(),
      { timeout: 3000 },
    );

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
    const drawCount = pileCount('draw');

    fireEvent.click(
      screen.getByRole('button', { name: /Draw pile: \d+ cards/ }),
    );

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

    expect(
      screen.getByRole('button', { name: 'Discard pile: 1 cards' }),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Discard pile: 1 cards' }),
    );

    const modal = screen.getByRole('dialog', { name: 'Discard pile' });
    expect(within(modal).getAllByRole('listitem')).toHaveLength(1);
    expect(within(modal).getByText('Weak')).toBeDefined();
  });

  it('opens a modal listing the Removed from Play pile cards when tapped', () => {
    function tinyDecks() {
      return [
        {
          id: 'deck-p1',
          name: 'P1Deck',
          cardTypes: [
            {
              id: 'p1card',
              name: 'P1Card',
              emoji: 'P1',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
        {
          id: 'deck-p2',
          name: 'P2Deck',
          cardTypes: [
            {
              id: 'p2card',
              name: 'P2Card',
              emoji: 'P2',
              color: '#57534e',
              quantity: 1,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
      ];
    }

    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-p1' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-p2' },
        ]}
        decks={tinyDecks()}
        food={TWO_FOOD}
        foodShapeIds={['crumb-a', 'crumb-b']}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    const [foodA] = cells
      .map((c, i) => (c.querySelector('.card-food') ? i : -1))
      .filter((i) => i >= 0);
    const birdSpot = neighbors(foodA).find((i) => !isFilled(cells[i]));

    fireEvent.click(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      )[0],
    );
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getAllByRole('gridcell')[foodA]);
    fireEvent.click(screen.getAllByRole('gridcell')[birdSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    const useFoodBadge = within(
      screen.getByRole('list', { name: 'Your hand' }),
    ).getByRole('button', { name: 'Use Food' });
    fireEvent.click(useFoodBadge);

    fireEvent.click(
      screen.getByRole('button', { name: 'Removed from Play: 1 cards' }),
    );

    const modal = screen.getByRole('dialog', { name: 'Removed from Play' });
    expect(within(modal).getAllByRole('listitem')).toHaveLength(1);
    expect(within(modal).getByText('Crumb A')).toBeDefined();
  });

  it('reshuffles the discard pile into the draw pile when it runs out during a refill', () => {
    function reshuffleDecks() {
      return [
        {
          id: 'deck-weak',
          name: 'Weak',
          cardTypes: [
            {
              id: 'weak',
              name: 'Weak',
              emoji: 'WK',
              color: '#57534e',
              quantity: 5,
              sides: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          ],
        },
        {
          id: 'deck-strong',
          name: 'Strong',
          cardTypes: [
            {
              id: 'strong',
              name: 'Strong',
              emoji: 'SG',
              color: '#57534e',
              quantity: 4,
              sides: { top: 9, right: 9, bottom: 9, left: 9 },
            },
          ],
        },
      ];
    }

    render(
      <PlayPage
        players={[
          { id: 'p1', name: 'Player 1', isCPU: false, deckId: 'deck-weak' },
          { id: 'p2', name: 'Player 2', isCPU: false, deckId: 'deck-strong' },
        ]}
        decks={reshuffleDecks()}
        food={SINGLE_FOOD}
        foodShapeIds={['crumb']}
      />,
    );

    const hand = () => screen.getByRole('list', { name: 'Your hand' });
    let cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const firstSpot = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    // Player 1 plays a Weak card next to Food; ending the turn refills
    // their hand from the last draw-pile card (draw pile now empty,
    // discard pile still empty).
    fireEvent.click(within(hand()).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[firstSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    // Player 2 plays a Strong card next to Player 1's Weak card, capturing
    // it — the captured card lands in Player 1's discard pile.
    cells = screen.getAllByRole('gridcell');
    const secondSpot = neighbors(firstSpot).find((i) => !isFilled(cells[i]));
    fireEvent.click(within(hand()).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[secondSpot]);
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();

    // Player 1 plays another Weak card — hand drops to 3, draw pile is
    // already empty, discard pile holds the 1 captured card.
    cells = screen.getAllByRole('gridcell');
    const thirdSpot = neighbors(foodIndex).find(
      (i) => !isFilled(cells[i]) && i !== firstSpot && i !== secondSpot,
    );
    fireEvent.click(within(hand()).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[thirdSpot]);

    expect(within(hand()).getAllByRole('button')).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: 'Discard pile: 1 cards' }),
    ).toBeDefined();

    // Ending Player 1's turn reshuffles the discard pile into the draw
    // pile to refill the hand back to 4; cycle back around to Player 1 to
    // see their post-refill state.
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    expect(within(hand()).getAllByRole('button')).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: 'Discard pile: 0 cards' }),
    ).toBeDefined();
  });

  it('shows the game settings summary behind the status tray’s info button (#70, #87)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        ruleset={{ allowMoving: true, allowReturnToHand: false }}
      />,
    );

    expect(screen.queryByText('Player 1, Player 2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Game settings' }));

    expect(screen.getByText('Player 1, Player 2')).toBeDefined();
    expect(screen.getByText('Allow Moving')).toBeDefined();
  });

  it('shows "None" for Ruleset when no rules are enabled', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Game settings' }));

    const settingRow = screen.getByText('Ruleset').closest('div');
    expect(within(settingRow).getByText('None')).toBeDefined();
  });

  it('logs the last 3 actions played, most recent first (#70)', () => {
    render(
      <PlayPage
        players={twoPlayers()}
        decks={DEFAULT_DECKS}
        food={SINGLE_FOOD}
      />,
    );

    expect(screen.getByText('No actions played yet.')).toBeDefined();

    const hand = screen.getByRole('list', { name: 'Your hand' });
    const cells = screen.getAllByRole('gridcell');
    const foodIndex = findFoodIndex(cells);
    const adjacentIndex = neighbors(foodIndex).find((i) => !isFilled(cells[i]));

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(cells[adjacentIndex]);

    const recentActions = screen.getByRole('list', { name: 'Recent actions' });
    const entries = within(recentActions).getAllByRole('listitem');
    expect(entries).toHaveLength(1);
    expect(entries[0].textContent).toMatch(/^Player 1 played/);
  });
});
