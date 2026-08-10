const SIDE_KEYS = ['top', 'right', 'bottom', 'left'];

export default function Hand({
  cards,
  selectedCardId,
  onSelectCard,
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
          style={{ '--card-color': card.color }}
          onClick={() => onSelectCard(card.id)}
        >
          {card.sides ? (
            <span className="card-sides">
              {SIDE_KEYS.map((side) => (
                <span key={side} className={`card-side card-side-${side}`}>
                  {card.sides[side]}
                </span>
              ))}
            </span>
          ) : null}
          <span className="card-emoji">{card.emoji}</span>
          <span className="card-name">{card.name}</span>
        </button>
      ))}
      {cards.length === 0 ? <p className="hand-empty">Hand is empty</p> : null}
    </div>
  );
}
