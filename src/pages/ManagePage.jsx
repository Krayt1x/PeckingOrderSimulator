import { useState } from 'react';
import { DEFAULT_DECKS, createCardType } from '../lib/decks.js';
import { DEFAULT_FOOD, createFoodShape, FOOD_GRID_SIZE } from '../lib/food.js';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];
const GRID_ROWS = Array.from({ length: FOOD_GRID_SIZE }, (_, row) => row);
const GRID_COLS = Array.from({ length: FOOD_GRID_SIZE }, (_, col) => col);

function clampSideValue(value) {
  return Math.min(9, Math.max(1, Number(value) || 1));
}

export default function ManagePage({ decks, setDecks, food, setFood }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const isFoodTab = activeIndex >= decks.length;
  const deck = isFoodTab ? null : decks[activeIndex];

  function updateDeck(updater) {
    setDecks((current) =>
      current.map((d, i) => (i === activeIndex ? updater(d) : d)),
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
    const defaults = DEFAULT_DECKS[activeIndex];
    if (!defaults) return;
    setDecks((current) =>
      current.map((d, i) => (i === activeIndex ? defaults : d)),
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

  return (
    <main className="page manage">
      <h1>Manage decks</h1>
      <p>
        Edit each deck&rsquo;s cards, or the Food objective shapes. Deck cards
        have four side values (top, right, bottom, left); Food shapes are drawn
        on a grid, with one value for outside edges and another for edges shared
        between the shape&rsquo;s own cells.
      </p>

      <div className="manage-tabs" role="tablist" aria-label="Decks and Food">
        {decks.map((d, i) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            className={`manage-tab${i === activeIndex ? ' manage-tab-active' : ''}`}
            onClick={() => setActiveIndex(i)}
          >
            {d.name}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={isFoodTab}
          className={`manage-tab${isFoodTab ? ' manage-tab-active' : ''}`}
          onClick={() => setActiveIndex(decks.length)}
        >
          Food
        </button>
      </div>

      {isFoodTab ? (
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
            <label className="manage-field">
              Deck size
              <input
                type="number"
                min="1"
                value={deck.size}
                onChange={(event) =>
                  updateDeck((d) => ({
                    ...d,
                    size: Math.max(1, Number(event.target.value) || 1),
                  }))
                }
              />
            </label>
            <button
              type="button"
              className="board-recenter"
              onClick={resetDeck}
            >
              Reset to default
            </button>
          </div>

          <table className="manage-cards">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Top</th>
                <th>Right</th>
                <th>Bottom</th>
                <th>Left</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {deck.cardTypes.map((card, i) => (
                <tr key={card.id}>
                  <td>
                    <input
                      className="manage-emoji-input"
                      type="text"
                      aria-label={`Icon for ${card.name || 'card'}`}
                      value={card.emoji}
                      onChange={(event) =>
                        updateCardType(i, { emoji: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label="Card name"
                      value={card.name}
                      onChange={(event) =>
                        updateCardType(i, { name: event.target.value })
                      }
                    />
                  </td>
                  {SIDE_KEYS.map((side) => (
                    <td key={side}>
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
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className="manage-remove"
                      onClick={() => removeCardType(i)}
                      disabled={deck.cardTypes.length <= 1}
                      aria-label={`Remove ${card.name || 'card'}`}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="board-recenter"
            onClick={addCardType}
          >
            Add card
          </button>
        </div>
      )}
    </main>
  );
}
