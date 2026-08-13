import { useEffect, useRef } from 'react';
import { buildTerrainSpriteGrid } from '../lib/terrainSprite.js';

// Renders the Random Terrain ruleset's rock cluster (#107) as a small
// pixel-art canvas sprite, the same technique PixelBirdSprite uses for
// cards.
export default function PixelRockSprite({ size = 48, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const grid = buildTerrainSpriteGrid();
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
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={`card-terrain-sprite${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    />
  );
}
