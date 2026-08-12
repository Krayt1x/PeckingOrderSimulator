// Deterministic "identicon"-style pixel art, seeded entirely by a card's
// name — the same name always produces the same pattern and color, no
// image assets or external generation involved.

const GRID_SIZE = 5;
const HALF_COLS = Math.ceil(GRID_SIZE / 2); // 3 — the left half generated,
// then mirrored onto the right half so every icon reads as one symmetric
// creature-like shape rather than plain noise.

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// A small, fast seeded PRNG (mulberry32) — good enough for a decorative
// pattern, not cryptography.
function mulberry32(seed) {
  let a = seed;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A GRID_SIZE x GRID_SIZE grid of booleans, mirrored left-to-right.
export function generatePixelGrid(name) {
  const random = mulberry32(hashString(name || ''));
  const grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const left = [];
    for (let col = 0; col < HALF_COLS; col++) {
      left.push(random() > 0.55);
    }
    const fullRow = [...left];
    for (let col = HALF_COLS; col < GRID_SIZE; col++) {
      fullRow.push(left[GRID_SIZE - 1 - col]);
    }
    grid.push(fullRow);
  }
  return grid;
}

// A pleasant, fully-saturated HSL color derived from the same name, so a
// given bird's icon always looks the same wherever it's drawn.
export function colorForName(name) {
  const hash = hashString(name || '');
  const hue = hash % 360;
  return `hsl(${hue}deg 65% 45%)`;
}
