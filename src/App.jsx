import { useState } from 'react';

function getInitialTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

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
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>
      <main className="page">
        <h1>Pecking Order</h1>
        <p>Scaffold is up. Gameplay pages go here.</p>
      </main>
    </div>
  );
}
