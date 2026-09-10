import React, { useState, useEffect } from 'react';
import { Swords, Users, Plus, Key, Copy, Check, Send, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { UserProfile, MultiplayerRoom, MultiplayerPlayer } from '../../types';
import { multiplayerClient } from '../../services/multiplayer';
import { sfx } from '../../services/sfx';

interface MultiplayerLobbyProps {
  profile: UserProfile;
  onBack: () => void;
  onGameStarted: (room: MultiplayerRoom) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ profile, onBack, onGameStarted }) => {
  const [activeTab, setActiveTab] = useState<'hub' | 'create' | 'join'>('hub');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState(`${profile.name}'s Arena`);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    multiplayerClient.connect();

    const unsubscribe = multiplayerClient.subscribe((type, data) => {
      if (type === 'room:update') {
        setRoom(data.room);
        setErrorMessage(null);
      } else if (type === 'match:found') {
        setIsSearchingQuick(false);
        setRoom(data.room);
      } else if (type === 'game:started') {
        onGameStarted(data.room);
      } else if (type === 'room:error') {
        setErrorMessage(data.message || 'Error occurred');
      } else if (type === 'room:left') {
        setRoom(null);
        setIsSearchingQuick(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onGameStarted]);

  const handleQuickMatch = () => {
    sfx.playButtonClick();
    setIsSearchingQuick(true);
    setErrorMessage(null);
    multiplayerClient.joinQuickMatch(profile);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.playButtonClick();
    multiplayerClient.createCustomRoom(profile, roomNameInput);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    sfx.playButtonClick();
    multiplayerClient.joinRoomByCode(profile, roomCodeInput);
  };

  const handleToggleReady = () => {
    if (!room) return;
    sfx.playButtonClick();
    const myPlayer = room.players[profile.id];
    multiplayerClient.setReady(!myPlayer?.ready);
  };

  const handleStartGame = () => {
    sfx.playButtonClick();
    multiplayerClient.startGame();
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    multiplayerClient.sendChat(chatInput);
    setChatInput('');
  };

  const handleLeave = () => {
    sfx.playButtonClick();
    multiplayerClient.leaveRoom();
    setRoom(null);
    setIsSearchingQuick(false);
  };

  // 1. IN ROOM LOBBY VIEW
  if (room) {
    const myPlayer = room.players[profile.id];
    const isHost = myPlayer?.isHost;
    const playerList = Object.values(room.players) as MultiplayerPlayer[];
    const allReady = playerList.length >= 2 && playerList.every((p) => p.ready || p.isHost);

    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900/90 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeave}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
              title="Leave Room"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-wide">{room.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="capitalize">{room.mode} Mode</span>
                <span>•</span>
                <span>{playerList.length}/4 Players</span>
              </div>
            </div>
          </div>

          {/* Room Code Badge */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs font-bold transition shadow-sm"
            title="Click to copy room code"
          >
            <span>{room.code}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Middle Content: Players List & Live Chat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Players Grid */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Combatants</h3>
            {playerList.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                  p.id === profile.id
                    ? 'bg-slate-800/90 border-orange-500 shadow-md'
                    : 'bg-slate-800/40 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold border border-white/20 shadow-md"
                    style={{ backgroundColor: p.avatar?.outfitColor || '#3b82f6' }}
                  >
                    {p.avatar?.headwear === 'crown' ? '👑' : p.avatar?.headwear === 'robot' ? '🤖' : '🐹'}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      {p.isHost && (
                        <span className="text-[9px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/40 font-black uppercase">
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{p.avatar?.badge || 'Mole Buster'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-xl border ${
                      p.ready || p.isHost
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-white/5'
                    }`}
                  >
                    {p.isHost ? 'Host' : p.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            ))}

            {/* Waiting for players slot */}
            {playerList.length < 2 && (
              <div className="flex items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/10 text-slate-500 text-xs font-semibold">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-orange-400" />
                Waiting for opponent to connect...
              </div>
            )}
          </div>

          {/* Integrated Room Chat */}
          <div className="flex flex-col bg-slate-950/70 rounded-2xl border border-white/10 p-3 overflow-hidden">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Room Chat</h3>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-1 text-xs">
              {room.chat.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl max-w-[85%] ${
                    msg.isSystem
                      ? 'bg-slate-800/40 text-slate-400 self-center text-center text-[11px] italic w-full'
                      : msg.senderId === profile.id
                      ? 'bg-orange-600 text-white self-end font-medium'
                      : 'bg-slate-800 text-slate-200 self-start font-medium border border-white/5'
                  }`}
                >
                  {!msg.isSystem && (
                    <span className="font-bold text-[10px] text-yellow-300 block mb-0.5">{msg.senderName}</span>
                  )}
                  <span>{msg.text}</span>
                  {msg.emoji && <span className="text-base ml-1">{msg.emoji}</span>}
                </div>
              ))}
            </div>

            {/* Chat Input & Quick Emotes */}
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-sm">
                {['🔨', '🔥', '👑', '😎', '💥', '⚡', '🏆'].map((em) => (
                  <button
                    key={em}
                    onClick={() => multiplayerClient.sendEmote(em)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition"
                  >
                    {em}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition font-medium"
                />
                <button
                  type="submit"
                  className="p-2 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-bold rounded-xl transition shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleLeave}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold border border-white/10 transition"
          >
            Leave
          </button>

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={playerList.length < 2}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition shadow-xl ${
                playerList.length >= 2
                  ? 'bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white shadow-orange-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <Swords className="w-4 h-4" />
              Start Duel
            </button>
          ) : (
            <button
              onClick={handleToggleReady}
              className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition ${
                myPlayer?.ready
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-orange-600 to-orange-400 text-white'
              }`}
            >
              {myPlayer?.ready ? 'Ready!' : 'Click when Ready'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. SEARCHING / QUICK MATCH QUEUE VIEW
  if (isSearchingQuick) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto bg-slate-900/90 rounded-3xl border border-white/10 text-center shadow-2xl backdrop-blur-xl">
        <div className="w-20 h-20 rounded-3xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-6 animate-pulse">
          <Swords className="w-10 h-10 text-orange-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-black text-white font-display mb-2 tracking-wide">Searching for Opponent...</h2>
        <p className="text-xs text-slate-400 mb-6">Connecting you to global 1v1 matchmaking queue. Preparing synchronized arena...</p>

        <button
          onClick={() => {
            multiplayerClient.leaveRoom();
            setIsSearchingQuick(false);
          }}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-white/10 transition"
        >
          Cancel Matchmaking
        </button>
      </div>
    );
  }

  // 3. MAIN LOBBY HUB
  return (
    <div className="max-w-xl mx-auto p-5 md:p-7 bg-slate-900/90 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white font-display tracking-wide">Multiplayer Duel 1v1</h2>
            <p className="text-xs text-slate-400">Compete in real time on a shared synchronized mole arena!</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 mb-4 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl font-medium">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-white/10 mb-6 gap-1.5">
        <button
          onClick={() => setActiveTab('hub')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeTab === 'hub'
              ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Quick Match
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeTab === 'create'
              ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Create Room
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeTab === 'join'
              ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Join with Code
        </button>
      </div>

      {/* Tab 1: Quick Match */}
      {activeTab === 'hub' && (
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/40 to-slate-900 border border-white/10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-3xl">
              ⚔️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ranked 1v1 Quick Duel</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Instant matchmaking with live opponents. 60-second synchronized score race with combat attack powerups!
              </p>
            </div>
          </div>

          <button
            id="btn_quick_duel"
            onClick={handleQuickMatch}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-base rounded-2xl uppercase tracking-wider transition shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <Swords className="w-5 h-5" />
            Find Opponent Now
          </button>
        </div>
      )}

      {/* Tab 2: Create Custom Room */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Arena Name</label>
            <input
              type="text"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition font-medium"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-sm rounded-2xl uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Private Arena
          </button>
        </form>
      )}

      {/* Tab 3: Join Room */}
      {activeTab === 'join' && (
        <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Enter 4-Letter Room Code</label>
            <input
              type="text"
              placeholder="e.g. MOLE-7890 or 7890"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono tracking-widest text-center text-yellow-400 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition font-bold"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-sm rounded-2xl uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
          >
            <Key className="w-5 h-5" />
            Join Arena
          </button>
        </form>
      )}
    </div>
  );
};
