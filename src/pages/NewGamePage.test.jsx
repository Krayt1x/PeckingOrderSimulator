import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import NewGamePage, { PLAYER_COLOR_PALETTE } from './NewGamePage.jsx';
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
    expect(screen.getAllByLabelText('Player name')).toHaveLength(4);
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

  it('gives each default player a distinct border color shown as a cube', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Rosters');

    const player1Cube = screen.getByRole('button', { name: 'Player 1 color' });
    const player2Cube = screen.getByRole('button', { name: 'Player 2 color' });

    expect(player1Cube.style.getPropertyValue('--swatch-color')).toBe(
      PLAYER_COLOR_PALETTE[0],
    );
    expect(player2Cube.style.getPropertyValue('--swatch-color')).toBe(
      PLAYER_COLOR_PALETTE[1],
    );
  });

  it('opens a 5x5 color chart modal from the cube and lets you pick a color', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Rosters');

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 color' }));
    const modal = screen.getByRole('dialog', { name: 'Player 1 color' });
    const swatches = within(modal)
      .getAllByRole('button')
      .filter((btn) => btn.className.includes('color-modal-swatch'));
    expect(swatches).toHaveLength(25);

    fireEvent.click(
      within(modal).getByRole('button', { name: PLAYER_COLOR_PALETTE[12] }),
    );

    // Picking a color closes the modal...
    expect(screen.queryByRole('dialog')).toBeNull();
    // ...and updates the cube.
    expect(
      screen
        .getByRole('button', { name: 'Player 1 color' })
        .style.getPropertyValue('--swatch-color'),
    ).toBe(PLAYER_COLOR_PALETTE[12]);

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    const setup = onStart.mock.calls[0][0];
    expect(setup.players[0].color).toBe(PLAYER_COLOR_PALETTE[12]);
    expect(setup.players[1].color).toBe(PLAYER_COLOR_PALETTE[1]);
  });

  it('defaults the food selection for 2 players to Potato Cake and Chip only', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Food');

    expect(
      screen
        .getByRole('switch', { name: /Potato Cake/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByRole('switch', { name: /Chip/ }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen
        .getByRole('switch', { name: /Burger/ })
        .getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('lets you toggle a food shape on and off', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Food');

    const burgerTile = screen.getByRole('switch', { name: /Burger/ });
    fireEvent.click(burgerTile);
    expect(burgerTile.getAttribute('aria-checked')).toBe('true');

    const chipTile = screen.getByRole('switch', { name: /Chip/ });
    fireEvent.click(chipTile);
    expect(chipTile.getAttribute('aria-checked')).toBe('false');
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
    expect(setup.foodShapeIds).toEqual(['potato-cake', 'chip']);
  });

  it('excludes a deselected food shape from the final setup', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Food');
    fireEvent.click(screen.getByRole('switch', { name: /Chip/ }));
    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    const chip = DEFAULT_FOOD.shapes.find((s) => s.name === 'Chip');
    expect(setup.foodShapeIds).not.toContain(chip.id);
  });

  it('defaults the food selection to Burger + Potato Cake for 3 players', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    goToStep('Food');

    expect(
      screen
        .getByRole('switch', { name: /Burger/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen
        .getByRole('switch', { name: /Potato Cake/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByRole('switch', { name: /Chip/ }).getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('defaults the food selection to Burger + Potato Cake + Chip for 4 players', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    goToStep('Food');

    ['Burger', 'Potato Cake', 'Chip'].forEach((name) => {
      expect(
        screen
          .getByRole('switch', { name: new RegExp(name) })
          .getAttribute('aria-checked'),
      ).toBe('true');
    });
  });

  it('shows a hover tooltip explaining the player-count food defaults', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Food');

    const info = screen.getByLabelText('Default food by player count info');
    expect(info.getAttribute('title')).toMatch(/2 players.*Potato Cake.*Chip/);
  });
});
