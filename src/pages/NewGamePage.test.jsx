import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import NewGamePage from './NewGamePage.jsx';
import { DEFAULT_DECKS } from '../lib/decks.js';
import { DEFAULT_FOOD } from '../lib/food.js';

afterEach(() => cleanup());

describe('NewGamePage', () => {
  it('starts with 2 player rows, each assigned a deck', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 players
  });

  it('adds player rows when the player count increases', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('Number of players'), {
      target: { value: '4' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(5); // header + 4 players
  });

  it('lets you mark a player as CPU and change their deck', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Player 2 is CPU'));
    fireEvent.change(screen.getByLabelText('Player 2 deck'), {
      target: { value: DEFAULT_DECKS[2].id },
    });

    expect(screen.getByLabelText('Player 2 is CPU').checked).toBe(true);
    expect(screen.getByLabelText('Player 2 deck').value).toBe(
      DEFAULT_DECKS[2].id,
    );
  });

  it('calls onStart with the configured players and food when starting', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    const setup = onStart.mock.calls[0][0];
    expect(setup.players).toHaveLength(2);
    expect(setup.foodId).toBe(DEFAULT_FOOD.id);
  });
});
