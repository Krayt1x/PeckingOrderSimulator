import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import ManagePage from './ManagePage.jsx';
import { DEFAULT_DECKS } from '../lib/decks.js';
import { DEFAULT_FOOD } from '../lib/food.js';

afterEach(() => cleanup());

function Harness() {
  const [decks, setDecks] = useState(DEFAULT_DECKS);
  const [food, setFood] = useState(DEFAULT_FOOD);
  return (
    <ManagePage
      decks={decks}
      setDecks={setDecks}
      food={food}
      setFood={setFood}
    />
  );
}

describe('ManagePage', () => {
  it('lets you edit a card side value', () => {
    const { container } = render(<Harness />);
    const topInputs = container.querySelectorAll('.manage-side-input');

    fireEvent.change(topInputs[0], { target: { value: '9' } });
    expect(topInputs[0].value).toBe('9');
  });

  it('adds and removes cards from the active deck', () => {
    const { container } = render(<Harness />);
    const rowsBefore = container.querySelectorAll(
      '.manage-cards tbody tr',
    ).length;

    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    expect(container.querySelectorAll('.manage-cards tbody tr')).toHaveLength(
      rowsBefore + 1,
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(container.querySelectorAll('.manage-cards tbody tr')).toHaveLength(
      rowsBefore,
    );
  });

  it('switches deck tabs and shows that deck name', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('tab', { name: 'Beach' }));

    expect(
      screen.getByRole('tab', { name: 'Beach' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByDisplayValue('Beach')).toBeDefined();
  });

  it('lets you edit the Food config from its own tab, with no deck size field', () => {
    const { container } = render(<Harness />);

    fireEvent.click(screen.getByRole('tab', { name: /Food/ }));

    expect(screen.getByDisplayValue('Standard Food')).toBeDefined();
    expect(screen.queryByText('Deck size')).toBeNull();

    const topInputs = container.querySelectorAll('.manage-side-input');
    fireEvent.change(topInputs[0], { target: { value: '7' } });
    expect(topInputs[0].value).toBe('7');
  });
});
