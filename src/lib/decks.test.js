import { describe, it, expect } from 'vitest';
import { DEFAULT_DECKS, buildDrawPile } from './decks.js';

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
});

describe('buildDrawPile', () => {
  it('stamps every card with the deck’s own color', () => {
    const deck = DEFAULT_DECKS[0];
    const pile = buildDrawPile(deck);
    expect(pile.length).toBe(deck.size);
    pile.forEach((card) => expect(card.deckColor).toBe(deck.color));
  });
});
