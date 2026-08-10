export const HAND_SIZE = 4;

export const DEFAULT_DECKS = [
  {
    id: 'deck-chickens',
    name: 'City',
    color: '#27272a',
    cardTypes: [
      {
        id: 'sparrow',
        name: 'Sparrow',
        emoji: 'SP',
        color: '#a8a29e',
        quantity: 4,
        sides: { top: 2, right: 2, bottom: 1, left: 1 },
      },
      {
        id: 'pigeon',
        name: 'Pigeon',
        emoji: 'PI',
        color: '#78716c',
        quantity: 4,
        sides: { top: 2, right: 2, bottom: 2, left: 2 },
      },
      {
        id: 'crow',
        name: 'Crow',
        emoji: 'CR',
        color: '#1c1917',
        quantity: 2,
        sides: { top: 4, right: 2, bottom: 4, left: 2 },
      },
      {
        id: 'bin-chicken',
        name: 'Bin Chicken',
        emoji: 'BC',
        color: '#eab308',
        quantity: 2,
        sides: { top: 5, right: 3, bottom: 3, left: 2 },
      },
    ],
  },
  {
    id: 'deck-ducks',
    name: 'Beach',
    color: '#1e3a5f',
    cardTypes: [
      {
        id: 'sparrow',
        name: 'Sparrow',
        emoji: 'SP',
        color: '#a8a29e',
        quantity: 3,
        sides: { top: 2, right: 2, bottom: 1, left: 1 },
      },
      {
        id: 'seagull',
        name: 'Seagull',
        emoji: 'SG',
        color: '#38bdf8',
        quantity: 5,
        sides: { top: 3, right: 2, bottom: 2, left: 1 },
      },
      {
        id: 'pelican',
        name: 'Pelican',
        emoji: 'PE',
        color: '#f97316',
        quantity: 2,
        sides: { top: 4, right: 4, bottom: 4, left: 2 },
      },
      {
        id: 'cockatoo',
        name: 'Cockatoo',
        emoji: 'CO',
        color: '#facc15',
        quantity: 2,
        sides: { top: 5, right: 2, bottom: 2, left: 1 },
      },
    ],
  },
  {
    id: 'deck-birds-of-prey',
    name: 'Park',
    color: '#14432b',
    cardTypes: [
      {
        id: 'sparrow',
        name: 'Sparrow',
        emoji: 'SP',
        color: '#a8a29e',
        quantity: 4,
        sides: { top: 2, right: 2, bottom: 1, left: 1 },
      },
      {
        id: 'duck',
        name: 'Duck',
        emoji: 'DU',
        color: '#0891b2',
        quantity: 4,
        sides: { top: 3, right: 3, bottom: 2, left: 1 },
      },
      {
        id: 'magpie',
        name: 'Magpie',
        emoji: 'MA',
        color: '#0f172a',
        quantity: 2,
        sides: { top: 4, right: 2, bottom: 2, left: 1 },
      },
      {
        id: 'swan',
        name: 'Swan',
        emoji: 'SW',
        color: '#0d9488',
        quantity: 2,
        sides: { top: 4, right: 4, bottom: 4, left: 2 },
      },
    ],
  },
];

let nextCustomCardId = 1;

export function createCardType() {
  const id = `custom-${Date.now()}-${nextCustomCardId++}`;
  return {
    id,
    name: 'New Card',
    emoji: 'NC',
    color: '#57534e',
    quantity: 1,
    sides: { top: 1, right: 1, bottom: 1, left: 1 },
  };
}

// The deck's total size is derived from its card quantities, not stored
// separately — editing a card's quantity is always what changes it.
export function deckSize(deck) {
  return (deck?.cardTypes ?? []).reduce(
    (sum, type) => sum + (Number(type.quantity) || 0),
    0,
  );
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds a shuffled deck, expanding each card type by its own `quantity`.
// Each card carries the deck's own color (deckColor) so it renders with a
// consistent background regardless of which card type it is — card-type
// color is no longer used for display, since telling players apart by
// card border color takes priority.
export function buildDrawPile(deck) {
  const types = deck?.cardTypes ?? [];
  if (types.length === 0) return [];

  const cards = [];
  types.forEach((type) => {
    const quantity = Math.max(1, Number(type.quantity) || 1);
    for (let i = 0; i < quantity; i++) {
      cards.push({
        ...type,
        typeId: type.id,
        id: `${type.id}-${i}`,
        deckColor: deck.color,
      });
    }
  });
  return shuffle(cards);
}
