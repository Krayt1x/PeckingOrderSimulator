import { describe, it, expect, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import PlayPage from './PlayPage.jsx';
import { DEFAULT_DECKS, HAND_SIZE } from '../lib/decks.js';

afterEach(() => cleanup());

function cardNameOf(button) {
  // Board cards hide their name label at default zoom (side values take
  // over that space), so fall back to the card's title attribute.
  const nameEl = button.querySelector('.card-name');
  if (nameEl) return nameEl.textContent;
  return button.querySelector('.card-on-board').getAttribute('title');
}

describe('PlayPage', () => {
  it('deals a starting hand of 4 cards and shows the remaining draw pile', () => {
    render(<PlayPage decks={DEFAULT_DECKS} />);

    const hand = screen.getByRole('list', { name: 'Your hand' });
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);

    const chickens = DEFAULT_DECKS.find((d) => d.name === 'Chickens');
    expect(
      screen.getByText(`Draw pile: ${chickens.size - HAND_SIZE}`),
    ).toBeDefined();
  });

  it('renders a 10x10 board with Food objective cards near the center', () => {
    render(<PlayPage decks={DEFAULT_DECKS} />);

    expect(screen.getAllByRole('gridcell')).toHaveLength(100);
    expect(screen.getAllByText('Food')).toHaveLength(4);
  });

  it('plays a selected card from hand onto an empty board cell', () => {
    render(<PlayPage decks={DEFAULT_DECKS} />);

    const hand = screen.getByRole('list', { name: 'Your hand' });
    const firstCard = within(hand).getAllByRole('button')[0];
    const name = cardNameOf(firstCard);

    fireEvent.click(firstCard);
    fireEvent.click(screen.getAllByRole('gridcell')[0]);

    expect(cardNameOf(screen.getAllByRole('gridcell')[0])).toBe(name);
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE - 1);
  });

  it('does not let you play a card onto a Food objective cell', () => {
    render(<PlayPage decks={DEFAULT_DECKS} />);
    const hand = screen.getByRole('list', { name: 'Your hand' });

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    // Food sits at indices 44, 45, 54, 55 on the 10x10 board.
    fireEvent.click(screen.getAllByRole('gridcell')[44]);

    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);
  });

  it('refills the hand back up to 4 cards when End Turn is clicked', () => {
    render(<PlayPage decks={DEFAULT_DECKS} />);
    const hand = screen.getByRole('list', { name: 'Your hand' });

    fireEvent.click(within(hand).getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByRole('gridcell')[0]);
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE - 1);

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(within(hand).getAllByRole('button')).toHaveLength(HAND_SIZE);
  });

  it('lets you switch decks and deals a fresh hand from the new deck', () => {
    render(<PlayPage decks={DEFAULT_DECKS} />);
    const ducks = DEFAULT_DECKS.find((d) => d.name === 'Ducks');

    fireEvent.change(screen.getByLabelText('Deck'), {
      target: { value: ducks.id },
    });

    const hand = screen.getByRole('list', { name: 'Your hand' });
    const names = within(hand)
      .getAllByRole('button')
      .map((button) => cardNameOf(button));
    const duckNames = ducks.cardTypes.map((c) => c.name);
    names.forEach((name) => expect(duckNames).toContain(name));
  });
});
