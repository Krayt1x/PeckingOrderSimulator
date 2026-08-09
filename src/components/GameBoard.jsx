import { useEffect, useRef, useState } from 'react';

export const BOARD_SIZE = 10;
const VIEWPORT_SIZE = 5;
const DEFAULT_CELL_SIZE = 72;
const MIN_CELL_SIZE = 32;
const MAX_CELL_SIZE = 128;
const ZOOM_STEP = 16;
const CELL_GAP = 8;

// The viewport box itself never resizes — zooming changes how many cells
// fit inside this fixed pixel box, not the box's own size.
const VIEWPORT_PX = VIEWPORT_SIZE * (DEFAULT_CELL_SIZE + CELL_GAP) - CELL_GAP;

function pitchOf(cellSize) {
  return cellSize + CELL_GAP;
}

function maxOffsetOf(cellSize) {
  return Math.max(0, BOARD_SIZE * pitchOf(cellSize) - VIEWPORT_PX);
}

function clampOffset(cellSize, value) {
  return Math.min(Math.max(value, 0), maxOffsetOf(cellSize));
}

// Snaps to the nearest whole cell so the viewport never shows a sliver of
// an extra row/column.
function snapOffset(cellSize, value) {
  const pitch = pitchOf(cellSize);
  return clampOffset(cellSize, Math.round(value / pitch) * pitch);
}

function centeredOffset(cellSize) {
  return snapOffset(cellSize, maxOffsetOf(cellSize) / 2);
}

export default function GameBoard({ cells, selectedCard, onCellClick }) {
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const [offset, setOffset] = useState(() => ({
    x: centeredOffset(DEFAULT_CELL_SIZE),
    y: centeredOffset(DEFAULT_CELL_SIZE),
  }));
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef(null);
  const viewportRef = useRef(null);

  function handlePointerDown(event) {
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset,
      moved: false,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    setOffset({
      x: clampOffset(cellSize, drag.startOffset.x - dx),
      y: clampOffset(cellSize, drag.startOffset.y - dy),
    });
  }

  function endDrag() {
    dragState.current = null;
    setIsDragging(false);
    setOffset((current) => ({
      x: snapOffset(cellSize, current.x),
      y: snapOffset(cellSize, current.y),
    }));
  }

  function recenter() {
    setOffset({ x: centeredOffset(cellSize), y: centeredOffset(cellSize) });
  }

  // Zooms while keeping whatever cell is currently centered in view still
  // centered afterwards, instead of jumping back to the board's center.
  function zoomTo(nextCellSize) {
    const clamped = Math.min(
      MAX_CELL_SIZE,
      Math.max(MIN_CELL_SIZE, nextCellSize),
    );
    if (clamped === cellSize) return;

    const oldPitch = pitchOf(cellSize);
    const newPitch = pitchOf(clamped);
    setOffset((current) => {
      const centerCellX = (current.x + VIEWPORT_PX / 2) / oldPitch;
      const centerCellY = (current.y + VIEWPORT_PX / 2) / oldPitch;
      return {
        x: snapOffset(clamped, centerCellX * newPitch - VIEWPORT_PX / 2),
        y: snapOffset(clamped, centerCellY * newPitch - VIEWPORT_PX / 2),
      };
    });
    setCellSize(clamped);
  }

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    function handleWheel(event) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      zoomTo(cellSize + direction * ZOOM_STEP);
    }

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [cellSize]);

  function handleCellClick(index) {
    if (dragState.current?.moved) return;
    onCellClick(index);
  }

  const showCardNames = cellSize >= 40;
  const emojiSize = Math.max(14, Math.round(cellSize * 0.42));
  const nameSize = Math.max(8, Math.round(cellSize * 0.14));
  const zoomPercent = Math.round((cellSize / DEFAULT_CELL_SIZE) * 100);

  return (
    <div className="board-wrap">
      <div
        ref={viewportRef}
        className={`board-viewport${isDragging ? ' board-dragging' : ''}`}
        style={{ width: VIEWPORT_PX, height: VIEWPORT_PX }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="board"
          role="grid"
          aria-label="Game board"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
            transform: `translate(${-offset.x}px, ${-offset.y}px)`,
          }}
        >
          {cells.map((card, index) => (
            <button
              key={index}
              type="button"
              role="gridcell"
              className={`board-cell${card ? ' board-cell-filled' : ''}${
                !card && selectedCard ? ' board-cell-droppable' : ''
              }`}
              style={{ width: cellSize, height: cellSize }}
              onClick={() => handleCellClick(index)}
            >
              {card ? (
                <span
                  className={`card card-on-board${card.type === 'food' ? ' card-food' : ''}`}
                  style={{ '--card-color': card.color }}
                >
                  <span className="card-emoji" style={{ fontSize: emojiSize }}>
                    {card.emoji}
                  </span>
                  {showCardNames ? (
                    <span className="card-name" style={{ fontSize: nameSize }}>
                      {card.name}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="board-controls">
        <p className="board-hint">
          Click and drag to look around the {BOARD_SIZE}x{BOARD_SIZE} board.
          Scroll or use the buttons to zoom.
        </p>
        <div className="board-zoom">
          <button
            type="button"
            className="board-zoom-btn"
            onClick={() => zoomTo(cellSize - ZOOM_STEP)}
            disabled={cellSize <= MIN_CELL_SIZE}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="board-zoom-level">{zoomPercent}%</span>
          <button
            type="button"
            className="board-zoom-btn"
            onClick={() => zoomTo(cellSize + ZOOM_STEP)}
            disabled={cellSize >= MAX_CELL_SIZE}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <button type="button" className="board-recenter" onClick={recenter}>
          Recenter
        </button>
      </div>
    </div>
  );
}
