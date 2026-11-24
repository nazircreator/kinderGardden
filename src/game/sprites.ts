import type { Mood, PropKind, SproutKind, SproutPalette, ZoneId } from './types';
import { hash2 } from './content';

export type Ctx = CanvasRenderingContext2D;

export function R(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function P(ctx: Ctx, x: number, y: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  // pixel ellipse
  const rxi = Math.max(1, Math.round(rx));
  const ryi = Math.max(1, Math.round(ry));
  for (let y = -ryi; y <= ryi; y++) {
    const t = 1 - (y * y) / (ryi * ryi);
    if (t < 0) continue;
    const w = Math.round(rxi * Math.sqrt(t));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), Math.max(1, w * 2), 1);
  }
}

export function shadowEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.25) {
  ctx.fillStyle = `rgba(20, 30, 15, ${alpha})`;
  const rxi = Math.max(1, Math.round(rx));
  const ryi = Math.max(1, Math.round(ry));
  for (let y = -ryi; y <= ryi; y++) {
    const t = 1 - (y * y) / (ryi * ryi);
    const w = Math.round(rxi * Math.sqrt(t));
    if (w > 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

/* ------------------------------------------------------------------ */
/*  KEEPER                                                             */
/* ------------------------------------------------------------------ */

const K = {
  hat: '#e8c97e',
  hatDark: '#c19b55',
  hatLight: '#f6e3ae',
  band: '#6d8f5a',
  bandDark: '#4e6b41',
  skin: '#f0c09b',
  skinShade: '#d79b78',
  skinLight: '#ffd9bb',
  hair: '#6f4a2f',
  hairDark: '#4e3220',
  shirt: '#8fb6c9',
  shirtShade: '#6c94a9',
  apron: '#f1e6cf',
  apronShade: '#d6c6a8',
  skirt: '#6b7f5d',
  skirtShade: '#52644a',
  boot: '#5c4632',
  bootDark: '#3f3022',
  eye: '#2c241d',
  blush: '#e79a7c',
};

export function drawPlayer(
  ctx: Ctx,
  x: number,
  y: number,
  dir: 0 | 1 | 2 | 3, // 0 down 1 up 2 left 3 right
  moving: boolean,
  running: boolean,
  time: number,
) {
  const bob = moving ? (Math.floor(time * (running ? 12 : 7)) % 2 === 0 ? 0 : -1) : 0;
  const step = moving ? Math.floor(time * (running ? 12 : 7)) % 4 : 0;
  const X = Math.round(x) - 7;
  const Y = Math.round(y) - 26 + bob;

  shadowEllipse(ctx, Math.round(x), Math.round(y) - 1, 7, 2.5, 0.3);

  // legs
  const legSwing = moving ? [0, 1, 0, -1][step] : 0;
  R(ctx, X + 4, Y + 21, 3, 5, K.skirtShade);
  R(ctx, X + 8, Y + 21, 3, 5, K.skirtShade);
  if (dir !== 1) {
    R(ctx, X + 4 + Math.min(0, legSwing), Y + 22, 3, 3, K.skinShade);
    R(ctx, X + 8 + Math.max(0, legSwing), Y + 22, 3, 3, K.skinShade);
    R(ctx, X + 4 + Math.min(0, legSwing), Y + 24, 3, 2, K.boot);
    R(ctx, X + 8 + Math.max(0, legSwing), Y + 24, 3, 2, K.boot);
    R(ctx, X + 3 + Math.min(0, legSwing), Y + 25, 4, 1, K.bootDark);
    R(ctx, X + 8 + Math.max(0, legSwing), Y + 25, 4, 1, K.bootDark);
  } else {
    R(ctx, X + 5, Y + 20, 6, 5, K.skirtShade);
    R(ctx, X + 5, Y + 24, 6, 2, K.boot);
  }

  // body / apron
  R(ctx, X + 3, Y + 13, 9, 8, K.shirt);
  R(ctx, X + 3, Y + 13, 2, 8, K.shirtShade);
  R(ctx, X + 5, Y + 13, 5, 9, K.apron);
  R(ctx, X + 5, Y + 13, 1, 9, K.apronShade);
  R(ctx, X + 4, Y + 19, 8, 2, K.skirt);
  // apron tie
  R(ctx, X + 5, Y + 20, 6, 1, K.apron);

  // arms
  if (dir === 2) {
    R(ctx, X + 3, Y + 14, 2, 6, K.skinShade);
    R(ctx, X + 3, Y + 19, 2, 1, K.skin);
  } else if (dir === 3) {
    R(ctx, X + 10, Y + 14, 2, 6, K.skinShade);
    R(ctx, X + 10, Y + 19, 2, 1, K.skin);
  } else {
    const swing = moving ? (step === 1 ? 1 : step === 3 ? -1 : 0) : 0;
    R(ctx, X + 2, Y + 14 + Math.max(0, swing), 2, 6, K.shirt);
    R(ctx, X + 2, Y + 19 + Math.max(0, swing), 2, 2, K.skin);
    R(ctx, X + 11, Y + 14 + Math.max(0, -swing), 2, 6, K.shirt);
    R(ctx, X + 11, Y + 19 + Math.max(0, -swing), 2, 2, K.skin);
  }

  // head
  R(ctx, X + 4, Y + 6, 7, 8, K.skin);
  R(ctx, X + 3, Y + 7, 9, 6, K.skin);
  R(ctx, X + 3, Y + 12, 9, 1, K.skinShade);
  if (dir === 2) {
    R(ctx, X + 3, Y + 6, 2, 7, K.hair);
    R(ctx, X + 3, Y + 6, 6, 1, K.hair);
    R(ctx, X + 3, Y + 7, 1, 4, K.hairDark);
    P(ctx, X + 8, Y + 9, K.eye);
    R(ctx, X + 7, Y + 12, 2, 1, K.skinShade);
    R(ctx, X + 9, Y + 10, 1, 1, K.blush);
  } else if (dir === 3) {
    R(ctx, X + 9, Y + 6, 2, 7, K.hair);
    R(ctx, X + 4, Y + 6, 6, 1, K.hair);
    R(ctx, X + 11, Y + 7, 1, 4, K.hairDark);
    P(ctx, X + 6, Y + 9, K.eye);
    R(ctx, X + 7, Y + 12, 2, 1, K.skinShade);
    R(ctx, X + 4, Y + 10, 1, 1, K.blush);
  } else if (dir === 1) {
    R(ctx, X + 4, Y + 6, 7, 7, K.hair);
    R(ctx, X + 3, Y + 7, 9, 5, K.hair);
    R(ctx, X + 4, Y + 10, 7, 3, K.hairDark);
    R(ctx, X + 5, Y + 6, 5, 1, K.hair);
  } else {
    R(ctx, X + 3, Y + 6, 9, 2, K.hair);
    R(ctx, X + 3, Y + 7, 1, 3, K.hair);
    R(ctx, X + 11, Y + 7, 1, 3, K.hair);
    P(ctx, X + 5, Y + 9, K.eye);
    P(ctx, X + 9, Y + 9, K.eye);
    R(ctx, X + 4, Y + 9, 1, 1, K.skinLight);
    R(ctx, X + 10, Y + 9, 1, 1, K.skinLight);
    P(ctx, X + 4, Y + 11, K.blush);
    P(ctx, X + 11, Y + 11, K.blush);
    R(ctx, X + 6, Y + 12, 3, 1, K.skinShade);
  }

  // straw hat
  R(ctx, X + 1, Y + 4, 13, 2, K.hat);
  R(ctx, X + 2, Y + 5, 11, 1, K.hatDark);
  R(ctx, X + 4, Y + 1, 7, 4, K.hat);
  R(ctx, X + 4, Y + 1, 2, 4, K.hatLight);
  R(ctx, X + 8, Y + 1, 3, 4, K.hatDark);
  R(ctx, X + 4, Y + 4, 7, 1, K.band);
  R(ctx, X + 4, Y + 4, 2, 1, K.bandDark);
  R(ctx, X + 0, Y + 5, 2, 1, K.hatDark);
  R(ctx, X + 13, Y + 5, 2, 1, K.hatDark);

  // satchel strap
  if (dir !== 1) {
    R(ctx, X + 9, Y + 13, 1, 5, '#a5744f');
    R(ctx, X + 6, Y + 17, 4, 3, '#b98a5f');
    R(ctx, X + 7, Y + 18, 2, 1, '#8e6544');
  }
}

/* ------------------------------------------------------------------ */
/*  SPROUTS                                                            */
/* ------------------------------------------------------------------ */

interface SproutDrawOpts {
  stage: 0 | 1 | 2 | 3;
  kind: SproutKind;
  pal: SproutPalette;
  mood: Mood;
  facing: 1 | -1;
  time: number;
  moving: boolean;
  crying: boolean;
  asleep: boolean;
  excited?: boolean;
  alpha?: number;
  scale?: number;
}

const BODY_H = [13, 17, 21, 25];
const BODY_W = [9, 11, 13, 15];

export function sproutMoodFace(mood: Mood): { eyes: 'dot' | 'happy' | 'sad' | 'closed' | 'wide' | 'worried'; mouth: 'smile' | 'open' | 'frown' | 'flat' | 'wobble' | 'sleep' } {
  switch (mood) {
    case 'joyful':
      return { eyes: 'happy', mouth: 'smile' };
    case 'excited':
      return { eyes: 'wide', mouth: 'open' };
    case 'content':
      return { eyes: 'dot', mouth: 'smile' };
    case 'uneasy':
      return { eyes: 'worried', mouth: 'wobble' };
    case 'hungry':
      return { eyes: 'wide', mouth: 'open' };
    case 'parched':
      return { eyes: 'wide', mouth: 'open' };
    case 'weary':
      return { eyes: 'closed', mouth: 'flat' };
    case 'sad':
      return { eyes: 'sad', mouth: 'frown' };
    case 'crying':
      return { eyes: 'sad', mouth: 'open' };
    case 'asleep':
      return { eyes: 'closed', mouth: 'sleep' };
    default:
      return { eyes: 'dot', mouth: 'smile' };
  }
}

export function drawSprout(ctx: Ctx, x: number, y: number, o: SproutDrawOpts) {
  const pal = o.pal;
  const stage = o.stage;
  const H = BODY_H[stage];
  const W = BODY_W[stage];
  const t = o.time;
  const bob = o.moving ? (Math.floor(t * 8) % 2) : Math.floor(t * 2) % 2 === 0 ? 0 : 1;
  const cryShake = o.crying ? Math.round(Math.sin(t * 30)) : 0;
  const X = Math.round(x + cryShake) - (W >> 1);
  const Y = Math.round(y) - H - (o.crying ? 0 : bob);
  const dk = pal.shade;
  const lt = pal.light;
  const body = pal.body;
  const face = sproutMoodFace(o.mood);
  const f = o.facing;

  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  shadowEllipse(ctx, Math.round(x), Math.round(y) - 1, W / 2 + 1, 2, 0.28);

  // feet
  if (stage > 0) {
    const step = o.moving ? Math.floor(t * 10) % 4 : 0;
    if (o.asleep) {
      R(ctx, X + 2, Y + H - 2, 4, 2, pal.leafDark);
      R(ctx, X + W - 6, Y + H - 2, 4, 2, pal.leafDark);
    } else {
      const l = [0, 1, 0, -1][step];
      R(ctx, X + 1, Y + H - 2 + Math.max(0, l), 4, 2, pal.leafDark);
      R(ctx, X + W - 5, Y + H - 2 + Math.max(0, -l), 4, 2, pal.leafDark);
    }
  } else {
    R(ctx, X + 2, Y + H - 1, 5, 1, pal.leafDark);
  }

  // body silhouette: rounded pear
  const top = stage === 0 ? Y + 3 : Y + 4;
  const bw = Math.max(4, W - 2);
  const bh = H - (top - Y) - 1;
  for (let i = 0; i < bh; i++) {
    const yy = top + i;
    const prog = i / bh;
    const shrink = stage === 3 ? (prog < 0.2 ? 1 : prog > 0.75 ? 1 : 0) : stage === 0 ? (prog > 0.7 ? 1 : 0) : (prog > 0.8 ? 1 : 0);
    const w = bw - shrink * 2;
    const xx = X + (W - w) / 2;
    R(ctx, xx, yy, w, 1, body);
    R(ctx, xx, yy, 1, 1, lt);
    R(ctx, xx + w - 1, yy, 1, 1, dk);
  }
  R(ctx, X + (W - bw) / 2 + 1, top + bh - 1, bw - 2, 1, dk);

  // leaf arms
  const armY = top + Math.round(bh * 0.35);
  const wave = o.crying ? -2 : o.excited ? Math.round(Math.sin(t * 16) * 2) : o.moving ? Math.round(Math.sin(t * 10) * 1) : 0;
  if (stage >= 1) {
    // left arm
    R(ctx, X - 1, armY + wave, 2, 1, pal.leaf);
    R(ctx, X - 2, armY + wave + 1, 2, 2, pal.leaf);
    P(ctx, X - 2, armY + wave + 2, pal.leafDark);
    // right arm
    R(ctx, X + W - 1, armY - wave, 2, 1, pal.leaf);
    R(ctx, X + W, armY - wave + 1, 2, 2, pal.leaf);
    P(ctx, X + W + 1, armY - wave + 2, pal.leafDark);
  }

  // face
  const eyeY = top + 2;
  const cx = X + W / 2;
  const eyeOff = stage === 0 ? 2 : 3;
  const lx = Math.round(cx - eyeOff + (f === 1 ? 0 : 0.5));
  const rx = Math.round(cx + eyeOff - (f === 1 ? 0.5 : 0));
  const drawEye = (ex: number, ey: number, kind: typeof face.eyes) => {
    switch (kind) {
      case 'dot':
        R(ctx, ex, ey, 1, 2, '#2f2a20');
        break;
      case 'happy':
        R(ctx, ex - 1, ey, 1, 1, '#2f2a20');
        R(ctx, ex, ey - 1, 1, 1, '#2f2a20');
        R(ctx, ex + 1, ey, 1, 1, '#2f2a20');
        break;
      case 'closed':
        R(ctx, ex - 1, ey + 1, 3, 1, '#2f2a20');
        break;
      case 'sad':
        R(ctx, ex, ey + 1, 1, 2, '#2f2a20');
        R(ctx, ex, ey, 2, 1, '#2f2a20');
        break;
      case 'wide':
        R(ctx, ex, ey - 1, 2, 3, '#2f2a20');
        R(ctx, ex, ey - 1, 1, 1, '#ffffff');
        break;
      case 'worried':
        R(ctx, ex, ey + 1, 1, 2, '#2f2a20');
        break;
    }
  };
  drawEye(lx, eyeY, face.eyes);
  drawEye(rx, eyeY, face.eyes);

  // round glasses (Nerdy the pumpkin keeps the arcade scores)
  if (o.kind === 'pumpkin') {
    const gx1 = lx - 2;
    const gx2 = rx - 1;
    const gy = eyeY - 1;
    R(ctx, gx1, gy, 4, 1, '#8a6a4a');
    R(ctx, gx1, gy + 3, 4, 1, '#8a6a4a');
    R(ctx, gx1, gy + 1, 1, 2, '#8a6a4a');
    R(ctx, gx1 + 3, gy + 1, 1, 2, '#8a6a4a');
    R(ctx, gx2, gy, 4, 1, '#8a6a4a');
    R(ctx, gx2, gy + 3, 4, 1, '#8a6a4a');
    R(ctx, gx2, gy + 1, 1, 2, '#8a6a4a');
    R(ctx, gx2 + 3, gy + 1, 1, 2, '#8a6a4a');
    R(ctx, gx1 + 4, gy + 2, Math.max(1, gx2 - gx1 - 4), 1, '#8a6a4a');
    // glass glint
    P(ctx, gx1 + 1, gy + 1, 'rgba(255,255,255,0.75)');
    P(ctx, gx2 + 1, gy + 1, 'rgba(255,255,255,0.75)');
  }

  // cheeks
  if (o.mood === 'joyful' || o.mood === 'content' || o.mood === 'excited') {
    R(ctx, lx - 2, eyeY + 2, 2, 1, pal.cheek);
    R(ctx, rx + 1, eyeY + 2, 2, 1, pal.cheek);
  }
  if (o.mood === 'crying' || o.mood === 'sad') {
    R(ctx, lx - 2, eyeY + 2, 2, 1, 'rgba(120,150,200,0.5)');
  }

  // mouth
  const my = eyeY + 4;
  switch (face.mouth) {
    case 'smile':
      R(ctx, cx - 1, my, 3, 1, '#7a4a3a');
      P(ctx, cx - 2, my - 1, '#7a4a3a');
      P(ctx, cx + 2, my - 1, '#7a4a3a');
      break;
    case 'open':
      R(ctx, cx - 1, my, 2, 2, '#7a4038');
      P(ctx, cx, my + 2, '#e07a72');
      break;
    case 'frown':
      R(ctx, cx - 1, my + 1, 3, 1, '#7a4a3a');
      P(ctx, cx - 2, my, '#7a4a3a');
      P(ctx, cx + 2, my, '#7a4a3a');
      break;
    case 'flat':
      R(ctx, cx - 1, my + 1, 2, 1, '#7a4a3a');
      break;
    case 'wobble':
      R(ctx, cx - 2, my + 1, 2, 1, '#7a4a3a');
      R(ctx, cx + 1, my, 1, 1, '#7a4a3a');
      break;
    case 'sleep':
      R(ctx, cx - 1, my + 1, 2, 1, '#8a6a5a');
      P(ctx, cx + 2, my + 1, '#8a6a5a');
      break;
  }

  // headpiece by kind / stage
  const headY = top - 1;
  const drawTop = () => {
    switch (o.kind) {
      case 'flower':
        if (stage >= 2) {
          const petal = pal.accent;
          const dark = pal.accentDark;
          R(ctx, cx - 3, headY - 2, 2, 2, petal);
          R(ctx, cx + 2, headY - 2, 2, 2, petal);
          R(ctx, cx - 1, headY - 3, 3, 3, pal.body);
          R(ctx, cx - 2, headY - 1, 1, 2, petal);
          R(ctx, cx + 2, headY - 1, 1, 2, petal);
          R(ctx, cx - 1, headY, 3, 1, dark);
        } else {
          R(ctx, cx - 1, headY - 2, 2, 2, pal.leaf);
          P(ctx, cx - 2, headY - 1, pal.leaf);
          P(ctx, cx + 1, headY - 2, pal.leafDark);
        }
        break;
      case 'herb':
        R(ctx, cx - 1, headY - 3, 1, 3, pal.leaf);
        R(ctx, cx - 3, headY - 3, 2, 2, pal.leaf);
        R(ctx, cx + 2, headY - 4, 2, 3, pal.leafDark);
        R(ctx, cx, headY - 4, 1, 1, lt);
        break;
      case 'berry':
        if (stage >= 2) {
          R(ctx, cx - 3, headY - 3, 2, 2, pal.accent);
          R(ctx, cx - 1, headY - 4, 2, 2, pal.accent);
          R(ctx, cx + 1, headY - 2, 2, 3, pal.accentDark);
          R(ctx, cx - 2, headY - 4, 2, 1, pal.leaf);
        } else {
          R(ctx, cx - 1, headY - 2, 2, 2, pal.leaf);
          P(ctx, cx + 1, headY - 3, pal.leafDark);
        }
        break;
      case 'mushroom':
        if (stage >= 2) {
          const capW = stage === 3 ? 11 : 9;
          const capX = Math.round(cx - capW / 2);
          R(ctx, capX, headY - 2, capW, 2, pal.accent);
          R(ctx, capX + 1, headY - 3, capW - 2, 1, pal.accentDark);
          R(ctx, capX + 2, headY - 3, 1, 1, lt);
          R(ctx, capX + capW - 4, headY - 2, 1, 1, lt);
          R(ctx, capX, headY, capW, 1, pal.accentDark);
          if (stage === 3) {
            R(ctx, capX - 1, headY - 1, 1, 1, pal.accent);
            R(ctx, capX + capW, headY - 1, 1, 1, pal.accent);
          }
          R(ctx, cx - 1, headY - 4, 2, 1, pal.leaf);
        } else {
          R(ctx, cx - 2, headY - 2, 4, 2, pal.accent);
          R(ctx, cx - 1, headY - 3, 3, 1, pal.accentDark);
          P(ctx, cx - 2, headY - 2, lt);
        }
        break;
      case 'clover':
        R(ctx, cx - 3, headY - 3, 3, 2, pal.leaf);
        R(ctx, cx + 1, headY - 3, 3, 2, pal.leaf);
        R(ctx, cx - 1, headY - 4, 3, 2, pal.leaf);
        R(ctx, cx - 1, headY - 2, 1, 2, pal.leafDark);
        P(ctx, cx + 1, headY - 1, pal.leafDark);
        break;
      case 'pumpkin': {
        // ribbed crown with a curly stalk
        const capW = stage === 3 ? 13 : stage === 2 ? 11 : 9;
        const capX = Math.round(cx - capW / 2);
        R(ctx, capX, headY - 2, capW, 3, pal.accent);
        R(ctx, capX + 1, headY - 3, capW - 2, 2, pal.accentDark);
        R(ctx, capX, headY + 1, capW, 1, pal.accentDark);
        R(ctx, capX + 1, headY - 2, 1, 3, pal.light);
        R(ctx, capX + capW - 2, headY - 1, 1, 2, pal.shade);
        // stalk
        R(ctx, cx - 1, headY - 5, 2, 3, pal.leafDark);
        R(ctx, cx + 1, headY - 6, 2, 2, pal.leaf);
        P(ctx, cx + 2, headY - 7, pal.leaf);
        break;
      }
    }
  };
  if (!o.asleep) drawTop();

  // hit flash is handled by caller via alpha

  if (o.crying) {
    // tears
    const ty = eyeY + 3;
    R(ctx, lx - 1, ty + (Math.floor(t * 6) % 3), 1, 2, '#bfe4f5');
    R(ctx, rx + 1, ty + ((Math.floor(t * 6) + 1) % 3), 1, 2, '#bfe4f5');
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  PROPS                                                              */
/* ------------------------------------------------------------------ */

import { ZONES } from './content';

function zoneColors(zone: ZoneId) {
  return ZONES[zone].theme.tree;
}

export function drawProp(ctx: Ctx, kind: PropKind, x: number, y: number, zone: ZoneId, variant = 0, time = 0, night = 0) {
  const c = zoneColors(zone);
  const X = Math.round(x);
  const Y = Math.round(y);
  const v = hash2(Math.round(x), Math.round(y) + variant * 17);

  switch (kind) {
    case 'tree': {
      shadowEllipse(ctx, X, Y, 13, 4, 0.22);
      R(ctx, X - 2, Y - 16, 4, 16, '#6b4a31');
      R(ctx, X - 2, Y - 16, 1, 16, '#7f5b3c');
      R(ctx, X + 1, Y - 16, 1, 16, '#4f3723');
      // roots
      R(ctx, X - 4, Y - 2, 3, 2, '#5a3d28');
      R(ctx, X + 2, Y - 2, 3, 2, '#5a3d28');
      const cy = Y - 30;
      ellipse(ctx, X, cy, 14, 11, c[0]);
      ellipse(ctx, X - 2, cy - 3, 11, 8, c[1]);
      ellipse(ctx, X + 3, cy + 2, 9, 7, c[2]);
      ellipse(ctx, X - 5, cy - 4, 6, 5, c[3]);
      // leaf clusters
      for (let i = 0; i < 7; i++) {
        const a = hash2(i * 7 + variant, X) * 6.28;
        const rr = 3 + hash2(i, Y) * 7;
        const px = X + Math.cos(a) * rr * 1.4;
        const py = cy + Math.sin(a) * rr * 0.8;
        R(ctx, px, py, 2, 2, i % 2 ? c[3] : c[1]);
      }
      R(ctx, X - 6, cy - 8, 3, 1, c[3]);
      R(ctx, X + 4, cy - 5, 2, 1, c[4]);
      break;
    }
    case 'pine': {
      shadowEllipse(ctx, X, Y, 11, 3.5, 0.24);
      R(ctx, X - 1, Y - 10, 3, 10, '#5b422d');
      for (let i = 0; i < 4; i++) {
        const w = 15 - i * 3;
        const yy = Y - 12 - i * 9;
        for (let r = 0; r < 6; r++) {
          const ww = Math.round(w * (1 - r / 8));
          R(ctx, X - ww, yy + r - 4, ww * 2, 1, r % 2 ? c[0] : c[1]);
        }
        R(ctx, X - w + 1, yy - 4, 2, 3, c[3]);
        R(ctx, X + w - 4, yy - 2, 2, 2, c[2]);
      }
      R(ctx, X - 1, Y - 42, 2, 3, c[4]);
      break;
    }
    case 'blossom': {
      shadowEllipse(ctx, X, Y, 14, 4.4, 0.24);
      R(ctx, X - 2, Y - 18, 4, 18, '#6d4a3c');
      R(ctx, X - 2, Y - 18, 1, 18, '#835c4c');
      R(ctx, X - 6, Y - 2, 4, 2, '#5c3d31');
      R(ctx, X + 2, Y - 2, 4, 2, '#5c3d31');
      const cy = Y - 34;
      ellipse(ctx, X, cy, 15, 11, '#b87f8c');
      ellipse(ctx, X - 2, cy - 3, 11, 8, '#d79ab0');
      ellipse(ctx, X + 3, cy + 2, 9, 7, '#a97183');
      for (let i = 0; i < 16; i++) {
        const a = hash2(i * 3 + variant, X) * 6.28;
        const rr = hash2(i, Y + i) * 15;
        const px = X + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.75;
        R(ctx, px, py, 2, 2, i % 3 === 0 ? '#f2c3d2' : i % 3 === 1 ? '#e8a7bb' : '#fff0f4');
      }
      if (night > 0.3) {
        for (let i = 0; i < 5; i++) {
          const px = X + (hash2(i, variant + 4) - 0.5) * 26;
          const py = cy + (hash2(i, variant + 9) - 0.5) * 18;
          ctx.fillStyle = `rgba(255,240,200,${0.3 + Math.sin(time * 2 + i) * 0.2})`;
          ctx.fillRect(px, py, 1, 1);
        }
      }
      break;
    }
    case 'bush': {
      shadowEllipse(ctx, X, Y, 10, 3, 0.2);
      ellipse(ctx, X, Y - 4, 9, 6, c[0]);
      ellipse(ctx, X - 2, Y - 6, 7, 4, c[1]);
      ellipse(ctx, X + 3, Y - 3, 6, 4, c[2]);
      R(ctx, X - 4, Y - 8, 2, 1, c[3]);
      R(ctx, X + 2, Y - 7, 2, 1, c[3]);
      if (v > 0.55) R(ctx, X + 4, Y - 6, 1, 1, '#e06d7e');
      break;
    }
    case 'berrybush': {
      shadowEllipse(ctx, X, Y, 10, 3, 0.2);
      ellipse(ctx, X, Y - 5, 10, 7, c[0]);
      ellipse(ctx, X - 2, Y - 7, 8, 5, c[1]);
      ellipse(ctx, X + 3, Y - 4, 7, 4, c[2]);
      for (let i = 0; i < 7; i++) {
        const px = X - 8 + hash2(i + variant, X) * 16;
        const py = Y - 12 + hash2(i, Y) * 9;
        R(ctx, px, py, 2, 2, i % 2 ? '#c34a6b' : '#e0657f');
        P(ctx, px, py, '#ff9ab0');
      }
      R(ctx, X - 5, Y - 9, 2, 1, c[3]);
      break;
    }
    case 'cottage': {
      shadowEllipse(ctx, X, Y, 34, 7, 0.25);
      // walls
      R(ctx, X - 26, Y - 34, 52, 32, '#e6d3b3');
      R(ctx, X - 26, Y - 34, 52, 3, '#c9b190');
      R(ctx, X - 26, Y - 34, 3, 32, '#d6c1a0');
      R(ctx, X + 23, Y - 34, 3, 32, '#bfa987');
      // stone base
      R(ctx, X - 26, Y - 8, 52, 6, '#9a8f83');
      for (let i = 0; i < 9; i++) R(ctx, X - 25 + i * 6, Y - 8 + (i % 2), 5, 2, i % 2 ? '#8b8074' : '#a79b8e');
      // roof
      for (let i = 0; i < 8; i++) {
        const w = 60 - i * 5;
        R(ctx, X - w / 2, Y - 36 - i * 4, w, 4, i % 2 ? '#a1583f' : '#b56b4c');
        R(ctx, X - w / 2 + 2, Y - 35 - i * 4, w - 4, 1, '#c77d5b');
      }
      R(ctx, X - 31, Y - 35, 62, 3, '#8f4832');
      // chimney
      R(ctx, X + 12, Y - 62, 7, 14, '#8d6b5e');
      R(ctx, X + 11, Y - 64, 9, 3, '#6f5348');
      R(ctx, X + 14, Y - 62, 2, 14, '#a37b6b');
      // door
      R(ctx, X - 7, Y - 24, 15, 24, '#7a4f36');
      R(ctx, X - 6, Y - 23, 13, 23, '#8f5f41');
      R(ctx, X - 6, Y - 23, 2, 23, '#a3704f');
      R(ctx, X - 3, Y - 24, 1, 24, '#6b432e');
      R(ctx, X + 3, Y - 24, 1, 24, '#6b432e');
      R(ctx, X - 5, Y - 12, 4, 3, '#f5b25e');
      R(ctx, X - 1, Y - 12, 1, 1, '#3a2a20');
      // windows
      const win = (wx: number) => {
        R(ctx, wx - 1, Y - 31, 12, 10, '#6b4a34');
        R(ctx, wx, Y - 30, 10, 8, '#ffd98a');
        R(ctx, wx, Y - 30, 10, 2, '#f6b95f');
        R(ctx, wx + 4, Y - 30, 2, 8, '#6b4a34');
        R(ctx, wx, Y - 27, 10, 1, '#6b4a34');
        R(ctx, wx, Y - 30, 2, 2, '#fff6d0');
        // flower box
        R(ctx, wx - 1, Y - 21, 12, 2, '#8a5d3f');
        R(ctx, wx, Y - 22, 2, 1, '#e05f66');
        R(ctx, wx + 4, Y - 23, 2, 2, '#f2c14e');
        R(ctx, wx + 8, Y - 22, 2, 1, '#df8fb4');
      };
      win(X - 21);
      win(X + 10);
      // sign
      R(ctx, X - 5, Y - 48, 10, 6, '#b8895a');
      R(ctx, X - 4, Y - 47, 8, 4, '#d2a978');
      R(ctx, X - 1, Y - 46, 4, 1, '#6b4a34');
      // lantern by door
      R(ctx, X + 10, Y - 10, 2, 8, '#4a3a2a');
      R(ctx, X + 8, Y - 13, 6, 4, '#ffd88a');
      R(ctx, X + 8, Y - 13, 6, 1, '#6b4a34');
      R(ctx, X + 8, Y - 10, 6, 1, '#6b4a34');
      // ivy
      for (let i = 0; i < 10; i++) {
        const ix = X - 26 + hash2(i + 2, 8) * 10;
        const iy = Y - 34 + hash2(i, 8) * 22;
        R(ctx, ix, iy, 2, 2, i % 2 ? '#5d8a4a' : '#6f9b54');
      }
      break;
    }
    case 'greenhouse': {
      shadowEllipse(ctx, X, Y, 30, 6, 0.22);
      R(ctx, X - 24, Y - 26, 48, 26, 'rgba(180,220,210,0.55)');
      R(ctx, X - 24, Y - 26, 48, 2, '#9fc9c0');
      for (let i = -24; i <= 24; i += 6) R(ctx, X + i, Y - 26, 1, 26, '#8fb9b0');
      for (let i = 0; i < 4; i++) {
        const w = 52 - i * 6;
        R(ctx, X - w / 2, Y - 28 - i * 5, w, 5, i % 2 ? 'rgba(190,225,215,0.65)' : 'rgba(215,240,232,0.55)');
      }
      R(ctx, X - 26, Y - 28, 52, 2, '#7ba59c');
      R(ctx, X - 6, Y - 18, 12, 18, 'rgba(150,190,180,0.7)');
      R(ctx, X - 6, Y - 18, 12, 2, '#7ba59c');
      // plants visible
      for (let i = 0; i < 5; i++) {
        R(ctx, X - 18 + i * 8, Y - 9, 4, 5, '#4d7a42');
        R(ctx, X - 17 + i * 8, Y - 11, 2, 3, '#66a056');
      }
      break;
    }
    case 'well': {
      shadowEllipse(ctx, X, Y, 16, 5, 0.24);
      R(ctx, X - 12, Y - 12, 24, 12, '#8f8b82');
      for (let i = 0; i < 8; i++) R(ctx, X - 12 + (i % 2) * 2, Y - 12 + i, 12, 1, i % 2 ? '#a3a096' : '#7d7a72');
      for (let i = 0; i < 6; i++) R(ctx, X - 10 + i * 4, Y - 12 + (i % 3) * 3, 4, 2, '#b1aea3');
      R(ctx, X - 13, Y - 14, 26, 2, '#9c9890');
      R(ctx, X - 10, Y - 13, 20, 2, '#365c66');
      R(ctx, X - 12, Y - 30, 3, 18, '#7a5a3d');
      R(ctx, X + 9, Y - 30, 3, 18, '#7a5a3d');
      for (let i = 0; i < 5; i++) {
        const w = 30 - i * 5;
        R(ctx, X - w / 2, Y - 34 - i * 2, w, 2, i % 2 ? '#8a5a42' : '#9c6b4e');
      }
      R(ctx, X - 2, Y - 29, 5, 3, '#5c4432');
      R(ctx, X - 1, Y - 26, 1, 12, '#c9b38a');
      R(ctx, X - 3, Y - 15, 5, 4, '#a5885e');
      R(ctx, X - 3, Y - 15, 5, 1, '#6f5a3e');
      break;
    }
    case 'fence': {
      shadowEllipse(ctx, X, Y, 9, 2, 0.18);
      R(ctx, X - 7, Y - 9, 2, 9, '#a8835a');
      R(ctx, X + 5, Y - 9, 2, 9, '#a8835a');
      R(ctx, X - 7, Y - 8, 2, 1, '#c19a6c');
      R(ctx, X + 5, Y - 8, 2, 1, '#c19a6c');
      R(ctx, X - 8, Y - 6, 16, 2, '#b08a5f');
      R(ctx, X - 8, Y - 3, 16, 2, '#9c7850');
      R(ctx, X - 8, Y - 6, 16, 1, '#c19a6c');
      break;
    }
    case 'lamp': {
      shadowEllipse(ctx, X, Y, 5, 2, 0.2);
      R(ctx, X - 1, Y - 18, 3, 18, '#3c3a33');
      R(ctx, X - 2, Y - 20, 5, 2, '#4a473d');
      R(ctx, X - 3, Y - 26, 7, 6, '#5b5850');
      const glow = 0.6 + Math.sin(time * 3 + X) * 0.15;
      R(ctx, X - 2, Y - 25, 5, 4, `rgba(255,214,120,${0.7 + glow * 0.2})`);
      R(ctx, X - 2, Y - 25, 2, 2, '#fff3c9');
      R(ctx, X - 4, Y - 27, 9, 2, '#3b3830');
      R(ctx, X - 3, Y - 17, 7, 1, '#4a473d');
      break;
    }
    case 'lanternpost': {
      shadowEllipse(ctx, X, Y, 5, 2, 0.2);
      R(ctx, X - 1, Y - 14, 2, 14, '#40433c');
      R(ctx, X - 3, Y - 18, 6, 6, 'rgba(255,220,140,0.35)');
      R(ctx, X - 2, Y - 17, 4, 4, '#ffe6a3');
      R(ctx, X - 2, Y - 17, 2, 2, '#fff8dc');
      R(ctx, X - 3, Y - 19, 6, 1, '#3b3d37');
      R(ctx, X - 3, Y - 13, 6, 1, '#3b3d37');
      break;
    }
    case 'mushroomGiant': {
      shadowEllipse(ctx, X, Y, 14, 4, 0.25);
      const h = 16 + variant * 3;
      R(ctx, X - 3, Y - h, 6, h, '#e7d9bd');
      R(ctx, X - 3, Y - h, 2, h, '#f4e9d2');
      R(ctx, X + 2, Y - h, 1, h, '#cbb896');
      R(ctx, X - 3, Y - 3, 6, 2, '#cbb896');
      const capY = Y - h - 8;
      ellipse(ctx, X, capY + 3, 16, 8, '#b6433f');
      ellipse(ctx, X, capY, 15, 6, '#cb5248');
      ellipse(ctx, X - 4, capY - 2, 9, 4, '#dd6a58');
      // spots
      R(ctx, X - 9, capY - 1, 3, 2, '#f3e6cd');
      R(ctx, X + 3, capY - 3, 2, 2, '#f3e6cd');
      R(ctx, X + 7, capY + 1, 2, 1, '#f3e6cd');
      R(ctx, X - 3, capY + 4, 2, 1, '#f3e6cd');
      R(ctx, X - 1, capY - 5, 2, 1, '#fcefd8');
      R(ctx, X - 16, capY + 4, 2, 1, '#a83b38');
      R(ctx, X + 15, capY + 2, 1, 1, '#a83b38');
      if (variant % 2 === 0) {
        // little door
        R(ctx, X - 2, Y - 9, 4, 6, '#6e4a36');
        R(ctx, X - 1, Y - 8, 2, 4, '#8a5f45');
        P(ctx, X + 1, Y - 6, '#f2d27a');
      }
      break;
    }
    case 'mushroomSmall': {
      shadowEllipse(ctx, X, Y, 4, 1.5, 0.18);
      R(ctx, X - 1, Y - 4, 2, 4, '#e8dcc2');
      ellipse(ctx, X, Y - 4, 4, 3, '#c45a52');
      ellipse(ctx, X - 1, Y - 5, 3, 2, '#d86c60');
      P(ctx, X - 2, Y - 5, '#f5e8d0');
      break;
    }
    case 'sunflower': {
      shadowEllipse(ctx, X, Y, 5, 2, 0.2);
      R(ctx, X, Y - 22, 2, 22, '#5c8f3f');
      R(ctx, X + 1, Y - 18, 1, 14, '#477531');
      R(ctx, X - 4, Y - 14, 4, 2, '#6aa04a');
      R(ctx, X + 2, Y - 10, 4, 2, '#6aa04a');
      R(ctx, X - 4, Y - 11, 2, 2, '#7cb259');
      R(ctx, X + 2, Y - 8, 2, 2, '#7cb259');
      const hy = Y - 26;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ellipse(ctx, X + Math.cos(a) * 5, hy + Math.sin(a) * 4, 2, 2, i % 2 ? '#f2c53d' : '#e8b22e');
      }
      ellipse(ctx, X, hy, 3, 3, '#7a4a2a');
      R(ctx, X - 1, hy - 1, 2, 2, '#9c6136');
      break;
    }
    case 'scarecrow': {
      shadowEllipse(ctx, X, Y, 7, 2.5, 0.22);
      R(ctx, X - 1, Y - 24, 3, 24, '#8a6a45');
      R(ctx, X - 9, Y - 18, 19, 2, '#8a6a45');
      R(ctx, X - 5, Y - 15, 11, 8, '#b5654d');
      R(ctx, X - 5, Y - 15, 11, 1, '#c97a5f');
      R(ctx, X - 3, Y - 7, 7, 2, '#a3563f');
      R(ctx, X - 6, Y - 6, 3, 4, '#9d7b50');
      R(ctx, X + 4, Y - 6, 3, 4, '#9d7b50');
      // head sack
      R(ctx, X - 3, Y - 27, 7, 6, '#d8c08e');
      R(ctx, X - 3, Y - 27, 7, 1, '#e8d4a8');
      P(ctx, X - 1, Y - 24, '#3d3020');
      P(ctx, X + 2, Y - 24, '#3d3020');
      R(ctx, X - 1, Y - 22, 3, 1, '#3d3020');
      // hat
      R(ctx, X - 6, Y - 30, 13, 2, '#a8905e');
      R(ctx, X - 3, Y - 33, 7, 4, '#b89b63');
      R(ctx, X - 3, Y - 29, 7, 1, '#8a6a45');
      R(ctx, X - 2, Y - 18, 1, 2, '#d8b35e');
      break;
    }
    case 'rock': {
      shadowEllipse(ctx, X, Y, 8, 2.5, 0.2);
      ellipse(ctx, X, Y - 3, 8, 5, '#8d8a80');
      ellipse(ctx, X - 2, Y - 5, 6, 3, '#a09d92');
      ellipse(ctx, X + 3, Y - 2, 5, 3, '#79766e');
      R(ctx, X - 4, Y - 6, 3, 1, '#b3b0a4');
      R(ctx, X + 1, Y - 7, 2, 1, '#b3b0a4');
      R(ctx, X - 6, Y - 1, 2, 1, '#6a685f');
      break;
    }
    case 'lily': {
      R(ctx, X - 6, Y - 1, 12, 1, 'rgba(60,110,110,0.25)');
      ellipse(ctx, X - 3, Y - 2, 5, 2, '#4f8a5f');
      ellipse(ctx, X + 4, Y - 1, 4, 2, '#467d55');
      ellipse(ctx, X, Y - 3, 3, 2, '#e9f0e2');
      ellipse(ctx, X, Y - 4, 2, 2, '#f7f6ef');
      R(ctx, X, Y - 4, 1, 1, '#f2cf6a');
      break;
    }
    case 'reeds': {
      for (let i = 0; i < 6; i++) {
        const h = 10 + hash2(i + 2, X) * 12;
        const ox = -5 + i * 2 + hash2(i, Y) * 2;
        R(ctx, X + ox, Y - h, 1, h, i % 2 ? '#6f8f4e' : '#83a35c');
        if (i % 3 === 0) {
          R(ctx, X + ox - 1, Y - h, 2, 3, '#9a8656');
          R(ctx, X + ox, Y - h - 2, 1, 2, '#b39c6a');
        }
      }
      break;
    }
    case 'arch': {
      shadowEllipse(ctx, X, Y, 16, 3, 0.2);
      R(ctx, X - 15, Y - 34, 3, 34, '#7d5c3f');
      R(ctx, X + 12, Y - 34, 3, 34, '#7d5c3f');
      R(ctx, X - 15, Y - 34, 1, 34, '#946f4d');
      R(ctx, X + 14, Y - 34, 1, 34, '#946f4d');
      for (let i = 0; i < 7; i++) {
        const w = 33 - i * 3;
        R(ctx, X - w / 2, Y - 36 - i * 2, w, 2, i % 2 ? '#7d5c3f' : '#8f6a48');
      }
      // roses
      const spots = [
        [-14, -30], [-11, -20], [-13, -12], [-9, -5], [13, -28], [11, -18], [13, -9], [10, -2],
        [-8, -38], [0, -42], [7, -39], [2, -35], [-3, -32],
      ];
      spots.forEach(([ox, oy], i) => {
        R(ctx, X + ox - 1, Y + oy, 3, 3, i % 3 === 0 ? '#e97f95' : i % 3 === 1 ? '#f0a3ae' : '#d9607e');
        R(ctx, X + ox, Y + oy, 1, 1, '#ffe3e9');
        R(ctx, X + ox - 2, Y + oy + 2, 2, 2, '#5c8a48');
      });
      break;
    }
    case 'swing': {
      shadowEllipse(ctx, X, Y, 16, 3, 0.22);
      R(ctx, X - 15, Y - 36, 3, 36, '#7d5c3f');
      R(ctx, X + 12, Y - 36, 3, 36, '#7d5c3f');
      R(ctx, X - 15, Y - 36, 1, 36, '#946f4d');
      R(ctx, X + 14, Y - 36, 1, 36, '#946f4d');
      R(ctx, X - 15, Y - 38, 31, 3, '#8a6746');
      R(ctx, X - 15, Y - 38, 31, 1, '#a37e57');
      const sway = Math.sin(time * 1.6) * 1.5;
      const rx = X + sway;
      R(ctx, rx - 8, Y - 36, 1, 16, '#b89a6d');
      R(ctx, rx + 8, Y - 36, 1, 16, '#b89a6d');
      R(ctx, rx - 10, Y - 21, 21, 3, '#9c6f47');
      R(ctx, rx - 10, Y - 21, 21, 1, '#bf8f5f');
      R(ctx, rx - 8, Y - 25, 2, 2, '#e97f95');
      R(ctx, rx + 6, Y - 25, 2, 2, '#f0a3ae');
      break;
    }
    case 'pergola': {
      shadowEllipse(ctx, X, Y, 24, 4, 0.22);
      for (const ox of [-21, -7, 7, 21]) {
        R(ctx, X + ox - 1, Y - 40, 3, 40, '#8a7259');
        R(ctx, X + ox - 1, Y - 40, 1, 40, '#a08b74');
      }
      R(ctx, X - 24, Y - 43, 48, 3, '#8a7259');
      R(ctx, X - 24, Y - 43, 48, 1, '#a08b74');
      for (let i = 0; i < 8; i++) R(ctx, X - 23 + i * 6, Y - 40, 1, 3, '#7a6249');
      // vines
      for (let i = 0; i < 10; i++) {
        const ox = -22 + hash2(i + 4, X) * 44;
        const len = 5 + hash2(i, Y) * 12;
        R(ctx, X + ox, Y - 41, 1, len, '#4f7a44');
        R(ctx, X + ox + 1, Y - 41 + len * 0.5, 2, 1, '#6b9a56');
        if (i % 2 === 0) R(ctx, X + ox - 1, Y - 41 + len, 2, 2, i % 4 ? '#d9d28a' : '#f2eeb8');
      }
      // hanging lanterns
      R(ctx, X - 6, Y - 39, 1, 5, '#5a4a3a');
      R(ctx, X - 8, Y - 34, 5, 5, 'rgba(255,225,150,0.45)');
      R(ctx, X - 7, Y - 33, 3, 3, '#ffedb0');
      break;
    }
    case 'sign': {
      shadowEllipse(ctx, X, Y, 5, 1.6, 0.2);
      R(ctx, X - 1, Y - 12, 2, 12, '#8a6746');
      R(ctx, X - 8, Y - 21, 16, 9, '#b08a5f');
      R(ctx, X - 7, Y - 20, 14, 7, '#c9a271');
      R(ctx, X - 6, Y - 18, 9, 1, '#6b4a30');
      R(ctx, X - 6, Y - 16, 11, 1, '#6b4a30');
      R(ctx, X + 6, Y - 21, 1, 9, '#9c7850');
      break;
    }
    case 'stump': {
      shadowEllipse(ctx, X, Y, 7, 2.4, 0.2);
      ellipse(ctx, X, Y - 3, 7, 4, '#6d4f36');
      ellipse(ctx, X, Y - 6, 7, 4, '#8a6746');
      ellipse(ctx, X, Y - 7, 5, 2.5, '#b08a5f');
      ellipse(ctx, X, Y - 7, 2, 1, '#c9a271');
      R(ctx, X - 6, Y - 6, 1, 4, '#5c422e');
      R(ctx, X + 5, Y - 6, 1, 4, '#5c422e');
      break;
    }
    case 'crystal': {
      shadowEllipse(ctx, X, Y - 1, 5, 2, 0.25);
      const glow = 0.55 + Math.sin(time * 2 + X * 0.3) * 0.2;
      R(ctx, X - 6, Y - 12, 12, 12, `rgba(140,220,210,${0.08 + glow * 0.06})`);
      const hue = variant % 2 ? '#8fe4da' : '#c7a6ef';
      const hue2 = variant % 2 ? '#5fb8b8' : '#9a7bd0';
      R(ctx, X - 3, Y - 14, 3, 10, hue2);
      R(ctx, X - 3, Y - 14, 1, 8, hue);
      R(ctx, X + 1, Y - 10, 3, 7, hue2);
      R(ctx, X + 1, Y - 10, 1, 5, hue);
      R(ctx, X - 1, Y - 18, 2, 6, hue);
      P(ctx, X - 2, Y - 15, '#f0fffb');
      P(ctx, X + 2, Y - 11, '#f0fffb');
      break;
    }
    case 'flowerPatch': {
      for (let i = 0; i < 5; i++) {
        const ox = -7 + i * 3.5;
        const oy = (hash2(i + 3, X) - 0.5) * 4;
        R(ctx, X + ox, Y - 5 + oy, 1, 5, '#4f7a3d');
        const c1 = ['#f2c14e', '#e97f95', '#a7b9f0', '#f0a3ae', '#f7e6a1'][i % 5];
        R(ctx, X + ox - 1, Y - 7 + oy, 3, 3, c1);
        P(ctx, X + ox, Y - 8 + oy, c1);
        P(ctx, X + ox, Y - 6 + oy, '#f7f0d4');
      }
      break;
    }
    case 'bench': {
      shadowEllipse(ctx, X, Y, 15, 3, 0.2);
      R(ctx, X - 14, Y - 6, 3, 6, '#5c4a38');
      R(ctx, X + 11, Y - 6, 3, 6, '#5c4a38');
      R(ctx, X - 15, Y - 8, 31, 3, '#8a6746');
      R(ctx, X - 15, Y - 8, 31, 1, '#a8805a');
      R(ctx, X - 14, Y - 16, 3, 9, '#5c4a38');
      R(ctx, X + 11, Y - 16, 3, 9, '#5c4a38');
      R(ctx, X - 15, Y - 18, 31, 3, '#8a6746');
      R(ctx, X - 15, Y - 18, 31, 1, '#a8805a');
      R(ctx, X - 15, Y - 14, 31, 2, '#7a5c40');
      R(ctx, X - 8, Y - 6, 3, 1, '#6d9a56');
      R(ctx, X + 4, Y - 6, 2, 1, '#6d9a56');
      R(ctx, X - 2, Y - 18, 4, 1, '#6d9a56');
      break;
    }
    case 'birdbath': {
      shadowEllipse(ctx, X, Y, 7, 2, 0.2);
      R(ctx, X - 1, Y - 10, 3, 10, '#9a968a');
      R(ctx, X - 4, Y - 1, 9, 2, '#8a867a');
      ellipse(ctx, X, Y - 12, 7, 3, '#8f8b80');
      ellipse(ctx, X, Y - 12, 6, 2, '#6fb3c4');
      ellipse(ctx, X, Y - 13, 4, 1.4, '#a6dbe6');
      R(ctx, X - 5, Y - 13, 2, 1, '#e8f7fa');
      R(ctx, X + 3, Y - 11, 2, 1, '#5cf2ff');
      break;
    }
    case 'windchime': {
      R(ctx, X - 5, Y - 26, 11, 1, '#7d5c3f');
      R(ctx, X - 6, Y - 27, 2, 2, '#7d5c3f');
      R(ctx, X + 5, Y - 27, 2, 2, '#7d5c3f');
      const sway = Math.sin(time * 2 + X) * 1;
      for (let i = 0; i < 3; i++) {
        const ox = -4 + i * 4;
        R(ctx, X + ox, Y - 25, 1, 6 + i * 2, '#c9bca0');
        const c = i === 0 ? '#e8d9b8' : i === 1 ? '#b9d4d8' : '#e2c0c8';
        R(ctx, X + ox - 1 + sway * (i % 2 ? 1 : -1), Y - 19 + i * 2, 3, 4, c);
        P(ctx, X + ox, Y - 18 + i * 2, '#fffdf5');
      }
      break;
    }
    case 'stone': {
      shadowEllipse(ctx, X, Y, 7, 2, 0.18);
      ellipse(ctx, X, Y - 2, 7, 3.4, '#a8a294');
      ellipse(ctx, X - 1, Y - 4, 5, 2, '#bdb7a6');
      R(ctx, X - 4, Y - 4, 3, 1, '#d6d0bd');
      break;
    }
    case 'tent': {
      shadowEllipse(ctx, X, Y, 40, 8, 0.26);
      // striped canvas roof
      for (let i = 0; i < 11; i++) {
        const w = 78 - i * 6;
        R(ctx, X - w / 2, Y - 8 - i * 4, w, 4, i % 2 ? '#e7e0cd' : '#c9564f');
        R(ctx, X - w / 2 + 2, Y - 7 - i * 4, w - 4, 1, i % 2 ? '#f6f1e2' : '#dc6a5f');
      }
      R(ctx, X - 42, Y - 8, 84, 4, '#8f3f3a');
      R(ctx, X - 44, Y - 6, 88, 2, '#a34a44');
      // pole + pennant
      R(ctx, X - 1, Y - 60, 3, 10, '#8a6a4a');
      R(ctx, X + 2, Y - 60, 10, 5, '#f2c14e');
      R(ctx, X + 12, Y - 58, 5, 2, '#f2c14e');
      // dark opening
      R(ctx, X - 14, Y - 24, 28, 24, '#3c2a26');
      R(ctx, X - 14, Y - 24, 28, 2, '#2c1e1b');
      R(ctx, X - 15, Y - 26, 30, 3, '#f0d9a8');
      R(ctx, X - 10, Y - 18, 20, 12, 'rgba(255,214,140,0.22)');
      // lanterns either side
      for (const ox of [-30, 28]) {
        R(ctx, X + ox, Y - 18, 2, 18, '#5c4a38');
        R(ctx, X + ox - 3, Y - 24, 8, 6, 'rgba(255,220,140,0.5)');
        R(ctx, X + ox - 2, Y - 23, 6, 4, '#ffe6a3');
        R(ctx, X + ox - 4, Y - 25, 10, 1, '#3b3d37');
      }
      break;
    }
    case 'booth': {
      shadowEllipse(ctx, X, Y, 18, 4, 0.24);
      // counter
      R(ctx, X - 16, Y - 12, 32, 12, '#b5834f');
      R(ctx, X - 16, Y - 12, 32, 2, '#cfa068');
      R(ctx, X - 16, Y - 2, 32, 2, '#8f6236');
      for (let i = 0; i < 4; i++) R(ctx, X - 14 + i * 8, Y - 10, 1, 8, '#9c6f42');
      // striped awning
      for (let i = 0; i < 8; i++) R(ctx, X - 18 + i * 5, Y - 20, 5, 5, i % 2 ? '#e7e0cd' : '#6f9bc9');
      R(ctx, X - 19, Y - 21, 38, 2, '#4f6f92');
      R(ctx, X - 19, Y - 15, 38, 1, '#3f5a78');
      // posts
      R(ctx, X - 18, Y - 15, 2, 15, '#8a6a4a');
      R(ctx, X + 16, Y - 15, 2, 15, '#8a6a4a');
      // prizes hanging
      R(ctx, X - 12, Y - 26, 3, 4, '#e0606b');
      R(ctx, X - 3, Y - 28, 3, 4, '#f2c14e');
      R(ctx, X + 6, Y - 26, 3, 4, '#8fbf6c');
      R(ctx, X - 12, Y - 22, 1, 3, '#5c4a38');
      R(ctx, X - 2, Y - 24, 1, 3, '#5c4a38');
      R(ctx, X + 7, Y - 22, 1, 3, '#5c4a38');
      // little sign
      R(ctx, X - 7, Y - 11, 14, 4, '#f0e2c2');
      R(ctx, X - 6, Y - 10, 12, 2, '#c9564f');
      break;
    }
    case 'balloons': {
      shadowEllipse(ctx, X, Y, 7, 2, 0.18);
      R(ctx, X - 1, Y - 14, 2, 14, '#8a6a4a');
      const cols = ['#e0606b', '#f2c14e', '#7fb069', '#7fa7d9', '#d983b0'];
      for (let i = 0; i < 5; i++) {
        const bx = X - 8 + i * 4;
        const by = Y - 22 - (i % 3) * 5;
        const bob = Math.sin(time * 1.6 + i) * 1.2;
        ellipse(ctx, bx, by + bob, 4, 5, cols[i % cols.length]);
        ellipse(ctx, bx - 1, by - 2 + bob, 2, 3, 'rgba(255,255,255,0.35)');
        R(ctx, bx, by + 5 + bob, 1, 2, cols[i % cols.length]);
        ctx.strokeStyle = 'rgba(90,75,55,0.6)';
        ctx.beginPath();
        ctx.moveTo(bx, by + 7 + bob);
        ctx.lineTo(X, Y - 14);
        ctx.stroke();
      }
      break;
    }
    case 'prizeShelf': {
      shadowEllipse(ctx, X, Y, 16, 4, 0.24);
      R(ctx, X - 15, Y - 30, 30, 30, '#a8783f');
      R(ctx, X - 15, Y - 30, 30, 2, '#c99a5c');
      R(ctx, X - 15, Y - 30, 2, 30, '#bd8b4c');
      R(ctx, X + 13, Y - 30, 2, 30, '#8a6132');
      for (let s = 0; s < 3; s++) {
        R(ctx, X - 14, Y - 30 + s * 10 + 9, 28, 2, '#7a5528');
        for (let i = 0; i < 4; i++) {
          const px = X - 11 + i * 7;
          const py = Y - 30 + s * 10;
          const kind = (s * 4 + i) % 4;
          if (kind === 0) {
            ellipse(ctx, px + 1, py + 6, 3, 3, '#e0606b');
            ellipse(ctx, px, py + 5, 2, 2, '#f2a0a8');
          } else if (kind === 1) {
            R(ctx, px - 1, py + 3, 5, 5, '#f2c14e');
            R(ctx, px - 1, py + 3, 5, 1, '#ffe08a');
          } else if (kind === 2) {
            R(ctx, px, py + 3, 3, 6, '#7fb069');
            R(ctx, px - 1, py + 6, 5, 3, '#5f8f4c');
          } else {
            ellipse(ctx, px + 1, py + 5, 3, 3, '#7fa7d9');
            R(ctx, px + 1, py + 2, 1, 2, '#4f6f92');
          }
        }
      }
      // top bunting
      for (let i = 0; i < 5; i++) R(ctx, X - 14 + i * 6, Y - 33, 4, 3, i % 2 ? '#e7e0cd' : '#c9564f');
      break;
    }
    case 'bunting': {
      R(ctx, X - 20, Y - 24, 2, 24, '#8a6a4a');
      R(ctx, X + 18, Y - 24, 2, 24, '#8a6a4a');
      const sag = Math.sin(time * 0.8) * 0.8;
      ctx.strokeStyle = '#6b5a44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X - 20, Y - 22);
      ctx.quadraticCurveTo(X, Y - 14 + sag, X + 20, Y - 22);
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9;
        const bx = X - 20 + t * 40;
        const by = Y - 22 + (1 - Math.pow(2 * t - 1, 2)) * 8 + sag;
        const c1 = ['#e0606b', '#f2c14e', '#7fb069', '#7fa7d9', '#d983b0'][i % 5];
        R(ctx, bx - 2, by, 4, 2, c1);
        R(ctx, bx - 1, by + 2, 2, 3, c1);
      }
      break;
    }
    case 'targetWall': {
      shadowEllipse(ctx, X, Y, 18, 4, 0.24);
      R(ctx, X - 17, Y - 34, 34, 34, '#9c7448');
      R(ctx, X - 17, Y - 34, 34, 2, '#b98a56');
      for (let i = 0; i < 5; i++) R(ctx, X - 16 + i * 7, Y - 33, 1, 33, '#8a6339');
      // targets
      const rings = ['#e7e0cd', '#c9564f', '#e7e0cd', '#c9564f'];
      for (const [ox, oy, rr] of [[-8, -24, 6], [7, -19, 5], [-3, -10, 4]] as [number, number, number][]) {
        rings.slice(0, 3).forEach((c, i) => ellipse(ctx, X + ox, Y + oy, rr - i * 2, rr - i * 2, c));
        ellipse(ctx, X + ox, Y + oy, 1.5, 1.5, '#f2c14e');
      }
      // hanging lanterns
      R(ctx, X - 20, Y - 38, 2, 5, '#5c4a38');
      R(ctx, X - 22, Y - 33, 6, 5, '#ffe6a3');
      R(ctx, X + 18, Y - 38, 2, 5, '#5c4a38');
      R(ctx, X + 16, Y - 33, 6, 5, '#ffe6a3');
      break;
    }
    case 'pumpkin': {
      shadowEllipse(ctx, X, Y, 7 + variant, 2.4, 0.2);
      const sz = 5 + variant;
      ellipse(ctx, X, Y - sz, sz, sz - 1, '#e08a30');
      ellipse(ctx, X - 2, Y - sz - 1, sz - 3, sz - 3, '#f0a044');
      ellipse(ctx, X + 2, Y - sz + 1, sz - 3, sz - 2, '#c97524');
      R(ctx, X - 1, Y - sz * 2 - 1, 2, 3, '#5f7a3a');
      R(ctx, X + 1, Y - sz * 2 - 2, 2, 2, '#6f8f44');
      if (variant === 1) {
        // carved face
        R(ctx, X - 3, Y - sz - 1, 2, 2, '#4a2c14');
        R(ctx, X + 2, Y - sz - 1, 2, 2, '#4a2c14');
        R(ctx, X - 2, Y - sz + 2, 5, 1, '#4a2c14');
        R(ctx, X - 3, Y - sz + 3, 1, 1, '#4a2c14');
        R(ctx, X + 3, Y - sz + 3, 1, 1, '#4a2c14');
      }
      break;
    }
    case 'arcadeSign': {
      shadowEllipse(ctx, X, Y, 16, 3.5, 0.22);
      R(ctx, X - 2, Y - 30, 4, 30, '#7a5a3d');
      R(ctx, X - 2, Y - 30, 1, 30, '#8f6c4a');
      R(ctx, X - 30, Y - 46, 60, 18, '#8a5a3a');
      R(ctx, X - 29, Y - 45, 58, 16, '#f0dfb8');
      R(ctx, X - 29, Y - 45, 58, 2, '#fbf0d4');
      R(ctx, X - 29, Y - 31, 58, 2, '#c9ab7c');
      // lettering
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8f3f3a';
      ctx.fillText('ARCADE', X, Y - 37);
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillStyle = '#6f9b54';
      ctx.fillText('PLAY 4 GAMES', X, Y - 30);
      ctx.textAlign = 'left';
      // bulbs
      for (let i = 0; i < 8; i++) {
        const b = 0.4 + Math.sin(time * 3 + i) * 0.35;
        R(ctx, X - 26 + i * 7, Y - 47, 2, 2, `rgba(255,220,140,${0.4 + b * 0.6})`);
      }
      // pennant
      R(ctx, X - 1, Y - 52, 3, 6, '#8a6a4a');
      R(ctx, X + 2, Y - 52, 9, 4, '#e0606b');
      break;
    }
    case 'stringLight': {
      R(ctx, X - 22, Y - 26, 2, 26, '#8a6a4a');
      R(ctx, X + 20, Y - 26, 2, 26, '#8a6a4a');
      ctx.strokeStyle = '#5a4a38';
      ctx.beginPath();
      ctx.moveTo(X - 22, Y - 24);
      ctx.quadraticCurveTo(X, Y - 16, X + 20, Y - 24);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const t = (i + 0.5) / 7;
        const bx = X - 22 + t * 42;
        const by = Y - 24 + (1 - Math.pow(2 * t - 1, 2)) * 7;
        const b = 0.5 + Math.sin(time * 2.4 + i * 1.3) * 0.4;
        R(ctx, bx - 1, by, 3, 4, `rgba(255,226,150,${0.45 + b * 0.5})`);
        R(ctx, bx - 1, by, 3, 1, '#5c4a38');
        if (night > 0.2) {
          ctx.fillStyle = `rgba(255,220,150,${0.06 + b * 0.05})`;
          ctx.fillRect(bx - 6, by - 4, 13, 13);
        }
      }
      break;
    }
    case 'carousel': {
      shadowEllipse(ctx, X, Y, 20, 5, 0.24);
      R(ctx, X - 20, Y - 3, 40, 3, '#8a6a4a');
      R(ctx, X - 20, Y - 4, 40, 2, '#a37f57');
      R(ctx, X - 2, Y - 40, 4, 37, '#8a6a4a');
      // canopy
      for (let i = 0; i < 5; i++) {
        const w = 36 - i * 6;
        R(ctx, X - w / 2, Y - 34 - i * 3, w, 3, i % 2 ? '#f2c14e' : '#c9564f');
      }
      R(ctx, X - 2, Y - 50, 4, 5, '#f2c14e');
      R(ctx, X - 1, Y - 53, 2, 3, '#e0606b');
      // horses on poles, rotating
      for (let i = 0; i < 4; i++) {
        const ang = time * 0.9 + (i * Math.PI) / 2;
        const px = X + Math.sin(ang) * 13;
        const depth = Math.cos(ang);
        const lift = Math.sin(time * 2.2 + i * 1.6) * 3;
        const py = Y - 12 + lift;
        const body = i % 2 ? '#f0e2c2' : '#e08a9c';
        if (depth > 0) {
          R(ctx, px - 3, py - 6, 6, 8, body);
          R(ctx, px - 4, py - 8, 8, 3, body);
          R(ctx, px + 2, py - 9, 3, 3, body);
          R(ctx, px - 3, py + 2, 2, 3, '#7a5a3d');
          R(ctx, px + 1, py + 2, 2, 3, '#7a5a3d');
          R(ctx, px - 4, py - 5, 2, 2, '#5c4a38');
        } else {
          R(ctx, px - 2, py - 5, 5, 6, '#a8785c');
        }
        R(ctx, px, py - 34, 1, 30, '#c9a06d');
      }
      break;
    }
    case 'stumpseat': {
      shadowEllipse(ctx, X, Y, 7, 2.4, 0.2);
      ellipse(ctx, X, Y - 3, 7, 4, '#6d4f36');
      ellipse(ctx, X, Y - 7, 7, 4, '#8a6746');
      ellipse(ctx, X, Y - 8, 6, 2.2, '#b08a5f');
      ellipse(ctx, X, Y - 8, 3, 1, '#c9a271');
      R(ctx, X - 6, Y - 7, 1, 5, '#5c422e');
      R(ctx, X + 5, Y - 7, 1, 5, '#5c422e');
      R(ctx, X - 2, Y - 9, 2, 1, '#6d9a56');
      break;
    }
  }

  if (night > 0.35 && (kind === 'lamp' || kind === 'lanternpost' || kind === 'stringLight' || kind === 'arcadeSign')) {
    const g = ctx.createRadialGradient(X, Y - 24, 1, X, Y - 24, 26);
    g.addColorStop(0, `rgba(255,220,140,${0.16 + night * 0.12})`);
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(X - 26, Y - 50, 52, 52);
  }
}

/* ------------------------------------------------------------------ */
/*  ICONS (canvas, for HUD)                                            */
/* ------------------------------------------------------------------ */

export const ICON_GLYPHS: Record<string, string> = {
  hunger: '\u{1F33E}',
  hydration: '\u{1F4A7}',
  energy: '\u{2600}\u{FE0F}',
  comfort: '\u{2764}\u{FE0F}',
  heart: '\u2764',
  calm: '\u{1F343}',
  trust: '\u2728',
  growth: '\u{1F331}',
  seeds: '\u{1F330}',
  berries: '\u{1F353}',
  harmony: '\u{1F49A}',
};