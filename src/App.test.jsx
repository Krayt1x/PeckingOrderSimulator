import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App.jsx';

afterEach(() => cleanup());

describe('App', () => {
  it('renders the Pecking Order heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Pecking Order' }),
    ).toBeDefined();
  });
});
