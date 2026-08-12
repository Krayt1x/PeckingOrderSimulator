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
  const settings = summarizeSettings({ players, food, foodShapeIds, ruleset });

  return (
    <div className="status-tray">
      <div className="status-tray-section">
        <h3 className="status-tray-heading">Game Settings</h3>
        <dl className="status-tray-settings">
          {settings.map(({ label, value }) => (
            <div key={label} className="status-tray-setting">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="status-tray-section">
        <h3 className="status-tray-heading">Recent Actions</h3>
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
    </div>
  );
}
