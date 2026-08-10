import { useEffect, useRef, useState } from 'react';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];

export const BOARD_SIZE = 16;
const VIEWPORT_SIZE = 5;
const DEFAULT_CELL_SIZE = 88;
const MIN_CELL_SIZE = 32;
const MAX_CELL_SIZE = 144;
const ZOOM_STEP = 16;
const CELL_GAP = 0;

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

function clampCellSize(size) {
  return Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, size));
}

// Extra empty cells of breathing room kept around the food bounding box
// when fitting the camera to it.
const FIT_PADDING_CELLS = 1;

// Finds the largest cellSize/offset that fits every Food cell (plus a
// little padding) inside the viewport — used both as the board's initial
// view and what "Recenter" snaps back to, so players never have to hunt
// for the objective on a large board.
export function computeFitView(cells) {
  const foodIndices = [];
  cells.forEach((card, i) => {
    if (card?.type === 'food') foodIndices.push(i);
  });

  if (foodIndices.length === 0) {
    return {
      cellSize: DEFAULT_CELL_SIZE,
      offset: {
        x: centeredOffset(DEFAULT_CELL_SIZE),
        y: centeredOffset(DEFAULT_CELL_SIZE),
      },
    };
  }

  const rows = foodIndices.map((i) => Math.floor(i / BOARD_SIZE));
  const cols = foodIndices.map((i) => i % BOARD_SIZE);
  const minRow = Math.max(0, Math.min(...rows) - FIT_PADDING_CELLS);
  const maxRow = Math.min(
    BOARD_SIZE - 1,
    Math.max(...rows) + FIT_PADDING_CELLS,
  );
  const minCol = Math.max(0, Math.min(...cols) - FIT_PADDING_CELLS);
  const maxCol = Math.min(
    BOARD_SIZE - 1,
    Math.max(...cols) + FIT_PADDING_CELLS,
  );
  const span = Math.max(maxRow - minRow + 1, maxCol - minCol + 1);

  let fitCellSize = MAX_CELL_SIZE;
  while (
    fitCellSize > MIN_CELL_SIZE &&
    span * pitchOf(fitCellSize) > VIEWPORT_PX
  ) {
    fitCellSize -= ZOOM_STEP;
  }
  fitCellSize = clampCellSize(fitCellSize);

  const pitch = pitchOf(fitCellSize);
  const centerCol = (minCol + maxCol + 1) / 2;
  const centerRow = (minRow + maxRow + 1) / 2;

  return {
    cellSize: fitCellSize,
    offset: {
      x: snapOffset(fitCellSize, centerCol * pitch - VIEWPORT_PX / 2),
      y: snapOffset(fitCellSize, centerRow * pitch - VIEWPORT_PX / 2),
    },
  };
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function GameBoard({
  cells,
  highlightedIndices,
  selectedIndex,
  onCellClick,
  playerColors = {},
  draggableIndices,
  onCardDragStart,
  onCardDragEnd,
  onCardDrop,
}) {
  const [cellSize, setCellSize] = useState(
    () => computeFitView(cells).cellSize,
  );
  const [offset, setOffset] = useState(() => computeFitView(cells).offset);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef(null);
  const pointers = useRef(new Map());
  const pinchState = useRef(null);
  const viewportRef = useRef(null);

  function handlePointerDown(event) {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size === 2) {
      dragState.current = null;
      const [p1, p2] = [...pointers.current.values()];
      pinchState.current = {
        startDistance: distanceBetween(p1, p2),
        startCellSize: cellSize,
        startOffset: offset,
        midX: (p1.x + p2.x) / 2,
        midY: (p1.y + p2.y) / 2,
      };
      setIsDragging(false);
      return;
    }

    if (pointers.current.size === 1) {
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offset,
        moved: false,
      };
      setIsDragging(true);
    }
  }

  function handlePinchMove() {
    const pinch = pinchState.current;
    if (!pinch || pointers.current.size < 2) return;
    const [p1, p2] = [...pointers.current.values()];
    const distance = distanceBetween(p1, p2);
    if (distance <= 0 || pinch.startDistance <= 0) return;

    const scale = distance / pinch.startDistance;
    const nextCellSize = clampCellSize(pinch.startCellSize * scale);
    const oldPitch = pitchOf(pinch.startCellSize);
    const newPitch = pitchOf(nextCellSize);
    const cellX = (pinch.startOffset.x + pinch.midX) / oldPitch;
    const cellY = (pinch.startOffset.y + pinch.midY) / oldPitch;

    setOffset({
      x: clampOffset(nextCellSize, cellX * newPitch - pinch.midX),
      y: clampOffset(nextCellSize, cellY * newPitch - pinch.midY),
    });
    setCellSize(nextCellSize);
  }

  function handlePointerMove(event) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pinchState.current) {
      handlePinchMove();
      return;
    }

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

  function endDrag(event) {
    pointers.current.delete(event.pointerId);

    if (pointers.current.size < 2 && pinchState.current) {
      pinchState.current = null;
      setOffset((current) => ({
        x: snapOffset(cellSize, current.x),
        y: snapOffset(cellSize, current.y),
      }));
    }

    if (pointers.current.size === 0) {
      dragState.current = null;
      setIsDragging(false);
      setOffset((current) => ({
        x: snapOffset(cellSize, current.x),
        y: snapOffset(cellSize, current.y),
      }));
    }
  }

  function recenter() {
    const fit = computeFitView(cells);
    setCellSize(fit.cellSize);
    setOffset(fit.offset);
  }

  // Zooms while keeping whatever cell is currently centered in view still
  // centered afterwards, instead of jumping back to the board's center.
  function zoomTo(nextCellSize) {
    const clamped = clampCellSize(nextCellSize);
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
  const showSides = cellSize >= 48;
  const emojiSize = Math.max(10, Math.round(cellSize * 0.22));
  const nameSize = Math.max(8, Math.round(cellSize * 0.14));
  const sideSize = Math.max(8, Math.round(cellSize * 0.16));
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
          {cells.map((card, index) => {
            // Bird cards show the emoji, corner name, and edge stats (like
            // a Triple Triad-style card) once zoomed in enough not to
            // collide. Food cards have edge stats too, but show their name
            // below the emoji instead of in the corner, at a lower zoom
            // threshold.
            const isFoodCard = card?.type === 'food';
            const cardHasSides = Boolean(card?.sides) && showSides;
            const cardShowsIndex = cardHasSides && !isFoodCard;
            const cardShowsName = isFoodCard && showCardNames;

            const isDraggable = Boolean(draggableIndices?.has(index));

            return (
              <button
                key={index}
                type="button"
                role="gridcell"
                className={`board-cell${card ? ' board-cell-filled' : ''}${
                  highlightedIndices?.has(index) ? ' board-cell-droppable' : ''
                }${index === selectedIndex ? ' board-cell-selected' : ''}${
                  isDraggable ? ' board-cell-draggable' : ''
                }`}
                style={{ width: cellSize, height: cellSize }}
                onClick={() => handleCellClick(index)}
                draggable={isDraggable}
                onDragStart={() => onCardDragStart?.(index)}
                onDragEnd={() => onCardDragEnd?.()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  onCardDrop?.(index);
                }}
              >
                {card ? (
                  <span
                    className={`card card-on-board${card.type === 'food' ? ' card-food' : ''}`}
                    style={
                      card.type === 'food'
                        ? { '--card-color': card.color }
                        : {
                            '--card-border': playerColors[card.ownerId],
                            '--card-bg': card.deckColor,
                          }
                    }
                    title={card.name}
                  >
                    {cardShowsIndex ? (
                      <span
                        className="card-index"
                        style={{ fontSize: sideSize }}
                      >
                        {card.name}
                      </span>
                    ) : null}
                    {cardHasSides ? (
                      <span className="card-sides">
                        {SIDE_KEYS.map((side) => (
                          <span
                            key={side}
                            className={`card-side card-side-${side}`}
                            style={{ fontSize: sideSize }}
                          >
                            {card.sides[side]}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span
                      className="card-emoji"
                      style={{ fontSize: emojiSize }}
                    >
                      {card.emoji}
                    </span>
                    {cardShowsName ? (
                      <span
                        className="card-name"
                        style={{ fontSize: nameSize }}
                      >
                        {card.name}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="board-controls">
        <p className="board-hint">
          Click and drag to look around the {BOARD_SIZE}x{BOARD_SIZE} board.
          Scroll, pinch, or use the buttons to zoom.
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
