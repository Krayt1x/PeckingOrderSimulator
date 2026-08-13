// Each entry becomes a checkbox on the New Game wizard's Ruleset step, and
// is also used to summarize the active ruleset elsewhere (the wizard's
// Review step, the in-game status tray) — add new rules here rather than
// hand-rolling more JSX per screen.
export const RULESET_OPTIONS = [
  {
    key: 'allowMoving',
    label: 'Allow Moving',
    description:
      'A player may move a bird of theirs to another space during their turn. Costs 1 action.',
  },
  {
    key: 'allowReturnToHand',
    label: 'Allow Return to Hand',
    description:
      'A player may move a bird of theirs to their discard pile during their turn. Costs 0 actions.',
  },
  {
    key: 'allowCardRotation',
    label: 'Allow Card Rotation',
    description:
      'Selecting a card in hand shows rotate arrows — spin its sides clockwise or anti-clockwise before playing it.',
  },
  {
    key: 'allowEqualValuePlay',
    label: 'Equal Value Playable',
    description:
      'A card may be placed against an opponent card with the same facing value — normally you can only play into a matchup you would win outright. Eating Food via majority control still always requires strict majority, tied count or not.',
  },
  {
    key: 'allowRandomTerrain',
    label: 'Random Terrain',
    description:
      'Scatters 1-5 rocks across the board at the start of the game. They have no side values and can never be captured or removed — they just take up their own cell, purely blocking a card from being placed there.',
  },
];

// Every available visual skin — add new ones here as they're built.
export const SKIN_OPTIONS = [
  { id: 'alpha', name: 'Alpha Skin' },
  { id: 'alpha-pixel-art', name: 'Alpha Pixel Art' },
];

export const DEFAULT_RULESET = {
  allowReturnToHand: true,
  allowCardRotation: true,
  allowEqualValuePlay: true,
  allowRandomTerrain: true,
  allowCustomSkins: true,
  skin: 'alpha-pixel-art',
};
