import { useState } from 'react';
import { DEFAULT_DECKS, createCardType } from '../lib/decks.js';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];

export default function ManagePage({ decks, setDecks }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const deck = decks[activeIndex];

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
    const clamped = Math.min(9, Math.max(1, Number(value) || 1));
    updateDeck((d) => ({
      ...d,
      cardTypes: d.cardTypes.map((c, i) =>
        i === cardIndex
          ? { ...c, sides: { ...c.sides, [sideKey]: clamped } }
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

  return (
    <main className="page manage">
      <h1>Manage decks</h1>
      <p>
        Edit each deck&rsquo;s cards. Every card has four side values (top,
        right, bottom, left) and a deck is built by cycling through its cards up
        to the deck size.
      </p>

      <div className="manage-tabs" role="tablist" aria-label="Decks">
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
      </div>

      {deck ? (
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
              {deck.cardTypes.map((card, i) => (
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
                      disabled={deck.cardTypes.length <= 1}
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
