import type {
  DailyProgress,
  GameState,
  Mood,
  SproutSave,
  SproutView,
  Stats,
  Weather,
  ZoneId,
} from './types';
import {
  ARRIVALS,
  CHAPTERS,
  DAILY_POOL,
  SHOP_BY_ID,
  SPROUTS,
  SPROUT_BY_ID,
  STAGE_GROWTH,
  STAGE_THRESHOLDS,
  STARTING_SPROUTS,
  WEATHER_LABEL,
  ZONE_ORDER,
  ZONE_RECT,
  ZONES,
  clamp,
  hash2,
  moodQuote,
} from './content';

export const SAVE_KEY = 'little-sprouts-save-v1';
export const SAVE_VERSION = 1;

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_STATS: Stats = {
  feeds: 0,
  waters: 0,
  talks: 0,
  cuddles: 0,
  plays: 0,
  stories: 0,
  breathes: 0,
  soothed: 0,
  decorPlaced: 0,
  harvests: 0,
  sprinkles: 0,
  blooms: 0,
  stagesGrown: 0,
  daysPlayed: 0,
};

export function makeSproutSave(id: string, x: number, y: number, zone: ZoneId, stage: 0 | 1 | 2 | 3 = 1): SproutSave {
  return {
    id,
    zone,
    x,
    y,
    facing: 1,
    stage,
    growth: STAGE_GROWTH[stage],
    heart: 8,
    calm: 55 + (SPROUT_BY_ID[id]?.personality === 'tender' ? -8 : 0),
    trust: 10,
    needs: { hunger: 66, hydration: 70, energy: 62, comfort: 62 },
    talksToday: 0,
    dayOfTalks: 0,
    storiesToday: 0,
    dayOfStories: 0,
    lastCryNotice: 0,
    cryGrace: 0,
    asleep: false,
    bloomSeen: false,
  };
}

export function weatherForDay(day: number): Weather {
  const r = mulberry32(day * 977 + 41)();
  if (day === 1) return 'sunny';
  if (r < 0.26) return 'softclouds';
  if (r < 0.38) return 'drizzle';
  return 'sunny';
}

export function makeDaily(day: number): DailyProgress {
  const rng = mulberry32(day * 6151 + 7);
  const pool = [...DAILY_POOL];
  const tasks: DailyProgress['tasks'] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    const t = pool.splice(idx, 1)[0];
    tasks.push({ def: { id: `d${day}-${i}`, ...t }, progress: 0, done: false });
  }
  return { day, tasks, allDone: false, rewardClaimed: false };
}

export function createInitialState(keeperName = 'You'): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    keeperName,
    day: 1,
    clock: 6 * 60 + 40,
    weather: 'sunny',
    zone: 'meadow',
    seeds: 40,
    berries: 5,
    dew: 6,
    canMax: 6,
    unlocked: { meadow: true, pond: false, sunroot: false, whisper: false, orchard: false, arcade: false },
    sprouts: {},
    decor: [],
    owned: {},
    quests: {},
    daily: makeDaily(1),
    stats: { ...DEFAULT_STATS },
    settings: { music: true, sfx: true, gentle: true, hints: true },
    flags: {
      introSeen: false,
      tutorialSeen: false,
      tutorialStep: 0,
      letters: [],
      shopSeen: false,
      zonesSeen: ['meadow'],
      chapterSeen: '',
      bloomGift: false,
      firstRain: false,
      plantedWelcome: false,
    },
    foraged: {},
    miniGames: {},
    seenZones: ['meadow'],
    lastSavedAt: Date.now(),
  };
  STARTING_SPROUTS.forEach((id, i) => {
    const def = SPROUT_BY_ID[id];
    const r = ZONE_RECT[def.homeZone];
    state.sprouts[id] = makeSproutSave(id, (r.x + 10.4 + i * 1.8) * 16, (r.y + 13.2 + (i % 2) * 1.2) * 16, def.homeZone, 1);
  });
  CHAPTERS.forEach((c) => {
    state.quests[c.id] = { tasks: {}, done: false, claimed: false };
  });
  return state;
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SAVE_VERSION) return null;
    const base = createInitialState();
    const merged: GameState = {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      flags: { ...base.flags, ...(parsed.flags ?? {}) },
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      unlocked: { ...base.unlocked, ...(parsed.unlocked ?? {}) },
      foraged: parsed.foraged ?? {},
    };
    // sanity: ensure all starting sprouts exist
    STARTING_SPROUTS.forEach((id) => {
      if (!merged.sprouts[id]) {
        const def = SPROUT_BY_ID[id];
        const r = ZONE_RECT[def.homeZone];
        merged.sprouts[id] = makeSproutSave(id, (r.x + 10) * 16, (r.y + 13) * 16, def.homeZone, 1);
      }
    });
    return merged;
  } catch {
    return null;
  }
}

export function saveState(s: GameState) {
  try {
    s.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  DERIVED VALUES                                                     */
/* ------------------------------------------------------------------ */

export function harmonyOf(s: GameState): number {
  const decorHarmony = s.decor.reduce((acc, d) => acc + (SHOP_BY_ID[d.itemId]?.harmony ?? 0), 0);
  const bonds = Object.values(s.sprouts).reduce((acc, sp) => acc + Math.floor(sp.heart / 25), 0);
  const bloomed = Object.values(s.sprouts).filter((sp) => sp.stage === 3).length;
  const zones = ZONE_ORDER.filter((z) => s.unlocked[z]).length;
  return Math.round(decorHarmony + bonds + bloomed * 2 + (zones - 1) * 2);
}

export function computeMood(sp: SproutSave, crying: boolean, asleep: boolean): Mood {
  if (asleep) return 'asleep';
  if (crying) return 'crying';
  const n = sp.needs;
  if (n.hunger < 20) return 'hungry';
  if (n.hydration < 20) return 'parched';
  if (n.energy < 16) return 'weary';
  if (n.comfort < 24) return 'sad';
  if (n.comfort < 40 || sp.calm < 30) return 'uneasy';
  if (n.comfort > 80 && n.hunger > 65 && n.hydration > 65 && sp.calm > 65) return 'joyful';
  return 'content';
}

export function nextZoneUnlock(s: GameState): { zone: ZoneId; name: string; seeds: number; harmony: number; missing: string } | null {
  const locked = ZONE_ORDER.filter((z) => !s.unlocked[z]);
  if (!locked.length) return null;
  const harmony = harmonyOf(s);
  const sorted = locked
    .map((z) => ({ z, req: ZONES[z].unlock! }))
    .sort((a, b) => a.req.harmony - b.req.harmony || a.req.seeds - b.req.seeds);
  const { z, req } = sorted[0];
  const missingParts: string[] = [];
  if (s.seeds < req.seeds) missingParts.push(`${req.seeds - s.seeds} seeds`);
  if (harmony < req.harmony) missingParts.push(`${req.harmony - harmony} harmony`);
  return {
    zone: z,
    name: ZONES[z].name,
    seeds: req.seeds,
    harmony: req.harmony,
    missing: missingParts.length ? missingParts.join(' and ') : 'ready to wake',
  };
}

export function sproutView(sp: SproutSave, crying: boolean, asleep: boolean, activity: SproutView['activity'], zone: ZoneId): SproutView {
  const def = SPROUT_BY_ID[sp.id];
  const nextStage = sp.stage >= 3 ? null : STAGE_THRESHOLDS[sp.stage];
  const mood = computeMood(sp, crying, asleep);
  return {
    id: sp.id,
    name: def?.name ?? sp.id,
    stage: sp.stage,
    mood,
    moodLabel: MOOD_LABELS[mood],
    needs: { ...sp.needs },
    heart: Math.round(sp.heart),
    calm: Math.round(sp.calm),
    trust: Math.round(sp.trust),
    zone,
    gap: {
      heart: Math.max(0, 100 - sp.heart),
      calm: Math.max(0, 100 - sp.calm),
      trust: Math.max(0, 100 - sp.trust),
      growth: Math.max(0, 100 - sp.growth),
      nextStage: nextStage === null ? null : Math.max(0, nextStage - sp.growth),
    },
    talksToday: sp.talksToday,
    storiesToday: sp.storiesToday,
    isCrying: crying,
    asleep,
    activity,
  };
}

export const MOOD_LABELS: Record<Mood, string> = {
  joyful: 'Joyful',
  content: 'Content',
  uneasy: 'Uneasy',
  hungry: 'Hungry',
  parched: 'Thirsty',
  weary: 'Weary',
  sad: 'Sad',
  crying: 'Crying',
  asleep: 'Asleep',
  excited: 'Excited',
};

export function greetingFor(sp: SproutSave, mood: Mood, timeLabel: string): string {
  const name = SPROUT_BY_ID[sp.id]?.name ?? 'Sprout';
  if (mood === 'crying') return `${name} looks up at you with huge, wet eyes. "You came. I did not think anyone would come."`;
  if (mood === 'sad') return `${name} is very quiet. "Everything feels a little far away today. Can you sit with me?"`;
  if (mood === 'hungry') return `${name} holds their tummy. "Is it... is it food time? I think it might be food time."`;
  if (mood === 'parched') return `${name} fans their leaves weakly. "Water? Just a sip? Please?"`;
  if (mood === 'weary') return `${name} yawns enormously. "I am not sleepy. I am just... resting my whole entire self."`;
  if (mood === 'asleep') return `${name} is asleep, breathing in tiny leaf-shaped puffs.`;
  if (mood === 'joyful') return `${name} beams at you. "You're here! I was hoping you'd be here!"`;
  if (mood === 'uneasy') return `${name} fidgets with a leaf. "It's a bit of a wobbly day. Nothing bad. Just wobbly."`;
  const q = moodQuote.content;
  return `${name} looks up. "Oh! Hello. ${q}"`;
}

export function stageLabel(stage: number) {
  return ['Seedling', 'Sprout', 'Budling', 'Bloomed'][stage] ?? 'Sprout';
}

export function clamp01(v: number) {
  return clamp(v, 0, 1);
}

export function dayLengthLabel() {
  return '6:00 — 2:00';
}

export function hashDay(day: number, salt = 0) {
  return hash2(day, salt);
}

/** Actions that count toward quests */
export type GameEventType =
  | 'play'
  | 'feed'
  | 'water'
  | 'talk'
  | 'cuddle'
  | 'story'
  | 'breathe'
  | 'decor'
  | 'soothe'
  | 'harvest'
  | 'unlock'
  | 'grow'
  | 'bloom'
  | 'harmony'
  | 'stage'
  | 'allzones';

export const QUEST_EVENT_LABEL: Partial<Record<GameEventType, string>> = {
  feed: 'Feeding',
  water: 'Watering',
  talk: 'Talking',
  cuddle: 'Cuddles',
  story: 'Stories',
  breathe: 'Breathing',
  decor: 'Decor',
  soothe: 'Soothed moments',
  harvest: 'Harvests',
  unlock: 'Areas woken',
  grow: 'Growth',
  bloom: 'Blooms',
  harmony: 'Harmony',
  allzones: 'All areas visited',
};

export function eligibleArrivals(state: GameState): { sprout: string; zone: ZoneId; text: string }[] {
  return ARRIVALS.filter((a) => a.day <= state.day && !state.sprouts[a.sprout] && (state.unlocked[a.zone] || ZONE_ORDER.indexOf(a.zone) === 0)).map(
    (a) => ({ sprout: a.sprout, zone: state.unlocked[a.zone] ? a.zone : 'meadow', text: a.text }),
  );
}

export function allSproutDefs() {
  return SPROUTS;
}

export function weatherNote(w: Weather) {
  return WEATHER_LABEL[w]?.note ?? '';
}