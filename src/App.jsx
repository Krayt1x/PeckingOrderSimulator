import { useEffect, useState } from 'react';
import PlayPage from './pages/PlayPage.jsx';
import ManagePage from './pages/ManagePage.jsx';
import { DEFAULT_DECKS } from './lib/decks.js';
import { loadJSON, saveJSON } from './lib/storage.js';

const DECKS_STORAGE_KEY = 'peckingorder:decks';

function getInitialTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function getRoute() {
  return window.location.hash === '#manage' ? 'manage' : 'play';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [route, setRoute] = useState(getRoute);
  const [decks, setDecks] = useState(() =>
    loadJSON(DECKS_STORAGE_KEY, DEFAULT_DECKS),
  );

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

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  return (
    <div>
      <header className="topnav">
        <div className="topnav-left">
          <strong>Pecking Order</strong>
          <nav className="topnav-links">
            <a href="#play" className={route === 'play' ? 'active' : ''}>
              Play
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
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>
      {route === 'manage' ? (
        <ManagePage decks={decks} setDecks={setDecks} />
      ) : (
        <PlayPage decks={decks} />
      )}
    </div>
  );
}
