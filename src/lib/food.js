export const FOOD_COUNT = 4;

export const DEFAULT_FOOD = {
  id: 'food',
  name: 'Standard Food',
  cardTypes: [
    {
      id: 'grain',
      name: 'Grain',
      emoji: '🌾',
      color: '#16a34a',
      sides: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    {
      id: 'seed',
      name: 'Seed',
      emoji: '🌱',
      color: '#22c55e',
      sides: { top: 2, right: 4, bottom: 2, left: 4 },
    },
    {
      id: 'berry',
      name: 'Berry',
      emoji: '🍓',
      color: '#dc2626',
      sides: { top: 4, right: 2, bottom: 4, left: 2 },
    },
    {
      id: 'worm',
      name: 'Worm',
      emoji: '🪱',
      color: '#a16207',
      sides: { top: 3, right: 5, bottom: 3, left: 1 },
    },
  ],
};

// Food isn't drawn/shuffled like a player deck — it's placed directly on
// the board, cycling through the configured food card types to fill the
// fixed number of Food positions.
export function buildFoodCards(food, count = FOOD_COUNT) {
  const types = food?.cardTypes ?? [];
  if (types.length === 0) return Array(count).fill(null);

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    return {
      ...type,
      typeId: type.id,
      id: `${type.id}-food-${i}`,
      type: 'food',
    };
  });
}
