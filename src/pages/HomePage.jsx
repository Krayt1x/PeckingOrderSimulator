export default function HomePage() {
  return (
    <main className="page home">
      <h1>Pecking Order</h1>
      <p>
        A card battle game about establishing dominance, one square at a time.
      </p>
      <div className="home-actions">
        <a href="#new-game" className="end-turn-btn">
          Play
        </a>
        <a href="#manage" className="board-recenter">
          Manage decks
        </a>
      </div>
    </main>
  );
}
