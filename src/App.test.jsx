import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('App', () => {
  it('shows the Home page by default', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Pecking Order', level: 1 }),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: 'Play' })).toBeDefined();
  });

  it('shows the Manage page at #manage', () => {
    window.location.hash = '#manage';
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Decks' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Food' })).toBeDefined();
    // New Game/Manage/theme now live behind the hamburger menu (#123).
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('link', { name: 'Manage' }).className).toContain(
      'active',
    );
  });

  it('shows the New Game wizard at #new-game', () => {
    window.location.hash = '#new-game';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'New Game' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('link', { name: 'New Game' }).className).toContain(
      'active',
    );
  });

  it('falls back to Home if #play is visited without starting a game', () => {
    window.location.hash = '#play';
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Pecking Order', level: 1 }),
    ).toBeDefined();
    expect(screen.queryByText(/'s turn/)).toBeNull();
  });

  it('keeps New Game/Manage/theme toggle hidden until the hamburger menu is opened (#123)', () => {
    render(<App />);
    expect(screen.queryByRole('link', { name: 'New Game' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Manage' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /mode$/ }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.getByRole('link', { name: 'New Game' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Manage' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeDefined();
  });

  it('closes the hamburger menu when a link inside it is clicked', () => {
    window.location.hash = '#manage';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('link', { name: 'Manage' }));

    expect(screen.queryByRole('link', { name: 'Manage' })).toBeNull();
  });

  it('toggles the theme from inside the hamburger menu', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    // The menu closes after the click, same as the nav links.
    expect(screen.queryByRole('button', { name: /mode$/ })).toBeNull();
  });

  it('starts a game from the wizard and lands on the board', () => {
    window.location.hash = '#new-game';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    // Random First Player is on by default, and Player 2 defaults to a
    // CPU with a Chicken Run character name (#95), so either player may
    // go first under either name — this just confirms the game started.
    expect(screen.getByText(/’s turn/)).toBeDefined();
    expect(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      ),
    ).toHaveLength(4);
  });
});
