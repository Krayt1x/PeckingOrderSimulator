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
    expect(screen.getByRole('link', { name: 'Manage' }).className).toContain(
      'active',
    );
  });

  it('shows the New Game wizard at #new-game', () => {
    window.location.hash = '#new-game';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'New Game' })).toBeDefined();
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

  it('starts a game from the wizard and lands on the board', () => {
    window.location.hash = '#new-game';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

    expect(screen.getByText(/Player 1.*turn/)).toBeDefined();
    expect(
      within(screen.getByRole('list', { name: 'Your hand' })).getAllByRole(
        'button',
      ),
    ).toHaveLength(4);
  });
});
