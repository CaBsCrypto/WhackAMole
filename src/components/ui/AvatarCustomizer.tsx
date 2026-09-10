import React, { useState } from 'react';
import { User, Check, Sparkles, Wand2, X } from 'lucide-react';
import { UserProfile, AvatarConfig } from '../../types';
import { sfx } from '../../services/sfx';

interface AvatarCustomizerProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

const SKIN_TONES = ['#fbcfe8', '#fde047', '#fed7aa', '#d4a373', '#854d0e', '#38bdf8', '#c084fc', '#4ade80'];

const HEADWEAR_OPTIONS = [
  { id: 'none', label: 'None', icon: '👤' },
  { id: 'crown', label: 'Royal Crown', icon: '👑' },
  { id: 'viking', label: 'Viking Horns', icon: '🪓' },
  { id: 'robot', label: 'Cyber Bot', icon: '🤖' },
  { id: 'cap', label: 'Snapback Cap', icon: '🧢' },
  { id: 'ninja_band', label: 'Ninja Headband', icon: '🥷' },
  { id: 'cat_ears', label: 'Neko Ears', icon: '🐱' },
  { id: 'chef', label: 'Chef Toque', icon: '👨‍🍳' },
];

const GLASSES_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'aviators', label: 'Aviator Shades 🕶️' },
  { id: 'vr_goggles', label: 'VR Cyber Visor 🥽' },
  { id: 'laser', label: 'Laser Specs 🔴' },
  { id: 'monocle', label: 'Gold Monocle 🧐' },
];

const EXPRESSION_OPTIONS = [
  { id: 'smug', label: 'Smug 😏' },
  { id: 'fierce', label: 'Fierce 😤' },
  { id: 'happy', label: 'Happy 😄' },
  { id: 'cool', label: 'Cool 😎' },
  { id: 'laugh', label: 'Laughing 😆' },
];

const OUTFIT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#1f2937'];

const TITLES = ['Mole Whacker', 'Reflex Master', 'Hammer Grandmaster', 'Golden Chaser', 'Whack Deity', 'Arena Glitch'];

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ profile, onClose, onUpdateProfile }) => {
  const [avatar, setAvatar] = useState<AvatarConfig>({ ...profile.avatar });
  const [name, setName] = useState(profile.name);

  const handleSave = () => {
    sfx.playPowerup();
    onUpdateProfile({
      ...profile,
      name: name.trim() || profile.name,
      avatar,
    });
    onClose();
  };

  const handleRandomize = () => {
    sfx.playButtonClick();
    setAvatar({
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      headwear: HEADWEAR_OPTIONS[Math.floor(Math.random() * HEADWEAR_OPTIONS.length)].id,
      glasses: GLASSES_OPTIONS[Math.floor(Math.random() * GLASSES_OPTIONS.length)].id,
      expression: EXPRESSION_OPTIONS[Math.floor(Math.random() * EXPRESSION_OPTIONS.length)].id,
      outfitColor: OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)],
      badge: avatar.badge,
      title: TITLES[Math.floor(Math.random() * TITLES.length)],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-wide">Avatar Customizer</h2>
              <p className="text-xs text-slate-400 font-body font-medium">Personalize your Whacker identity & title</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl border border-white/10 transition cursor-pointer"
            >
              <Wand2 className="w-4 h-4" /> Randomize
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 bg-slate-900/50">
          {/* Left: Live Visual Preview Card */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/70 rounded-3xl border border-white/10 text-center min-w-[220px]">
            {/* Avatar Visual representation */}
            <div
              className="relative w-28 h-28 rounded-3xl flex items-center justify-center text-5xl shadow-2xl border-2 border-white/20 mb-4 transition-all duration-300"
              style={{ backgroundColor: avatar.outfitColor }}
            >
              {/* Headwear layer */}
              {avatar.headwear === 'crown' && <span className="absolute -top-4 text-3xl">👑</span>}
              {avatar.headwear === 'viking' && <span className="absolute -top-3 text-3xl">🪓</span>}
              {avatar.headwear === 'cap' && <span className="absolute -top-3 text-3xl">🧢</span>}
              {avatar.headwear === 'robot' && <span className="absolute -top-3 text-3xl">🤖</span>}
              {avatar.headwear === 'cat_ears' && <span className="absolute -top-3 text-3xl">🐱</span>}
              {avatar.headwear === 'chef' && <span className="absolute -top-4 text-3xl">👨‍🍳</span>}

              {/* Mole Face Base */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center border border-black/10 shadow-inner"
                style={{ backgroundColor: avatar.skinTone }}
              >
                <span className="text-2xl">
                  {avatar.expression === 'smug'
                    ? '😏'
                    : avatar.expression === 'fierce'
                    ? '😤'
                    : avatar.expression === 'laugh'
                    ? '😆'
                    : avatar.expression === 'cool'
                    ? '😎'
                    : '😄'}
                </span>
              </div>
            </div>

            <span className="text-base font-display font-bold text-white">{name || 'Whacker'}</span>
            <span className="text-[10px] text-orange-400 font-black uppercase tracking-wider mt-1 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              {avatar.title}
            </span>
          </div>

          {/* Right: Customization Controls */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Username Input */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Player Handle</label>
              <input
                type="text"
                value={name}
                maxLength={18}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition font-medium"
              />
            </div>

            {/* Skin Tone */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Skin Tone</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAvatar({ ...avatar, skinTone: color })}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      avatar.skinTone === color ? 'border-white scale-110 shadow-lg' : 'border-white/10'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Headwear */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Headwear</label>
              <div className="grid grid-cols-4 gap-2">
                {HEADWEAR_OPTIONS.map((hw) => (
                  <button
                    key={hw.id}
                    onClick={() => setAvatar({ ...avatar, headwear: hw.id })}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      avatar.headwear === hw.id
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/60 shadow-sm'
                        : 'bg-slate-800/40 text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base">{hw.icon}</span>
                    <span className="text-[10px] truncate max-w-full">{hw.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Outfit Color */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Outfit Color</label>
              <div className="flex flex-wrap gap-2">
                {OUTFIT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAvatar({ ...avatar, outfitColor: color })}
                    className={`w-7 h-7 rounded-xl border-2 transition ${
                      avatar.outfitColor === color ? 'border-white scale-110 shadow-lg' : 'border-white/10'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Title / Badge Selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Equipped Title</label>
              <select
                value={avatar.title}
                onChange={(e) => setAvatar({ ...avatar, title: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition font-medium"
              >
                {TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-slate-950/70">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition"
          >
            <Check className="w-4 h-4" /> Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
};
