import { baseSides } from '../lib/rotation.js';
import PixelBirdSprite from './PixelBirdSprite.jsx';
import { HAND_SIZE } from '../lib/decks.js';

const SIDE_KEYS = ['top', 'left', 'right', 'bottom'];

export default function Hand({
  cards,
  selectedCardId,
  onSelectCard,
  onUseFood,
  onRotateCard,
  allowRotation = false,
  playerColor,
  disabled = false,
  useFoodDisabled = false,
}) {
  return (
    <div
      className={`hand${disabled ? ' hand-disabled' : ''}`}
      role="list"
      aria-label="Your hand"
    >
      {cards.map((card) => {
        // A Food-derived card's Use Food badge stays clickable even when
        // the rest of the hand is disabled (e.g. no actions left) — using
        // it is always free, so the card itself isn't fully disabled.
        const cardDisabled = disabled && !(card.fromFood && !useFoodDisabled);
        const rotationDeg = card.rotation ?? 0;
        // The face renders the card's original (rotation-0) side values in
        // fixed slots and lets a single CSS transform turn the whole face —
        // name and numbers together — rather than re-shuffling the numbers
        // between slots a second time on top of the data rotation.
        const faceSides = card.sides
          ? baseSides(card.sides, rotationDeg)
          : null;
        return (
          <button
            key={card.id}
            type="button"
            disabled={cardDisabled}
            className={`card${card.fromFood ? ' card-hand-food' : ''}${selectedCardId === card.id ? ' card-selected' : ''}`}
            style={{
              '--card-border': playerColor,
              '--card-bg': card.deckColor,
            }}
            onClick={() => onSelectCard(card.id)}
          >
            <span
              className="card-face"
              style={
                rotationDeg
                  ? { transform: `rotate(${rotationDeg}deg)` }
                  : undefined
              }
            >
              {faceSides ? (
                <span className="card-sides">
                  {SIDE_KEYS.map((side) => (
                    <span key={side} className={`card-side card-side-${side}`}>
                      {faceSides[side]}
                    </span>
                  ))}
                </span>
              ) : null}
              {faceSides && !card.fromFood ? (
                <PixelBirdSprite
                  typeId={card.typeId}
                  name={card.name}
                  size={40}
                />
              ) : null}
              <span className="card-name">{card.name}</span>
            </span>
            {card.fromFood ? (
              <span
                role="button"
                tabIndex={0}
                className="use-food-badge"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!useFoodDisabled) onUseFood(card.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (!useFoodDisabled) onUseFood(card.id);
                }}
              >
                Use Food
              </span>
            ) : null}
            {allowRotation && selectedCardId === card.id ? (
              <>
                <span
                  role="button"
                  tabIndex={0}
                  className="rotate-arrow rotate-arrow-left"
                  aria-label="Rotate anti-clockwise"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!disabled) onRotateCard(card.id, 'ccw');
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (!disabled) onRotateCard(card.id, 'ccw');
                  }}
                >
                  &#8634;
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className="rotate-arrow rotate-arrow-right"
                  aria-label="Rotate clockwise"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!disabled) onRotateCard(card.id, 'cw');
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (!disabled) onRotateCard(card.id, 'cw');
                  }}
                >
                  &#8635;
                </span>
              </>
            ) : null}
          </button>
        );
      })}
      {cards.length === 0 ? <p className="hand-empty">Hand is empty</p> : null}
      {/* Invisible spacer slots for whatever's short of a full hand right
          now — between playing a card and refilling back to HAND_SIZE.
          Without them, the real cards' own flex-basis: 0 sizing redivides
          the row's width among however many are actually left, growing
          each one — which not only looks like a jump on its own, but also
          throws the piles (sized off a hand card's width, elsewhere in
          index.css) out of sync with them, since the piles have no way to
          know a card just got wider. Reserving the slot keeps each real
          card's width a function of the row's own width alone, matching
          what the piles already assume (#128 follow-up). */}
      {cards.length < HAND_SIZE
        ? Array.from({ length: HAND_SIZE - cards.length }).map((_, i) => (
            <button
              key={`placeholder-${i}`}
              type="button"
              tabIndex={-1}
              disabled
              className="card card-placeholder"
              aria-hidden="true"
            />
          ))
        : null}
    </div>
  );
}
