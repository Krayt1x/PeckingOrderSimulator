import { baseSides } from '../lib/rotation.js';
import PixelBirdSprite from './PixelBirdSprite.jsx';

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];

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
            className={`card${selectedCardId === card.id ? ' card-selected' : ''}`}
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
              {faceSides ? (
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
    </div>
  );
}
