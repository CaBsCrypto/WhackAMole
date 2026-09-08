import React, { useState } from 'react';
import { ShoppingBag, Zap, Sparkles, Snowflake, Shield, Flame, Check, Lock, ArrowUpCircle } from 'lucide-react';
import { UserProfile, HammerItem, PowerupItem } from '../../types';
import { DEFAULT_HAMMERS, DEFAULT_POWERUPS } from '../../services/storage';
import { sfx } from '../../services/sfx';

interface ShopModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ profile, onClose, onUpdateProfile }) => {
  const [tab, setTab] = useState<'hammers' | 'powerups'>('hammers');
  const [selectedHammerId, setSelectedHammerId] = useState<string>(profile.selectedHammerId);

  const handleSelectHammer = (hammerId: string) => {
    sfx.playButtonClick();
    setSelectedHammerId(hammerId);
    onUpdateProfile({
      ...profile,
      selectedHammerId: hammerId,
    });
  };

  const handleBuyHammer = (hammer: HammerItem) => {
    const isGems = hammer.currency === 'gems';
    const currentBalance = isGems ? profile.gems : profile.coins;

    if (currentBalance < hammer.price) {
      sfx.playButtonClick();
      return;
    }

    sfx.playPowerup();
    const updatedHammers = [...profile.inventoryHammers, hammer.id];
    onUpdateProfile({
      ...profile,
      coins: isGems ? profile.coins : profile.coins - hammer.price,
      gems: isGems ? profile.gems - hammer.price : profile.gems,
      inventoryHammers: updatedHammers,
      selectedHammerId: hammer.id,
    });
  };

  const handleUpgradeHammer = (hammerId: string) => {
    const upgradeCost = 250;
    if (profile.coins < upgradeCost) return;

    sfx.playPowerup();
    onUpdateProfile({
      ...profile,
      coins: profile.coins - upgradeCost,
    });
  };

  const handleBuyPowerup = (powerup: PowerupItem) => {
    if (profile.coins < powerup.price) {
      sfx.playButtonClick();
      return;
    }

    sfx.playCoin();
    const currentCount = profile.powerups[powerup.id] || 0;
    onUpdateProfile({
      ...profile,
      coins: profile.coins - powerup.price,
      powerups: {
        ...profile.powerups,
        [powerup.id]: currentCount + 1,
      },
    });
  };

  const getPowerupIcon = (name: string) => {
    switch (name) {
      case 'Snowflake':
        return <Snowflake className="w-6 h-6 text-cyan-400" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-6 h-6 text-emerald-400" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-purple-400" />;
      case 'PizzaOven':
        return <Flame className="w-6 h-6 text-red-500 animate-pulse" />;
      default:
        return <Zap className="w-6 h-6 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-['Outfit'] tracking-tight">Armory & Powerup Shop</h2>
              <p className="text-xs text-slate-400">Upgrade hammers, unlock visual styles & stock combat items</p>
            </div>
          </div>

          {/* User Currency Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 text-yellow-400 border border-white/10 px-3 py-1.5 rounded-xl font-black text-xs font-mono">
              <span>🪙</span>
              <span>{profile.coins.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 text-indigo-400 border border-white/10 px-3 py-1.5 rounded-xl font-black text-xs font-mono">
              <span>💎</span>
              <span>{profile.gems}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-950/90 p-1.5 border-b border-white/10 gap-1.5">
          <button
            onClick={() => setTab('hammers')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
              tab === 'hammers'
                ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            🔨 Hammers & Weapons ({profile.inventoryHammers.length}/{DEFAULT_HAMMERS.length})
          </button>
          <button
            onClick={() => setTab('powerups')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 ${
              tab === 'powerups'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            ⚡ Combat Powerups
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-900/50">
          {tab === 'hammers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_HAMMERS.map((hammer) => {
                const isUnlocked = profile.inventoryHammers.includes(hammer.id);
                const isSelected = profile.selectedHammerId === hammer.id;
                const isGems = hammer.currency === 'gems';
                const canAfford = isGems ? profile.gems >= hammer.price : profile.coins >= hammer.price;

                return (
                  <div
                    key={hammer.id}
                    className={`flex flex-col justify-between p-4 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-slate-800/80 border-orange-500 shadow-lg shadow-orange-500/10'
                        : isUnlocked
                        ? 'bg-slate-800/40 border-white/10 hover:border-white/20'
                        : 'bg-slate-950/40 border-white/5 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Top Hammer Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-md"
                            style={{
                              backgroundColor: hammer.color,
                              boxShadow: hammer.glowColor ? `0 0 15px ${hammer.glowColor}` : 'none',
                            }}
                          >
                            🔨
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white">{hammer.name}</h3>
                            <span className="text-[10px] text-orange-400 font-black uppercase tracking-wider">
                              {hammer.specialEffect.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="flex items-center gap-1 bg-orange-500 text-slate-950 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Check className="w-3 h-3" /> Equipped
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mb-4">{hammer.description}</p>

                      {/* Hammer Stats */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-white/5 text-[11px] mb-4">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-tighter">Damage</span>
                          <span className="font-black text-white font-mono">{hammer.damage} DMG</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-tighter">Crit Chance</span>
                          <span className="font-black text-yellow-400 font-mono">{Math.round(hammer.critChance * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-tighter">Score Bonus</span>
                          <span className="font-black text-emerald-400 font-mono">+{Math.round((hammer.scoreBonus - 1) * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isUnlocked ? (
                      <div className="flex gap-2">
                        {!isSelected && (
                          <button
                            onClick={() => handleSelectHammer(hammer.id)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md"
                          >
                            Equip Hammer
                          </button>
                        )}
                        <button
                          onClick={() => handleUpgradeHammer(hammer.id)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 border border-white/10"
                          title="Upgrade Stats (250 coins)"
                        >
                          <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                          <span>+Stats (250🪙)</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuyHammer(hammer)}
                        disabled={!canAfford}
                        className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                          canAfford
                            ? isGems
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-600/20'
                              : 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Unlock for {hammer.price} {isGems ? '💎 Gems' : '🪙 Credits'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEFAULT_POWERUPS.map((pw) => {
                const count = profile.powerups[pw.id] || 0;
                const canAfford = profile.coins >= pw.price;

                return (
                  <div
                    key={pw.id}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-slate-800/40 border border-white/10 hover:border-white/20 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
                            {getPowerupIcon(pw.icon)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white">{pw.name}</h3>
                            <span className="text-xs text-slate-400">Duration: {pw.duration}s</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Owned</span>
                          <span className="text-sm font-black text-yellow-400 font-mono">{count}x</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mb-4">{pw.description}</p>
                    </div>

                    <button
                      onClick={() => handleBuyPowerup(pw)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                        canAfford
                          ? 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-md'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      Buy 1x ({pw.price} 🪙)
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
