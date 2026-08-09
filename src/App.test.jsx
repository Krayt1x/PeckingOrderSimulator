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

  it('renders a 10x10 board with Food objective cards near the center', () => {
    render(<App />);

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(100);
    expect(screen.getAllByText('Food')).toHaveLength(4);
  });

  it('plays a selected card from hand onto an empty board cell', () => {
    render(<App />);

    const cells = screen.getAllByRole('gridcell');

    fireEvent.click(screen.getByRole('button', { name: /Card 1/ }));
    fireEvent.click(cells[0]);

    expect(cells[0].textContent).toContain('Card 1');
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

  it('does not let you play a card onto a Food objective cell', () => {
    render(<App />);
    const cells = screen.getAllByRole('gridcell');

    // Food sits at indices 44, 45, 54, 55 on the 10x10 board.
    fireEvent.click(screen.getByRole('button', { name: /Card 1/ }));
    fireEvent.click(cells[44]);

    expect(cells[44].textContent).toContain('Food');
    expect(screen.queryByRole('button', { name: /Card 1/ })).not.toBeNull();
  });
});
