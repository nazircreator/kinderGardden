import { useEffect, useRef } from 'react';
import { drawSprout } from '../game/sprites';
import { SPROUT_BY_ID, SPROUTS } from '../game/content';
import type { Mood, SproutKind, SproutPalette } from '../game/types';

export function SproutPortrait({
  id,
  mood = 'content',
  size = 64,
  stage = 3,
  flip = false,
  className = '',
}: {
  id: string;
  mood?: Mood;
  size?: number;
  stage?: 0 | 1 | 2 | 3;
  flip?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const def = SPROUT_BY_ID[id] ?? SPROUTS[0];
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.save();
      ctx.translate(0, 6);
      drawSprout(ctx, 24, 38, {
        stage,
        kind: def.kind,
        pal: def.palette,
        mood,
        facing: flip ? -1 : 1,
        time: t,
        moving: false,
        crying: mood === 'crying',
        asleep: mood === 'asleep',
      });
      ctx.restore();
    };
    let last = performance.now();
    const loop = (now: number) => {
      t += (now - last) / 1000;
      last = now;
      draw();
      raf = requestAnimationFrame(loop);
    };
    if (mood === 'asleep' || mood === 'content' || mood === 'sad') {
      // static-ish frames still animate breathing subtly
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [def.kind, def.palette, mood, stage, flip]);

  return <canvas ref={ref} width={48} height={48} style={{ width: size, height: size }} className={`pixel ${className}`} aria-hidden />;
}

export function TileCanvas({
  draw,
  size = 48,
}: {
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    draw(ctx, c.width, c.height);
  }, [draw]);
  return <canvas ref={ref} width={48} height={48} style={{ width: size, height: size }} className="pixel" aria-hidden />;
}

export function MoodDot({ mood }: { mood: Mood }) {
  const map: Record<Mood, string> = {
    joyful: 'var(--mood-joy)',
    excited: 'var(--mood-joy)',
    content: 'var(--mood-good)',
    uneasy: 'var(--mood-uneasy)',
    hungry: 'var(--mood-warn)',
    parched: 'var(--mood-warn)',
    weary: 'var(--mood-tired)',
    sad: 'var(--mood-sad)',
    crying: 'var(--mood-cry)',
    asleep: 'var(--mood-sleep)',
  };
  return <span className="mood-dot" style={{ background: map[mood] }} aria-hidden />;
}

export function Meter({
  value,
  color,
  label,
  compact = false,
  warnBelow = 25,
}: {
  value: number;
  color: string;
  label: string;
  compact?: boolean;
  warnBelow?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const low = pct < warnBelow;
  return (
    <div className={`meter ${compact ? 'meter-compact' : ''}`} title={`${label}: ${Math.round(pct)}%`}>
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span className={`meter-fill ${low ? 'low' : ''}`} style={{ width: `${pct}%`, background: color }} />
      </span>
    </div>
  );
}