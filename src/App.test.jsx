import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('App', () => {
  it('shows the Play page by default with the Play nav link active', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Pecking Order', level: 1 }),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: 'Play' }).className).toContain(
      'active',
    );
  });

  it('shows the Manage page at #manage', () => {
    window.location.hash = '#manage';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Manage decks' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Manage' }).className).toContain(
      'active',
    );
  });
});
