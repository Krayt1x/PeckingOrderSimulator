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

  it('does not offer a 1-player option — the game needs an opponent', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
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

  it('shows a CPU strategy picker only once a player is marked as CPU, defaulting to Random', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Rosters');
    // Keep turn order deterministic for the players[1] index check below.
    fireEvent.click(screen.getByLabelText('Random First Player'));

    expect(screen.queryByLabelText('Player 2 CPU strategy')).toBeNull();

    fireEvent.click(screen.getByLabelText('Player 2 is CPU'));

    expect(screen.getByLabelText('Player 2 CPU strategy').value).toBe('random');

    fireEvent.change(screen.getByLabelText('Player 2 CPU strategy'), {
      target: { value: 'defensive' },
    });

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    expect(setup.players[1].cpuStrategy).toBe('defensive');
  });

  it('offers Ruthless as a selectable CPU strategy', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Rosters');
    fireEvent.click(screen.getByLabelText('Random First Player'));
    fireEvent.click(screen.getByLabelText('Player 2 is CPU'));

    fireEvent.change(screen.getByLabelText('Player 2 CPU strategy'), {
      target: { value: 'ruthless' },
    });

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    expect(setup.players[1].cpuStrategy).toBe('ruthless');
  });

  it('lets you mark a player as First and starts them first', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Rosters');

    // Random First Player is on by default — turn it off to pick manually.
    fireEvent.click(screen.getByLabelText('Random First Player'));
    expect(screen.getByLabelText('Player 1 first').checked).toBe(false);
    fireEvent.click(screen.getByLabelText('Player 2 first'));
    expect(screen.getByLabelText('Player 2 first').checked).toBe(true);
    // Only one player can be first at a time.
    fireEvent.click(screen.getByLabelText('Player 1 first'));
    expect(screen.getByLabelText('Player 2 first').checked).toBe(false);
    expect(screen.getByLabelText('Player 1 first').checked).toBe(true);

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    expect(setup.players[0].name).toBe('Player 1');
    expect(setup.players).toHaveLength(2);
  });

  it('picks a random first player by default (Random First Player starts checked)', () => {
    const onStart = vi.fn();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Rosters');

    // Random First Player is on by default, disabling the individual
    // per-player checkboxes.
    expect(screen.getByLabelText('Random First Player').checked).toBe(true);
    expect(screen.getByLabelText('Player 1 first').disabled).toBe(true);

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    // Math.random mocked to 0.99 -> last player in a 2-player list.
    expect(setup.players[0].name).toBe('Player 2');
    randomSpy.mockRestore();
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
    const color1 = player1Cube.style.getPropertyValue('--swatch-color');
    const color2 = player2Cube.style.getPropertyValue('--swatch-color');

    // Colors are picked randomly from the palette, but distinctly.
    expect(PLAYER_COLOR_PALETTE).toContain(color1);
    expect(PLAYER_COLOR_PALETTE).toContain(color2);
    expect(color1).not.toBe(color2);
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
    // Keep turn order deterministic for the players[0]/[1] index checks.
    fireEvent.click(screen.getByLabelText('Random First Player'));

    const player2ColorBefore = screen
      .getByRole('button', { name: 'Player 2 color' })
      .style.getPropertyValue('--swatch-color');
    // A color distinct from Player 2's, so the duplicate-color guard
    // (#76) never blocks the pick.
    const targetColor = PLAYER_COLOR_PALETTE.find(
      (c) => c !== player2ColorBefore,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 color' }));
    const modal = screen.getByRole('dialog', { name: 'Player 1 color' });
    const swatches = within(modal)
      .getAllByRole('button')
      .filter((btn) => btn.className.includes('color-modal-swatch'));
    expect(swatches).toHaveLength(25);

    fireEvent.click(within(modal).getByRole('button', { name: targetColor }));

    // Picking a color closes the modal...
    expect(screen.queryByRole('dialog')).toBeNull();
    // ...and updates the cube.
    expect(
      screen
        .getByRole('button', { name: 'Player 1 color' })
        .style.getPropertyValue('--swatch-color'),
    ).toBe(targetColor);

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    const setup = onStart.mock.calls[0][0];
    expect(setup.players[0].color).toBe(targetColor);
    expect(setup.players[1].color).toBe(player2ColorBefore);
  });

  it("won't let a player pick a color another player already has", () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Rosters');

    const player2Color = screen
      .getByRole('button', { name: 'Player 2 color' })
      .style.getPropertyValue('--swatch-color');
    const player1ColorBefore = screen
      .getByRole('button', { name: 'Player 1 color' })
      .style.getPropertyValue('--swatch-color');

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 color' }));
    const modal = screen.getByRole('dialog', { name: 'Player 1 color' });
    const takenSwatch = within(modal).getByRole('button', {
      name: player2Color,
    });
    expect(takenSwatch.disabled).toBe(true);

    fireEvent.click(takenSwatch);

    // The modal stays open and Player 1's color is unchanged — a disabled
    // button click is a no-op.
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(
      screen
        .getByRole('button', { name: 'Player 1 color' })
        .style.getPropertyValue('--swatch-color'),
    ).toBe(player1ColorBefore);
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

  it('defaults every ruleset option off on the Ruleset step', () => {
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={() => {}}
      />,
    );
    goToStep('Ruleset');

    expect(screen.getByRole('checkbox', { name: 'Allow Moving' }).checked).toBe(
      false,
    );
    expect(
      screen.getByRole('checkbox', { name: 'Allow Return to Hand' }).checked,
    ).toBe(false);
  });

  it('lets you toggle ruleset options and includes them in the final setup', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Ruleset');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow Moving' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Allow Return to Hand' }),
    );

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    expect(setup.ruleset).toEqual({
      allowMoving: true,
      allowReturnToHand: true,
      allowCardRotation: false,
      allowEqualValuePlay: false,
      allowCustomSkins: false,
      skin: 'alpha',
    });
  });

  it('includes the default ruleset in the final setup when left untouched', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    expect(setup.ruleset).toEqual({
      allowMoving: false,
      allowReturnToHand: false,
      allowCardRotation: false,
      allowEqualValuePlay: false,
      allowCustomSkins: false,
      skin: 'alpha',
    });
  });

  it('shows the skin dropdown only once Custom Skins is enabled, and includes the chosen skin in the setup', () => {
    const onStart = vi.fn();
    render(
      <NewGamePage
        decks={DEFAULT_DECKS}
        food={DEFAULT_FOOD}
        onStart={onStart}
      />,
    );
    goToStep('Ruleset');

    expect(screen.queryByLabelText('Skin')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Custom Skins' }));
    expect(screen.getByLabelText('Skin').value).toBe('alpha');

    goToStep('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    const setup = onStart.mock.calls[0][0];
    expect(setup.ruleset.allowCustomSkins).toBe(true);
    expect(setup.ruleset.skin).toBe('alpha');
  });
});
