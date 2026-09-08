import React from 'react';
import { Bell, Sparkles, Trophy, Gift, X } from 'lucide-react';
import { PushNotification } from '../../types';

interface PushNotificationsToastProps {
  notifications: PushNotification[];
  onDismiss: (id: string) => void;
  onOpenChallenges: () => void;
}

export const PushNotificationsToast: React.FC<PushNotificationsToastProps> = ({
  notifications,
  onDismiss,
  onOpenChallenges,
}) => {
  // Auto-dismiss the earliest notification after 3.5 seconds
  React.useEffect(() => {
    if (notifications.length === 0) return;
    const oldest = notifications[0];
    const timer = setTimeout(() => {
      onDismiss(oldest.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [notifications, onDismiss]);

  if (notifications.length === 0) return null;

  // Limit to at most 1 visible toast to prevent cluttering the screen
  const visibleNotifications = notifications.slice(0, 1);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs sm:max-w-sm w-full pointer-events-none">
      {visibleNotifications.map((notif) => {
        const getIcon = () => {
          switch (notif.type) {
            case 'challenge':
              return <Trophy className="w-5 h-5 text-orange-400" />;
            case 'event':
              return <Sparkles className="w-5 h-5 text-indigo-400" />;
            case 'reward':
              return <Gift className="w-5 h-5 text-emerald-400" />;
            default:
              return <Bell className="w-5 h-5 text-yellow-400" />;
          }
        };

        return (
          <div
            key={notif.id}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-slide-in text-slate-100 transition"
          >
            <div className="p-2 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
              {getIcon()}
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-white">{notif.title}</h4>
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="text-slate-500 hover:text-white p-0.5 rounded transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{notif.body}</p>

              {notif.type === 'challenge' && (
                <button
                  onClick={() => {
                    onDismiss(notif.id);
                    onOpenChallenges();
                  }}
                  className="mt-2 self-start text-[10px] font-bold text-orange-400 hover:underline uppercase tracking-wider"
                >
                  View Challenge →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
