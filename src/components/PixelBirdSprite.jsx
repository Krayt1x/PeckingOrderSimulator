import { useEffect, useRef } from 'react';
import { buildBirdSpriteGrid } from '../lib/birdSprites.js';

// Renders a card's hand-placed pixel-art bird sprite (#97) onto a canvas —
// only visible under the Alpha Pixel Art skin, via CSS (see .card-pixel-sprite
// in index.css), so it's always in the DOM but usually display:none.
export default function PixelBirdSprite({
  typeId,
  name,
  size = 48,
  className,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const grid = buildBirdSpriteGrid(typeId, name);
    const rows = grid.length;
    const cols = grid[0].length;
    const scale = size / cols;
    canvas.width = cols * scale;
    canvas.height = rows * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const color = grid[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [typeId, name, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`card-pixel-sprite${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    />
  );
}
