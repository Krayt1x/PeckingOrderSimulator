export default function Hand({ cards, selectedCardId, onSelectCard }) {
  return (
    <div className="hand" role="list" aria-label="Your hand">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={`card${selectedCardId === card.id ? ' card-selected' : ''}`}
          style={{ '--card-color': card.color }}
          onClick={() => onSelectCard(card.id)}
        >
          <span className="card-emoji">{card.emoji}</span>
          <span className="card-name">{card.name}</span>
        </button>
      ))}
      {cards.length === 0 ? <p className="hand-empty">Hand is empty</p> : null}
    </div>
  );
}
