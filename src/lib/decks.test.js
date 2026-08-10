import { describe, it, expect } from 'vitest';
import { DEFAULT_DECKS, buildDrawPile, deckSize } from './decks.js';

describe('DEFAULT_DECKS', () => {
  it('gives every default deck its own color', () => {
    DEFAULT_DECKS.forEach((deck) => {
      expect(typeof deck.color).toBe('string');
      expect(deck.color.length).toBeGreaterThan(0);
    });
    // Each deck's color should be distinct so cards from different decks
    // are visually distinguishable on the board.
    const colors = DEFAULT_DECKS.map((d) => d.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('gives every card type a quantity', () => {
    DEFAULT_DECKS.forEach((deck) => {
      deck.cardTypes.forEach((type) => {
        expect(Number.isInteger(type.quantity)).toBe(true);
        expect(type.quantity).toBeGreaterThan(0);
      });
    });
  });
});

describe('deckSize', () => {
  it('sums the quantities of every card type', () => {
    const deck = {
      cardTypes: [{ quantity: 3 }, { quantity: 2 }, { quantity: 4 }],
    };
    expect(deckSize(deck)).toBe(9);
  });

  it('treats a missing or non-numeric quantity as 0', () => {
    const deck = { cardTypes: [{ quantity: 3 }, {}, { quantity: 'x' }] };
    expect(deckSize(deck)).toBe(3);
  });
});

describe('buildDrawPile', () => {
  it('stamps every card with the deck’s own color', () => {
    const deck = DEFAULT_DECKS[0];
    const pile = buildDrawPile(deck);
    expect(pile.length).toBe(deckSize(deck));
    pile.forEach((card) => expect(card.deckColor).toBe(deck.color));
  });

  it('builds exactly `quantity` copies of each card type', () => {
    const deck = {
      color: '#000000',
      cardTypes: [
        { id: 'a', name: 'A', emoji: 'A', quantity: 3, sides: {} },
        { id: 'b', name: 'B', emoji: 'B', quantity: 1, sides: {} },
      ],
    };
    const pile = buildDrawPile(deck);
    expect(pile.filter((c) => c.typeId === 'a')).toHaveLength(3);
    expect(pile.filter((c) => c.typeId === 'b')).toHaveLength(1);
  });
});
