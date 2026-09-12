import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { MoleType } from '../../types';

export interface MoleParticleCanvasRef {
  triggerExplosion: (
    x: number,
    y: number,
    type: MoleType,
    isCrit?: boolean,
    isDefeated?: boolean
  ) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  baseSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  shape: 'circle' | 'star' | 'diamond' | 'streak' | 'ring_particle';
  rotation: number;
  rotSpeed: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  life: number;
  maxLife: number;
}

interface ImpactFlash {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

// Particle color configurations tuned specifically to each mole archetype
const MOLE_THEMES: Record<
  MoleType,
  {
    colors: string[];
    ringColor: string;
    glowColor: string;
    flashColor: string;
    shapes: Array<'circle' | 'star' | 'diamond' | 'streak'>;
    baseCount: number;
    speedMultiplier: number;
  }
> = {
  standard: {
    colors: ['#ef4444', '#f97316', '#facc15', '#22c55e', '#ffffff', '#fb923c'],
    ringColor: 'rgba(239, 68, 68, 0.85)',
    glowColor: '#f97316',
    flashColor: 'rgba(249, 115, 22, 0.7)',
    shapes: ['circle', 'streak'],
    baseCount: 20,
    speedMultiplier: 1.0,
  },
  fast: {
    colors: ['#06b6d4', '#38bdf8', '#67e8f9', '#facc15', '#ffffff', '#0284c7'],
    ringColor: 'rgba(6, 182, 212, 0.9)',
    glowColor: '#38bdf8',
    flashColor: 'rgba(56, 189, 248, 0.8)',
    shapes: ['streak', 'diamond', 'circle'],
    baseCount: 22,
    speedMultiplier: 1.45,
  },
  bomb: {
    colors: ['#dc2626', '#ea580c', '#f59e0b', '#1e293b', '#fee2e2', '#7f1d1d'],
    ringColor: 'rgba(220, 38, 38, 0.95)',
    glowColor: '#ea580c',
    flashColor: 'rgba(239, 68, 68, 0.9)',
    shapes: ['circle', 'streak'],
    baseCount: 5,
    speedMultiplier: 0.8,
  },

};


export const MoleParticleCanvas = forwardRef<MoleParticleCanvasRef, { className?: string }>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const ringsRef = useRef<ShockwaveRing[]>([]);
    const flashesRef = useRef<ImpactFlash[]>([]);
    const animFrameRef = useRef<number | null>(null);
    const isRunningRef = useRef<boolean>(false);
    const lastTimeRef = useRef<number>(performance.now());

    // Resize canvas to match display size & account for devicePixelRatio
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const width = Math.floor(rect.width * dpr);
      const height = Math.floor(rect.height * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }, []);

    useEffect(() => {
      resizeCanvas();
      const handleResize = () => resizeCanvas();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, [resizeCanvas]);

    // Draw 4-point sparkle star
    const drawStar = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outerRadius: number,
      innerRadius: number,
      angle: number
    ) => {
      let rot = (Math.PI / 2) * 3 + angle;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    // Main 60fps animation tick
    const loop = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        isRunningRef.current = false;
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isRunningRef.current = false;
        return;
      }

      const now = performance.now();
      const delta = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Render & Update Central Impact Flashes
      for (let i = flashesRef.current.length - 1; i >= 0; i--) {
        const f = flashesRef.current[i];
        f.life += delta;
        const progress = f.life / f.maxLife;

        if (progress >= 1) {
          flashesRef.current.splice(i, 1);
          continue;
        }

        const currentAlpha = (1 - progress) * f.alpha;
        const currentRadius = f.radius * (1 + progress * 0.4);

        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, currentRadius);
        grad.addColorStop(0, f.color.replace(/[\d.]+\)$/, `${currentAlpha})`));
        grad.addColorStop(1, f.color.replace(/[\d.]+\)$/, '0)'));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render & Update Expanding Shockwave Rings
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        const ring = ringsRef.current[i];
        ring.life += delta;
        const progress = ring.life / ring.maxLife;

        if (progress >= 1) {
          ringsRef.current.splice(i, 1);
          continue;
        }

        // Ease-out cubic expansion
        const eased = 1 - Math.pow(1 - progress, 3);
        const curRadius = ring.radius + (ring.maxRadius - ring.radius) * eased;
        const alpha = Math.max(0, 1 - progress);
        const curLineWidth = Math.max(0.5, ring.lineWidth * (1 - progress * 0.75));

        ctx.save();
        ctx.strokeStyle = ring.color.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.lineWidth = curLineWidth;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, curRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Render & Update Burst Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += delta;
        const progress = p.life / p.maxLife;

        if (progress >= 1 || p.size <= 0.2) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        // Physics: Velocity, Drag, Gravity
        p.vx *= Math.pow(p.drag, delta * 60);
        p.vy *= Math.pow(p.drag, delta * 60);
        p.vy += p.gravity * delta;

        p.x += p.vx * delta * 60;
        p.y += p.vy * delta * 60;

        p.rotation += p.rotSpeed * delta;
        p.alpha = Math.max(0, 1 - progress);
        p.size = Math.max(0, p.baseSize * (1 - progress * 0.85));

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'star') {
          drawStar(ctx, 0, 0, 4, p.size * 1.5, p.size * 0.5, 0);
        } else if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.3);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size * 1.3);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'streak') {
          // Elongated along motion vector
          const speed = Math.hypot(p.vx, p.vy);
          const stretch = Math.min(3.5, 1 + speed * 0.15);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * stretch, p.size * 0.7, Math.atan2(p.vy, p.vx) - p.rotation, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Circle / Glow dot
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();

      // Continue running loop if particles, rings or flashes exist
      if (
        particlesRef.current.length > 0 ||
        ringsRef.current.length > 0 ||
        flashesRef.current.length > 0
      ) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        isRunningRef.current = false;
        animFrameRef.current = null;
      }
    }, []);

    const startLoop = useCallback(() => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        lastTimeRef.current = performance.now();
        animFrameRef.current = requestAnimationFrame(loop);
      }
    }, [loop]);

    // Imperative Trigger function callable upon mole whack
    const triggerExplosion = useCallback(
      (
        x: number,
        y: number,
        type: MoleType,
        isCrit = false,
        isDefeated = false
      ) => {
        // Bomb explosion 100% disabled: zero flashes, rings or canvas particles for total stability
        if (type === 'bomb') return;

        resizeCanvas();
        const theme = MOLE_THEMES[type] || MOLE_THEMES.standard;

        // Performance cap: skip if too many particles already active
        if (particlesRef.current.length > 50) return;

        const countMult = (isCrit ? 1.4 : 1.0) * (isDefeated ? 1.25 : 1.0);
        const particleCount = Math.round(theme.baseCount * countMult);

        // 1. Central Core Impact Flash
        flashesRef.current.push({
          x,
          y,
          radius: isCrit ? 48 : 34,
          color: theme.flashColor,
          alpha: 0.85,
          life: 0,
          maxLife: 0.18,
        });

        // 2. Shockwave Expanding Ring
        ringsRef.current.push({
          x,
          y,
          radius: 6,
          maxRadius: isCrit ? 95 : 72,
          color: theme.ringColor,
          lineWidth: isCrit ? 5.5 : 3.5,
          life: 0,
          maxLife: 0.3,
        });

        // Extra secondary ring on crits
        if (isCrit) {
          setTimeout(() => {
            ringsRef.current.push({
              x,
              y,
              radius: 12,
              maxRadius: 110,
              color: theme.colors[0] ? `${theme.colors[0]}cc` : 'rgba(255, 255, 255, 0.8)',
              lineWidth: 2.5,
              life: 0,
              maxLife: 0.35,
            });
            startLoop();
          }, 60);
        }

        // 3. Radial Particle Burst
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.55;
          const speedBase = 2.5 + Math.random() * 6.5;
          const speed = speedBase * theme.speedMultiplier * (isCrit ? 1.3 : 1.0);

          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed - (Math.random() * 1.8); // slight upward bias

          const color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
          const shape = theme.shapes[Math.floor(Math.random() * theme.shapes.length)];
          const baseSize = (2.8 + Math.random() * 4.2) * (isCrit ? 1.35 : 1.0);

          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            vx,
            vy,
            color,
            size: baseSize,
            baseSize,
            alpha: 1.0,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.3,
            gravity: 5.0,
            drag: 0.945,
            shape,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 12,
          });
        }

        // 4. Auxiliary Micro-Sparks / Glitter
        const glitterCount = isCrit ? 14 : 6;

        for (let g = 0; g < glitterCount; g++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (4.0 + Math.random() * 7.0) * theme.speedMultiplier;
          const color = Math.random() > 0.4 ? '#ffffff' : theme.glowColor;

          particlesRef.current.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            size: 2.0 + Math.random() * 2.2,
            baseSize: 2.0 + Math.random() * 2.2,
            alpha: 1.0,
            life: 0,
            maxLife: 0.3 + Math.random() * 0.25,
            gravity: 2.5,
            drag: 0.92,
            shape: 'star',
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 16,
          });
        }

        startLoop();
      },
      [resizeCanvas, startLoop]
    );

    useImperativeHandle(
      ref,
      () => ({
        triggerExplosion,
      }),
      [triggerExplosion]
    );

    return (
      <canvas
        ref={canvasRef}
        id="mole_particle_canvas_overlay"
        className={`absolute inset-0 w-full h-full pointer-events-none z-30 ${className}`}
      />
    );
  }
);

MoleParticleCanvas.displayName = 'MoleParticleCanvas';
