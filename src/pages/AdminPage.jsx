import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import useGameState    from '../hooks/useGameState';
import { subscribeToQuestions, subscribeToPlayers, saveSession } from '../firebase/db';
import LoginScreen     from '../components/admin/LoginScreen';
import QuestionEditor  from '../components/admin/QuestionEditor';
import GameControl     from '../components/admin/GameControl';
import HostControl     from '../components/admin/HostControl';
import SessionHistory  from '../components/admin/SessionHistory';
import LoadingSpinner  from '../components/shared/LoadingSpinner';

const TABS = [
  { id: 'questions', label: '📝 Questions' },
  { id: 'game',      label: '🎮 Game Control' },
  { id: 'host',      label: '🖥 Host / QR' },
  { id: 'history',   label: '📋 History' },
];

function AboutCorner() {
  return (
    <a
      href="/about"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 group"
    >
      <img
        src="/builder.jpg"
        alt="SivaSoorya G.R"
        className="w-7 h-7 rounded-full object-cover opacity-20 group-hover:opacity-50 transition-opacity"
      />
      <span className="text-white/20 group-hover:text-white/50 transition-colors text-xs">
        About
      </span>
    </a>
  );
}

export default function AdminPage() {
  const [authed,      setAuthed]      = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab,         setTab]         = useState('game');
  const [questions,   setQuestions]   = useState([]);
  const [players,     setPlayers]     = useState([]);
  const { gameState, loading }        = useGameState();
  const sessionSaving                 = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authed) return;
    const u1 = subscribeToQuestions(setQuestions);
    const u2 = subscribeToPlayers(setPlayers);
    return () => { u1(); u2(); };
  }, [authed]);

  // Save session when quiz ends — admin is authenticated so this write is allowed.
  useEffect(() => {
    if (!authed || !gameState || gameState.phase !== 'ended') return;
    if (gameState.sessionSaved || sessionSaving.current) return;
    sessionSaving.current = true;
    saveSession(gameState).catch(console.error);
  }, [authed, gameState?.phase, gameState?.sessionSaved]);

  // Reset saving guard when a new quiz starts.
  useEffect(() => {
    if (gameState?.phase === 'waiting') sessionSaving.current = false;
  }, [gameState?.phase]);

  if (authLoading) return <LoadingSpinner />;
  if (!authed)     return <LoginScreen onLogin={() => {}} />;
  if (loading)     return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0a1628]">
      {/* Header */}
      <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="QuizLive" className="w-8 h-8" />
          <div>
            <h1 className="font-black text-white leading-none">Admin Panel</h1>
            <p className="text-brand-300 text-xs">{gameState?.title ?? 'QuizLive'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass rounded-xl px-3 py-1.5 text-xs text-white/60">
            {players.length} player{players.length !== 1 ? 's' : ''} · {questions.length} Q
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-[65px] z-30 glass border-b border-white/10 px-4 flex gap-1 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${tab === t.id
                ? 'bg-brand-600 text-white shadow-lg'
                : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <main className="p-4 max-w-2xl mx-auto pb-16">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'questions' && (
            <QuestionEditor questions={questions} />
          )}
          {tab === 'game' && (
            <GameControl gameState={gameState} questions={questions} />
          )}
          {tab === 'host' && (
            <HostControl gameState={gameState} />
          )}
          {tab === 'history' && (
            <SessionHistory />
          )}
        </motion.div>
      </main>

      <AboutCorner />
    </div>
  );
}
