import React from 'react';
import { Settings, Volume2, VolumeX, Moon, Sun, Bell, RefreshCw, Play, RotateCcw, Home } from 'lucide-react';
import { UserProfile, GameTheme, MoleType } from '../../types';
import { sfx } from '../../services/sfx';
import { dynamicSoundtrack } from '../../services/soundtrack';

interface PauseAndSettingsModalProps {
  profile: UserProfile;
  isOpen: boolean;
  isPaused: boolean;
  onClose: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  onQuitToMenu?: () => void;
  onTriggerKitchenDisaster?: () => void;
  onTestCompleteRecipe?: () => void;
  onTestParticleExplosion?: (type: MoleType) => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

const THEMES: Array<{ id: GameTheme; name: string; icon: string; desc: string }> = [
  { id: 'garden', name: 'Meadow Garden', icon: '🌿', desc: 'Lush green grass & earthy soil mounds' },
  { id: 'cyber', name: 'Cyber Neon', icon: '⚡', desc: 'Futuristic glowing grid & holo rims' },
  { id: 'volcano', name: 'Magma Core', icon: '🌋', desc: 'Volcanic crust & molten embers' },
  { id: 'arcade', name: 'Retro Arcade', icon: '🕹️', desc: 'Classic wooden carnival cabinet' },
];

export const PauseAndSettingsModal: React.FC<PauseAndSettingsModalProps> = ({
  profile,
  isOpen,
  isPaused,
  onClose,
  onResume,
  onRestart,
  onQuitToMenu,
  onTriggerKitchenDisaster,
  onTestCompleteRecipe,
  onTestParticleExplosion,
  onUpdateProfile,
}) => {
  if (!isOpen) return null;

  const handleSoundVolumeChange = (val: number) => {
    sfx.setVolume(val);
    onUpdateProfile({
      ...profile,
      settings: { ...profile.settings, soundVolume: val },
    });
  };

  const handleMusicVolumeChange = (val: number) => {
    dynamicSoundtrack.setVolume(val);
    onUpdateProfile({
      ...profile,
      settings: { ...profile.settings, musicVolume: val },
    });
  };

  const handleSelectTheme = (theme: GameTheme) => {
    sfx.playButtonClick();
    onUpdateProfile({
      ...profile,
      settings: { ...profile.settings, theme },
    });
  };

  const handleToggleNotifications = () => {
    sfx.playButtonClick();
    const current = profile.settings.pushNotifications;
    onUpdateProfile({
      ...profile,
      settings: { ...profile.settings, pushNotifications: !current },
    });
  };

  const handleToggleDarkMode = () => {
    sfx.playButtonClick();
    const current = profile.settings.darkMode;
    onUpdateProfile({
      ...profile,
      settings: { ...profile.settings, darkMode: !current },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-lg bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-['Outfit'] tracking-tight">
                {isPaused ? 'Game Paused' : 'Settings & Preferences'}
              </h2>
              <p className="text-xs text-slate-400">Audio, graphics themes & synchronization</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh] bg-slate-900/50">
          {/* Pause Action Buttons if in game */}
          {isPaused && (
            <div className="grid grid-cols-3 gap-2 pb-4 border-b border-white/10">
              {onResume && (
                <button
                  onClick={onResume}
                  className="py-3 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-xs uppercase rounded-xl flex flex-col items-center gap-1 shadow-md"
                >
                  <Play className="w-4 h-4" /> Resume
                </button>
              )}
              {onRestart && (
                <button
                  onClick={onRestart}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl flex flex-col items-center gap-1 border border-white/10 transition"
                >
                  <RotateCcw className="w-4 h-4 text-yellow-400" /> Restart
                </button>
              )}
              {onQuitToMenu && (
                <button
                  onClick={onQuitToMenu}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl flex flex-col items-center gap-1 border border-white/10 transition"
                >
                  <Home className="w-4 h-4 text-red-400" /> Quit
                </button>
              )}
            </div>
          )}

          {/* Sound & Music Sliders */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audio Sliders</h3>

            {/* SFX Volume */}
            <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Volume2 className="w-4 h-4 text-orange-400" />
                <span>Sound FX</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={profile.settings.soundVolume}
                onChange={(e) => handleSoundVolumeChange(parseFloat(e.target.value))}
                className="accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Music Volume */}
            <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Dynamic Synth</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={profile.settings.musicVolume}
                onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                className="accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Arena 3D Environment</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => handleSelectTheme(th.id)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    profile.settings.theme === th.id
                      ? 'bg-slate-800/90 border-orange-500 shadow-md'
                      : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{th.icon}</span>
                    <span className="font-bold text-xs text-white">{th.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{th.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles: Dark Mode & Push Notifications */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Bell className="w-4 h-4 text-yellow-400" />
                <span>Push Notifications & Bounties</span>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`w-11 h-6 rounded-full transition p-1 flex items-center ${
                  profile.settings.pushNotifications ? 'bg-orange-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                {profile.settings.darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                <span>High Contrast Dark Mode</span>
              </div>
              <button
                onClick={handleToggleDarkMode}
                className={`w-11 h-6 rounded-full transition p-1 flex items-center ${
                  profile.settings.darkMode ? 'bg-orange-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="flex items-center justify-between p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-xs text-emerald-300">
            <div className="flex items-center gap-2 font-bold">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Cloud Sync Active</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Online</span>
          </div>

          {/* Particle Explosion Effects Previewer by Mole Type */}
          {onTestParticleExplosion && (
            <div className="p-3 bg-slate-950/70 rounded-2xl border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>💥</span>
                  <span>Efectos de Explosión de Partículas (Por Topo)</span>
                </span>
                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Canvas 60FPS</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Haz clic en cualquier topo para probar su explosión de partículas y paleta de color única:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {(
                  [
                    { type: 'standard' as MoleType, name: 'Standard', emoji: '🍕', color: 'border-red-500/50 text-red-300 bg-red-950/40' },
                    { type: 'golden' as MoleType, name: 'Golden', emoji: '✨', color: 'border-amber-500/50 text-amber-300 bg-amber-950/40' },
                    { type: 'fast' as MoleType, name: 'Fast', emoji: '⚡', color: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40' },
                    { type: 'tough' as MoleType, name: 'Tough', emoji: '🛡️', color: 'border-slate-400/50 text-slate-300 bg-slate-900/60' },
                    { type: 'bomb' as MoleType, name: 'Bomb', emoji: '💣', color: 'border-rose-600/50 text-rose-300 bg-rose-950/40' },
                    { type: 'helmet' as MoleType, name: 'Helmet', emoji: '⛑️', color: 'border-yellow-500/50 text-yellow-300 bg-yellow-950/40' },
                    { type: 'frost' as MoleType, name: 'Frost', emoji: '❄️', color: 'border-sky-400/50 text-sky-300 bg-sky-950/40' },
                    { type: 'rainbow' as MoleType, name: 'Rainbow', emoji: '🌈', color: 'border-purple-400/50 text-purple-300 bg-purple-950/40' },
                    { type: 'phantom' as MoleType, name: 'Phantom', emoji: '👻', color: 'border-indigo-400/50 text-indigo-300 bg-indigo-950/40' },
                    { type: 'boss' as MoleType, name: 'Boss King', emoji: '👑', color: 'border-pink-500/60 text-pink-200 bg-pink-950/50 col-span-2 sm:col-span-1' },
                  ]
                ).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onTestParticleExplosion(item.type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition hover:scale-105 active:scale-95 ${item.color}`}
                  >
                    <span>{item.emoji}</span>
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Test / Manual Trigger for Kitchen Disaster Event (When in-game or testing) */}
          {onTriggerKitchenDisaster && isPaused && (
            <button
              id="btn_test_kitchen_disaster"
              onClick={() => {
                onTriggerKitchenDisaster();
                if (onResume) onResume();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-red-950/70 hover:bg-red-900/80 border border-red-500/50 rounded-2xl text-xs font-black text-red-300 transition shadow-lg shadow-red-950/40"
            >
              <span className="animate-spin">🚨</span>
              <span>Probar Evento: "Desastre en Cocina" (10s)</span>
            </button>
          )}

          {/* Test / Manual Trigger for Pizza Recipe Complete (When in-game or testing) */}
          {onTestCompleteRecipe && isPaused && (
            <button
              id="btn_test_complete_recipe"
              onClick={() => {
                onTestCompleteRecipe();
                if (onResume) onResume();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-amber-950/80 to-yellow-950/80 hover:from-amber-900/90 hover:to-yellow-900/90 border border-amber-500/60 rounded-2xl text-xs font-black text-amber-300 transition shadow-lg shadow-amber-950/40"
            >
              <span>🍕</span>
              <span>Probar "Receta Completa" (+1,500 Pts & 2.5x Bono)</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end bg-slate-950/70">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-xs uppercase rounded-xl transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
