import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
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
  it('has no page heading or subtext, and no table to overflow the page width', () => {
    const { container } = render(<Harness />);

    expect(screen.queryByRole('heading', { name: /Manage decks/ })).toBeNull();
    expect(screen.queryByText(/Edit each deck’s cards/)).toBeNull();
    // Cards are wrapping flex rows, not a table with a fixed min-width —
    // nothing here can force horizontal scroll on the page.
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('.manage-card-row')).not.toBeNull();
  });

  it('separates Decks and Food into top-level tabs, with per-deck sub-tabs', () => {
    render(<Harness />);

    const sections = screen.getByRole('tablist', { name: 'Manage sections' });
    expect(within(sections).getByRole('tab', { name: 'Decks' })).toBeDefined();
    expect(within(sections).getByRole('tab', { name: 'Food' })).toBeDefined();

    const deckTabs = screen.getByRole('tablist', { name: 'Choose deck' });
    DEFAULT_DECKS.forEach((d) => {
      expect(within(deckTabs).getByRole('tab', { name: d.name })).toBeDefined();
    });

    fireEvent.click(within(sections).getByRole('tab', { name: 'Food' }));
    expect(screen.queryByRole('tablist', { name: 'Choose deck' })).toBeNull();
  });

  it('lets you edit a card side value', () => {
    const { container } = render(<Harness />);
    const topInputs = container.querySelectorAll('.manage-side-input');

    fireEvent.change(topInputs[0], { target: { value: '9' } });
    expect(topInputs[0].value).toBe('9');
  });

  it('adds and removes cards from the active deck', () => {
    const { container } = render(<Harness />);
    const rowsBefore = container.querySelectorAll('.manage-card-row').length;

    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    expect(container.querySelectorAll('.manage-card-row')).toHaveLength(
      rowsBefore + 1,
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(container.querySelectorAll('.manage-card-row')).toHaveLength(
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

  it('shows the Food tab with a shape grid per food, and no deck size field', () => {
    const { container } = render(<Harness />);

    fireEvent.click(screen.getByRole('tab', { name: /Food/ }));

    expect(screen.getByDisplayValue('Standard Food')).toBeDefined();
    expect(screen.queryByText('Deck size')).toBeNull();
    expect(container.querySelectorAll('.food-shape-card')).toHaveLength(3);
    expect(container.querySelectorAll('.food-shape-cell.active')).toHaveLength(
      1 + 2 + 4,
    ); // Chip + Potato Cake + Burger cell counts
  });

  it('lets you toggle a cell in a food shape grid', () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: /Food/ }));

    const chipCard = container.querySelectorAll('.food-shape-card')[0];
    const activeBefore = chipCard.querySelectorAll(
      '.food-shape-cell.active',
    ).length;
    const inactiveCell = [
      ...chipCard.querySelectorAll('.food-shape-cell'),
    ].find((cell) => !cell.classList.contains('active'));

    fireEvent.click(inactiveCell);

    expect(chipCard.querySelectorAll('.food-shape-cell.active')).toHaveLength(
      activeBefore + 1,
    );
  });

  it('lets you edit a food shape outside/inside edge values', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: /Food/ }));

    const outsideInput = screen.getAllByLabelText('Outside edge value')[0];
    fireEvent.change(outsideInput, { target: { value: '9' } });
    expect(outsideInput.value).toBe('9');
  });

  it('adds and removes food shapes', () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: /Food/ }));
    const before = container.querySelectorAll('.food-shape-card').length;

    fireEvent.click(screen.getByRole('button', { name: 'Add food shape' }));
    expect(container.querySelectorAll('.food-shape-card')).toHaveLength(
      before + 1,
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(container.querySelectorAll('.food-shape-card')).toHaveLength(before);
  });

  it('opens an Export modal with the current decks and Food as JSON', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    const modal = screen.getByRole('dialog', { name: /Export/ });
    const textarea = within(modal).getByDisplayValue(/"decks"/);
    const payload = JSON.parse(textarea.value);
    expect(payload.decks).toEqual(DEFAULT_DECKS);
    expect(payload.food).toEqual(DEFAULT_FOOD);

    fireEvent.click(within(modal).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
