import React, { useState } from 'react';
import { MessageSquare, Send, Zap, Snowflake, Droplets, Bomb } from 'lucide-react';
import { MultiplayerRoom, CombatAttackType, UserProfile, MultiplayerPlayer } from '../../types';
import { multiplayerClient } from '../../services/multiplayer';

interface MultiplayerMatchOverlayProps {
  room: MultiplayerRoom;
  profile: UserProfile;
  activeAttacks: { type: string; expiresAt: number }[];
}

export const MultiplayerMatchOverlay: React.FC<MultiplayerMatchOverlayProps> = ({
  room,
  profile,
  activeAttacks,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [lastEmote, setLastEmote] = useState<{ emoji: string; sender: string } | null>(null);

  const myPlayer = room.players[profile.id];
  const opponent = (Object.values(room.players) as MultiplayerPlayer[]).find((p) => p.id !== profile.id);

  // Check if player is under active attack
  const isFrostSlowed = activeAttacks.some((a) => a.type === 'frost_slow' && a.expiresAt > Date.now());
  const isInkSplatted = activeAttacks.some((a) => a.type === 'ink_splat' && a.expiresAt > Date.now());
  const isBombBarraged = activeAttacks.some((a) => a.type === 'bomb_barrage' && a.expiresAt > Date.now());

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    multiplayerClient.sendChat(chatText);
    setChatText('');
  };

  const handleEmote = (emoji: string) => {
    multiplayerClient.sendEmote(emoji);
    setLastEmote({ emoji, sender: 'You' });
    setTimeout(() => setLastEmote(null), 2500);
  };

  const handleAttack = (type: CombatAttackType) => {
    if (!opponent) return;
    multiplayerClient.useAttack(opponent.id, type);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3">
      {/* 1. Top Bar: Head-to-Head Live Score & Combo Duel Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 max-w-2xl mx-auto w-full bg-slate-900/85 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-2xl mt-12 sm:mt-14">
        {/* My Stats (Left) */}
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg border border-white/20 shadow-sm"
            style={{ backgroundColor: myPlayer?.avatar?.outfitColor || '#3b82f6' }}
          >
            {myPlayer?.avatar?.headwear === 'crown' ? '👑' : '🐹'}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white truncate max-w-[90px]">{myPlayer?.name || 'You'}</span>
            <span className="text-xs font-black text-yellow-400 font-mono">
              {(myPlayer?.score || 0).toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* VS Center Badge */}
        <div className="flex flex-col items-center px-3">
          <span className="text-xs font-black text-red-500 font-mono tracking-widest">VS</span>
          <span className="text-[10px] text-slate-400 font-mono font-bold">{room.timeRemaining}s</span>
        </div>

        {/* Opponent Stats (Right) */}
        <div className="flex items-center gap-2 flex-1 justify-end text-right">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white truncate max-w-[90px]">{opponent?.name || 'Opponent'}</span>
            <span className="text-xs font-black text-yellow-400 font-mono">
              {(opponent?.score || 0).toLocaleString()} pts
            </span>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg border border-white/20 shadow-sm"
            style={{ backgroundColor: opponent?.avatar?.outfitColor || '#ef4444' }}
          >
            {opponent?.avatar?.headwear === 'crown' ? '👑' : opponent?.avatar?.headwear === 'robot' ? '🤖' : '🐹'}
          </div>
        </div>
      </div>

      {/* 2. Floating Live Emote Bubble */}
      {lastEmote && (
        <div className="pointer-events-none self-center bg-slate-900/90 text-white px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="text-2xl">{lastEmote.emoji}</span>
          <span className="text-xs font-bold">{lastEmote.sender}</span>
        </div>
      )}

      {/* 3. Combat Attacks Tray & Quick Emote Ribbon (Bottom Right / Left) */}
      <div className="flex items-end justify-between gap-3 mb-14 sm:mb-2">
        {/* Emotes & Chat Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
          {['🔨', '🔥', '😂', '👑', '💣'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmote(emoji)}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-lg transition active:scale-125"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 transition"
            title="Toggle Match Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Combat Attack Traps Against Opponent */}
        {opponent && (
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">Attack:</span>
            {/* Frost Slow Attack */}
            <button
              onClick={() => handleAttack('frost_slow')}
              className="flex items-center gap-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
              title="Freeze Opponent Screen (4s)"
            >
              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
              <span>Freeze</span>
            </button>

            {/* Ink Splat Attack */}
            <button
              onClick={() => handleAttack('ink_splat')}
              className="flex items-center gap-1 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
              title="Blind Opponent with Ink (4s)"
            >
              <Droplets className="w-3.5 h-3.5 text-purple-400" />
              <span>Ink</span>
            </button>

            {/* Bomb Barrage */}
            <button
              onClick={() => handleAttack('bomb_barrage')}
              className="flex items-center gap-1 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
              title="Drop Bomb Surge on Opponent"
            >
              <Bomb className="w-3.5 h-3.5 text-red-400" />
              <span>TNT</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Active Incoming Attack Visual Effects Overlays */}
      {isFrostSlowed && (
        <div className="pointer-events-none absolute inset-0 bg-cyan-500/20 border-8 border-cyan-400/80 animate-pulse flex items-center justify-center">
          <div className="bg-cyan-900/90 text-cyan-100 px-4 py-2 rounded-2xl font-black text-sm border border-cyan-400 flex items-center gap-2 shadow-2xl">
            <Snowflake className="w-5 h-5 animate-spin" />
            FROST SLOW ACTIVE!
          </div>
        </div>
      )}

      {isInkSplatted && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 bg-slate-950/90 rounded-full blur-xl animate-ping opacity-75" />
          <div className="absolute w-60 h-60 bg-purple-950/85 rounded-full blur-lg opacity-85" />
        </div>
      )}

      {/* 5. In-Match Chat Drawer */}
      {chatOpen && (
        <div className="pointer-events-auto absolute bottom-16 left-4 w-72 bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Match Chat</span>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
          <div className="h-32 overflow-y-auto flex flex-col gap-1.5 text-xs">
            {room.chat.map((msg) => (
              <div key={msg.id} className="p-2 rounded-xl bg-slate-800/80 text-slate-200 border border-white/5">
                <span className="font-bold text-[10px] text-yellow-300 block">{msg.senderName}</span>
                <span>{msg.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChat} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Quick message..."
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition font-medium"
            />
            <button
              type="submit"
              className="p-1.5 bg-gradient-to-r from-orange-600 to-orange-400 text-white font-bold rounded-xl shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
