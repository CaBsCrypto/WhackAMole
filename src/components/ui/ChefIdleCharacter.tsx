import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfx } from '../../services/sfx';

export type ChefAction = 'idle' | 'check_watch' | 'wipe_brow' | 'look_around' | 'cheer';

interface ChefIdleCharacterProps {
  className?: string;
  onInteract?: () => void;
}

export const ChefIdleCharacter: React.FC<ChefIdleCharacterProps> = ({
  className = '',
  onInteract,
}) => {
  const [currentAction, setCurrentAction] = useState<ChefAction>('idle');
  const [isBlinking, setIsBlinking] = useState(false);
  const [bubbleText, setBubbleText] = useState<{ text: string; icon?: string } | null>(null);
  const [sweatVisible, setSweatVisible] = useState(false);
  const [watchActive, setWatchActive] = useState(false);

  const actionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Blinking loop (every 3 to 5 seconds)
  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = 2800 + Math.random() * 2400;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Trigger an action with appropriate timing, dialogue, and sfx
  const triggerAction = (action: ChefAction, manual = false) => {
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);

    setCurrentAction(action);

    if (action === 'check_watch') {
      setWatchActive(true);
      sfx.playChefWatchTick();

      const watchQuotes = [
        { text: '¿A qué hora salen los topos?', icon: '⏱️' },
        { text: '¡El horno está a 450°F!', icon: '🔥' },
        { text: '¡Mamma mia, qué tarde es!', icon: '🍕' },
        { text: '¡La masa ya fermentó!', icon: '⏰' },
      ];
      const quote = watchQuotes[Math.floor(Math.random() * watchQuotes.length)];
      setBubbleText(quote);

      setTimeout(() => setWatchActive(false), 2600);

      bubbleTimeoutRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 3000);

      setTimeout(() => {
        setCurrentAction('idle');
      }, 3400);
    } else if (action === 'wipe_brow') {
      setSweatVisible(true);
      sfx.playChefBrowWipe();

      const wipeQuotes = [
        { text: '¡Phew! Qué calor en la cocina...', icon: '💦' },
        { text: '¡La harina se me pegó al bigote!', icon: '🥖' },
        { text: '¡Uff! Un respiro antes de hornear', icon: '💨' },
        { text: '¡Esos topos no me darán tregua!', icon: '🦔' },
      ];
      const quote = wipeQuotes[Math.floor(Math.random() * wipeQuotes.length)];
      setBubbleText(quote);

      // Sweat droplet fades halfway through wipe
      setTimeout(() => {
        setSweatVisible(false);
      }, 1400);

      bubbleTimeoutRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 2900);

      setTimeout(() => {
        setCurrentAction('idle');
      }, 3200);
    } else if (action === 'look_around') {
      const scanQuotes = [
        { text: '👀 ¿Dónde se esconden esos topos?', icon: '🧐' },
        { text: 'Huelo masa crujiente...', icon: '🧀' },
      ];
      setBubbleText(scanQuotes[Math.floor(Math.random() * scanQuotes.length)]);

      bubbleTimeoutRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 2600);

      setTimeout(() => {
        setCurrentAction('idle');
      }, 2800);
    } else if (action === 'cheer') {
      sfx.playChefGreeting();
      const cheerQuotes = [
        { text: '¡Mamma Mia! ¡A amasar!', icon: '👨‍🍳' },
        { text: '¡Rodillo listo para aplastar!', icon: '💥' },
        { text: '¡La receta maestra no se rinde!', icon: '🍕' },
        { text: '¡Buon appetito e buona fortuna!', icon: '⭐' },
      ];
      setBubbleText(cheerQuotes[Math.floor(Math.random() * cheerQuotes.length)]);

      bubbleTimeoutRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 2800);

      setTimeout(() => {
        setCurrentAction('idle');
      }, 2400);
    }
  };

  // Organic idle cycle loop (randomly choose check_watch, wipe_brow, or look_around every 7-10 seconds)
  useEffect(() => {
    const scheduleNextIdleAction = () => {
      // 7.5 to 11.5 seconds between actions
      const delay = 7500 + Math.random() * 4000;
      actionTimerRef.current = setTimeout(() => {
        // 50% watch, 40% brow wipe, 10% look around
        const rand = Math.random();
        if (rand < 0.48) {
          triggerAction('check_watch');
        } else if (rand < 0.88) {
          triggerAction('wipe_brow');
        } else {
          triggerAction('look_around');
        }
        scheduleNextIdleAction();
      }, delay);
    };

    scheduleNextIdleAction();
    return () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, []);

  const handleChefClick = () => {
    triggerAction('cheer', true);
    if (onInteract) onInteract();
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Speech / Thought Bubble */}
      <AnimatePresence>
        {bubbleText && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setBubbleText(null)}
            className="absolute -top-12 z-30 px-3 py-1.5 bg-amber-950/90 border border-amber-400/40 backdrop-blur-md rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.5)] cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-amber-200"
          >
            {bubbleText.icon && <span className="text-sm">{bubbleText.icon}</span>}
            <span className="font-body tracking-wide">{bubbleText.text}</span>
            {/* Bubble Tail */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-950/90 border-r border-b border-amber-400/40 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chef Character Container */}
      <motion.div
        className="relative cursor-pointer group"
        onClick={handleChefClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        title="¡Haz clic en el Chef Luigi!"
      >
        {/* Warm Ambient Kitchen Oven Glow Under Character */}
        <div className="absolute -inset-2 bg-gradient-to-t from-amber-500/25 via-red-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:from-amber-400/35 transition-all duration-300" />

        {/* Dynamic Vector Chef SVG Rig */}
        <svg
          viewBox="0 0 160 175"
          className="w-28 h-32 sm:w-32 sm:h-36 md:w-36 md:h-40 drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs / Gradients */}
          <defs>
            {/* Hat Gradient */}
            <linearGradient id="hatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="85%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Hat Crease Shadow */}
            <linearGradient id="hatShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>

            {/* Skin Gradient */}
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            {/* Red Neckerchief / Bandana Gradient */}
            <linearGradient id="scarfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Chef Uniform Double-Breasted White Coat */}
            <linearGradient id="coatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            {/* Golden Watch Metal Gradient */}
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Rolling Pin Wood */}
            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* ===================================================
              BASE BODY & APRON (Subtle Breathing Motion)
             =================================================== */}
          <motion.g
            animate={{
              y: currentAction === 'idle' ? [0, -1.8, 0] : 0,
            }}
            transition={{
              repeat: Infinity,
              duration: 2.8,
              ease: 'easeInOut',
            }}
          >
            {/* Wooden Prep Counter Edge underneath */}
            <rect x="25" y="162" width="110" height="7" rx="3.5" fill="#78350f" />
            <rect x="28" y="163" width="104" height="2" rx="1" fill="#b45309" opacity="0.6" />

            {/* Chef Coat & Shoulders */}
            <path
              d="M48 116 C48 106 58 100 80 100 C102 100 112 106 112 116 L118 162 L42 162 Z"
              fill="url(#coatGrad)"
              stroke="#cbd5e1"
              strokeWidth="1.8"
            />

            {/* Double-Breasted Coat Overlap Seam */}
            <path d="M84 102 L84 162" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Chef Coat Golden/Charcoal Buttons */}
            <circle cx="74" cy="115" r="2.2" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <circle cx="74" cy="128" r="2.2" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <circle cx="74" cy="141" r="2.2" fill="#475569" stroke="#334155" strokeWidth="0.8" />

            <circle cx="86" cy="115" r="2.2" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <circle cx="86" cy="128" r="2.2" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <circle cx="86" cy="141" r="2.2" fill="#475569" stroke="#334155" strokeWidth="0.8" />

            {/* Apron Pocket */}
            <rect x="66" y="146" width="28" height="15" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
            {/* Wooden Tasting Spoon sticking out of apron pocket */}
            <rect x="85" y="137" width="2.4" height="12" rx="1" fill="#d97706" transform="rotate(12 85 137)" />
            <ellipse cx="88" cy="135" rx="3.5" ry="4.5" fill="#f59e0b" transform="rotate(12 88 135)" />

            {/* Red Neckerchief / Italian Bandana Tie */}
            <path
              d="M62 98 C66 94 72 92 80 92 C88 92 94 94 98 98 C94 104 88 108 80 108 C72 108 66 104 62 98 Z"
              fill="url(#scarfGrad)"
              stroke="#991b1b"
              strokeWidth="1.2"
            />
            {/* Neckerchief Front Knot & Tails */}
            <ellipse cx="80" cy="103" rx="3.5" ry="3" fill="#dc2626" />
            <path d="M78 104 L74 113 L79 110 L82 113 L81 104 Z" fill="#b91c1c" />

            {/* ===================================================
                RIGHT ARM: HELD ROLLING PIN OR BROW WIPE
               =================================================== */}
            <motion.g
              animate={
                currentAction === 'wipe_brow'
                  ? {
                      // Hand sweeps across brow from right to left and back
                      rotate: [-20, -118, -125, -112, -20],
                      x: [0, -12, -22, -14, 0],
                      y: [0, -42, -45, -40, 0],
                    }
                  : currentAction === 'cheer'
                  ? {
                      rotate: [-15, -60, -45, -60, -15],
                      x: [0, -4, -6, -4, 0],
                      y: [0, -15, -10, -15, 0],
                    }
                  : {
                      rotate: 0,
                      x: 0,
                      y: 0,
                    }
              }
              transition={{
                duration: currentAction === 'wipe_brow' ? 3.0 : 1.8,
                times: currentAction === 'wipe_brow' ? [0, 0.28, 0.55, 0.78, 1] : undefined,
                ease: 'easeInOut',
              }}
              style={{ originX: '106px', originY: '110px' }}
            >
              {/* Right Upper Sleeve */}
              <path
                d="M104 106 C112 108 122 114 122 122 C122 128 116 132 110 134 C106 128 102 118 104 106 Z"
                fill="url(#coatGrad)"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Right Forearm & Hand */}
              <ellipse cx="114" cy="136" rx="5" ry="6" fill="url(#skinGrad)" />

              {/* White Kitchen Cloth / Towel in Hand (used to wipe brow) */}
              <g>
                <path
                  d="M110 137 C108 144 112 152 115 155 C118 152 121 146 120 137 Z"
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <path d="M113 140 L113 151" stroke="#e2e8f0" strokeWidth="0.8" />
              </g>

              {/* Wooden Rolling Pin (resting along arm when not wiping) */}
              {currentAction !== 'wipe_brow' && (
                <g>
                  {/* Rolling pin barrel */}
                  <rect x="122" y="118" width="7" height="34" rx="3.5" fill="url(#woodGrad)" stroke="#92400e" strokeWidth="1" />
                  {/* Handles */}
                  <rect x="124" y="112" width="3" height="6" rx="1" fill="#78350f" />
                  <rect x="124" y="152" width="3" height="6" rx="1" fill="#78350f" />
                </g>
              )}
            </motion.g>

            {/* ===================================================
                LEFT ARM: WRISTWATCH CHECK OR READY STANCE
               =================================================== */}
            <motion.g
              animate={
                currentAction === 'check_watch'
                  ? {
                      // Arm raises wrist to eye level in front of chest
                      rotate: [10, 82, 85, 80, 10],
                      x: [0, 14, 18, 15, 0],
                      y: [0, -22, -26, -23, 0],
                    }
                  : currentAction === 'cheer'
                  ? {
                      rotate: [0, 45, 30, 45, 0],
                      x: [0, 6, 4, 6, 0],
                      y: [0, -10, -6, -10, 0],
                    }
                  : {
                      rotate: 0,
                      x: 0,
                      y: 0,
                    }
              }
              transition={{
                duration: currentAction === 'check_watch' ? 3.2 : 1.8,
                times: currentAction === 'check_watch' ? [0, 0.25, 0.6, 0.85, 1] : undefined,
                ease: 'easeInOut',
              }}
              style={{ originX: '54px', originY: '110px' }}
            >
              {/* Left Upper Sleeve */}
              <path
                d="M56 106 C48 108 38 114 38 122 C38 128 44 132 50 134 C54 128 58 118 56 106 Z"
                fill="url(#coatGrad)"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Left Forearm & Hand */}
              <ellipse cx="46" cy="136" rx="5" ry="6" fill="url(#skinGrad)" />

              {/* Gold Wristwatch (Chef's Kitchen Timer Watch) */}
              <g transform="translate(43, 133)">
                {/* Watch Strap (Brown Leather) */}
                <rect x="0" y="0" width="7" height="6" rx="1.5" fill="#78350f" />
                {/* Golden Watch Case */}
                <circle cx="3.5" cy="3" r="4.2" fill="url(#goldGrad)" stroke="#854d0e" strokeWidth="0.8" />
                {/* White Watch Dial Face */}
                <circle cx="3.5" cy="3" r="2.8" fill="#ffffff" />
                {/* Watch Hour & Minute Hands */}
                <line x1="3.5" y1="3" x2="3.5" y2="1.2" stroke="#1e293b" strokeWidth="0.8" strokeLinecap="round" />
                <line x1="3.5" y1="3" x2="5.0" y2="3" stroke="#ef4444" strokeWidth="0.7" strokeLinecap="round" />

                {/* Watch Active Pulse / Sparkle */}
                {watchActive && (
                  <circle
                    cx="3.5"
                    cy="3"
                    r="6.5"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.8"
                    className="animate-ping opacity-75"
                  />
                )}
              </g>
            </motion.g>

            {/* ===================================================
                HEAD, FACE & TOQUE BLANCHE (Chef Hat)
               =================================================== */}
            <motion.g
              animate={
                currentAction === 'check_watch'
                  ? {
                      // Tilts head down-left toward wrist
                      rotate: [-2, 7, 8, 6, -2],
                      x: [0, -3, -4, -3, 0],
                      y: [0, 2, 3, 2, 0],
                    }
                  : currentAction === 'wipe_brow'
                  ? {
                      // Tilts head slightly back as brow is wiped
                      rotate: [0, -6, -8, -4, 0],
                      x: [0, 2, 3, 2, 0],
                      y: [0, -1.5, -2, -1, 0],
                    }
                  : currentAction === 'look_around'
                  ? {
                      rotate: [0, -10, 10, -8, 0],
                      x: [0, -3, 3, -2, 0],
                    }
                  : currentAction === 'cheer'
                  ? {
                      rotate: [0, -8, 8, -5, 0],
                      y: [0, -4, 0, -3, 0],
                    }
                  : {
                      rotate: 0,
                      x: 0,
                      y: 0,
                    }
              }
              transition={{
                duration:
                  currentAction === 'check_watch'
                    ? 3.2
                    : currentAction === 'wipe_brow'
                    ? 3.0
                    : currentAction === 'look_around'
                    ? 2.6
                    : 1.8,
                ease: 'easeInOut',
              }}
              style={{ originX: '80px', originY: '88px' }}
            >
              {/* Ears */}
              <ellipse cx="61" cy="74" rx="4.5" ry="6" fill="url(#skinGrad)" stroke="#f97316" strokeWidth="0.8" />
              <ellipse cx="99" cy="74" rx="4.5" ry="6" fill="url(#skinGrad)" stroke="#f97316" strokeWidth="0.8" />

              {/* Head / Face Base */}
              <path
                d="M62 66 C62 50 98 50 98 66 C98 84 92 90 80 90 C68 90 62 84 62 66 Z"
                fill="url(#skinGrad)"
                stroke="#ea580c"
                strokeWidth="1"
              />

              {/* Rosy Chef Cheeks */}
              <ellipse cx="68" cy="76" rx="4.2" ry="3" fill="#f87171" opacity="0.45" />
              <ellipse cx="92" cy="76" rx="4.2" ry="3" fill="#f87171" opacity="0.45" />

              {/* Nose */}
              <ellipse cx="80" cy="72" rx="4.5" ry="3.8" fill="#fb923c" stroke="#ea580c" strokeWidth="0.8" />
              <ellipse cx="79" cy="71" rx="1.6" ry="1.2" fill="#ffedd5" opacity="0.7" />

              {/* Eyebrows */}
              <motion.g
                animate={
                  currentAction === 'check_watch'
                    ? { y: 1.2, rotate: 3 }
                    : currentAction === 'wipe_brow'
                    ? { y: -1.5, rotate: -2 }
                    : { y: 0, rotate: 0 }
                }
              >
                {/* Left Eyebrow */}
                <path d="M68 62 Q73 59 76 62" stroke="#451a03" strokeWidth="2.4" strokeLinecap="round" />
                {/* Right Eyebrow */}
                <path d="M84 62 Q87 59 92 62" stroke="#451a03" strokeWidth="2.4" strokeLinecap="round" />
              </motion.g>

              {/* Eyes & Blinking Animation */}
              <motion.g
                animate={{
                  scaleY: isBlinking ? 0.12 : 1,
                }}
                transition={{ duration: 0.1 }}
                style={{ originX: '80px', originY: '66px' }}
              >
                {/* Eye Whites */}
                <ellipse cx="72" cy="66" rx="3.5" ry="4.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
                <ellipse cx="88" cy="66" rx="3.5" ry="4.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />

                {/* Eyeballs / Pupils (shifts direction based on action) */}
                <motion.g
                  animate={
                    currentAction === 'check_watch'
                      ? { x: -1.8, y: 1.8 } // Looking down-left at wrist
                      : currentAction === 'wipe_brow'
                      ? { x: 0.5, y: -1.2 } // Looking relieved up
                      : currentAction === 'look_around'
                      ? { x: [-2, 2, -1], y: 0 }
                      : { x: 0, y: 0 }
                  }
                  transition={{ duration: 0.3 }}
                >
                  <circle cx="72" cy="66" r="2.2" fill="#1e293b" />
                  <circle cx="73" cy="65.2" r="0.8" fill="#ffffff" />

                  <circle cx="88" cy="66" r="2.2" fill="#1e293b" />
                  <circle cx="89" cy="65.2" r="0.8" fill="#ffffff" />
                </motion.g>
              </motion.g>

              {/* Sweat Droplet on Brow (Active during wipe_brow) */}
              <AnimatePresence>
                {sweatVisible && (
                  <motion.g
                    initial={{ opacity: 0, scale: 0.2, y: 2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.4, y: -4, x: 6 }}
                    transition={{ duration: 0.35 }}
                  >
                    <path
                      d="M92 58 C92 58 94 62 94 63.5 C94 64.8 93 65.8 91.8 65.8 C90.5 65.8 89.5 64.8 89.5 63.5 C89.5 62 92 58 92 58 Z"
                      fill="#38bdf8"
                      stroke="#0284c7"
                      strokeWidth="0.6"
                    />
                    <ellipse cx="91.2" cy="63.2" rx="0.7" ry="1.1" fill="#ffffff" opacity="0.8" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Italian Curved Handlebar Mustache */}
              <motion.g
                animate={
                  currentAction === 'check_watch'
                    ? { rotate: 2, y: 0.5 }
                    : currentAction === 'wipe_brow'
                    ? { rotate: -1, y: -0.5 }
                    : currentAction === 'cheer'
                    ? { scale: 1.06, y: -1 }
                    : { rotate: [0, 1, 0, -1, 0] }
                }
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                style={{ originX: '80px', originY: '77px' }}
              >
                {/* Left Mustache Swirl */}
                <path
                  d="M80 77 C77 75 71 74 66 77 C62 79 58 80 57 77 C56 74 61 72 67 72 C73 72 78 75 80 77 Z"
                  fill="#451a03"
                />
                {/* Right Mustache Swirl */}
                <path
                  d="M80 77 C83 75 89 74 94 77 C98 79 102 80 103 77 C104 74 99 72 93 72 C87 72 82 75 80 77 Z"
                  fill="#451a03"
                />
                {/* Center Mustache Bridge */}
                <ellipse cx="80" cy="76" rx="4" ry="2.2" fill="#451a03" />
              </motion.g>

              {/* Mouth */}
              {currentAction === 'check_watch' ? (
                // Focused small "O" mouth while checking watch
                <ellipse cx="80" cy="83" rx="2" ry="2.5" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
              ) : currentAction === 'wipe_brow' ? (
                // Relieved soft sigh smile
                <path d="M76 82 Q80 85 84 82" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              ) : currentAction === 'cheer' ? (
                // Wide open joyful smile
                <path d="M74 81 Q80 88 86 81 Z" fill="#b91c1c" stroke="#451a03" strokeWidth="1" />
              ) : (
                // Friendly resting smile
                <path d="M75 82 Q80 86 85 82" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              )}

              {/* ===================================================
                  CHEF'S TOQUE BLANCHE (Chef Hat)
                 =================================================== */}
              <motion.g
                animate={
                  currentAction === 'cheer'
                    ? {
                        y: [-2, -8, -2],
                        rotate: [0, -6, 0],
                      }
                    : {
                        rotate: [0, 1.2, 0, -1.2, 0],
                      }
                }
                transition={{
                  repeat: currentAction === 'cheer' ? 1 : Infinity,
                  duration: currentAction === 'cheer' ? 0.6 : 3.8,
                  ease: 'easeInOut',
                }}
                style={{ originX: '80px', originY: '52px' }}
              >
                {/* Hat Headband */}
                <path
                  d="M62 52 C62 50 70 49 80 49 C90 49 98 50 98 52 L99 57 C99 58 91 59 80 59 C69 59 61 58 61 57 Z"
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                />

                {/* Italian Tricolor Hat Ribbon Accent */}
                <rect x="74" y="53" width="4" height="4" fill="#16a34a" />
                <rect x="78" y="53" width="4" height="4" fill="#ffffff" />
                <rect x="82" y="53" width="4" height="4" fill="#dc2626" />

                {/* Puffy Toque Crown / Folds */}
                <path
                  d="M61 52 C52 50 46 38 52 26 C57 16 70 18 72 23 C74 12 86 12 88 23 C90 16 103 16 108 26 C114 38 108 50 99 52 Z"
                  fill="url(#hatGradient)"
                  stroke="#cbd5e1"
                  strokeWidth="1.6"
                />

                {/* Vertical Fabric Creases */}
                <path d="M64 48 C66 36 67 28 72 24" stroke="url(#hatShadow)" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M80 49 C80 34 80 25 80 18" stroke="url(#hatShadow)" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M96 48 C94 36 93 28 88 24" stroke="url(#hatShadow)" strokeWidth="2.2" strokeLinecap="round" />

                {/* Little Golden Chef Star Badge on Hat */}
                <path
                  d="M80 34 L81.2 37.5 L84.8 37.5 L81.9 39.7 L83 43 L80 40.8 L77 43 L78.1 39.7 L75.2 37.5 L78.8 37.5 Z"
                  fill="#f59e0b"
                  stroke="#b45309"
                  strokeWidth="0.5"
                />
              </motion.g>
            </motion.g>
          </motion.g>
        </svg>

        {/* Small floating Flour Sparkles around the Chef */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span className="absolute top-2 left-3 w-1.5 h-1.5 bg-white/70 rounded-full animate-ping opacity-50" />
          <span className="absolute top-10 right-2 w-1 h-1 bg-amber-200/80 rounded-full animate-pulse" />
          <span className="absolute bottom-4 left-6 w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" />
        </div>
      </motion.div>

      {/* Interactive Action Badges & Character Name */}
      <div className="mt-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-white/10 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider font-display">
            Chef Luigi • En Guardia
          </span>
        </div>

        {/* Action Previewer Pills (Allowing player to manually see the animations on demand!) */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerAction('check_watch', true);
            }}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
              currentAction === 'check_watch'
                ? 'bg-amber-500/30 text-amber-200 border-amber-400/50 scale-105'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
            }`}
            title="Ver al chef chequear su reloj"
          >
            ⏱️ Mirar Reloj
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerAction('wipe_brow', true);
            }}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
              currentAction === 'wipe_brow'
                ? 'bg-sky-500/30 text-sky-200 border-sky-400/50 scale-105'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
            }`}
            title="Ver al chef secarse la frente con el paño"
          >
            💦 Secar Frente
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerAction('cheer', true);
            }}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
              currentAction === 'cheer'
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 scale-105'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
            }`}
            title="Saludar al Chef"
          >
            👨‍🍳 Saludar
          </button>
        </div>
      </div>
    </div>
  );
};
