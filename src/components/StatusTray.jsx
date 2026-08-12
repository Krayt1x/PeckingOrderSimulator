import { useState } from 'react';
import { RULESET_OPTIONS, SKIN_OPTIONS } from '../lib/rulesets.js';

// Summarizes the game's settings the same way the New Game wizard's
// Review step does, so the two never drift out of sync.
function summarizeSettings({ players, food, foodShapeIds, ruleset }) {
  const playerNames = players
    .map((p) => `${p.name}${p.isCPU ? ' (CPU)' : ''}`)
    .join(', ');

  const foodNames = food.shapes
    .filter((s) => foodShapeIds.includes(s.id))
    .map((s) => s.name);

  const enabledRules = RULESET_OPTIONS.filter((o) => ruleset[o.key]).map(
    (o) => o.label,
  );
  if (ruleset.allowCustomSkins) {
    const skinName =
      SKIN_OPTIONS.find((s) => s.id === ruleset.skin)?.name ?? ruleset.skin;
    enabledRules.push(`Custom Skins (${skinName})`);
  }

  return [
    { label: 'Players', value: playerNames },
    {
      label: 'Food',
      value: foodNames.length === 0 ? 'None' : foodNames.join(', '),
    },
    {
      label: 'Ruleset',
      value: enabledRules.length === 0 ? 'None' : enabledRules.join(', '),
    },
  ];
}

export default function StatusTray({
  players,
  food,
  foodShapeIds,
  ruleset,
  actionLog,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const settings = summarizeSettings({ players, food, foodShapeIds, ruleset });

  return (
    <div className="status-tray">
      <div className="status-tray-section">
        <div className="status-tray-header">
          <h3 className="status-tray-heading">Recent Actions</h3>
          <button
            type="button"
            className="status-tray-info-btn"
            aria-label="Game settings"
            onClick={() => setShowSettings(true)}
          >
            i
          </button>
        </div>
        {actionLog.length === 0 ? (
          <p className="status-tray-empty">No actions played yet.</p>
        ) : (
          <ol className="status-tray-actions" aria-label="Recent actions">
            {actionLog.map((entry) => (
              <li key={entry.id}>{entry.text}</li>
            ))}
          </ol>
        )}
      </div>
      {showSettings ? (
        <div
          className="color-modal-backdrop"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="pile-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Game Settings"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Game Settings</h3>
            <dl className="status-tray-settings">
              {settings.map(({ label, value }) => (
                <div key={label} className="status-tray-setting">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className="board-recenter"
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
