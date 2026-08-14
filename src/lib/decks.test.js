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

  it('matches the requested City/Beach/Park bird rosters', () => {
    function findDeck(name) {
      return DEFAULT_DECKS.find((d) => d.name === name);
    }
    function findCard(deck, name) {
      return deck.cardTypes.find((c) => c.name === name);
    }

    const expected = {
      City: {
        Sparrow: { quantity: 4, sides: [2, 2, 1, 1] },
        Pigeon: { quantity: 4, sides: [2, 2, 2, 2] },
        Crow: { quantity: 2, sides: [4, 2, 2, 4] },
        'Bin Chicken': { quantity: 2, sides: [5, 3, 2, 3] },
      },
      Park: {
        Sparrow: { quantity: 4, sides: [2, 2, 1, 1] },
        Duck: { quantity: 4, sides: [3, 3, 1, 2] },
        Magpie: { quantity: 2, sides: [4, 2, 1, 2] },
        Swan: { quantity: 2, sides: [4, 4, 2, 4] },
      },
      Beach: {
        Sparrow: { quantity: 3, sides: [2, 2, 1, 1] },
        Seagull: { quantity: 5, sides: [3, 2, 1, 2] },
        Pelican: { quantity: 2, sides: [4, 4, 2, 4] },
        Cockatoo: { quantity: 2, sides: [5, 2, 1, 2] },
      },
    };

    Object.entries(expected).forEach(([setName, birds]) => {
      const deck = findDeck(setName);
      expect(deck).toBeDefined();
      expect(deck.cardTypes).toHaveLength(Object.keys(birds).length);

      Object.entries(birds).forEach(([birdName, { quantity, sides }]) => {
        const card = findCard(deck, birdName);
        expect(card, `${setName} is missing ${birdName}`).toBeDefined();
        expect(card.quantity).toBe(quantity);
        expect(card.sides).toEqual({
          top: sides[0],
          right: sides[1],
          bottom: sides[2],
          left: sides[3],
        });
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
