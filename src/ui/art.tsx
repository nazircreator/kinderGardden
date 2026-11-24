import { useEffect, useRef } from 'react';
import { drawProp } from '../game/sprites';
import { ZONES } from '../game/content';
import type { PropKind, Weather, ZoneId } from '../game/types';

export function DecorPreview({ kind, size = 64, zone = 'meadow' }: { kind: PropKind; size?: number; zone?: ZoneId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    // choose a scale that fits the biggest props
    const big = kind === 'cottage' || kind === 'well' || kind === 'pergola' || kind === 'arch' || kind === 'swing' || kind === 'blossom' || kind === 'tree' || kind === 'pine';
    const scale = big ? 1.5 : 2.1;
    ctx.scale(scale, scale);
    ctx.translate(30, 30);
    ctx.translate(-30, -30);
    drawProp(ctx, kind, 30, 44, zone, 0, 1.5, 0);
    ctx.restore();
  }, [kind, zone]);
  return <canvas ref={ref} width={60} height={56} style={{ width: size, height: (size * 56) / 60 }} className="pixel" aria-hidden />;
}

export function ZoneThumb({ zone, size = 88, locked = false }: { zone: ZoneId; size?: number; locked?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const z = ZONES[zone];
    const W = c.width;
    const H = c.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = z.theme.grass[1];
    ctx.fillRect(0, 0, W, H);
    // grass tufts
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 3 === 0 ? z.theme.grass[3] : z.theme.grass[2];
      ctx.fillRect((i * 37) % W, (i * 23) % H, 2, 1);
    }
    // path
    ctx.fillStyle = z.theme.path[0];
    for (let i = 0; i < 6; i++) ctx.fillRect(10 + i * 11, 58 - i * 5, 14, 5);
    // water
    if (z.water?.[0]) {
      const w = z.water[0];
      const cx = W * 0.42;
      const cy = H * 0.42;
      ctx.fillStyle = z.theme.water[1];
      ctx.beginPath();
      ctx.ellipse(cx, cy, w.rx * 3.2, w.ry * 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = z.theme.water[0];
      ctx.beginPath();
      ctx.ellipse(cx, cy - 1, w.rx * 2.8, w.ry * 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = z.theme.water[2];
      ctx.fillRect(cx - 8, cy - 3, 9, 1);
    }
    // representative foliage
    ctx.save();
    ctx.translate(W / 2, H - 6);
    ctx.scale(0.82, 0.82);
    const picks: Partial<Record<ZoneId, PropKind[]>> = {
      meadow: ['cottage', 'tree', 'blossom'],
      pond: ['reeds', 'blossom', 'lily'],
      sunroot: ['sunflower', 'scarecrow', 'sunflower'],
      whisper: ['mushroomGiant', 'crystal', 'mushroomGiant'],
      orchard: ['blossom', 'swing', 'blossom'],
    };
    const list = picks[zone] ?? ['tree'];
    if (zone === 'meadow') {
      ctx.translate(-22, -2);
      drawProp(ctx, 'cottage', 0, 0, zone, 0, 0, 0);
      ctx.translate(38, 6);
      drawProp(ctx, 'tree', 0, 0, zone, 0, 0, 0);
    } else if (zone === 'pond') {
      drawProp(ctx, 'reeds', -16, 0, zone, 0, 0, 0);
      ctx.translate(24, -4);
      drawProp(ctx, 'blossom', 0, 0, zone, 0, 0, 0);
    } else if (zone === 'sunroot') {
      drawProp(ctx, 'sunflower', -18, 0, zone, 0, 0, 0);
      ctx.translate(20, 0);
      drawProp(ctx, 'sunflower', 0, 0, zone, 1, 0, 0);
    } else if (zone === 'whisper') {
      drawProp(ctx, 'mushroomGiant', -12, 0, zone, 1, 0, 0);
      ctx.translate(22, 2);
      drawProp(ctx, 'mushroomGiant', 0, 0, zone, 0, 0, 0);
    } else {
      drawProp(ctx, 'blossom', -14, 0, zone, 0, 0, 0);
      ctx.translate(22, 0);
      drawProp(ctx, 'blossom', 0, 0, zone, 2, 0, 0);
    }
    ctx.restore();
    void list;
    if (locked) {
      ctx.fillStyle = 'rgba(24, 30, 20, 0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(230, 215, 180, 0.5)';
      ctx.lineWidth = 2;
      // little lock
      ctx.strokeRect(W / 2 - 9, H / 2 - 4, 18, 14);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2 - 5, 6, Math.PI, 0);
      ctx.stroke();
    }
  }, [zone, locked]);
  return <canvas ref={ref} width={88} height={66} style={{ width: size, height: (size * 66) / 88 }} className="pixel" aria-hidden />;
}

export function WeatherIcon({ weather, size = 14 }: { weather: Weather; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', style: { imageRendering: 'pixelated' as const } };
  if (weather === 'sunny') {
    return (
      <svg {...common} aria-hidden>
        <circle cx="8" cy="8" r="3.6" fill="#ffd873" />
        <circle cx="8" cy="8" r="2.4" fill="#fff0b8" />
        <g fill="#ffd873">
          <rect x="7" y="0" width="2" height="2.4" />
          <rect x="7" y="13.6" width="2" height="2.4" />
          <rect x="0" y="7" width="2.4" height="2" />
          <rect x="13.6" y="7" width="2.4" height="2" />
        </g>
      </svg>
    );
  }
  if (weather === 'softclouds') {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="5" width="10" height="7" rx="3" fill="#e8eef0" />
        <rect x="6" y="3" width="6" height="5" rx="2.5" fill="#f6fbfc" />
        <rect x="2" y="8" width="12" height="4" rx="2" fill="#cfdadd" />
      </svg>
    );
  }
  if (weather === 'drizzle') {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="4" width="10" height="6" rx="3" fill="#d7e2e6" />
        <rect x="5" y="2.5" width="6" height="4" rx="2" fill="#eef4f6" />
        <g fill="#8fd3e8">
          <rect x="4" y="11" width="1.4" height="3" />
          <rect x="7.5" y="11" width="1.4" height="4" />
          <rect x="11" y="11" width="1.4" height="3" />
        </g>
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="8" cy="7" r="4" fill="#f4e6ac" />
      <circle cx="8" cy="7" r="4" fill="none" stroke="#fff6cd" strokeWidth="1" />
      <g fill="#f4e6ac">
        <rect x="1" y="11" width="1.5" height="1.5" />
        <rect x="12" y="2" width="1.5" height="1.5" />
        <rect x="14" y="9" width="1" height="1" />
      </g>
    </svg>
  );
}

export function SproutStageIcon({ stage, size = 18 }: { stage: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }} aria-hidden>
      <rect x="7" y="9" width="2" height="5" fill="#5d8747" />
      {stage >= 1 && (
        <>
          <rect x="4" y="7" width="3" height="2" fill="#8fbf6c" />
          <rect x="9" y="6" width="3" height="2" fill="#7cb05c" />
        </>
      )}
      {stage >= 2 && <circle cx="8" cy="5" r="3" fill="#e8b85a" />}
      {stage >= 3 && (
        <>
          <circle cx="8" cy="3" r="2" fill="#f6d477" />
          <rect x="7" y="4" width="2" height="2" fill="#fff0b8" />
        </>
      )}
      {stage === 0 && <rect x="6" y="9" width="4" height="2" fill="#8fbf6c" />}
      <rect x="3" y="14" width="10" height="1.5" fill="#7d6a4a" />
    </svg>
  );
}