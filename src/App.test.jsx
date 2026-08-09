import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from './App.jsx';

afterEach(() => cleanup());

describe('App', () => {
  it('renders the Pecking Order heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Pecking Order' }),
    ).toBeDefined();
  });

  it('plays a selected card from hand onto an empty board cell', () => {
    render(<App />);

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(9);

    fireEvent.click(screen.getByRole('button', { name: /Card 1/ }));
    fireEvent.click(cells[4]);

    expect(cells[4].textContent).toContain('Card 1');
    expect(screen.queryByRole('button', { name: /Card 1/ })).toBeNull();
  });

  it('does not let you play onto an already-occupied cell', () => {
    render(<App />);
    const cells = screen.getAllByRole('gridcell');

    fireEvent.click(screen.getByRole('button', { name: /Card 1/ }));
    fireEvent.click(cells[0]);
    fireEvent.click(screen.getByRole('button', { name: /Card 2/ }));
    fireEvent.click(cells[0]);

    expect(cells[0].textContent).toContain('Card 1');
  });
});
