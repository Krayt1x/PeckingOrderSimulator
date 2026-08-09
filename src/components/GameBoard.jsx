import { useRef, useState } from 'react';

export const BOARD_SIZE = 10;
const VIEWPORT_SIZE = 5;
const CELL_SIZE = 72;
const CELL_GAP = 8;
const PITCH = CELL_SIZE + CELL_GAP;
const MAX_OFFSET = (BOARD_SIZE - VIEWPORT_SIZE) * PITCH;

function clamp(value) {
  return Math.min(Math.max(value, 0), MAX_OFFSET);
}

// Snaps to the nearest whole cell so the viewport always shows exactly
// VIEWPORT_SIZE full cells, never a sliver of an extra row/column.
function snap(value) {
  return clamp(Math.round(value / PITCH) * PITCH);
}

const CENTERED_OFFSET = snap(MAX_OFFSET / 2);

export default function GameBoard({ cells, selectedCard, onCellClick }) {
  const [offset, setOffset] = useState({
    x: CENTERED_OFFSET,
    y: CENTERED_OFFSET,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef(null);

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
      x: clamp(drag.startOffset.x - dx),
      y: clamp(drag.startOffset.y - dy),
    });
  }

  function endDrag() {
    dragState.current = null;
    setIsDragging(false);
    setOffset((current) => ({ x: snap(current.x), y: snap(current.y) }));
  }

  function recenter() {
    setOffset({ x: CENTERED_OFFSET, y: CENTERED_OFFSET });
  }

  function handleCellClick(index) {
    if (dragState.current?.moved) return;
    onCellClick(index);
  }

  return (
    <div className="board-wrap">
      <div
        className={`board-viewport${isDragging ? ' board-dragging' : ''}`}
        style={{
          width: VIEWPORT_SIZE * PITCH - CELL_GAP,
          height: VIEWPORT_SIZE * PITCH - CELL_GAP,
        }}
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
            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
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
              style={{ width: CELL_SIZE, height: CELL_SIZE }}
              onClick={() => handleCellClick(index)}
            >
              {card ? (
                <span
                  className={`card card-on-board${card.type === 'food' ? ' card-food' : ''}`}
                  style={{ '--card-color': card.color }}
                >
                  <span className="card-emoji">{card.emoji}</span>
                  <span className="card-name">{card.name}</span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="board-controls">
        <p className="board-hint">
          Click and drag to look around the {BOARD_SIZE}x{BOARD_SIZE} board.
        </p>
        <button type="button" className="board-recenter" onClick={recenter}>
          Recenter
        </button>
      </div>
    </div>
  );
}
