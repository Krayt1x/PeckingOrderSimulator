import { useState } from 'react';

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;
const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4];

const WIZARD_STEPS = [
  { key: 'players', label: 'Players' },
  { key: 'rosters', label: 'Rosters' },
  { key: 'food', label: 'Food' },
  { key: 'ruleset', label: 'Ruleset' },
  { key: 'review', label: 'Review' },
];

// Each entry becomes a checkbox on the Ruleset step — add new rules here
// rather than hand-rolling more JSX.
const RULESET_OPTIONS = [
  {
    key: 'allowMoving',
    label: 'Allow Moving',
    description:
      'A player may move a bird of theirs to another space during their turn. Costs 1 action.',
  },
  {
    key: 'allowReturnToHand',
    label: 'Allow Return to Hand',
    description:
      'A player may move a bird of theirs to their discard pile during their turn. Costs 0 actions.',
  },
];

export const DEFAULT_RULESET = {
  allowMoving: true,
  allowReturnToHand: false,
};

// A player's color borders their cards on the board, independent of which
// deck (and therefore card background color) they're playing. Laid out as
// 5 shades each of 5 hues so the picker modal reads as a 5x5 color chart.
export const PLAYER_COLOR_PALETTE = [
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#991b1b',
  '#fdba74',
  '#fb923c',
  '#f97316',
  '#ea580c',
  '#9a3412',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#166534',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1e3a8a',
  '#d8b4fe',
  '#c084fc',
  '#a855f7',
  '#7c3aed',
  '#581c87',
];

// Which food shapes are pre-selected for a given player count — keeps
// smaller games shorter (fewer Food tiles to eat) and scales up with more
// players competing for them.
const FOOD_DEFAULTS_BY_PLAYER_COUNT = {
  2: ['potato-cake', 'chip'],
  3: ['burger', 'potato-cake'],
  4: ['burger', 'potato-cake', 'chip'],
};

export const FOOD_DEFAULTS_TOOLTIP =
  'Default food by player count — 2 players: Potato Cake + Chip. ' +
  '3 players: Burger + Potato Cake. ' +
  '4 players: Burger + Potato Cake + Chip.';

function defaultFoodShapeIds(playerCount, food) {
  const preferred = FOOD_DEFAULTS_BY_PLAYER_COUNT[playerCount];
  const allIds = food.shapes.map((s) => s.id);
  if (!preferred) return allIds;
  const available = new Set(allIds);
  const ids = preferred.filter((id) => available.has(id));
  return ids.length > 0 ? ids : allIds;
}

// Picks a random color from the palette, avoiding any already in use by
// another default player so players stay visually distinct — falls back
// to any random color if every one is somehow already taken.
function randomPlayerColor(usedColors) {
  const available = PLAYER_COLOR_PALETTE.filter(
    (color) => !usedColors.includes(color),
  );
  const pool = available.length > 0 ? available : PLAYER_COLOR_PALETTE;
  return pool[Math.floor(Math.random() * pool.length)];
}

function defaultPlayer(index, decks, usedColors = []) {
  return {
    id: `player-${index}`,
    name: `Player ${index + 1}`,
    isCPU: false,
    deckId: decks[index % decks.length]?.id,
    color: randomPlayerColor(usedColors),
  };
}

export default function NewGamePage({ decks, food, onStart }) {
  const [players, setPlayers] = useState(() => {
    const initial = [];
    for (let i = 0; i < 2; i++) {
      initial.push(
        defaultPlayer(
          i,
          decks,
          initial.map((p) => p.color),
        ),
      );
    }
    return initial;
  });
  const [selectedFoodShapeIds, setSelectedFoodShapeIds] = useState(() =>
    defaultFoodShapeIds(2, food),
  );
  const [wizardStep, setWizardStep] = useState('players');
  const [colorPickerPlayerIndex, setColorPickerPlayerIndex] = useState(null);
  const [ruleset, setRuleset] = useState(DEFAULT_RULESET);

  function toggleRuleset(key) {
    setRuleset((current) => ({ ...current, [key]: !current[key] }));
  }

  // Mirrors the tile-pick-then-advance pattern from DropshipSimulator's own
  // New Game wizard — a brief pause lets the "selected" highlight register
  // before the stage swaps out from under it.
  function advanceWizardStep(next) {
    setTimeout(() => setWizardStep(next), 200);
  }

  function setPlayerCount(count) {
    const clamped = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));
    setPlayers((current) => {
      const next = current.slice(0, clamped);
      while (next.length < clamped) {
        next.push(
          defaultPlayer(
            next.length,
            decks,
            next.map((p) => p.color),
          ),
        );
      }
      return next;
    });
    setSelectedFoodShapeIds(defaultFoodShapeIds(clamped, food));
    advanceWizardStep('rosters');
  }

  function updatePlayer(index, patch) {
    setPlayers((current) =>
      current.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function pickPlayerColor(color) {
    if (colorPickerPlayerIndex === null) return;
    updatePlayer(colorPickerPlayerIndex, { color });
    setColorPickerPlayerIndex(null);
  }

  function toggleFoodShape(id) {
    setSelectedFoodShapeIds((current) =>
      current.includes(id)
        ? current.filter((shapeId) => shapeId !== id)
        : [...current, id],
    );
  }

  function handleStart() {
    onStart({
      players,
      foodId: food.id,
      foodShapeIds: selectedFoodShapeIds,
      ruleset,
    });
  }

  function stepSummary(key) {
    if (key === 'players') {
      return `${players.length} player${players.length === 1 ? '' : 's'}`;
    }
    if (key === 'rosters') {
      return players
        .map((p) => `${p.name}${p.isCPU ? ' (CPU)' : ''}`)
        .join(', ');
    }
    if (key === 'food') {
      const chosen = food.shapes.filter((s) =>
        selectedFoodShapeIds.includes(s.id),
      );
      return chosen.length === 0
        ? 'None'
        : chosen.map((s) => s.name).join(', ');
    }
    if (key === 'ruleset') {
      const enabled = RULESET_OPTIONS.filter((o) => ruleset[o.key]).map(
        (o) => o.label,
      );
      return enabled.length === 0 ? 'None' : enabled.join(', ');
    }
    return '';
  }

  function continueFrom(key) {
    const index = WIZARD_STEPS.findIndex((s) => s.key === key);
    const next = WIZARD_STEPS[index + 1];
    if (next) setWizardStep(next.key);
  }

  function renderPlayersStep() {
    return (
      <>
        <p className="stage-label">How many players?</p>
        <div className="home-tile-grid two-col-mobile-grid">
          {PLAYER_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              className={`home-tile${players.length === count ? ' selected' : ''}`}
              onClick={() => setPlayerCount(count)}
            >
              <span className="home-tile-title">{count}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderRostersStep() {
    return (
      <>
        <p className="stage-label">Who&rsquo;s playing, and with which deck?</p>
        <div className="manage-cards-list new-game-players">
          {players.map((player, i) => (
            <div key={player.id} className="manage-card-row">
              <input
                type="text"
                className="manage-card-name-input"
                aria-label="Player name"
                value={player.name}
                onChange={(event) =>
                  updatePlayer(i, { name: event.target.value })
                }
              />
              <label className="manage-side-field">
                CPU
                <input
                  type="checkbox"
                  checked={player.isCPU}
                  aria-label={`${player.name} is CPU`}
                  onChange={(event) =>
                    updatePlayer(i, { isCPU: event.target.checked })
                  }
                />
              </label>
              <select
                value={player.deckId}
                aria-label={`${player.name} deck`}
                onChange={(event) =>
                  updatePlayer(i, { deckId: event.target.value })
                }
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="color-cube"
                style={{ '--swatch-color': player.color }}
                aria-label={`${player.name} color`}
                onClick={() => setColorPickerPlayerIndex(i)}
              />
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderFoodStep() {
    return (
      <>
        <p className="stage-label">
          Which food is in play?{' '}
          <span
            className="info-tooltip"
            role="img"
            aria-label="Default food by player count info"
            title={FOOD_DEFAULTS_TOOLTIP}
          >
            &#9432;
          </span>
        </p>
        <p className="wizard-body-hint">
          Pick which food shapes will be placed on the board. Edit shapes in{' '}
          <a href="#manage">Manage</a>.
        </p>
        <div className="home-tile-grid two-col-mobile-grid">
          {food.shapes.map((shape) => {
            const selected = selectedFoodShapeIds.includes(shape.id);
            const width = Math.max(...shape.cells.map((c) => c.col), 0) + 1;
            const height = Math.max(...shape.cells.map((c) => c.row), 0) + 1;
            return (
              <button
                key={shape.id}
                type="button"
                role="switch"
                aria-checked={selected}
                className={`home-tile${selected ? ' selected' : ''}`}
                onClick={() => toggleFoodShape(shape.id)}
              >
                <span className="home-tile-title">{shape.name}</span>
                <span className="home-tile-description">
                  {width}x{height} &mdash; outside {shape.outsideValue}, inside{' '}
                  {shape.insideValue}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderRulesetStep() {
    return (
      <>
        <p className="stage-label">Ruleset</p>
        <div className="ruleset-options">
          {RULESET_OPTIONS.map((option) => (
            <label key={option.key} className="ruleset-option">
              <input
                type="checkbox"
                checked={Boolean(ruleset[option.key])}
                aria-label={option.label}
                onChange={() => toggleRuleset(option.key)}
              />
              <span>
                <span className="ruleset-option-label">{option.label}</span>
                <span className="wizard-body-hint">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </>
    );
  }

  return (
    <main className="page">
      <div className="wizard-card">
        <div className="wizard-card-header">
          <h1 className="wizard-card-title">New Game</h1>
          <a href="#" className="board-recenter">
            Cancel
          </a>
        </div>
        <div className="wizard-layout">
          <div className="wizard-rail">
            {WIZARD_STEPS.map((step, i) => (
              <button
                key={step.key}
                type="button"
                aria-label={step.label}
                className={`wizard-rail-step${step.key === wizardStep ? ' current' : ''}`}
                onClick={() => setWizardStep(step.key)}
              >
                <span className="wizard-rail-dot">{i + 1}</span>
                <span className="wizard-rail-text">
                  <span className="wizard-rail-label">{step.label}</span>
                  {stepSummary(step.key) ? (
                    <span className="wizard-rail-summary">
                      {stepSummary(step.key)}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <div className="wizard-body">
            {wizardStep === 'players' && renderPlayersStep()}
            {wizardStep === 'rosters' && renderRostersStep()}
            {wizardStep === 'food' && renderFoodStep()}
            {wizardStep === 'ruleset' && renderRulesetStep()}
            {wizardStep === 'review' && (
              <>
                <p className="stage-label">Review &amp; start</p>
                {WIZARD_STEPS.filter((s) => s.key !== 'review').map((s) => (
                  <div key={s.key} className="wizard-review-line">
                    <span>{s.label}</span>
                    <span>{stepSummary(s.key) || '—'}</span>
                  </div>
                ))}
                <div className="wizard-step-actions">
                  <button
                    type="button"
                    className="end-turn-btn"
                    onClick={handleStart}
                  >
                    Start Game
                  </button>
                </div>
              </>
            )}
            {wizardStep !== 'review' ? (
              <div className="wizard-step-actions">
                <button
                  type="button"
                  className="end-turn-btn"
                  onClick={() => continueFrom(wizardStep)}
                >
                  Continue
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {colorPickerPlayerIndex !== null ? (
        <div
          className="color-modal-backdrop"
          onClick={() => setColorPickerPlayerIndex(null)}
        >
          <div
            className="color-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${players[colorPickerPlayerIndex].name} color`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="color-modal-grid">
              {PLAYER_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-modal-swatch${
                    players[colorPickerPlayerIndex].color === color
                      ? ' selected'
                      : ''
                  }`}
                  style={{ '--swatch-color': color }}
                  aria-label={color}
                  aria-pressed={players[colorPickerPlayerIndex].color === color}
                  onClick={() => pickPlayerColor(color)}
                />
              ))}
            </div>
            <button
              type="button"
              className="board-recenter"
              onClick={() => setColorPickerPlayerIndex(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
