import { useState } from 'react';

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;
const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4];

const WIZARD_STEPS = [
  { key: 'players', label: 'Players' },
  { key: 'rosters', label: 'Rosters' },
  { key: 'food', label: 'Food' },
  { key: 'review', label: 'Review' },
];

function defaultPlayer(index, decks) {
  return {
    id: `player-${index}`,
    name: `Player ${index + 1}`,
    isCPU: false,
    deckId: decks[index % decks.length]?.id,
  };
}

export default function NewGamePage({ decks, food, onStart }) {
  const [players, setPlayers] = useState(() =>
    Array.from({ length: 2 }, (_, i) => defaultPlayer(i, decks)),
  );
  const [selectedFoodShapeIds, setSelectedFoodShapeIds] = useState(() =>
    food.shapes.map((s) => s.id),
  );
  const [wizardStep, setWizardStep] = useState('players');

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
        next.push(defaultPlayer(next.length, decks));
      }
      return next;
    });
    advanceWizardStep('rosters');
  }

  function updatePlayer(index, patch) {
    setPlayers((current) =>
      current.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function toggleFoodShape(id) {
    setSelectedFoodShapeIds((current) =>
      current.includes(id)
        ? current.filter((shapeId) => shapeId !== id)
        : [...current, id],
    );
  }

  function handleStart() {
    onStart({ players, foodId: food.id, foodShapeIds: selectedFoodShapeIds });
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
        <table className="manage-cards new-game-players">
          <thead>
            <tr>
              <th>Player</th>
              <th>CPU</th>
              <th>Deck</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, i) => (
              <tr key={player.id}>
                <td>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(event) =>
                      updatePlayer(i, { name: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={player.isCPU}
                    aria-label={`${player.name} is CPU`}
                    onChange={(event) =>
                      updatePlayer(i, { isCPU: event.target.checked })
                    }
                  />
                </td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  function renderFoodStep() {
    return (
      <>
        <p className="stage-label">Which food is in play?</p>
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
    </main>
  );
}
