import { useState } from 'react';
import { DEFAULT_DECKS, createCardType, deckSize } from '../lib/decks.js';
import { DEFAULT_FOOD, createFoodShape, FOOD_GRID_SIZE } from '../lib/food.js';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];
const GRID_ROWS = Array.from({ length: FOOD_GRID_SIZE }, (_, row) => row);
const GRID_COLS = Array.from({ length: FOOD_GRID_SIZE }, (_, col) => col);

function clampSideValue(value) {
  return Math.min(9, Math.max(1, Number(value) || 1));
}

function clampQuantity(value) {
  return Math.max(1, Number(value) || 1);
}

export default function ManagePage({ decks, setDecks, food, setFood }) {
  const [activeSection, setActiveSection] = useState('decks');
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  const deck = decks[activeDeckIndex];

  function updateDeck(updater) {
    setDecks((current) =>
      current.map((d, i) => (i === activeDeckIndex ? updater(d) : d)),
    );
  }

  function updateCardType(cardIndex, patch) {
    updateDeck((d) => ({
      ...d,
      cardTypes: d.cardTypes.map((c, i) =>
        i === cardIndex ? { ...c, ...patch } : c,
      ),
    }));
  }

  function updateSide(cardIndex, sideKey, value) {
    updateDeck((d) => ({
      ...d,
      cardTypes: d.cardTypes.map((c, i) =>
        i === cardIndex
          ? { ...c, sides: { ...c.sides, [sideKey]: clampSideValue(value) } }
          : c,
      ),
    }));
  }

  function addCardType() {
    updateDeck((d) => ({
      ...d,
      cardTypes: [...d.cardTypes, createCardType()],
    }));
  }

  function removeCardType(cardIndex) {
    updateDeck((d) => ({
      ...d,
      cardTypes: d.cardTypes.filter((_, i) => i !== cardIndex),
    }));
  }

  function resetDeck() {
    const defaults = DEFAULT_DECKS[activeDeckIndex];
    if (!defaults) return;
    setDecks((current) =>
      current.map((d, i) => (i === activeDeckIndex ? defaults : d)),
    );
  }

  function updateFood(updater) {
    setFood((current) => updater(current));
  }

  function updateShape(shapeIndex, patch) {
    updateFood((f) => ({
      ...f,
      shapes: f.shapes.map((s, i) =>
        i === shapeIndex ? { ...s, ...patch } : s,
      ),
    }));
  }

  function toggleShapeCell(shapeIndex, row, col) {
    updateFood((f) => ({
      ...f,
      shapes: f.shapes.map((s, i) => {
        if (i !== shapeIndex) return s;
        const isActive = s.cells.some((c) => c.row === row && c.col === col);
        const cells = isActive
          ? s.cells.filter((c) => !(c.row === row && c.col === col))
          : [...s.cells, { row, col }];
        return { ...s, cells };
      }),
    }));
  }

  function addFoodShape() {
    updateFood((f) => ({ ...f, shapes: [...f.shapes, createFoodShape()] }));
  }

  function removeFoodShape(shapeIndex) {
    updateFood((f) => ({
      ...f,
      shapes: f.shapes.filter((_, i) => i !== shapeIndex),
    }));
  }

  function resetFood() {
    setFood(DEFAULT_FOOD);
  }

  const exportPayload = JSON.stringify({ decks, food }, null, 2);

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportPayload);
    } catch {
      // Clipboard API unavailable — the textarea's own text is still
      // there for the player to select and copy by hand.
    }
  }

  return (
    <main className="page manage">
      <div className="manage-header">
        <div
          className="manage-tabs"
          role="tablist"
          aria-label="Manage sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'decks'}
            className={`manage-tab${activeSection === 'decks' ? ' manage-tab-active' : ''}`}
            onClick={() => setActiveSection('decks')}
          >
            Decks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'food'}
            className={`manage-tab${activeSection === 'food' ? ' manage-tab-active' : ''}`}
            onClick={() => setActiveSection('food')}
          >
            Food
          </button>
        </div>
        <button
          type="button"
          className="board-recenter"
          onClick={() => setExportOpen(true)}
        >
          Export
        </button>
      </div>

      {activeSection === 'food' ? (
        <div className="manage-deck">
          <div className="manage-deck-header">
            <label className="manage-field">
              Food name
              <input
                type="text"
                value={food.name}
                onChange={(event) =>
                  updateFood((f) => ({ ...f, name: event.target.value }))
                }
              />
            </label>
            <button
              type="button"
              className="board-recenter"
              onClick={resetFood}
            >
              Reset to default
            </button>
          </div>

          {food.shapes.map((shape, i) => (
            <div key={shape.id} className="food-shape-card">
              <div className="food-shape-header">
                <input
                  className="manage-emoji-input"
                  type="text"
                  aria-label={`Icon for ${shape.name || 'food shape'}`}
                  value={shape.emoji}
                  onChange={(event) =>
                    updateShape(i, { emoji: event.target.value })
                  }
                />
                <input
                  type="text"
                  aria-label="Food shape name"
                  value={shape.name}
                  onChange={(event) =>
                    updateShape(i, { name: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="manage-remove"
                  onClick={() => removeFoodShape(i)}
                  disabled={food.shapes.length <= 1}
                  aria-label={`Remove ${shape.name || 'food shape'}`}
                >
                  X
                </button>
              </div>

              <div className="food-shape-body">
                <div
                  className="food-shape-grid"
                  role="group"
                  aria-label={`${shape.name || 'food shape'} shape`}
                >
                  {GRID_ROWS.map((row) =>
                    GRID_COLS.map((col) => {
                      const active = shape.cells.some(
                        (c) => c.row === row && c.col === col,
                      );
                      return (
                        <button
                          key={`${row}-${col}`}
                          type="button"
                          className={`food-shape-cell${active ? ' active' : ''}`}
                          aria-pressed={active}
                          aria-label={`${shape.name || 'food shape'} cell row ${row + 1} column ${col + 1}`}
                          onClick={() => toggleShapeCell(i, row, col)}
                        />
                      );
                    }),
                  )}
                </div>
                <div className="food-shape-values">
                  <label className="manage-field">
                    Outside edge value
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={shape.outsideValue}
                      onChange={(event) =>
                        updateShape(i, {
                          outsideValue: clampSideValue(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="manage-field">
                    Inside edge value
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={shape.insideValue}
                      onChange={(event) =>
                        updateShape(i, {
                          insideValue: clampSideValue(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="board-recenter"
            onClick={addFoodShape}
          >
            Add food shape
          </button>
        </div>
      ) : (
        <>
          <div
            className="manage-tabs manage-subtabs"
            role="tablist"
            aria-label="Choose deck"
          >
            {decks.map((d, i) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={i === activeDeckIndex}
                className={`manage-tab${i === activeDeckIndex ? ' manage-tab-active' : ''}`}
                onClick={() => setActiveDeckIndex(i)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <div className="manage-deck">
            <div className="manage-deck-header">
              <label className="manage-field">
                Deck name
                <input
                  type="text"
                  value={deck.name}
                  onChange={(event) =>
                    updateDeck((d) => ({ ...d, name: event.target.value }))
                  }
                />
              </label>
              <div className="manage-field">
                Deck size
                <span className="manage-deck-size">{deckSize(deck)}</span>
              </div>
              <button
                type="button"
                className="board-recenter"
                onClick={resetDeck}
              >
                Reset to default
              </button>
            </div>

            <div className="manage-cards-list">
              {deck.cardTypes.map((card, i) => (
                <div key={card.id} className="manage-card-row">
                  <input
                    className="manage-emoji-input"
                    type="text"
                    aria-label={`Icon for ${card.name || 'card'}`}
                    value={card.emoji}
                    onChange={(event) =>
                      updateCardType(i, { emoji: event.target.value })
                    }
                  />
                  <input
                    className="manage-card-name-input"
                    type="text"
                    aria-label="Card name"
                    value={card.name}
                    onChange={(event) =>
                      updateCardType(i, { name: event.target.value })
                    }
                  />
                  <label className="manage-side-field">
                    Qty
                    <input
                      className="manage-side-input"
                      type="number"
                      min="1"
                      aria-label={`Quantity for ${card.name || 'card'}`}
                      value={card.quantity}
                      onChange={(event) =>
                        updateCardType(i, {
                          quantity: clampQuantity(event.target.value),
                        })
                      }
                    />
                  </label>
                  <div className="manage-card-sides">
                    {SIDE_KEYS.map((side) => (
                      <label key={side} className="manage-side-field">
                        {side.charAt(0).toUpperCase() + side.slice(1)}
                        <input
                          className="manage-side-input"
                          type="number"
                          min="1"
                          max="9"
                          aria-label={`${side} value for ${card.name || 'card'}`}
                          value={card.sides[side]}
                          onChange={(event) =>
                            updateSide(i, side, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="manage-remove"
                    onClick={() => removeCardType(i)}
                    disabled={deck.cardTypes.length <= 1}
                    aria-label={`Remove ${card.name || 'card'}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="board-recenter"
              onClick={addCardType}
            >
              Add card
            </button>
          </div>
        </>
      )}

      {exportOpen ? (
        <div
          className="color-modal-backdrop"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="pile-modal export-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Export decks and Food"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Export decks &amp; Food</h3>
            <p className="wizard-body-hint">
              Copy this and paste it into a GitHub issue to request it be
              imported.
            </p>
            <textarea
              className="export-textarea"
              readOnly
              value={exportPayload}
              onFocus={(event) => event.target.select()}
            />
            <div className="wizard-step-actions">
              <button
                type="button"
                className="end-turn-btn"
                onClick={copyExport}
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                className="board-recenter"
                onClick={() => setExportOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
