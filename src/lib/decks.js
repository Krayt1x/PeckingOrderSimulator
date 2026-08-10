export const HAND_SIZE = 4;

export const DEFAULT_DECKS = [
  {
    id: 'deck-chickens',
    name: 'City',
    size: 9,
    color: '#e2e2df',
    cardTypes: [
      {
        id: 'hen',
        name: 'Hen',
        emoji: 'HE',
        color: '#d97706',
        sides: { top: 5, right: 3, bottom: 4, left: 2 },
      },
      {
        id: 'rooster',
        name: 'Rooster',
        emoji: 'RO',
        color: '#dc2626',
        sides: { top: 6, right: 7, bottom: 2, left: 3 },
      },
      {
        id: 'chick',
        name: 'Chick',
        emoji: 'CH',
        color: '#eab308',
        sides: { top: 2, right: 2, bottom: 2, left: 6 },
      },
      {
        id: 'hatchling',
        name: 'Hatchling',
        emoji: 'HA',
        color: '#65a30d',
        sides: { top: 1, right: 4, bottom: 5, left: 3 },
      },
    ],
  },
  {
    id: 'deck-ducks',
    name: 'Beach',
    size: 9,
    color: '#f6e7c1',
    cardTypes: [
      {
        id: 'duck',
        name: 'Duck',
        emoji: 'DU',
        color: '#0891b2',
        sides: { top: 4, right: 5, bottom: 3, left: 4 },
      },
      {
        id: 'duckling',
        name: 'Duckling',
        emoji: 'DL',
        color: '#0284c7',
        sides: { top: 2, right: 3, bottom: 2, left: 5 },
      },
      {
        id: 'swan',
        name: 'Swan',
        emoji: 'SW',
        color: '#0d9488',
        sides: { top: 7, right: 4, bottom: 6, left: 3 },
      },
      {
        id: 'goose',
        name: 'Goose',
        emoji: 'GO',
        color: '#059669',
        sides: { top: 5, right: 6, bottom: 4, left: 5 },
      },
    ],
  },
  {
    id: 'deck-birds-of-prey',
    name: 'Park',
    size: 9,
    color: '#dbead9',
    cardTypes: [
      {
        id: 'eagle',
        name: 'Eagle',
        emoji: 'EA',
        color: '#7c3aed',
        sides: { top: 8, right: 6, bottom: 3, left: 5 },
      },
      {
        id: 'owl',
        name: 'Owl',
        emoji: 'OW',
        color: '#a21caf',
        sides: { top: 5, right: 4, bottom: 7, left: 4 },
      },
      {
        id: 'hawk',
        name: 'Hawk',
        emoji: 'HK',
        color: '#4338ca',
        sides: { top: 6, right: 5, bottom: 4, left: 6 },
      },
      {
        id: 'falcon',
        name: 'Falcon',
        emoji: 'FA',
        color: '#57534e',
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
    sides: { top: 1, right: 1, bottom: 1, left: 1 },
  };
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds a shuffled deck of `deck.size` card instances, cycling through
// `deck.cardTypes` to fill it out. Each card carries the deck's own color
// (deckColor) so it renders with a consistent background regardless of
// which card type it is — card-type color is no longer used for display,
// since telling players apart by card border color takes priority.
export function buildDrawPile(deck) {
  const types = deck?.cardTypes ?? [];
  if (types.length === 0) return [];

  const cards = [];
  for (let i = 0; i < deck.size; i++) {
    const type = types[i % types.length];
    cards.push({
      ...type,
      typeId: type.id,
      id: `${type.id}-${i}`,
      deckColor: deck.color,
    });
  }
  return shuffle(cards);
}
