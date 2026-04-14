import { useState, useEffect } from 'react';
import { joinGame, getPlayer } from '../firebase/db';

const PLAYER_ID_KEY   = 'ql_player_id';
const PLAYER_NAME_KEY = 'ql_player_name';

export default function usePlayer() {
  const [playerId,   setPlayerId]   = useState(() => localStorage.getItem(PLAYER_ID_KEY)   || '');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(PLAYER_NAME_KEY) || '');
  const [joining,    setJoining]    = useState(false);
  const [error,      setError]      = useState('');
  const [suggested,  setSuggested]  = useState('');
  const [verified,   setVerified]   = useState(false); // true once Firestore check done

  // On load: verify stored playerId still exists in Firestore.
  // If game was reset, the doc is deleted — clear localStorage and re-show JoinScreen.
  useEffect(() => {
    const storedId = localStorage.getItem(PLAYER_ID_KEY);
    if (!storedId) {
      setVerified(true);
      return;
    }
    getPlayer(storedId).then((player) => {
      if (!player) {
        // Doc deleted (game was reset) — force re-join
        localStorage.removeItem(PLAYER_ID_KEY);
        localStorage.removeItem(PLAYER_NAME_KEY);
        setPlayerId('');
        setPlayerName('');
      }
      setVerified(true);
    }).catch(() => setVerified(true));
  }, []);

  const join = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoining(true);
    setError('');
    setSuggested('');
    try {
      const id = await joinGame(trimmed);
      localStorage.setItem(PLAYER_ID_KEY,   id);
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
      setPlayerId(id);
      setPlayerName(trimmed);
    } catch (e) {
      if (e.message === 'NAME_TAKEN') {
        setSuggested(e.suggested);
        setError('name_taken');
      } else {
        setError('Could not join. Try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const leave = () => {
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(PLAYER_NAME_KEY);
    setPlayerId('');
    setPlayerName('');
  };

  return {
    playerId,
    playerName,
    join,
    leave,
    joining,
    error,
    suggested,
    setSuggested,
    setError,
    verified,   // PlayerPage waits for this before rendering
  };
}
