import { generatePixelGrid, colorForName } from '../lib/pixelArt.js';

// Renders a card's deterministic identicon-style pixel art as an inline
// SVG — purely decorative, so it's hidden from assistive tech (the card's
// name is already announced via its own text/label elsewhere).
export default function PixelArtIcon({ name, size = 24, className }) {
  const grid = generatePixelGrid(name);
  const color = colorForName(name);
  const gridSize = grid.length;

  return (
    <svg
      className={`pixel-art-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      aria-hidden="true"
      focusable="false"
    >
      {grid.map((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex}
              y={rowIndex}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
