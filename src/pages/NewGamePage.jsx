import { useState } from 'react';

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;

function defaultPlayer(index, decks) {
  return {
    id: `player-${index}`,
    name: `Player ${index + 1}`,
    isCPU: false,
    deckId: decks[index % decks.length]?.id,
  };
}

export default function NewGamePage({ decks, food, onStart }) {
  const [players, setPlayers] = useState(() =>
    Array.from({ length: 2 }, (_, i) => defaultPlayer(i, decks)),
  );

  function handleNumPlayersChange(value) {
    const count = Math.min(
      MAX_PLAYERS,
      Math.max(MIN_PLAYERS, Number(value) || MIN_PLAYERS),
    );
    setPlayers((current) => {
      const next = current.slice(0, count);
      while (next.length < count) {
        next.push(defaultPlayer(next.length, decks));
      }
      return next;
    });
  }

  function updatePlayer(index, patch) {
    setPlayers((current) =>
      current.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function handleStart() {
    onStart({ players, foodId: food.id });
  }

  return (
    <main className="page">
      <h1>New Game</h1>
      <p>Set up who&rsquo;s playing before heading to the board.</p>

      <label className="manage-field">
        Number of players
        <input
          type="number"
          min={MIN_PLAYERS}
          max={MAX_PLAYERS}
          value={players.length}
          onChange={(event) => handleNumPlayersChange(event.target.value)}
        />
      </label>

      <table className="manage-cards new-game-players">
        <thead>
          <tr>
            <th>Player</th>
            <th>CPU</th>
            <th>Deck</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => (
            <tr key={player.id}>
              <td>
                <input
                  type="text"
                  value={player.name}
                  onChange={(event) =>
                    updatePlayer(i, { name: event.target.value })
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={player.isCPU}
                  aria-label={`${player.name} is CPU`}
                  onChange={(event) =>
                    updatePlayer(i, { isCPU: event.target.checked })
                  }
                />
              </td>
              <td>
                <select
                  value={player.deckId}
                  aria-label={`${player.name} deck`}
                  onChange={(event) =>
                    updatePlayer(i, { deckId: event.target.value })
                  }
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="new-game-food">
        Food: <strong>{food.name}</strong> (edit in <a href="#manage">Manage</a>
        )
      </p>

      <button type="button" className="end-turn-btn" onClick={handleStart}>
        Start Game
      </button>
    </main>
  );
}
