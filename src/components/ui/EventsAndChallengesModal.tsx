import React from 'react';
import { Calendar, Flame, Sparkles, Check, Gift, Target, Coins, Zap, Trophy } from 'lucide-react';
import { UserProfile, WeeklyChallenge, SpecialEvent } from '../../types';
import { CURRENT_EVENTS } from '../../services/storage';
import { sfx } from '../../services/sfx';

interface EventsAndChallengesModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const EventsAndChallengesModal: React.FC<EventsAndChallengesModalProps> = ({
  profile,
  onClose,
  onUpdateProfile,
}) => {
  const handleClaimChallenge = (challenge: WeeklyChallenge) => {
    if (challenge.current < challenge.target || challenge.claimed) return;

    sfx.playPowerup();
    const updatedChallenges = profile.challenges.map((c) =>
      c.id === challenge.id ? { ...c, claimed: true } : c
    );

    onUpdateProfile({
      ...profile,
      coins: profile.coins + challenge.rewardCoins,
      gems: profile.gems + challenge.rewardGems,
      challenges: updatedChallenges,
    });
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'moles_hit':
        return <Target className="w-5 h-5 text-amber-400" />;
      case 'golden_hit':
        return <Coins className="w-5 h-5 text-yellow-400" />;
      case 'combo_streak':
        return <Zap className="w-5 h-5 text-purple-400" />;
      case 'duels_won':
        return <Trophy className="w-5 h-5 text-emerald-400" />;
      default:
        return <Gift className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-['Outfit'] tracking-tight">Events & Weekly Bounties</h2>
              <p className="text-xs text-slate-400">Complete challenges to earn coins, gems & exclusive perks</p>
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
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5 bg-slate-900/50">
          {/* Active Special Events Banner */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Active Special Events
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CURRENT_EVENTS.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${event.bannerColor} border border-white/20 shadow-lg text-white`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                      {event.badge}
                    </span>
                    <span className="text-xs font-bold bg-black/20 px-2 py-0.5 rounded-lg">
                      Ends in {event.endsInHours}h
                    </span>
                  </div>
                  <h4 className="font-black text-base font-['Outfit'] tracking-tight">{event.title}</h4>
                  <p className="text-xs text-white/90 mt-1">{event.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Challenges List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" /> Weekly Bounties
            </h3>

            <div className="flex flex-col gap-2.5">
              {profile.challenges.map((c) => {
                const progress = Math.min(1, c.current / Math.max(1, c.target));
                const isComplete = c.current >= c.target;

                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-800/40 border border-white/10 hover:border-white/20 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
                        {getChallengeIcon(c.type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{c.title}</h4>
                        <p className="text-xs text-slate-400">{c.description}</p>

                        {/* Mini Progress bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-28 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-300"
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {c.current}/{c.target}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reward & Claim Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold">
                        <span className="text-yellow-400">+{c.rewardCoins} 🪙</span>
                        <span className="text-indigo-400">+{c.rewardGems} 💎</span>
                      </div>

                      {c.claimed ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                          <Check className="w-3.5 h-3.5" /> Claimed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimChallenge(c)}
                          disabled={!isComplete}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            isComplete
                              ? 'bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white shadow-md shadow-orange-500/20'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                          }`}
                        >
                          Claim Reward
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
