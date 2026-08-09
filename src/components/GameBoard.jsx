export default function GameBoard({ cells, selectedCard, onCellClick }) {
  return (
    <div className="board" role="grid" aria-label="Game board">
      {cells.map((card, index) => (
        <button
          key={index}
          type="button"
          role="gridcell"
          className={`board-cell${card ? ' board-cell-filled' : ''}${
            !card && selectedCard ? ' board-cell-droppable' : ''
          }`}
          onClick={() => onCellClick(index)}
          disabled={!card && !selectedCard}
        >
          {card ? (
            <span
              className="card card-on-board"
              style={{ '--card-color': card.color }}
            >
              <span className="card-emoji">{card.emoji}</span>
              <span className="card-name">{card.name}</span>
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
