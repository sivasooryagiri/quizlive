import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Particles from '../shared/Particles';
import { subscribeToPlayers } from '../../firebase/db';

// Tie-aware rank (players sorted desc by score already)
const getRank = (players, score) =>
  players.filter((p) => p.score > score).length + 1;

const PODIUM_ORDER = [1, 0, 2]; // visual order: 2nd, 1st, 3rd

const PODIUM_STYLES = [
  {
    height:   'h-40',
    gradient: 'from-slate-300 to-slate-400',
    shadow:   'shadow-slate-300/30',
    ring:     'ring-slate-300/40',
    medal:    '🥈',
    textSize: 'text-base',
  },
  {
    height:   'h-56',
    gradient: 'from-yellow-300 via-amber-400 to-yellow-500',
    shadow:   'shadow-yellow-400/60',
    ring:     'ring-yellow-300/60',
    medal:    '🥇',
    textSize: 'text-lg',
    isWinner: true,
  },
  {
    height:   'h-32',
    gradient: 'from-amber-600 to-orange-600',
    shadow:   'shadow-orange-500/30',
    ring:     'ring-orange-400/40',
    medal:    '🥉',
    textSize: 'text-sm',
  },
];

function PodiumSlot({ player, style, delay }) {
  if (!player) return <div className="w-40" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 100, damping: 16 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Crown + glow for winner */}
      {style.isWinner && (
        <>
          <motion.span
            animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-4xl"
          >
            👑
          </motion.span>
          {/* Glow pulse behind avatar */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute w-20 h-20 rounded-full bg-yellow-400/30 blur-xl pointer-events-none"
          />
        </>
      )}

      {/* Avatar */}
      <motion.div
        animate={
          style.isWinner
            ? { boxShadow: ['0 0 0px rgba(250,204,21,0)', '0 0 30px rgba(250,204,21,0.7)', '0 0 0px rgba(250,204,21,0)'] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
        className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${style.gradient}
                    flex items-center justify-center text-xl font-black text-white
                    ring-2 ${style.ring} shadow-xl ${style.shadow}`}
      >
        {player.name.charAt(0).toUpperCase()}
      </motion.div>

      {/* Podium block */}
      <div
        className={`w-40 ${style.height} bg-gradient-to-t ${style.gradient}
                    rounded-t-2xl flex flex-col items-center justify-end pb-4
                    shadow-xl ${style.shadow}`}
      >
        <span className="text-2xl mb-1">{style.medal}</span>
        <p className={`text-white font-black ${style.textSize} text-center px-2 w-full truncate`}>
          {player.name}
        </p>
        <p className="text-white/70 text-xs font-bold mt-0.5">{player.score} pts</p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPhase({ gameState, questions }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPlayers(setPlayers);
    return unsub;
  }, []);

  const topTen = players.slice(0, 10);
  const isLast = (gameState?.currentQuestionIndex ?? 0) >= (questions.length - 1);

  // Attach display rank to each player (tie-aware)
  const ranked = topTen.map((p) => ({
    ...p,
    displayRank: getRank(players, p.score),
  }));

  return (
    <div className="min-h-screen w-full flex flex-col overflow-hidden relative
                    bg-gradient-to-b from-[#0f0a1e] via-[#160b2e] to-[#0a1628]">

      {/* Falling confetti */}
      {topTen.length > 0 && <Particles count={28} />}

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ opacity: [0.06, 0.16, 0.06] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px]
                     bg-brand-600 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 flex flex-col h-full p-6 gap-4">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-6xl font-black gradient-text tracking-tight leading-none">
            🏆 Leaderboard
          </h1>
          {isLast && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-brand-300 text-xl mt-2 font-semibold"
            >
              Final Results!
            </motion.p>
          )}
        </motion.div>

        {/* Podium — top 3 */}
        {topTen.length > 0 && (
          <div className="flex justify-center items-end gap-4 relative">
            {PODIUM_ORDER.map((rankIdx, vi) => (
              <PodiumSlot
                key={rankIdx}
                player={topTen[rankIdx]}
                style={PODIUM_STYLES[vi]}
                delay={0.1 + vi * 0.15}
              />
            ))}
          </div>
        )}

        {/* Ranks 4–10 */}
        {ranked.length > 3 && (
          <div className="grid grid-cols-2 gap-2 max-w-4xl mx-auto w-full">
            <AnimatePresence>
              {ranked.slice(3).map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.07, type: 'spring', stiffness: 160 }}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-2.5"
                >
                  {/* Rank badge */}
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center
                                  justify-center shrink-0">
                    <span className="text-white/50 font-black text-xs">
                      {p.displayRank === i + 4 ? `#${p.displayRank}` : `#${p.displayRank}`}
                    </span>
                  </div>

                  {/* Mini avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500
                                  to-purple-600 flex items-center justify-center text-xs
                                  font-black text-white shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  <span className="flex-1 text-white font-bold truncate text-sm">{p.name}</span>

                  <span className="text-brand-300 font-black text-sm tabular-nums shrink-0">
                    {p.score}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {players.length === 0 && (
          <p className="text-center text-white/30 text-lg mt-4">No players yet</p>
        )}
      </div>
    </div>
  );
}
