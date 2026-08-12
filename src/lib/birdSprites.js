// Hand-placed pixel-art bird sprites for the Alpha Pixel Art skin (#97).
// Every species shares one 16x16 perched-bird silhouette (base + outline +
// eye + a beak stub) so the set reads as one consistent style; each species
// then supplies its own body/leg/beak colors plus a short list of pixel
// overrides for whatever makes it recognizable (a crest, a bald head, an
// oversized pouch beak, a color-blocked pattern). Nothing here is copied
// from any reference image — every grid and color below was placed by hand.

const OUTLINE = '#241a12';
const EYE_DEFAULT = '#100c08';

// '.' transparent, K outline, P primary/body, S body shade, L leg, Q beak,
// E eye. Species recolor P/S/L/Q via `colors` and layer `overrides` on top.
const BASE_ROWS = [
  '................',
  '................',
  '......KKK.......',
  '.....KPPPK......',
  '....KPPPPPKQ....',
  '....KPPEPPKQ....',
  '...SKPPPPPK.....',
  '..SSKPPPPPK.....',
  '.SSPKPPPPPPK....',
  'SPPPKPPSSPPK....',
  'SPPPPPPSSPPPK...',
  '.SPPPPSSPPPPK...',
  '..SPPPSSPPPPK...',
  '...SSPPPPPPK....',
  '...KLL.KLL......',
  '...KLL.KLL......',
];
const GRID_W = 16;
const GRID_H = BASE_ROWS.length;

const C = {
  WHITE: '#f7f2e6',
  WHITE_SHADE: '#d9d3c2',
  GREY: '#9a9690',
  GREY_DARK: '#6d6a64',
  BLACK: '#1c1a17',
  BLACK_SHEEN: '#33302b',
  BROWN: '#8a5a34',
  BROWN_DARK: '#5c3a20',
  TAN: '#c9a06b',
  LEG_GREY: '#4a4642',
  LEG_ORANGE: '#e8a33d',
  BEAK_ORANGE: '#e8a33d',
  BEAK_ORANGE_D: '#c17f1f',
  BEAK_GREY: '#6b6660',
  RED: '#c23b3b',
  YELLOW: '#ffd93d',
  ORANGE_CREST: '#ff9d2e',
  RED_ORANGE: '#e8552a',
  GREEN: '#2f6b45',
  GREEN_LIGHT: '#4f9467',
  PINK_LEG: '#e8a390',
  POUCH: '#e8845a',
  POUCH_SHADE: '#c96a43',
  PALE_EYE: '#dcd6c4',
  CREAM: '#fdead0',
  CREAM_TAN: '#dba86a',
  CREAM_BROWN: '#a5713a',
};

// Each entry: colors for the shared base's P/S/L/Q codes, plus a list of
// [row, col, color] pixels layered on afterward for whatever makes that
// species recognizable at a glance.
const SPECIES = {
  sparrow: {
    colors: { P: C.BROWN, S: C.BROWN_DARK, L: C.LEG_GREY, Q: C.BEAK_ORANGE },
    overrides: [
      [9, 3, C.TAN],
      [10, 3, C.TAN],
      [11, 4, C.TAN],
    ],
  },
  pigeon: {
    colors: { P: C.GREY, S: C.GREY_DARK, L: C.RED, Q: C.LEG_GREY },
    overrides: [
      [3, 8, C.GREEN],
      [4, 7, C.GREEN_LIGHT],
      [4, 8, '#5a3f7a'],
    ],
  },
  crow: {
    colors: { P: C.BLACK, S: C.BLACK_SHEEN, L: C.BLACK, Q: C.BLACK },
    overrides: [],
  },
  'bin-chicken': {
    colors: { P: C.WHITE, S: C.WHITE_SHADE, L: C.BLACK, Q: C.BLACK },
    overrides: [
      [2, 6, C.BLACK],
      [2, 7, C.BLACK],
      [2, 8, C.BLACK],
      [3, 5, C.BLACK],
      [3, 6, C.BLACK],
      [3, 7, C.BLACK],
      [3, 8, C.BLACK],
      [3, 9, C.BLACK],
      [4, 5, C.BLACK],
      [4, 6, C.BLACK],
      [4, 7, C.BLACK],
      [4, 8, C.BLACK],
      [4, 9, C.BLACK],
      [4, 10, C.BLACK],
      [5, 5, C.BLACK],
      [5, 6, C.BLACK],
      [5, 8, C.BLACK],
      [5, 9, C.BLACK],
      [5, 10, C.BLACK],
      [6, 6, C.BLACK],
      [6, 7, C.BLACK],
      [6, 8, C.BLACK],
      [6, 9, C.BLACK],
      [6, 10, C.BLACK],
      [4, 12, C.BLACK],
      [5, 13, C.BLACK],
      [6, 13, C.BLACK],
      [7, 12, C.BLACK],
      [8, 1, C.BLACK],
      [9, 1, C.BLACK],
    ],
  },
  seagull: {
    colors: { P: C.WHITE, S: C.WHITE_SHADE, L: C.PINK_LEG, Q: C.YELLOW },
    overrides: [[5, 12, C.RED]],
  },
  pelican: {
    colors: { P: C.WHITE, S: C.WHITE_SHADE, L: C.GREY_DARK, Q: C.POUCH },
    overrides: [
      [3, 12, C.POUCH],
      [4, 12, C.POUCH],
      [4, 13, C.POUCH],
      [5, 12, C.POUCH],
      [5, 13, C.POUCH],
      [5, 14, C.POUCH],
      [6, 12, C.POUCH_SHADE],
      [6, 13, C.POUCH_SHADE],
      [9, 1, C.BLACK],
      [10, 1, C.BLACK],
    ],
  },
  cockatoo: {
    colors: { P: C.CREAM, S: C.CREAM_TAN, L: C.BEAK_GREY, Q: C.BEAK_GREY },
    overrides: [
      [0, 7, C.YELLOW],
      [0, 8, C.YELLOW],
      [1, 6, C.ORANGE_CREST],
      [1, 7, C.YELLOW],
      [1, 8, C.YELLOW],
      [1, 9, C.ORANGE_CREST],
      [2, 5, C.RED_ORANGE],
      [2, 6, C.ORANGE_CREST],
      [2, 7, C.ORANGE_CREST],
      [10, 2, C.CREAM_BROWN],
      [11, 3, C.CREAM_BROWN],
      [12, 4, C.CREAM_BROWN],
    ],
  },
  duck: {
    colors: { P: C.BROWN, S: C.BROWN_DARK, L: C.LEG_ORANGE, Q: C.BEAK_ORANGE },
    overrides: [
      [2, 6, C.GREEN],
      [2, 7, C.GREEN],
      [2, 8, C.GREEN],
      [3, 5, C.GREEN],
      [3, 6, C.GREEN_LIGHT],
      [3, 7, C.GREEN],
      [3, 8, C.GREEN],
      [3, 9, C.GREEN],
      [4, 5, C.GREEN],
      [4, 6, C.GREEN],
      [4, 7, C.GREEN],
      [4, 8, C.GREEN],
      [4, 9, C.GREEN],
      [5, 5, C.GREEN],
      [5, 6, C.GREEN],
      [5, 8, C.GREEN],
      [5, 9, C.GREEN],
      [6, 5, C.WHITE],
      [6, 6, C.WHITE],
      [6, 9, C.WHITE],
    ],
  },
  magpie: {
    colors: { P: C.BLACK, S: C.BLACK_SHEEN, L: C.BLACK, Q: C.BLACK },
    overrides: [
      [5, 7, C.PALE_EYE],
      [2, 5, C.WHITE],
      [2, 6, C.WHITE],
      [3, 5, C.WHITE],
      [8, 1, C.WHITE],
      [9, 1, C.WHITE],
      [9, 2, C.WHITE],
      [10, 1, C.WHITE],
    ],
  },
  swan: {
    colors: { P: C.BLACK, S: C.BLACK_SHEEN, L: C.BLACK, Q: C.RED },
    overrides: [[5, 13, C.WHITE]],
  },
};

function hashName(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// Any card type not in the curated list above (custom decks, renamed cards)
// still gets a bird-shaped sprite — just colored deterministically from its
// name instead of hand-tuned markings.
function genericSpecies(name) {
  const hue = hashName(name || '') % 360;
  return {
    colors: {
      P: `hsl(${hue} 32% 62%)`,
      S: `hsl(${hue} 30% 46%)`,
      L: C.LEG_GREY,
      Q: C.BEAK_ORANGE,
    },
    overrides: [],
  };
}

// Renders a card (by typeId + name) to a 16x16 grid of CSS color strings
// (or null for transparent), ready to hand to a canvas renderer.
export function buildBirdSpriteGrid(typeId, name) {
  const species = SPECIES[typeId] || genericSpecies(name);
  const grid = [];
  for (let y = 0; y < GRID_H; y++) {
    const row = BASE_ROWS[y].padEnd(GRID_W, '.').slice(0, GRID_W);
    const gridRow = [];
    for (let x = 0; x < GRID_W; x++) {
      const code = row[x];
      if (code === '.') gridRow.push(null);
      else if (code === 'K') gridRow.push(OUTLINE);
      else if (code === 'E') gridRow.push(EYE_DEFAULT);
      else gridRow.push(species.colors[code] ?? null);
    }
    grid.push(gridRow);
  }
  species.overrides.forEach(([y, x, color]) => {
    if (y >= 0 && y < GRID_H && x >= 0 && x < GRID_W) grid[y][x] = color;
  });
  return grid;
}
