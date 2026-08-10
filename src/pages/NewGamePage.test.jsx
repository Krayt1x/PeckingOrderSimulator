import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import NewGamePage from './NewGamePage.jsx';
import { DEFAULT_DECKS } from '../lib/decks.js';
import { DEFAULT_FOOD } from '../lib/food.js';

afterEach(() => cleanup());

function goToStep(label) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('NewGamePage', () => {
  it('starts on the Players step with 2 players picked by default', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    expect(screen.getByText('How many players?')).toBeDefined();
    expect(screen.getByRole('button', { name: '2' }).className).toContain(
      'selected',
    );
  });

  it('picking a player count advances to the Rosters step with that many rows', async () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '4' }));

    await waitFor(() =>
      expect(screen.getByText(/playing, and with which deck/)).toBeDefined(),
    );
    expect(screen.getAllByRole('row')).toHaveLength(5); // header + 4 players
  });

  it('lets you mark a player as CPU and change their deck on the Rosters step', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Rosters');

    fireEvent.click(screen.getByLabelText('Player 2 is CPU'));
    fireEvent.change(screen.getByLabelText('Player 2 deck'), {
      target: { value: DEFAULT_DECKS[2].id },
    });

    expect(screen.getByLabelText('Player 2 is CPU').checked).toBe(true);
    expect(screen.getByLabelText('Player 2 deck').value).toBe(
      DEFAULT_DECKS[2].id,
    );
  });

  it('shows the food config on the Food step', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Food');

    expect(screen.getAllByText('Standard Food').length).toBeGreaterThan(0);
  });

  it('summarizes every step and calls onStart from the Review step', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Review');

    expect(screen.getAllByText('2 players').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    const setup = onStart.mock.calls[0][0];
    expect(setup.players).toHaveLength(2);
    expect(setup.foodId).toBe(DEFAULT_FOOD.id);
  });
});
