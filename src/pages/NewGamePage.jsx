import { useState } from 'react';
import {
  RULESET_OPTIONS,
  SKIN_OPTIONS,
  DEFAULT_RULESET,
} from '../lib/rulesets.js';

export { RULESET_OPTIONS, SKIN_OPTIONS, DEFAULT_RULESET };

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const PLAYER_COUNT_OPTIONS = [2, 3, 4];

const WIZARD_STEPS = [
  { key: 'mode', label: 'Mode' },
  { key: 'players', label: 'Players' },
  { key: 'rosters', label: 'Rosters' },
  { key: 'food', label: 'Food' },
  { key: 'ruleset', label: 'Ruleset' },
  { key: 'review', label: 'Review' },
];

// Picking Tutorial (#102) jumps straight into a fixed 2-player game rather
// than continuing through the rest of the wizard.
export const TUTORIAL_FOOD_SHAPE_IDS = ['chip', 'potato-cake'];

export const TUTORIAL_RULESET = {
  allowMoving: true,
  allowReturnToHand: true,
  allowCardRotation: true,
  allowEqualValuePlay: true,
  allowRandomTerrain: false,
  allowCustomSkins: true,
  skin: 'alpha-pixel-art',
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

// Named characters from the movie Chicken Run — a CPU player's flavor
// name once the "is CPU" box is ticked.
export const CHICKEN_RUN_NAMES = [
  'Ginger',
  'Rocky',
  'Bunty',
  'Babs',
  'Mac',
  'Fowler',
  'Mrs. Tweedy',
  'Mr. Tweedy',
  'Nick',
  'Fetcher',
];

function randomChickenRunName(usedNames) {
  const available = CHICKEN_RUN_NAMES.filter(
    (name) => !usedNames.includes(name),
  );
  const pool = available.length > 0 ? available : CHICKEN_RUN_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Player 1 defaults to human; every other seat defaults to CPU so a game
// is playable solo the moment a player count is picked (#95).
function defaultPlayer(index, decks, usedColors = [], usedNames = []) {
  const isCPU = index > 0;
  return {
    id: `player-${index}`,
    name: isCPU ? randomChickenRunName(usedNames) : `Player ${index + 1}`,
    isCPU,
    cpuStrategy: 'random',
    deckId: 'random',
    color: randomPlayerColor(usedColors),
  };
}

// Builds a fresh roster of `count` default players (Player 1 human, the
// rest CPU) — used both for the wizard's initial state and for jumping
// straight into a Tutorial game (#102), so both stay in sync.
function buildDefaultRoster(count, decks) {
  const roster = [];
  for (let i = 0; i < count; i++) {
    roster.push(
      defaultPlayer(
        i,
        decks,
        roster.map((p) => p.color),
        roster.map((p) => p.name),
      ),
    );
  }
  return roster;
}

const CPU_STRATEGIES = ['aggressive', 'defensive', 'ruthless'];

// Resolves any "random" deck/CPU-strategy picks to a concrete choice once,
// right before the game starts — not re-rolled every render, and not left
// as a literal "random" value the rest of the app would have to special-case.
function resolveRandomPlayerSettings(playerList, decks) {
  return playerList.map((p) => ({
    ...p,
    deckId:
      p.deckId === 'random'
        ? decks[Math.floor(Math.random() * decks.length)]?.id
        : p.deckId,
    cpuStrategy:
      p.isCPU && p.cpuStrategy === 'random'
        ? CPU_STRATEGIES[Math.floor(Math.random() * CPU_STRATEGIES.length)]
        : p.cpuStrategy,
  }));
}

export default function NewGamePage({ decks, food, onStart }) {
  const [players, setPlayers] = useState(() => buildDefaultRoster(2, decks));
  const [selectedFoodShapeIds, setSelectedFoodShapeIds] = useState(() =>
    defaultFoodShapeIds(2, food),
  );
  const [wizardStep, setWizardStep] = useState('mode');
  const [colorPickerPlayerIndex, setColorPickerPlayerIndex] = useState(null);
  const [ruleset, setRuleset] = useState(DEFAULT_RULESET);
  const [firstPlayerId, setFirstPlayerId] = useState(null);
  const [randomFirstPlayer, setRandomFirstPlayer] = useState(true);

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
            next.map((p) => p.name),
          ),
        );
      }
      setFirstPlayerId((id) => (next.some((p) => p.id === id) ? id : null));
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
    const takenByOther = players.some(
      (p, i) => i !== colorPickerPlayerIndex && p.color === color,
    );
    if (takenByOther) return;
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

  // Turn order always follows the `players` array, so setting a first
  // player just means moving them to the front of it.
  function orderedPlayers() {
    const leadId = randomFirstPlayer
      ? players[Math.floor(Math.random() * players.length)].id
      : firstPlayerId;
    const leadIndex = players.findIndex((p) => p.id === leadId);
    if (leadIndex <= 0) return players;
    return [
      players[leadIndex],
      ...players.slice(0, leadIndex),
      ...players.slice(leadIndex + 1),
    ];
  }

  function handleStart() {
    onStart({
      players: resolveRandomPlayerSettings(orderedPlayers(), decks),
      foodId: food.id,
      foodShapeIds: selectedFoodShapeIds,
      ruleset,
    });
  }

  // Picking Tutorial (#102) skips the rest of the wizard entirely — a
  // fixed 2-player roster (human always first, so the guided steps land on
  // their turn), Chip + Potato Cake, and a fixed ruleset chosen to keep
  // the board simple to learn on.
  function startTutorial() {
    const availableIds = new Set(food.shapes.map((s) => s.id));
    const foodShapeIds = TUTORIAL_FOOD_SHAPE_IDS.filter((id) =>
      availableIds.has(id),
    );
    onStart({
      players: resolveRandomPlayerSettings(buildDefaultRoster(2, decks), decks),
      foodId: food.id,
      foodShapeIds: foodShapeIds.length > 0 ? foodShapeIds : [...availableIds],
      ruleset: TUTORIAL_RULESET,
      isTutorial: true,
    });
  }

  function stepSummary(key) {
    if (key === 'players') {
      return `${players.length} player${players.length === 1 ? '' : 's'}`;
    }
    if (key === 'rosters') {
      const names = players
        .map((p) => `${p.name}${p.isCPU ? ' (CPU)' : ''}`)
        .join(', ');
      if (randomFirstPlayer) return `${names} — first player: random`;
      const first = players.find((p) => p.id === firstPlayerId);
      return first ? `${names} — ${first.name} goes first` : names;
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
      if (ruleset.allowCustomSkins) {
        const skinName =
          SKIN_OPTIONS.find((s) => s.id === ruleset.skin)?.name ?? ruleset.skin;
        enabled.push(`Custom Skins (${skinName})`);
      }
      return enabled.length === 0 ? 'None' : enabled.join(', ');
    }
    return '';
  }

  function continueFrom(key) {
    const index = WIZARD_STEPS.findIndex((s) => s.key === key);
    const next = WIZARD_STEPS[index + 1];
    if (next) setWizardStep(next.key);
  }

  function renderModeStep() {
    return (
      <>
        <p className="stage-label">How do you want to play?</p>
        <div className="home-tile-grid two-col-mobile-grid">
          <button
            type="button"
            className="home-tile"
            onClick={() => advanceWizardStep('players')}
          >
            <span className="home-tile-icon">🎮</span>
            <span className="home-tile-title">New Game</span>
            <span className="home-tile-description">
              Set up players, food, and rules yourself.
            </span>
          </button>
          <button type="button" className="home-tile" onClick={startTutorial}>
            <span className="home-tile-icon">🎓</span>
            <span className="home-tile-title">Tutorial</span>
            <span className="home-tile-description">
              Jump into a guided 2-player game that teaches you the basics.
            </span>
          </button>
        </div>
      </>
    );
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
        <label className="ruleset-option random-first-player">
          <input
            type="checkbox"
            checked={randomFirstPlayer}
            aria-label="Random First Player"
            onChange={(event) => {
              setRandomFirstPlayer(event.target.checked);
              if (event.target.checked) setFirstPlayerId(null);
            }}
          />
          <span className="ruleset-option-label">Random First Player</span>
        </label>
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
                First
                <input
                  type="checkbox"
                  checked={!randomFirstPlayer && firstPlayerId === player.id}
                  disabled={randomFirstPlayer}
                  aria-label={`${player.name} first`}
                  onChange={(event) =>
                    setFirstPlayerId(event.target.checked ? player.id : null)
                  }
                />
              </label>
              <label className="manage-side-field">
                CPU
                <input
                  type="checkbox"
                  checked={player.isCPU}
                  aria-label={`${player.name} is CPU`}
                  onChange={(event) => {
                    const isCPU = event.target.checked;
                    updatePlayer(i, {
                      isCPU,
                      ...(isCPU
                        ? {
                            name: randomChickenRunName(
                              players
                                .filter((_, pi) => pi !== i)
                                .map((p) => p.name),
                            ),
                          }
                        : {}),
                    });
                  }}
                />
              </label>
              <select
                value={player.deckId}
                aria-label={`${player.name} deck`}
                onChange={(event) =>
                  updatePlayer(i, { deckId: event.target.value })
                }
              >
                <option value="random">Random</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              {player.isCPU ? (
                <select
                  value={player.cpuStrategy || 'random'}
                  aria-label={`${player.name} CPU strategy`}
                  onChange={(event) =>
                    updatePlayer(i, { cpuStrategy: event.target.value })
                  }
                >
                  <option value="random">Random</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="defensive">Defensive</option>
                  <option value="ruthless">Ruthless</option>
                </select>
              ) : null}
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
                <span className="ruleset-option-label">
                  {option.label}{' '}
                  <span
                    className="info-tooltip"
                    role="img"
                    aria-label={`${option.label} info`}
                    title={option.description}
                  >
                    &#9432;
                  </span>
                </span>
              </span>
            </label>
          ))}
          <label className="ruleset-option">
            <input
              type="checkbox"
              checked={Boolean(ruleset.allowCustomSkins)}
              aria-label="Custom Skins"
              onChange={() => toggleRuleset('allowCustomSkins')}
            />
            <span>
              <span className="ruleset-option-label">
                Custom Skins{' '}
                <span
                  className="info-tooltip"
                  role="img"
                  aria-label="Custom Skins info"
                  title="Choose a visual skin for the game."
                >
                  &#9432;
                </span>
              </span>
              {ruleset.allowCustomSkins ? (
                <select
                  className="ruleset-skin-select"
                  value={ruleset.skin || 'alpha'}
                  aria-label="Skin"
                  onChange={(event) =>
                    setRuleset((r) => ({ ...r, skin: event.target.value }))
                  }
                >
                  {SKIN_OPTIONS.map((skin) => (
                    <option key={skin.id} value={skin.id}>
                      {skin.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </span>
          </label>
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
            {wizardStep === 'mode' && renderModeStep()}
            {wizardStep === 'players' && renderPlayersStep()}
            {wizardStep === 'rosters' && renderRostersStep()}
            {wizardStep === 'food' && renderFoodStep()}
            {wizardStep === 'ruleset' && renderRulesetStep()}
            {wizardStep === 'review' && (
              <>
                <p className="stage-label">Review &amp; start</p>
                {WIZARD_STEPS.filter(
                  (s) => s.key !== 'review' && s.key !== 'mode',
                ).map((s) => (
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
            {wizardStep !== 'review' && wizardStep !== 'mode' ? (
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
              {PLAYER_COLOR_PALETTE.map((color) => {
                const isOwn = players[colorPickerPlayerIndex].color === color;
                const takenByOther = players.some(
                  (p, i) => i !== colorPickerPlayerIndex && p.color === color,
                );
                return (
                  <button
                    key={color}
                    type="button"
                    className={`color-modal-swatch${isOwn ? ' selected' : ''}${
                      takenByOther ? ' taken' : ''
                    }`}
                    style={{ '--swatch-color': color }}
                    aria-label={color}
                    aria-pressed={isOwn}
                    disabled={takenByOther}
                    onClick={() => pickPlayerColor(color)}
                  />
                );
              })}
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
