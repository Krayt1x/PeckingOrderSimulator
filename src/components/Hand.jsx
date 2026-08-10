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
}) {
  return (
    <div
      className={`hand${disabled ? ' hand-disabled' : ''}`}
      role="list"
      aria-label="Your hand"
    >
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          disabled={disabled}
          className={`card${selectedCardId === card.id ? ' card-selected' : ''}`}
          style={{ '--card-border': playerColor, '--card-bg': card.deckColor }}
          onClick={() => onSelectCard(card.id)}
        >
          {card.sides ? (
            <>
              <span className="card-index">{card.name}</span>
              <span className="card-sides">
                {SIDE_KEYS.map((side) => (
                  <span key={side} className={`card-side card-side-${side}`}>
                    {card.sides[side]}
                  </span>
                ))}
              </span>
            </>
          ) : null}
          <span className="card-emoji">{card.emoji}</span>
          {card.fromFood ? (
            <span
              role="button"
              tabIndex={0}
              className="use-food-badge"
              onClick={(event) => {
                event.stopPropagation();
                if (!disabled) onUseFood(card.id);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                event.stopPropagation();
                if (!disabled) onUseFood(card.id);
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
              <span
                role="button"
                tabIndex={0}
                className="rotate-arrow rotate-arrow-right"
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
            </>
          ) : null}
        </button>
      ))}
      {cards.length === 0 ? <p className="hand-empty">Hand is empty</p> : null}
    </div>
  );
}
