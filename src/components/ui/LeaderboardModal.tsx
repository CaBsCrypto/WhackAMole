import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Users, Globe, Calendar, Search, Swords, X, RotateCcw, Loader2 } from 'lucide-react';
import { LeaderboardEntry, UserProfile } from '../../types';
import { storageService } from '../../services/storage';
import { getLeaderboard, SpicyCrustLeaderboardEntry } from '../../services/spicycrust-api';
import { sfx } from '../../services/sfx';

interface LeaderboardModalProps {
  profile: UserProfile;
  onClose: () => void;
  onPlayAgain?: () => void;
  onChallengePlayer?: (playerName: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  profile,
  onClose,
  onPlayAgain,
  onChallengePlayer,
}) => {
  const [tab, setTab] = useState<'spicycrust' | 'local_global' | 'weekly'>('spicycrust');
  const [spicyEntries, setSpicyEntries] = useState<SpicyCrustLeaderboardEntry[]>([]);
  const [localEntries, setLocalEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'spicycrust') {
      getLeaderboard(20)
        .then((data) => {
          if (data && data.length > 0) {
            setSpicyEntries(data);
          } else {
            // Fallback default sample data if API is starting or clean
            setSpicyEntries([
              { id: '1', rank: 1, nickname: 'ThunderHammer', score: 18450, created_at: new Date().toISOString() },
              { id: '2', rank: 2, nickname: 'CyberStriker', score: 16200, created_at: new Date().toISOString() },
              { id: '3', rank: 3, nickname: 'RagnarMole', score: 14800, created_at: new Date(Date.now() - 86400000).toISOString() },
              { id: '4', rank: 4, nickname: 'ShadowWhack', score: 13500, created_at: new Date(Date.now() - 172800000).toISOString() },
              { id: '5', rank: 5, nickname: 'PixelQueen', score: 11900, created_at: new Date(Date.now() - 259200000).toISOString() },
            ]);
          }
        })
        .catch(() => {
          setSpicyEntries([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      const storageTab = tab === 'weekly' ? 'weekly' : 'global';
      storageService
        .fetchLeaderboard(storageTab)
        .then((data) => {
          if (data && data.length > 0) {
            setLocalEntries(data);
          } else {
            setLocalEntries([
              { rank: 1, userId: 'u1', name: 'ThunderHammer', avatar: { skinTone: '#fbbf24', headwear: 'crown', glasses: 'laser', expression: 'smug', outfitColor: '#e11d48', badge: 'Grandmaster', title: 'Mole Deity' }, score: 18450, combo: 42, wins: 88, level: 32, date: 'Today' },
              { rank: 2, userId: 'u2', name: 'CyberStriker', avatar: { skinTone: '#38bdf8', headwear: 'robot', glasses: 'vr_goggles', expression: 'fierce', outfitColor: '#06b6d4', badge: 'Champion', title: 'Lightning Reflexes' }, score: 16200, combo: 36, wins: 71, level: 28, date: 'Today' },
              { rank: 3, userId: 'u3', name: 'RagnarMole', avatar: { skinTone: '#fbcfe8', headwear: 'viking', glasses: 'monocle', expression: 'laugh', outfitColor: '#854d0e', badge: 'Diamond', title: 'Berserker' }, score: 14800, combo: 31, wins: 59, level: 24, date: 'Yesterday' },
            ]);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tab]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Reciente';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Reciente';
    }
  };

  const filteredSpicyEntries = spicyEntries.filter((e) =>
    (e.nickname || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLocalEntries = localEntries.filter((e) =>
    (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-wide flex items-center gap-2">
                <span>Taberna SpicyCrust</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono uppercase font-bold">
                  Official API
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-body font-medium">Ranking mundial oficial y registros de la taberna</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-950/90 p-1.5 border-b border-white/10 gap-1.5">
          <button
            onClick={() => {
              sfx.playButtonClick();
              setTab('spicycrust');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'spicycrust'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" /> SpicyCrust Live
          </button>
          <button
            onClick={() => {
              sfx.playButtonClick();
              setTab('local_global');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'local_global'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Salón de Honor
          </button>
          <button
            onClick={() => {
              sfx.playButtonClick();
              setTab('weekly');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'weekly'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" /> Copa Semanal
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-950/50 border-b border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar jugador por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition font-medium"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 px-6 py-2 bg-slate-950/80 border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
          <div className="col-span-2 sm:col-span-1 text-center">#</div>
          <div className="col-span-6 sm:col-span-6 text-left">Jugador</div>
          <div className="col-span-4 sm:col-span-3 text-right">Puntaje</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Fecha</div>
        </div>

        {/* Leaderboard Rows */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-1.5 bg-slate-900/50">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              <span>Cargando leaderboard de SpicyCrust API...</span>
            </div>
          ) : tab === 'spicycrust' ? (
            filteredSpicyEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">No hay puntajes registrados en esta temporada aún. ¡Sé el primero!</div>
            ) : (
              filteredSpicyEntries.map((entry, index) => {
                const rank = entry.rank || index + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;
                const isMe = (entry.nickname || '').toLowerCase() === (profile.name || '').toLowerCase();

                return (
                  <div
                    key={entry.id || index}
                    className={`grid grid-cols-12 items-center px-4 py-3 rounded-2xl border transition ${
                      isMe
                        ? 'bg-slate-800/90 border-orange-500 shadow-md'
                        : isTop1
                        ? 'bg-amber-950/30 border-yellow-500/50 shadow-sm'
                        : isTop2
                        ? 'bg-slate-800/60 border-slate-400/40 shadow-sm'
                        : isTop3
                        ? 'bg-orange-950/20 border-amber-700/40 shadow-sm'
                        : 'bg-slate-950/40 border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-center font-mono">
                      {isTop1 ? (
                        <span className="text-xl">🥇</span>
                      ) : isTop2 ? (
                        <span className="text-xl">🥈</span>
                      ) : isTop3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">#{rank}</span>
                      )}
                    </div>

                    {/* Nickname */}
                    <div className="col-span-6 sm:col-span-6 flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-sm shrink-0">
                        🍕
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs sm:text-sm font-display font-bold text-white truncate">
                          {entry.nickname || 'Anónimo'}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-orange-500 text-slate-950 px-1 py-0.2 rounded font-black tracking-wider shrink-0">
                            TÚ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-4 sm:col-span-3 text-right">
                      <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                        isTop1 ? 'text-yellow-300' : isTop2 ? 'text-slate-200' : isTop3 ? 'text-amber-400' : 'text-yellow-400'
                      }`}>
                        {(entry.score || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="hidden sm:block sm:col-span-2 text-right font-mono text-[11px] text-slate-400 truncate">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            filteredLocalEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No hay registros locales.</div>
            ) : (
              filteredLocalEntries.map((entry, index) => {
                const rank = index + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;
                const isMe = entry.userId === profile.id || entry.name === profile.name;

                return (
                  <div
                    key={entry.userId || index}
                    className={`grid grid-cols-12 items-center px-4 py-3 rounded-2xl border transition ${
                      isMe
                        ? 'bg-slate-800/90 border-orange-500 shadow-md'
                        : isTop1
                        ? 'bg-amber-950/30 border-yellow-500/50 shadow-sm'
                        : isTop2
                        ? 'bg-slate-800/60 border-slate-400/40 shadow-sm'
                        : isTop3
                        ? 'bg-orange-950/20 border-amber-700/40 shadow-sm'
                        : 'bg-slate-950/40 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-center font-mono">
                      {isTop1 ? (
                        <span className="text-xl">🥇</span>
                      ) : isTop2 ? (
                        <span className="text-xl">🥈</span>
                      ) : isTop3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">#{rank}</span>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-6 flex items-center gap-2 min-w-0 pr-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border border-white/20"
                        style={{ backgroundColor: entry.avatar?.outfitColor || '#3b82f6' }}
                      >
                        {entry.avatar?.headwear === 'crown' ? '👑' : entry.avatar?.headwear === 'viking' ? '🪓' : '🐹'}
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs sm:text-sm font-display font-bold text-white truncate">{entry.name}</span>
                        {isMe && (
                          <span className="text-[9px] bg-orange-500 text-slate-950 px-1 py-0.2 rounded font-black tracking-wider shrink-0">
                            TÚ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-3 text-right">
                      <span className="text-sm sm:text-base font-black text-yellow-400 font-mono tracking-tight">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>

                    <div className="hidden sm:block sm:col-span-2 text-right font-mono text-[11px] text-slate-400 truncate">
                      {entry.date || 'Hoy'}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer with "Volver a Jugar" Button */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/90 flex gap-2.5">
          {onPlayAgain && (
            <button
              onClick={() => {
                sfx.playButtonClick();
                onClose();
                onPlayAgain();
              }}
              className="flex-1 py-3 bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-500 hover:to-red-400 text-white font-display font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Volver a Jugar</span>
            </button>
          )}

          <button
            onClick={() => {
              sfx.playButtonClick();
              onClose();
            }}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-2xl transition cursor-pointer border border-white/10"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
