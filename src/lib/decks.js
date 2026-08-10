export const HAND_SIZE = 4;

export const DEFAULT_DECKS = [
  {
    id: 'deck-chickens',
    name: 'City',
    color: '#e2e2df',
    cardTypes: [
      {
        id: 'hen',
        name: 'Hen',
        emoji: 'HE',
        color: '#d97706',
        quantity: 3,
        sides: { top: 5, right: 3, bottom: 4, left: 2 },
      },
      {
        id: 'rooster',
        name: 'Rooster',
        emoji: 'RO',
        color: '#dc2626',
        quantity: 2,
        sides: { top: 6, right: 7, bottom: 2, left: 3 },
      },
      {
        id: 'chick',
        name: 'Chick',
        emoji: 'CH',
        color: '#eab308',
        quantity: 2,
        sides: { top: 2, right: 2, bottom: 2, left: 6 },
      },
      {
        id: 'hatchling',
        name: 'Hatchling',
        emoji: 'HA',
        color: '#65a30d',
        quantity: 2,
        sides: { top: 1, right: 4, bottom: 5, left: 3 },
      },
    ],
  },
  {
    id: 'deck-ducks',
    name: 'Beach',
    color: '#f6e7c1',
    cardTypes: [
      {
        id: 'duck',
        name: 'Duck',
        emoji: 'DU',
        color: '#0891b2',
        quantity: 3,
        sides: { top: 4, right: 5, bottom: 3, left: 4 },
      },
      {
        id: 'duckling',
        name: 'Duckling',
        emoji: 'DL',
        color: '#0284c7',
        quantity: 2,
        sides: { top: 2, right: 3, bottom: 2, left: 5 },
      },
      {
        id: 'swan',
        name: 'Swan',
        emoji: 'SW',
        color: '#0d9488',
        quantity: 2,
        sides: { top: 7, right: 4, bottom: 6, left: 3 },
      },
      {
        id: 'goose',
        name: 'Goose',
        emoji: 'GO',
        color: '#059669',
        quantity: 2,
        sides: { top: 5, right: 6, bottom: 4, left: 5 },
      },
    ],
  },
  {
    id: 'deck-birds-of-prey',
    name: 'Park',
    color: '#dbead9',
    cardTypes: [
      {
        id: 'eagle',
        name: 'Eagle',
        emoji: 'EA',
        color: '#7c3aed',
        quantity: 3,
        sides: { top: 8, right: 6, bottom: 3, left: 5 },
      },
      {
        id: 'owl',
        name: 'Owl',
        emoji: 'OW',
        color: '#a21caf',
        quantity: 2,
        sides: { top: 5, right: 4, bottom: 7, left: 4 },
      },
      {
        id: 'hawk',
        name: 'Hawk',
        emoji: 'HK',
        color: '#4338ca',
        quantity: 2,
        sides: { top: 6, right: 5, bottom: 4, left: 6 },
      },
      {
        id: 'falcon',
        name: 'Falcon',
        emoji: 'FA',
        color: '#57534e',
        quantity: 2,
        sides: { top: 7, right: 7, bottom: 2, left: 4 },
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
