import { useEffect, useState } from 'react';

// How long each phase of the looping demo stays on screen before advancing
// to the next one, in ms. Mirrors a real turn: Food starts evenly
// contested, blue plays a card beyond the bottom red bird — it lands, then
// a beat later the weaker bird it captured is removed from the board —
// tipping the majority. Red plays a card beside blue's new one the same
// way, capturing it right back — but since that skirmish happens one cell
// further out, it never touches Food's own neighbors, so blue's majority
// holds. Blue then taps Food — Food and every bird eligible to claim it
// get a yellow border — and a beat later one of them takes Food to score.
// Uses the game's own card markup, so the preview looks and moves exactly
// like play does.
const PHASE_DELAYS = [700, 500, 250, 400, 500, 250, 400, 250, 400, 500, 500];

function DemoBirdCard({ color, sides, entering, flying, selected }) {
  const modifier = flying
    ? ' tutorial-demo-card-flying'
    : entering
      ? ' tutorial-demo-card-entering'
      : '';
  return (
    <span
      className={`card card-on-board tutorial-demo-card${modifier}${selected ? ' tutorial-demo-card-selected' : ''}`}
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

function DemoFoodCard({ selected }) {
  return (
    <span
      className={`card card-on-board card-food tutorial-demo-card${selected ? ' tutorial-demo-card-selected' : ''}`}
      style={{ '--card-color': '#eab308' }}
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

  // Phase 0: Food is evenly contested — one bird on each side.
  // Phase 1: blue plays a 4-strength card in the empty cell just beyond
  // the bottom bird, and it lands.
  // Phase 2: a 250ms beat, card settled, nothing removed yet.
  // Phase 3: the weaker bird it beat flies off the board — its cell
  // (adjacent to Food) is left empty rather than replaced, so the majority
  // now favors blue.
  // Phase 4: red plays a 5-strength card beside blue's new one, and lands.
  // Phase 5: another 250ms beat before blue's card is removed.
  // Phase 6: blue's card flies off, captured right back — but that cell
  // was never adjacent to Food, so this skirmish doesn't touch the
  // majority, which still favors blue.
  // Phase 7: Food is tapped and gets a yellow border.
  // Phase 8: a 250ms beat later, every bird eligible to claim it (both
  // blue birds) gets a yellow border too.
  // Phase 9: one of them takes Food, scoring a point.
  // Phase 10: a brief empty pause before the scene resets and loops.
  const showBottomOld = phase <= 3;
  const bottomOldFlying = phase === 3;
  const showPlay = phase >= 1 && phase <= 6;
  const playFlying = phase === 6;
  const showPlayLeft = phase >= 4;
  const showLeft = phase <= 8;
  const showFood = phase <= 8;
  const foodSelected = phase >= 7 && phase <= 8;
  const birdsSelected = phase === 8;
  const showScorePop = phase === 9;

  return (
    <div className="color-modal-backdrop">
      <div
        className="pile-modal tutorial-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to the tutorial"
      >
        <h2>Watch a Turn Play Out</h2>
        <ul className="tutorial-intro-rules">
          <li>
            When playing a card, if the strength of your card is higher than
            the opposing cards, the opposing cards will fly off the board.
          </li>
          <li>
            If you have more birds adjacent to a piece of food, you can use
            an action to tap the food and then select a bird to fly away
            with it, securing you a victory point.
          </li>
        </ul>
        <div className="tutorial-intro-board" aria-hidden="true">
          <div className="tutorial-intro-cell tutorial-intro-cell-top">
            <DemoBirdCard color="#ef4444" sides={2} />
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-left">
            {showLeft ? (
              <DemoBirdCard color="#3b82f6" sides={3} selected={birdsSelected} />
            ) : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-food">
            {showFood ? <DemoFoodCard selected={foodSelected} /> : null}
            {showScorePop ? (
              <span className="tutorial-intro-score-pop">+1</span>
            ) : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-right">
            <DemoBirdCard color="#3b82f6" sides={3} selected={birdsSelected} />
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-bottom">
            {showBottomOld ? (
              <DemoBirdCard color="#ef4444" sides={3} flying={bottomOldFlying} />
            ) : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-play">
            {showPlay ? (
              <DemoBirdCard
                color="#3b82f6"
                sides={4}
                entering={phase === 1}
                flying={playFlying}
              />
            ) : null}
          </div>
          <div className="tutorial-intro-cell tutorial-intro-cell-play-left">
            {showPlayLeft ? (
              <DemoBirdCard color="#ef4444" sides={5} entering={phase === 4} />
            ) : null}
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
