import { useState } from 'react';
import { DEFAULT_DECKS, createCardType } from '../lib/decks.js';
import { DEFAULT_FOOD } from '../lib/food.js';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];

export default function ManagePage({ decks, setDecks, food, setFood }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const isFoodTab = activeIndex >= decks.length;
  const activeCollection = isFoodTab ? food : decks[activeIndex];

  function updateActive(updater) {
    if (isFoodTab) {
      setFood((current) => updater(current));
    } else {
      setDecks((current) =>
        current.map((d, i) => (i === activeIndex ? updater(d) : d)),
      );
    }
  }

  function updateCardType(cardIndex, patch) {
    updateActive((collection) => ({
      ...collection,
      cardTypes: collection.cardTypes.map((c, i) =>
        i === cardIndex ? { ...c, ...patch } : c,
      ),
    }));
  }

  function updateSide(cardIndex, sideKey, value) {
    const clamped = Math.min(9, Math.max(1, Number(value) || 1));
    updateActive((collection) => ({
      ...collection,
      cardTypes: collection.cardTypes.map((c, i) =>
        i === cardIndex
          ? { ...c, sides: { ...c.sides, [sideKey]: clamped } }
          : c,
      ),
    }));
  }

  function addCardType() {
    updateActive((collection) => ({
      ...collection,
      cardTypes: [...collection.cardTypes, createCardType()],
    }));
  }

  function removeCardType(cardIndex) {
    updateActive((collection) => ({
      ...collection,
      cardTypes: collection.cardTypes.filter((_, i) => i !== cardIndex),
    }));
  }

  function resetActive() {
    if (isFoodTab) {
      setFood(DEFAULT_FOOD);
      return;
    }
    const defaults = DEFAULT_DECKS[activeIndex];
    if (!defaults) return;
    setDecks((current) =>
      current.map((d, i) => (i === activeIndex ? defaults : d)),
    );
  }

  return (
    <main className="page manage">
      <h1>Manage decks</h1>
      <p>
        Edit each deck&rsquo;s cards, or the Food objective cards. Every card
        has four side values (top, right, bottom, left).
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
          🌾 Food
        </button>
      </div>

      {activeCollection ? (
        <div className="manage-deck">
          <div className="manage-deck-header">
            <label className="manage-field">
              {isFoodTab ? 'Food name' : 'Deck name'}
              <input
                type="text"
                value={activeCollection.name}
                onChange={(event) =>
                  updateActive((collection) => ({
                    ...collection,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            {isFoodTab ? null : (
              <label className="manage-field">
                Deck size
                <input
                  type="number"
                  min="1"
                  value={activeCollection.size}
                  onChange={(event) =>
                    updateActive((collection) => ({
                      ...collection,
                      size: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="board-recenter"
              onClick={resetActive}
            >
              Reset to default
            </button>
          </div>

          <table className="manage-cards">
            <thead>
              <tr>
                <th>Emoji</th>
                <th>Name</th>
                <th>Top</th>
                <th>Right</th>
                <th>Bottom</th>
                <th>Left</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {activeCollection.cardTypes.map((card, i) => (
                <tr key={card.id}>
                  <td>
                    <input
                      className="manage-emoji-input"
                      type="text"
                      aria-label={`Emoji for ${card.name || 'card'}`}
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
                      disabled={activeCollection.cardTypes.length <= 1}
                      aria-label={`Remove ${card.name || 'card'}`}
                    >
                      ✕
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
      ) : null}
    </main>
  );
}
