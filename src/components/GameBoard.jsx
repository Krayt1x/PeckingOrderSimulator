import { useEffect, useRef, useState } from 'react';
import { baseSides } from '../lib/rotation.js';
import PixelBirdSprite from './PixelBirdSprite.jsx';
import PixelRockSprite from './PixelRockSprite.jsx';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];

export const BOARD_SIZE = 16;
const VIEWPORT_SIZE = 5;
const MIN_CELL_SIZE = 32;
const MAX_CELL_SIZE = 144;
const ZOOM_STEP = 16;
const CELL_GAP = 0;

// Mirrors .page's own CSS (max-width: 560px; padding: 0 1.5rem) so the
// viewport box always exactly fills the same content width .page gives
// everything else — full desktop content width above 560px, narrowing
// with the actual screen below it, rather than a couple of hardcoded
// breakpoint sizes that only fit some phones and leave others with a
// board too small (or, previously, too big) for the row around it.
const PAGE_MAX_WIDTH_PX = 560;
const PAGE_HORIZONTAL_PADDING_PX = 48;
const DESKTOP_CELL_SIZE = Math.floor(
  (PAGE_MAX_WIDTH_PX - PAGE_HORIZONTAL_PADDING_PX) / VIEWPORT_SIZE,
);

function defaultCellSize() {
  if (typeof window === 'undefined') return DESKTOP_CELL_SIZE;
  const pageWidth = Math.min(window.innerWidth, PAGE_MAX_WIDTH_PX);
  const contentWidth = pageWidth - PAGE_HORIZONTAL_PADDING_PX;
  return Math.max(MIN_CELL_SIZE, Math.floor(contentWidth / VIEWPORT_SIZE));
}

// The viewport box itself never resizes as you zoom — zooming changes how
// many cells fit inside this fixed pixel box, not the box's own size.
function viewportPx() {
  return VIEWPORT_SIZE * (defaultCellSize() + CELL_GAP) - CELL_GAP;
}

function pitchOf(cellSize) {
  return cellSize + CELL_GAP;
}

function maxOffsetOf(cellSize) {
  return Math.max(0, BOARD_SIZE * pitchOf(cellSize) - viewportPx());
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
  const defaultSize = defaultCellSize();

  if (foodIndices.length === 0) {
    return {
      cellSize: defaultSize,
      offset: {
        x: centeredOffset(defaultSize),
        y: centeredOffset(defaultSize),
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

  const vpx = viewportPx();
  let fitCellSize = MAX_CELL_SIZE;
  while (fitCellSize > MIN_CELL_SIZE && span * pitchOf(fitCellSize) > vpx) {
    fitCellSize -= ZOOM_STEP;
  }
  fitCellSize = clampCellSize(fitCellSize);

  const pitch = pitchOf(fitCellSize);
  const centerCol = (minCol + maxCol + 1) / 2;
  const centerRow = (minRow + maxRow + 1) / 2;

  return {
    cellSize: fitCellSize,
    offset: {
      x: snapOffset(fitCellSize, centerCol * pitch - vpx / 2),
      y: snapOffset(fitCellSize, centerRow * pitch - vpx / 2),
    },
  };
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function GameBoard({
  cells,
  highlightedIndices,
  claimableIndices,
  claimColor,
  selectedIndex,
  onCellClick,
  playerColors = {},
  draggableIndices,
  onCardDragStart,
  onCardDragEnd,
  onCardDrop,
  hoveredOwnerId,
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

  // Panning and zooming never snap back to a grid position — only clamped
  // so the viewport can't scroll past the board's edge. Players are free
  // to leave the camera misaligned with the grid if they want to.
  function endDrag(event) {
    pointers.current.delete(event.pointerId);

    if (pointers.current.size < 2 && pinchState.current) {
      pinchState.current = null;
      setOffset((current) => ({
        x: clampOffset(cellSize, current.x),
        y: clampOffset(cellSize, current.y),
      }));
    }

    if (pointers.current.size === 0) {
      dragState.current = null;
      setIsDragging(false);
      setOffset((current) => ({
        x: clampOffset(cellSize, current.x),
        y: clampOffset(cellSize, current.y),
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

    const vpx = viewportPx();
    const oldPitch = pitchOf(cellSize);
    const newPitch = pitchOf(clamped);
    setOffset((current) => {
      const centerCellX = (current.x + vpx / 2) / oldPitch;
      const centerCellY = (current.y + vpx / 2) / oldPitch;
      return {
        x: clampOffset(clamped, centerCellX * newPitch - vpx / 2),
        y: clampOffset(clamped, centerCellY * newPitch - vpx / 2),
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
  const nameSize = Math.max(8, Math.round(cellSize * 0.14));
  const sideSize = Math.max(8, Math.round(cellSize * 0.16));
  const spriteSize = Math.max(16, Math.round(cellSize * 0.4));
  const terrainIconSize = Math.max(20, Math.round(cellSize * 0.85));
  const zoomPercent = Math.round((cellSize / defaultCellSize()) * 100);
  const vpx = viewportPx();

  return (
    <div className="board-wrap">
      <div
        ref={viewportRef}
        className={`board-viewport${isDragging ? ' board-dragging' : ''}`}
        style={{ width: vpx, height: vpx }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="board-zoom-overlay"
          onPointerDown={(event) => event.stopPropagation()}
        >
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
        <div
          className="board"
          role="grid"
          aria-label="Game board"
          // Explicit width/height (rather than leaving it to auto-size from
          // the grid tracks) so a background painted on .board — like the
          // pixel-art skin's grass checker — covers the full panned grid
          // instead of only the portion that happens to fit .board-viewport's
          // own width (#103).
          style={{
            width: BOARD_SIZE * cellSize,
            height: BOARD_SIZE * cellSize,
            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
            transform: `translate(${-offset.x}px, ${-offset.y}px)`,
          }}
        >
          {cells.map((card, index) => {
            // Every card shows its name in the center once zoomed in
            // enough for that not to collide, at a lower zoom threshold
            // than the edge stats (like a Triple Triad-style card) show
            // once zoomed in further still.
            const cardHasSides = Boolean(card?.sides) && showSides;
            const cardShowsName = showCardNames;

            const isDraggable = Boolean(draggableIndices?.has(index));
            const isClaimable = Boolean(claimableIndices?.has(index));
            const isOwnerHighlighted =
              hoveredOwnerId != null &&
              card?.type !== 'food' &&
              card?.type !== 'terrain' &&
              card?.ownerId === hoveredOwnerId;
            const rotationDeg = card?.rotation ?? 0;
            const faceSides = cardHasSides
              ? baseSides(card.sides, rotationDeg)
              : null;

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
                {card && card.type === 'terrain' ? (
                  <span className="card card-on-board card-terrain">
                    <span className="card-face">
                      <PixelRockSprite size={terrainIconSize} />
                    </span>
                  </span>
                ) : card ? (
                  <span
                    className={`card card-on-board${card.type === 'food' ? ' card-food' : ''}${isClaimable ? ' card-claimable' : ''}${isOwnerHighlighted ? ' card-owner-highlighted' : ''}`}
                    style={
                      card.type === 'food'
                        ? {
                            '--card-color': card.color,
                            ...(isClaimable
                              ? { '--claim-color': claimColor }
                              : null),
                          }
                        : {
                            '--card-border': playerColors[card.ownerId],
                            '--card-bg': card.deckColor,
                          }
                    }
                    title={card.name}
                  >
                    <span
                      className="card-face"
                      style={
                        rotationDeg
                          ? { transform: `rotate(${rotationDeg}deg)` }
                          : undefined
                      }
                    >
                      {cardHasSides ? (
                        <span className="card-sides">
                          {SIDE_KEYS.map((side) => (
                            <span
                              key={side}
                              className={`card-side card-side-${side}`}
                              style={{ fontSize: sideSize }}
                            >
                              {faceSides[side]}
                            </span>
                          ))}
                        </span>
                      ) : null}
                      {cardHasSides && card.type !== 'food' ? (
                        <PixelBirdSprite
                          typeId={card.typeId}
                          name={card.name}
                          size={spriteSize}
                        />
                      ) : null}
                      {cardShowsName ? (
                        <span
                          className="card-name"
                          style={{ fontSize: nameSize }}
                        >
                          {card.name}
                        </span>
                      ) : null}
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
