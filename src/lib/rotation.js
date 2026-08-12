// Rotating a card 90° spins which edge each side value faces — physically
// equivalent to turning the card itself.
export function rotateSides(sides, direction) {
  if (direction === 'cw') {
    return {
      top: sides.left,
      right: sides.top,
      bottom: sides.right,
      left: sides.bottom,
    };
  }
  return {
    top: sides.right,
    right: sides.bottom,
    bottom: sides.left,
    left: sides.top,
  };
}

// Given a card's current (already-rotated) side values and the cumulative
// degrees of rotation that produced them, returns the side values as they
// were at rotation 0 — lets a card face render its numbers in fixed slots
// while a single CSS transform, not a second data rotation, turns the
// whole face visually.
export function baseSides(sides, rotationDeg) {
  const steps = ((((rotationDeg ?? 0) % 360) + 360) % 360) / 90;
  let result = sides;
  for (let i = 0; i < steps; i++) {
    result = rotateSides(result, 'ccw');
  }
  return result;
}
