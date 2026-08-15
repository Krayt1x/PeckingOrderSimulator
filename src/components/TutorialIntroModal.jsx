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
const TURN_PHASE_DELAYS = [
  700, 500, 250, 400, 500, 250, 400, 250, 400, 500, 500,
];

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

// The first page's looping replay of a full turn — unchanged from the
// original single-page intro (#115), just extracted so it can sit
// alongside the newer per-rule pages below it (#132).
function TurnDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPhase((p) => (p + 1) % TURN_PHASE_DELAYS.length);
    }, TURN_PHASE_DELAYS[phase]);
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
    <>
      <ul className="tutorial-intro-rules">
        <li>
          When playing a card, if the strength of your card is higher than the
          opposing cards, the opposing cards will fly off the board.
        </li>
        <li>
          If you have more birds adjacent to a piece of food, you can use an
          action to tap the food and then select a bird to fly away with it,
          securing you a victory point.
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
    </>
  );
}

const FOOD_PHASE_DELAYS = [900, 500, 900];

// Second page (#132): a food-derived card's Use Food badge, the same one
// Hand.jsx renders during real play, looping through being tapped and
// granting a bonus action.
function FoodDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPhase((p) => (p + 1) % FOOD_PHASE_DELAYS.length);
    }, FOOD_PHASE_DELAYS[phase]);
    return () => clearTimeout(timeoutId);
  }, [phase]);

  // Phase 0: idle — both cards in hand.
  // Phase 1: the food card's Use Food badge glows, about to be tapped.
  // Phase 2: the food card is discarded (fades out) and a "+1 Action"
  // pop appears above the hand.
  const badgeActive = phase === 1;
  const consumed = phase === 2;

  return (
    <>
      <ul className="tutorial-intro-rules">
        <li>
          A piece of Food you've eaten joins your deck — draw it into your hand
          like any other card.
        </li>
        <li>
          Tap its Use Food badge to discard it for free instead of playing it to
          the board — doing so doesn't cost an action, it grants you an extra
          one.
        </li>
      </ul>
      <div className="tutorial-demo-hand" aria-hidden="true">
        <span
          className="card tutorial-demo-hand-card"
          style={{ '--card-border': '#3b82f6', '--card-bg': '#292524' }}
        >
          <span className="card-face">
            <span className="card-name">Sparrow</span>
          </span>
        </span>
        <span
          className="card tutorial-demo-hand-card card-hand-food"
          style={{
            '--card-border': '#3b82f6',
            '--card-bg': '#eab308',
            opacity: consumed ? 0 : 1,
          }}
        >
          <span className="card-face">
            <span className="card-name">Chip</span>
          </span>
          <span
            className={`use-food-badge${badgeActive ? ' tutorial-demo-badge-active' : ''}`}
          >
            Use Food
          </span>
          {consumed ? (
            <span className="tutorial-intro-score-pop">+1 Action</span>
          ) : null}
        </span>
      </div>
    </>
  );
}

const ROTATE_PHASE_DELAYS = [700, 900, 900];

// Third page (#132): the same rotate arrows Hand.jsx shows on a selected
// card when the Allow Card Rotation ruleset is on, spinning the card's
// face back and forth to show what rotating changes.
function RotateDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPhase((p) => (p + 1) % ROTATE_PHASE_DELAYS.length);
    }, ROTATE_PHASE_DELAYS[phase]);
    return () => clearTimeout(timeoutId);
  }, [phase]);

  // Phase 0: idle at its dealt facing.
  // Phase 1: the clockwise arrow is tapped — the card spins 90°.
  // Phase 2: the anti-clockwise arrow is tapped — the card spins back.
  const rotationDeg = phase === 1 ? 90 : 0;
  const rightActive = phase === 1;
  const leftActive = phase === 2;

  return (
    <>
      <ul className="tutorial-intro-rules">
        <li>
          With Allow Card Rotation on, selecting a card in your hand reveals
          rotate arrows in its top corners.
        </li>
        <li>
          Rotating spins which strength faces which direction before you play it
          — the same four values, just reoriented to face a different opponent.
        </li>
      </ul>
      <div className="tutorial-demo-hand" aria-hidden="true">
        <span
          className="card tutorial-demo-hand-card card-selected"
          style={{ '--card-border': '#3b82f6', '--card-bg': '#292524' }}
        >
          <span
            className="card-face"
            style={{ transform: `rotate(${rotationDeg}deg)` }}
          >
            <span className="card-sides">
              <span className="card-side card-side-top">4</span>
              <span className="card-side card-side-right">1</span>
              <span className="card-side card-side-bottom">2</span>
              <span className="card-side card-side-left">3</span>
            </span>
            <span className="card-name">Sparrow</span>
          </span>
          <span
            className={`rotate-arrow rotate-arrow-left${leftActive ? ' tutorial-demo-arrow-active' : ''}`}
          >
            &#8634;
          </span>
          <span
            className={`rotate-arrow rotate-arrow-right${rightActive ? ' tutorial-demo-arrow-active' : ''}`}
          >
            &#8635;
          </span>
        </span>
      </div>
    </>
  );
}

const DISCARD_PHASE_DELAYS = [900, 600, 900];

// Fourth page (#132): a card on the board sliding into the discard pile,
// illustrating the Allow Discarding from the Board ruleset.
function DiscardDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPhase((p) => (p + 1) % DISCARD_PHASE_DELAYS.length);
    }, DISCARD_PHASE_DELAYS[phase]);
    return () => clearTimeout(timeoutId);
  }, [phase]);

  // Phase 0: the card sits on the board, untouched.
  // Phase 1: dragged partway toward the discard pile — fading as it goes.
  // Phase 2: gone from the board, sitting in the discard pile instead.
  const dragging = phase === 1;
  const discarded = phase === 2;

  return (
    <>
      <ul className="tutorial-intro-rules">
        <li>
          With Allow Discarding from the Board on, you can drag one of your own
          cards on the board straight to your discard pile.
        </li>
        <li>
          It's free — no action spent — handy for clearing space or getting a
          card back into your deck to redraw later.
        </li>
      </ul>
      <div className="tutorial-discard-demo" aria-hidden="true">
        <div className="tutorial-discard-demo-cell">
          {!discarded ? (
            <span
              className={`card card-on-board tutorial-demo-card${dragging ? ' tutorial-demo-card-dragging' : ''}`}
              style={{ '--card-border': '#3b82f6', '--card-bg': '#292524' }}
            >
              <span className="card-face">
                <span className="card-name">Sparrow</span>
              </span>
            </span>
          ) : null}
        </div>
        <span className="tutorial-discard-demo-arrow">&#8594;</span>
        <div className="tutorial-discard-demo-pile">
          {discarded ? (
            <span
              className="card tutorial-demo-hand-card"
              style={{ '--card-border': '#3b82f6', '--card-bg': '#292524' }}
            >
              <span className="card-face">
                <span className="card-name">Sparrow</span>
              </span>
            </span>
          ) : (
            <span>Discard Pile</span>
          )}
        </div>
      </div>
    </>
  );
}

const PAGES = [
  { title: 'Watch a Turn Play Out', Demo: TurnDemo },
  { title: 'How to Use Food', Demo: FoodDemo },
  { title: 'Rotating Cards', Demo: RotateDemo },
  { title: 'Discarding Cards from the Board', Demo: DiscardDemo },
];

export default function TutorialIntroModal({ onDismiss }) {
  const [page, setPage] = useState(0);
  const isLastPage = page === PAGES.length - 1;
  const { title, Demo } = PAGES[page];

  function handleNext() {
    if (isLastPage) {
      onDismiss();
    } else {
      setPage((p) => p + 1);
    }
  }

  return (
    <div className="color-modal-backdrop">
      <div
        className="pile-modal tutorial-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to the tutorial"
      >
        <h2>{title}</h2>
        <Demo />
        <button
          type="button"
          className="end-turn-btn"
          onClick={handleNext}
          autoFocus
        >
          {isLastPage ? 'Start Tutorial' : 'Next Page'}
        </button>
      </div>
    </div>
  );
}
