import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Users, Globe, Calendar, Search, Swords } from 'lucide-react';
import { LeaderboardEntry, UserProfile } from '../../types';
import { storageService } from '../../services/storage';
import { sfx } from '../../services/sfx';

interface LeaderboardModalProps {
  profile: UserProfile;
  onClose: () => void;
  onChallengePlayer?: (playerName: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ profile, onClose, onChallengePlayer }) => {
  const [tab, setTab] = useState<'global' | 'weekly' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    storageService.fetchLeaderboard(tab).then((data) => {
      if (data && data.length > 0) {
        setEntries(data);
      } else {
        // Fallback default list if offline
        setEntries([
          { rank: 1, userId: 'u1', name: 'ThunderHammer', avatar: { skinTone: '#fbbf24', headwear: 'crown', glasses: 'laser', expression: 'smug', outfitColor: '#e11d48', badge: 'Grandmaster', title: 'Mole Deity' }, score: 18450, combo: 42, wins: 88, level: 32, date: 'Today' },
          { rank: 2, userId: 'u2', name: 'CyberStriker', avatar: { skinTone: '#38bdf8', headwear: 'robot', glasses: 'vr_goggles', expression: 'fierce', outfitColor: '#06b6d4', badge: 'Champion', title: 'Lightning Reflexes' }, score: 16200, combo: 36, wins: 71, level: 28, date: 'Today' },
          { rank: 3, userId: 'u3', name: 'RagnarMole', avatar: { skinTone: '#fbcfe8', headwear: 'viking', glasses: 'monocle', expression: 'laugh', outfitColor: '#854d0e', badge: 'Diamond', title: 'Berserker' }, score: 14800, combo: 31, wins: 59, level: 24, date: 'Yesterday' },
          { rank: 4, userId: 'u4', name: 'ShadowWhack', avatar: { skinTone: '#e2e8f0', headwear: 'ninja_band', glasses: 'aviators', expression: 'cool', outfitColor: '#1e293b', badge: 'Platinum', title: 'Ghost Whacker' }, score: 13500, combo: 28, wins: 45, level: 20, date: '2 days ago' },
          { rank: 5, userId: 'u5', name: 'PixelQueen', avatar: { skinTone: '#f472b6', headwear: 'cat_ears', glasses: 'heart', expression: 'happy', outfitColor: '#ec4899', badge: 'Gold', title: 'Arcade Star' }, score: 11900, combo: 24, wins: 38, level: 18, date: '3 days ago' },
        ]);
      }
      setLoading(false);
    });
  }, [tab]);

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-['Outfit'] tracking-tight">Global Rankings & Friends</h2>
              <p className="text-xs text-slate-400">Compete with players worldwide for seasonal rewards</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-950/90 p-1.5 border-b border-white/10 gap-1.5">
          <button
            onClick={() => {
              sfx.playButtonClick();
              setTab('global');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
              tab === 'global'
                ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" /> Global Top
          </button>
          <button
            onClick={() => {
              sfx.playButtonClick();
              setTab('weekly');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
              tab === 'weekly'
                ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" /> Weekly Cup
          </button>
          <button
            onClick={() => {
              sfx.playButtonClick();
              setTab('friends');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
              tab === 'friends'
                ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Amigos
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-950/50 border-b border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search whacker by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition font-medium"
            />
          </div>
        </div>

        {/* Leaderboard Rows */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2 bg-slate-900/50">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading leaderboard...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No records found.</div>
          ) : (
            filteredEntries.map((entry, index) => {
              const rank = index + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isMe = entry.userId === profile.id || entry.name === profile.name;

              return (
                <div
                  key={entry.userId || index}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                    isMe
                      ? 'bg-slate-800/90 border-orange-500 shadow-md'
                      : isTop1
                      ? 'bg-slate-800/60 border-yellow-500/40 shadow-sm'
                      : 'bg-slate-800/30 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Left: Rank & Avatar & Name */}
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-8 flex items-center justify-center">
                      {isTop1 ? (
                        <span className="text-xl">🥇</span>
                      ) : isTop2 ? (
                        <span className="text-xl">🥈</span>
                      ) : isTop3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-xs font-black text-slate-400 font-mono">#{rank}</span>
                      )}
                    </div>

                    {/* Avatar Icon */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-bold border border-white/20 shadow-sm"
                      style={{ backgroundColor: entry.avatar?.outfitColor || '#3b82f6' }}
                    >
                      {entry.avatar?.headwear === 'crown'
                        ? '👑'
                        : entry.avatar?.headwear === 'viking'
                        ? '🪓'
                        : entry.avatar?.headwear === 'robot'
                        ? '🤖'
                        : '🐹'}
                    </div>

                    {/* Player Info */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{entry.name}</span>
                        {isMe && (
                          <span className="text-[9px] bg-orange-500 text-slate-950 px-1.5 py-0.5 rounded font-black tracking-wider">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{entry.avatar?.title || 'Mole Whacker'} • Lv.{entry.level || 1}</span>
                    </div>
                  </div>

                  {/* Right: Score & Stats */}
                  <div className="flex items-center gap-4 text-right">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-yellow-400 font-mono">
                        {entry.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">{entry.combo}x streak</span>
                    </div>

                    {onChallengePlayer && !isMe && (
                      <button
                        onClick={() => onChallengePlayer(entry.name)}
                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition"
                        title="Challenge this player to a 1v1 duel"
                      >
                        <Swords className="w-3.5 h-3.5 text-orange-400" />
                        <span>Duel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
