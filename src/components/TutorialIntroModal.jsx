import { useEffect, useState } from 'react';

// How long each phase of the looping demo stays on screen before advancing
// to the next one, in ms. Mirrors a real capture (a weaker card is flown
// off the board) followed by a real Food claim (birds surround it, it
// flashes claimable, then is eaten) using the game's own card markup, so
// the preview looks and moves exactly like play does.
const PHASE_DELAYS = [500, 400, 400, 600, 600, 1100, 600];

function DemoBirdCard({ color, sides, flying }) {
  return (
    <span
      className={`card card-on-board tutorial-demo-card${flying ? ' tutorial-demo-card-flying' : ''}`}
      style={{ '--card-border': color, '--card-bg': '#292524' }}
    >
      <span className="card-face">
        <span className="card-sides">
          <span className="card-side card-side-top">{sides}</span>
          <span className="card-side card-side-right">{sides}</span>
          <span className="card-side card-side-bottom">{sides}</span>
          <span className="card-side card-side-left">{sides}</span>
        </span>
      </span>
    </span>
  );
}

function DemoFoodCard({ claimable }) {
  return (
    <span
      className={`card card-on-board card-food tutorial-demo-card${claimable ? ' card-claimable' : ''}`}
      style={{
        '--card-color': '#eab308',
        ...(claimable ? { '--claim-color': '#3b82f6' } : null),
      }}
    >
      <span className="card-face">
        <span className="card-name">Chip</span>
      </span>
    </span>
  );
}

export default function TutorialIntroModal({ onDismiss }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPhase((p) => (p + 1) % PHASE_DELAYS.length);
    }, PHASE_DELAYS[phase]);
    return () => clearTimeout(timeoutId);
  }, [phase]);

  const showEnemy = phase <= 2;
  const enemyFlying = phase === 2;
  const showStrong = phase >= 1;
  const showBirds = phase >= 4;
  const showFood = phase !== 6;
  const foodClaimable = phase === 5;

  return (
    <div className="color-modal-backdrop">
      <div
        className="pile-modal tutorial-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to the tutorial"
      >
        <h2>Watch a Turn Play Out</h2>
        <p>
          This is the actual game board, replaying a capture and a Food
          claim on a loop.
        </p>
        <div className="tutorial-intro-board" aria-hidden="true">
          <div className="tutorial-intro-cell tutorial-intro-cell-enemy">
            {showEnemy ? (
              <DemoBirdCard color="#ef4444" sides={2} flying={enemyFlying} />
            ) : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-strong">
            {showStrong ? <DemoBirdCard color="#3b82f6" sides={5} /> : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-food">
            {showFood ? <DemoFoodCard claimable={foodClaimable} /> : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-bird-a">
            {showBirds ? <DemoBirdCard color="#3b82f6" sides={3} /> : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-bird-b">
            {showBirds ? <DemoBirdCard color="#3b82f6" sides={3} /> : null}
          </div>
        </div>
        <button
          type="button"
          className="end-turn-btn"
          onClick={onDismiss}
          autoFocus
        >
          Start Tutorial
        </button>
      </div>
    </div>
  );
}
