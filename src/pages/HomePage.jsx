function formatReleaseDate(iso) {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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
      <p className="home-version">
        v{__APP_VERSION__} &middot; released{' '}
        {formatReleaseDate(__COMMIT_DATE__)}
      </p>
    </main>
  );
}
