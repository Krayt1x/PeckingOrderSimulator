import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import NewGamePage from './pages/NewGamePage.jsx';
import PlayPage from './pages/PlayPage.jsx';
import ManagePage from './pages/ManagePage.jsx';
import { DEFAULT_DECKS } from './lib/decks.js';
import { DEFAULT_FOOD } from './lib/food.js';
import { loadJSON, saveJSON } from './lib/storage.js';

// Bump the trailing version whenever DEFAULT_DECKS/DEFAULT_FOOD's shape
// changes meaningfully (renames, schema changes) — otherwise a browser
// with older cached data keeps seeing stale names, or worse, data that no
// longer matches the current schema (e.g. Food without `shapes`).
const DECKS_STORAGE_KEY = 'peckingorder:decks:v6';
const FOOD_STORAGE_KEY = 'peckingorder:food:v3';

function getInitialTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function getRoute() {
  const hash = window.location.hash;
  if (hash === '#new-game') return 'new-game';
  if (hash === '#play') return 'play';
  if (hash === '#manage') return 'manage';
  return 'home';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [route, setRoute] = useState(getRoute);
  const [decks, setDecks] = useState(() =>
    loadJSON(DECKS_STORAGE_KEY, DEFAULT_DECKS),
  );
  const [food, setFood] = useState(() =>
    loadJSON(FOOD_STORAGE_KEY, DEFAULT_FOOD),
  );
  const [gameSetup, setGameSetup] = useState(null);
  // Bumped on every new game (including Play Again) so PlayPage remounts
  // and re-runs its lazy initial state — a fresh shuffle/board — instead
  // of reusing whatever was left over from the game that just ended.
  const [gameId, setGameId] = useState(0);

  useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    saveJSON(DECKS_STORAGE_KEY, decks);
  }, [decks]);

  useEffect(() => {
    saveJSON(FOOD_STORAGE_KEY, food);
  }, [food]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  function startGame(setup) {
    setGameSetup(setup);
    setGameId((id) => id + 1);
    window.location.hash = '#play';
    setRoute('play');
  }

  // Play Again reuses the exact same players/ruleset/food selection as
  // the game that just ended — only the gameId changes, to remount
  // PlayPage into a fresh game rather than reset its state in place.
  function playAgain() {
    setGameId((id) => id + 1);
  }

  // The active game's chosen skin themes the nav bar too, not just the
  // board and cards — but only while actually on the play screen (#99),
  // never on Home/New Game/Manage.
  const activeSkin =
    route === 'play' && gameSetup?.ruleset?.allowCustomSkins
      ? gameSetup.ruleset.skin
      : 'alpha';

  function renderRoute() {
    if (route === 'manage') {
      return (
        <ManagePage
          decks={decks}
          setDecks={setDecks}
          food={food}
          setFood={setFood}
        />
      );
    }
    if (route === 'new-game') {
      return <NewGamePage decks={decks} food={food} onStart={startGame} />;
    }
    if (route === 'play' && gameSetup) {
      return (
        <PlayPage
          key={gameId}
          players={gameSetup.players}
          decks={decks}
          food={food}
          foodShapeIds={gameSetup.foodShapeIds}
          ruleset={gameSetup.ruleset}
          onPlayAgain={playAgain}
        />
      );
    }
    return <HomePage />;
  }

  return (
    <div data-skin={activeSkin}>
      <header className="topnav">
        <div className="topnav-left">
          <a href="#" className="topnav-brand">
            <strong>Pecking Order</strong>
          </a>
          <nav className="topnav-links">
            <a
              href="#new-game"
              className={route === 'new-game' ? 'active' : ''}
            >
              New Game
            </a>
            <a href="#manage" className={route === 'manage' ? 'active' : ''}>
              Manage
            </a>
          </nav>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>
      {renderRoute()}
    </div>
  );
}
