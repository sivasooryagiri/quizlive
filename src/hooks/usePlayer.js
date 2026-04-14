import { useState } from 'react';
import { joinGame } from '../firebase/db';

const PLAYER_ID_KEY   = 'ql_player_id';
const PLAYER_NAME_KEY = 'ql_player_name';

export default function usePlayer() {
  const [playerId,   setPlayerId]   = useState(() => localStorage.getItem(PLAYER_ID_KEY)   || '');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(PLAYER_NAME_KEY) || '');
  const [joining,    setJoining]    = useState(false);
  const [error,      setError]      = useState('');
  const [suggested,  setSuggested]  = useState(''); // suggested alternative name

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

  return { playerId, playerName, join, leave, joining, error, suggested, setSuggested, setError };
}
