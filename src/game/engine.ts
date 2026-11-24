import {
  CHAPTERS,
  DECOR_FLAVOR,
  MINI_GAME_BY_ID,
  GATES,
  HOUR_RATE,
  MINUTE_MS,
  SHOP_BY_ID,
  SPROUTS,
  SPROUT_BY_ID,
  STAGE_GROWTH,
  STAGE_THRESHOLDS,
  STORIES,
  TILE,
  WEATHER_LABEL,
  ZONE_ORDER,
  ZONE_RECT,
  ZONES,
  clamp,
  hash2,
  lerp,
} from './content';
import {
  DEFAULT_STATS,
  SAVE_KEY,
  clearSave,
  computeMood,
  createInitialState,
  dayLengthLabel,
  eligibleArrivals,
  harmonyOf,
  hasSave,
  loadState,
  makeDaily,
  makeSproutSave,
  mulberry32,
  nextZoneUnlock,
  saveState,
  sproutView,
  weatherForDay,
} from './state';
import type {
  ActionId,
  DailyProgress,
  GameState,
  InteractPrompt,
  MiniGameId,
  MiniGameSave,
  Mood,
  Personality,
  PlacedDecor,
  QuestView,
  ShopItem,
  SproutSave,
  SproutView,
  ZoneId,
} from './types';
import { World } from './world';
import type { Ctx } from './sprites';
import { drawPlayer, drawProp, drawSprout, ellipse, R, shadowEllipse } from './sprites';
import { LINES, TALK_OPTIONS, TUTORIAL } from './dialogue';
import { Sfx } from './audio';

export interface DialogueOption {
  id: string;
  label: string;
}

export interface DialogueData {
  sproutId: string;
  name: string;
  text: string;
  options: DialogueOption[];
  mood: Mood;
  portraitMood?: Mood;
}

export interface StoryData {
  sproutId: string;
  name: string;
  title: string;
  paragraphs: string[];
}

export interface LetterData {
  id: string;
  title: string;
  from: string;
  body: string;
}

export interface SpeechData {
  id: number;
  sproutId: string;
  name: string;
  text: string;
}

export interface BreathState {
  active: boolean;
  phase: 'in' | 'hold' | 'out' | 'rest';
  progress: number;
  cycles: number;
}

export interface Snapshot {
  ready: boolean;
  started: boolean;
  paused: boolean;
  zone: ZoneId;
  zoneName: string;
  zoneSubtitle: string;
  day: number;
  clock: number;
  clockLabel: string;
  partOfDay: 'dawn' | 'morning' | 'day' | 'evening' | 'night';
  weather: GameState['weather'];
  weatherLabel: string;
  seeds: number;
  berries: number;
  dew: number;
  canMax: number;
  harmony: number;
  nextUnlock: { zone: ZoneId; name: string; seeds: number; harmony: number; missing: string } | null;
  unlocked: Record<ZoneId, boolean>;
  sprouts: SproutView[];
  neediest: SproutView[];
  quest: QuestView | null;
  chapters: QuestView[];
  daily: DailyProgress | null;
  prompt: InteractPrompt | null;
  placement: null | { item: ShopItem; valid: boolean; x: number; y: number };
  mode: 'play' | 'place';
  keeperName: string;
  settings: GameState['settings'];
  flags: GameState['flags'];
  stats: GameState['stats'];
  owned: Record<string, number>;
  decor: PlacedDecor[];
  zoneUnlocks: {
    id: ZoneId;
    name: string;
    subtitle: string;
    blurb: string;
    unlocked: boolean;
    seeds: number;
    harmony: number;
    canAfford: boolean;
    meetsHarmony: boolean;
  }[];
  toast: { id: number; text: string; tone: 'good' | 'soft' | 'warn' } | null;
  miniGames: Record<string, MiniGameSave>;
  arcadeUnlocked: boolean;
  miniGame: MiniGameId | null;
  showIntro: boolean;
  hasSave: boolean;
  tutorialStep: number;
  tutorialActive: boolean;
  breath: BreathState;
  selectedId: string | null;
  timeHour: number;
  dayProgress: number;
  canTend: boolean;
}

interface Actor {
  id: string;
  x: number;
  y: number;
  target: { x: number; y: number } | null;
  facing: 1 | -1;
  dir: 0 | 1 | 2 | 3;
  moving: boolean;
  anim: number;
  idle: number;
  activity: 'wander' | 'idle' | 'sleep' | 'cry' | 'care';
  crying: boolean;
  cryingFor: number;
  careT: number;
  blink: number;
  bubble: { text: string; kind: 'need' | 'heart' | 'note'; t: number } | null;
  sleepT: number;
  stageShown: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: 'petal' | 'spark' | 'rain' | 'firefly' | 'heart' | 'pollen' | 'ring' | 'leaf' | 'text';
  color: string;
  size: number;
  text?: string;
}

function sp_asleep(state: GameState, id: string) {
  return !!state.sprouts[id]?.asleep;
}

const WALK_SPEED = 62;
const RUN_SPEED = 104;

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: Ctx;
  state: GameState;
  world: World;
  actors: Record<string, Actor> = {};
  player = { x: 0, y: 0, dir: 0 as 0 | 1 | 2 | 3, moving: false, running: false, anim: 0, speed: 0 };
  keys = new Set<string>();
  camera = { x: 0, y: 0 };
  view = { w: 640, h: 400, scale: 2 };
  time = 0;
  last = 0;
  raf = 0;
  running = false;
  paused = false;
  started = false;
  zone: ZoneId = 'meadow';
  mode: 'play' | 'place' = 'play';
  placementItem: ShopItem | null = null;
  placementPos = { x: 0, y: 0 };
  placementValid = false;
  particles: Particle[] = [];
  toast: { id: number; text: string; tone: 'good' | 'soft' | 'warn' } | null = null;
  miniGame: MiniGameId | null = null;
  toastT = 0;
  toastId = 0;
  dialogue: DialogueData | null = null;
  speech: SpeechData | null = null;
  speechTimer = 0;
  speechId = 0;
  story: StoryData | null = null;
  letter: LetterData | null = null;
  breath: BreathState = { active: false, phase: 'in', progress: 0, cycles: 0 };
  selectedId: string | null = null;
  pointer = { x: 0, y: 0 };
  hoverWorld = { x: 0, y: 0 };
  walkTarget: { x: number; y: number } | null = null;
  pendingInteract: string | null = null;
  onSnapshot: (s: Snapshot) => void;
  onDialogue: (d: DialogueData | null) => void;
  onStory: (s: StoryData | null) => void;
  onLetter: (l: LetterData | null) => void;
  onSpeech: (s: SpeechData | null) => void;
  sfx: Sfx;
  isMobile = false;
  touchDir = { x: 0, y: 0 };
  runTouch = false;
  lastZoneToast = 0;
  ambientT = 0;
  weatherT = 0;
  lightning = 0;
  lastDayCheck = 0;
  saveT = 0;
  emitT = 0;
  showIntro = false;
  daySummary: { day: number; blooms: number; hearts: number } | null = null;
  propCache = new Map<string, HTMLCanvasElement>();
  lightCanvas: HTMLCanvasElement;
  resizeObs: ResizeObserver | null = null;
  musicT = 0;

  constructor(canvas: HTMLCanvasElement, hooks: {
    onSnapshot: (s: Snapshot) => void;
    onDialogue: (d: DialogueData | null) => void;
    onStory: (s: StoryData | null) => void;
    onLetter: (l: LetterData | null) => void;
    onSpeech: (s: SpeechData | null) => void;
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.onSnapshot = hooks.onSnapshot;
    this.onDialogue = hooks.onDialogue;
    this.onStory = hooks.onStory;
    this.onLetter = hooks.onLetter;
    this.onSpeech = hooks.onSpeech;
    this.state = createInitialState();
    this.world = new World();
    this.lightCanvas = document.createElement('canvas');
    this.sfx = new Sfx(() => this.state.settings);
    this.isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    this.showIntro = !hasSave();
    this.started = false;
    this.syncActors();
    this.player.x = this.world.spawnPoint('meadow').x;
    this.player.y = this.world.spawnPoint('meadow').y;
    this.resize();
    this.emit(true);
  }

  /* ---------------- lifecycle ---------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sfx.stopMusic();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const cssW = Math.max(320, rect.width);
    const cssH = Math.max(240, rect.height);
    const targetW = clamp(cssW / (this.isMobile ? 1.7 : 2.15), 380, 880);
    const scale = cssW / targetW;
    const w = Math.round(cssW / scale);
    const h = Math.round(cssH / scale);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.view = { w, h, scale };
    this.lightCanvas.width = w;
    this.lightCanvas.height = h;
  }

  private boundResize = () => this.resize();

  attach() {
    this.resizeObs = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) this.resizeObs.observe(this.canvas.parentElement);
    window.addEventListener('resize', this.boundResize);
    // Layout may still be settling (fonts, bottom nav); re-measure shortly after.
    window.setTimeout(() => this.resize(), 60);
    window.setTimeout(() => this.resize(), 300);
  }

  detach() {
    this.resizeObs?.disconnect();
    window.removeEventListener('resize', this.boundResize);
  }

  newGame(name: string) {
    const s = createInitialState(name.trim() || 'Keeper');
    s.flags.chapterSeen = CHAPTERS[0].id;
    this.state = s;
    this.story = null;
    this.letter = null;
    this.dialogue = null;
    this.actors = {};
    this.syncActors();
    this.player.x = this.world.spawnPoint('meadow').x;
    this.player.y = this.world.spawnPoint('meadow').y;
    this.zone = 'meadow';
    this.started = true;
    this.showIntro = false;
    this.mode = 'play';
    this.placementItem = null;
    this.particles = [];
    this.sfx.setMusic(true);
    this.beginTutorial();
    this.save();
    this.emit(true);
    this.sfx.play('chime');
  }

  continueGame() {
    const loaded = loadState();
    if (loaded) {
      this.state = loaded;
      this.world = new World(this.decorKindList());
      this.syncActors();
      const z = loaded.zone && loaded.unlocked[loaded.zone] ? loaded.zone : 'meadow';
      this.zone = z;
      this.player.x = this.world.spawnPoint(z).x;
      this.player.y = this.world.spawnPoint(z).y;
    } else {
      this.newGame('Keeper');
      return;
    }
    this.started = true;
    this.showIntro = false;
    if (!this.state.flags.chapterSeen) this.state.flags.chapterSeen = CHAPTERS[0].id;
    this.sfx.setMusic(this.state.settings.music);
    this.emit(true);
    this.toastMsg('Welcome back to the garden.', 'soft');
  }

  beginTutorial() {
    this.state.flags.tutorialSeen = false;
    this.state.flags.tutorialStep = 0;
    this.toastMsg('Use WASD or arrows to walk.', 'soft', 4);
  }

  /* ---------------- helpers ---------------- */

  decorKindList() {
    return this.state.decor
      .map((d) => ({ kind: SHOP_BY_ID[d.itemId]?.kind ?? 'stone', x: d.x, y: d.y, zone: d.zone }))
      .filter(Boolean);
  }

  syncActors() {
    const next: Record<string, Actor> = {};
    Object.values(this.state.sprouts).forEach((sp) => {
      const prev = this.actors[sp.id];
      if (prev) {
        next[sp.id] = { ...prev, x: sp.x, y: sp.y, facing: sp.facing };
        return;
      }
      next[sp.id] = {
        id: sp.id,
        x: sp.x,
        y: sp.y,
        target: null,
        facing: 1,
        dir: 0,
        moving: false,
        anim: 0,
        idle: Math.random() * 3,
        activity: sp.asleep ? 'sleep' : 'idle',
        crying: false,
        cryingFor: 0,
        careT: 0,
        blink: 0,
        bubble: null,
        sleepT: 0,
        stageShown: sp.stage,
      };
    });
    this.actors = next;
  }

  currentActorZone(a: Actor): ZoneId {
    return this.world.zoneAt(a.x, a.y) ?? this.state.sprouts[a.id]?.zone ?? 'meadow';
  }

  toastMsg(text: string, tone: 'good' | 'soft' | 'warn' = 'soft', seconds = 3) {
    const id = ++this.toastId;
    this.toast = { id, text, tone };
    this.toastT = seconds;
    this.emit();
  }

  emit(force = false) {
    this.onSnapshot(this.snapshot());
    this.emitT = 0;
  }

  snapshot(): Snapshot {
    const s = this.state;
    const harmony = harmonyOf(s);
    const clock = s.clock;
    const part = this.partOfDay();
    const sproutViews: SproutView[] = Object.values(s.sprouts).map((sp) => {
      const a = this.actors[sp.id];
      const zone = a ? this.currentActorZone(a) : sp.zone;
      const activity = a?.activity ?? 'idle';
      return sproutView(sp, !!a?.crying, !!sp.asleep, activity, zone);
    });
    const quest = this.buildQuestView();
    const neediest = [...sproutViews].sort((a, b) => this.urgency(b) - this.urgency(a)).slice(0, 3);
    const nu = nextZoneUnlock(s);
    const prompt = this.currentPrompt();
    const hour = Math.floor(clock / 60) % 24;
    return {
      ready: true,
      started: this.started,
      paused: this.paused,
      zone: this.zone,
      zoneName: ZONES[this.zone].name,
      zoneSubtitle: ZONES[this.zone].subtitle,
      day: s.day,
      clock,
      clockLabel: this.clockLabel(),
      partOfDay: part,
      weather: s.weather,
      weatherLabel: WEATHER_LABEL[s.weather]?.label ?? 'Sunny',
      seeds: s.seeds,
      berries: s.berries,
      dew: s.dew,
      canMax: s.canMax,
      harmony,
      nextUnlock: nu,
      unlocked: s.unlocked,
      sprouts: sproutViews,
      neediest,
      quest,
      chapters: this.buildAllQuestViews(),
      daily: s.daily,
      prompt,
      placement: this.mode === 'place' && this.placementItem ? { item: this.placementItem, valid: this.placementValid, x: this.placementPos.x, y: this.placementPos.y } : null,
      mode: this.mode,
      keeperName: s.keeperName,
      settings: s.settings,
      flags: s.flags,
      stats: s.stats,
      owned: s.owned,
      decor: s.decor,
      zoneUnlocks: ZONE_ORDER.map((id) => ({
        id,
        name: ZONES[id].name,
        subtitle: ZONES[id].subtitle,
        blurb: ZONES[id].blurb,
        unlocked: s.unlocked[id],
        seeds: ZONES[id].unlock?.seeds ?? 0,
        harmony: ZONES[id].unlock?.harmony ?? 0,
        canAfford: s.seeds >= (ZONES[id].unlock?.seeds ?? 0),
        meetsHarmony: harmony >= (ZONES[id].unlock?.harmony ?? 0),
      })),
      miniGames: s.miniGames ?? {},
      arcadeUnlocked: !!s.unlocked.arcade,
      miniGame: this.miniGame,
      toast: this.toast,
      showIntro: this.showIntro,
      hasSave: hasSave(),
      tutorialStep: s.flags.tutorialStep,
      tutorialActive: s.settings.hints && !s.flags.tutorialSeen,
      breath: { ...this.breath },
      selectedId: this.selectedId,
      timeHour: hour,
      dayProgress: clamp((clock - 360) / 1200, 0, 1),
      canTend: s.dew > 0,
    };
  }

  buildQuestView(): QuestView | null {
    const s = this.state;
    const ch = CHAPTERS.find((c) => c.id === s.flags.chapterSeen) ?? CHAPTERS[0];
    if (!ch) return null;
    const prog = s.quests[ch.id];
    const tasks = ch.tasks.map((t) => {
      const p = Math.min(prog?.tasks[t.id] ?? 0, t.count);
      return { id: t.id, label: t.label, progress: p, count: t.count, done: p >= t.count };
    });
    return {
      id: ch.id,
      title: ch.title,
      intro: ch.intro,
      tasks,
      reward: ch.reward,
      done: tasks.every((t) => t.done),
      claimed: !!prog?.claimed,
      letter: ch.letter,
    };
  }

  buildAllQuestViews(): QuestView[] {
    const s = this.state;
    return CHAPTERS.map((ch) => {
      const prog = s.quests[ch.id];
      const tasks = ch.tasks.map((t) => {
        const p = Math.min(prog?.tasks[t.id] ?? 0, t.count);
        return { id: t.id, label: t.label, progress: p, count: t.count, done: p >= t.count };
      });
      return {
        id: ch.id,
        title: ch.title,
        intro: ch.intro,
        tasks,
        reward: ch.reward,
        done: tasks.every((t) => t.done),
        claimed: !!prog?.claimed,
        letter: ch.letter,
      };
    });
  }

  urgency(v: SproutView) {
    const n = v.needs;
    return (100 - n.hunger) * 0.7 + (100 - n.hydration) * 0.7 + (100 - n.comfort) * 0.8 + (100 - n.energy) * 0.3 + (v.isCrying ? 60 : 0) + (100 - v.calm) * 0.6;
  }

  clockLabel() {
    const m = ((this.state.clock % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mm = Math.floor(m % 60);
    const suffix = h < 12 ? 'am' : 'pm';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(Math.floor(mm / 5) * 5).padStart(2, '0')}${suffix}`;
  }

  partOfDay(): 'dawn' | 'morning' | 'day' | 'evening' | 'night' {
    const c = this.state.clock;
    if (c < 7 * 60) return 'dawn';
    if (c < 11 * 60) return 'morning';
    if (c < 17 * 60) return 'day';
    if (c < 20 * 60) return 'evening';
    return 'night';
  }

  darkness(): number {
    const c = this.state.clock;
    if (c >= 6 * 60 && c < 7 * 60) return lerp(0.42, 0.06, (c - 360) / 60);
    if (c >= 7 * 60 && c < 17.5 * 60) return 0;
    if (c >= 17.5 * 60 && c < 19.5 * 60) return lerp(0, 0.3, (c - 1050) / 120);
    if (c >= 19.5 * 60 && c < 21 * 60) return lerp(0.3, 0.58, (c - 1170) / 90);
    return 0.58;
  }

  /* ---------------- update ---------------- */

  update(dt: number) {
    if (!this.started || this.paused) {
      this.time += dt;
      this.render();
      return;
    }
    this.time += dt;
    this.ambientT += dt;
    this.emitT += dt;
    this.saveT += dt;
    this.updateClock(dt);
    this.updatePlayer(dt);
    this.updateActors(dt);
    this.updateNeeds(dt);
    this.updateParticles(dt);
    this.updateBreath(dt);
    this.updateCamera(dt);
    this.updateAmbient(dt);
    this.checkZoneEntry();
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) {
        this.toast = null;
        this.emit();
      }
    }
    if (this.speechTimer > 0) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0 && this.speech) {
        this.speech = null;
        this.onSpeech(null);
      }
    }
    if (this.emitT > 0.12) this.emit();
    if (this.saveT > 20) {
      this.saveT = 0;
      this.save();
    }
  }

  updateClock(dt: number) {
    const s = this.state;
    s.clock += dt / HOUR_RATE;
    // tutorials ignore
    if (s.clock >= 26 * 60) {
      this.endDay('The garden grew dark and quiet, so you went inside to sleep.');
    }
  }

  updatePlayer(dt: number) {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.has('w') || k.has('arrowup')) dy -= 1;
    if (k.has('s') || k.has('arrowdown')) dy += 1;
    if (k.has('a') || k.has('arrowleft')) dx -= 1;
    if (k.has('d') || k.has('arrowright')) dx += 1;
    if (this.touchDir.x || this.touchDir.y) {
      dx = this.touchDir.x;
      dy = this.touchDir.y;
    }
    let target: { x: number; y: number } | null = null;
    if (dx || dy) {
      this.walkTarget = null;
      this.pendingInteract = null;
    } else if (this.walkTarget) {
      const ddx = this.walkTarget.x - this.player.x;
      const ddy = this.walkTarget.y - this.player.y;
      if (Math.hypot(ddx, ddy) > 6) {
        dx = ddx;
        dy = ddy;
      } else {
        this.walkTarget = null;
        this.player.moving = false;
      }
    }
    const running = this.runTouch || k.has('shift');
    const len = Math.hypot(dx, dy);
    let moved = false;
    if (len > 0.01) {
      const speed = running ? RUN_SPEED : WALK_SPEED;
      const vx = (dx / len) * speed * dt;
      const vy = (dy / len) * speed * dt;
      const nx = this.player.x + vx;
      const ny = this.player.y + vy;
      if (this.canPlayerStand(nx, ny)) {
        this.player.x = nx;
        this.player.y = ny;
        moved = true;
      } else if (this.canPlayerStand(nx, this.player.y)) {
        this.player.x = nx;
        moved = true;
      } else if (this.canPlayerStand(this.player.x, ny)) {
        this.player.y = ny;
        moved = true;
      } else {
        this.walkTarget = null;
      }
      this.player.moving = moved;
      this.player.running = running;
      if (moved) {
        this.player.anim += dt * (running ? 1.6 : 1);
        if (Math.abs(vx) > Math.abs(vy) * 0.7) this.player.dir = vx > 0 ? 3 : 2;
        else if (Math.abs(vy) > 0.1) this.player.dir = vy > 0 ? 0 : 1;
      }
    } else {
      this.player.moving = false;
      this.player.running = false;
    }
    this.player.x = clamp(this.player.x, 12, this.world.base.width - 12);
    this.player.y = clamp(this.player.y, 12, this.world.base.height - 12);
    if (this.pendingInteract) {
      const sp = this.state.sprouts[this.pendingInteract];
      if (sp) {
        const a = this.actors[this.pendingInteract];
        if (a && Math.hypot(a.x - this.player.x, a.y - this.player.y) < 40) {
          const target = this.pendingInteract;
          this.pendingInteract = null;
          this.walkTarget = null;
          this.openCare(target);
        }
      } else this.pendingInteract = null;
    }
    this.state.zone = this.zone;
  }

  canPlayerStand(x: number, y: number) {
    if (!this.world.walkable(x, y, 5)) return false;
    const gate = this.world.gateNear(x, y, 18);
    if (gate) {
      const targetZone = this.world.zoneAt(x, y) ?? gate.to;
      if (!this.state.unlocked[targetZone] && !this.state.unlocked[gate.to]) return false;
    }
    return true;
  }

  updateActors(dt: number) {
    const t = this.time;
    Object.values(this.state.sprouts).forEach((sp) => {
      const a = this.actors[sp.id];
      if (!a) return;
      const def = SPROUT_BY_ID[sp.id];
      const zone = this.currentActorZone(a);
      const zoneRect = ZONE_RECT[zone];
      const playerDist = Math.hypot(this.player.x - a.x, this.player.y - a.y);
      const mood = computeMood(sp, a.crying, sp.asleep);
      const hour = (this.state.clock / 60) % 24;
      const nightTime = hour >= 20 || hour < 6;

      // day/night sleep behavior
      if (!sp.asleep && nightTime && sp.needs.energy < 45 && a.activity !== 'care' && !a.crying) {
        this.fallAsleep(sp.id, true);
      }

      // crying onset
      if (!a.crying && !sp.asleep && this.started && !def?.passive && this.time > sp.cryGrace) {
        const bad = sp.needs.comfort < 26 || sp.needs.hunger < 12 || sp.needs.hydration < 12 || sp.calm < 22 || (nightTime && sp.calm < 32);
        if (bad) {
          a.crying = true;
          a.cryingFor = 0;
          a.bubble = { text: '!', kind: 'need', t: 3 };
          this.sfx.play('cry', 0.6);
          const now = this.time;
          if (now - sp.lastCryNotice > 90) {
            sp.lastCryNotice = now;
            this.toastMsg(`${def?.name ?? 'A sprout'} is crying in ${ZONES[zone].name}. They need someone to stay.`, 'warn', 6);
          }
          this.emit();
        }
      }
      if (a.crying) {
        a.cryingFor += dt;
        a.activity = 'cry';
        if (playerDist < 60) a.facing = this.player.x > a.x ? 1 : -1;
        if (a.cryingFor > 70 && !sp.asleep) {
          // they cry themselves out
          a.crying = false;
          a.cryingFor = 0;
          sp.calm = Math.max(12, sp.calm);
        }
      }

      if (sp.asleep) {
        a.activity = 'sleep';
        a.moving = false;
        a.target = null;
        a.sleepT += dt;
        sp.needs.energy = clamp(sp.needs.energy + 0.075 * (dt / 0.5), 0, 100);
        sp.needs.comfort = clamp(sp.needs.comfort + 0.02 * (dt / 0.5), 0, 100);
        sp.needs.hunger = clamp(sp.needs.hunger - 0.012 * (dt / 0.5), 0, 100);
        sp.needs.hydration = clamp(sp.needs.hydration - 0.01 * (dt / 0.5), 0, 100);
        if (sp.needs.energy > 96) sp.asleep = false;
        return;
      }

      if (a.crying) {
        a.moving = false;
        a.anim += dt;
        return;
      }

      // player proximity pause
      // Passive plants (Nerdy) are rooted: they stay where they were planted.
      if (def?.passive) {
        a.moving = false;
        a.target = null;
        a.activity = 'idle';
        a.facing = this.player.x > a.x ? 1 : -1;
        a.anim += dt;
        if (a.bubble) {
          a.bubble.t -= dt;
          if (a.bubble.t <= 0) a.bubble = null;
        }
        sp.x = a.x;
        sp.y = a.y;
        sp.facing = a.facing;
        sp.zone = zone;
        return;
      }

      if (playerDist < 26) {
        a.moving = false;
        a.facing = this.player.x > a.x ? 1 : -1;
        a.idle += dt;
        a.activity = 'idle';
      } else {
        a.idle -= dt;
        if (!a.target && a.idle <= 0) {
          if (a.activity === 'care' || Math.random() < 0.35) {
            a.target = null;
            a.idle = 1.5 + Math.random() * 3.5;
            a.activity = 'idle';
          } else {
            const rng = Math.random;
            const target = this.world.randomWalkable(zone, rng);
            a.target = target;
            a.activity = 'wander';
            a.idle = 0;
          }
        }
        if (a.target) {
          const dx = a.target.x - a.x;
          const dy = a.target.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d < 4) {
            a.target = null;
            a.idle = 1.5 + Math.random() * 5;
            a.activity = 'idle';
          } else {
            const speed = 11;
            const nx = a.x + (dx / d) * speed * dt;
            const ny = a.y + (dy / d) * speed * dt;
            // keep in their zone
            const zn = this.world.zoneAt(nx, ny);
            if (zn === zone && this.world.walkable(nx, ny, 4)) {
              a.x = nx;
              a.y = ny;
              a.moving = true;
              a.facing = dx > 0 ? 1 : -1;
              a.dir = Math.abs(dx) > Math.abs(dy) * 0.6 ? (dx > 0 ? 3 : 2) : dy > 0 ? 0 : 1;
              a.activity = 'wander';
            } else {
              a.target = null;
              a.idle = 0.5 + Math.random() * 1.5;
              a.moving = false;
            }
          }
        } else {
          a.moving = false;
          a.idle -= dt;
        }
      }
      a.anim += dt;
      if (a.careT > 0) {
        a.careT -= dt;
        if (a.careT <= 0) a.activity = 'idle';
      }
      // bubble decay
      if (a.bubble) {
        a.bubble.t -= dt;
        if (a.bubble.t <= 0) a.bubble = null;
      }
      // occasional need bubble
      if (!a.bubble && Math.random() < dt * 0.06 && !sp.asleep) {
        const need = this.criticalNeed(sp);
        if (need) a.bubble = { text: need, kind: 'need', t: 3.5 };
      }
      // sync save position
      sp.x = a.x;
      sp.y = a.y;
      sp.facing = a.facing;
      sp.zone = zone;
    });
  }

  criticalNeed(sp: SproutSave): string | null {
    const n = sp.needs;
    if (n.hunger < 35) return 'hungry';
    if (n.hydration < 35) return 'thirsty';
    if (n.energy < 30) return 'tired';
    if (n.comfort < 35) return 'sad';
    return null;
  }

  allSproutsInZone(zone: ZoneId) {
    return Object.values(this.state.sprouts).filter((sp) => {
      const a = this.actors[sp.id];
      return (a ? this.currentActorZone(a) : sp.zone) === zone;
    });
  }

  updateNeeds(dt: number) {
    if (!this.started) return;
    const minutes = dt / HOUR_RATE;
    const s = this.state;
    const raining = s.weather === 'drizzle';
    const night = this.partOfDay() === 'night';
    const k = s.settings.gentle ? 0.6 : 1;
    Object.values(s.sprouts).forEach((sp) => {
      if (sp.asleep) return;
      const a = this.actors[sp.id];
      const crying = a?.crying;
      const n = sp.needs;
      // Target feel: a neglected sprout drifts from comfortable to needing you
      // across roughly one in-game day, so each day asks for one or two visits.
      n.hunger = clamp(n.hunger - 0.058 * minutes * k, 0, 100);
      n.hydration = clamp(n.hydration - (raining ? 0 : 0.052 * minutes * k), 0, 100);
      n.energy = clamp(n.energy - (night ? 0.012 : 0.026) * minutes * k, 0, 100);
      n.comfort = clamp(n.comfort - 0.038 * minutes * k - (crying ? 0.04 * minutes : 0), 0, 100);
      sp.calm = clamp(sp.calm + (crying ? -0.05 * minutes : (n.comfort > 60 ? 0.02 : -0.035) * minutes), 0, 100);
      const good = n.hunger > 45 && n.hydration > 45 && n.comfort > 45 && !crying;
      sp.growth = clamp(sp.growth + (good ? 0.024 * minutes : 0.002 * minutes), 0, 100);
      if (good && sp.heart < 100 && Math.random() < dt * 0.02) sp.heart = clamp(sp.heart + 0.2, 0, 100);
      this.checkStage(sp);
      if (crying && sp.needs.comfort > 60) a!.crying = false;
      // reset daily counters
      if (sp.dayOfTalks !== s.day) {
        sp.talksToday = 0;
        sp.dayOfTalks = s.day;
      }
      if (sp.dayOfStories !== s.day) {
        sp.storiesToday = 0;
        sp.dayOfStories = s.day;
      }
    });
    // rain audio sometimes
    if (raining) {
      this.weatherT += dt;
      if (this.weatherT > 40) {
        this.weatherT = 0;
        this.sfx.play('rain', 0.4);
      }
    }
  }

  checkStage(sp: SproutSave) {
    while (sp.stage < 3 && sp.growth >= STAGE_THRESHOLDS[sp.stage]) {
      sp.stage = (sp.stage + 1) as 0 | 1 | 2 | 3;
      const a = this.actors[sp.id];
      if (a) {
        const zone = this.currentActorZone(a);
        for (let i = 0; i < 16; i++) this.spawnParticle('spark', a.x, a.y - 20, { color: ['#fff3c9', '#ffe08a', '#b6e6a8'][i % 3] });
        void zone;
      }
      this.state.stats.stagesGrown++;
      this.sfx.play('grow');
      if (sp.stage === 3) {
        sp.bloomSeen = true;
        sp.heart = clamp(sp.heart + 10, 0, 100);
        sp.calm = clamp(sp.calm + 15, 0, 100);
        this.state.stats.blooms++;
        this.state.seeds += 12;
        const def = SPROUT_BY_ID[sp.id];
        this.toastMsg(`${def?.name ?? 'A sprout'} bloomed! +12 seeds`, 'good', 5);
        this.recordEvent('bloom', 1);
        this.sfx.play('bloom');
      } else {
        this.toastMsg(`${SPROUT_BY_ID[sp.id]?.name ?? 'A sprout'} grew into a ${['', 'Sprout', 'Budling', 'Bloomed'][sp.stage]}!`, 'good', 4);
        this.recordEvent('grow', 1);
      }
      this.emit();
    }
  }

  /* ---------------- camera / ambient ---------------- */

  updateCamera(dt: number) {
    const vw = this.view.w;
    const vh = this.view.h;
    const worldW = this.world.base.width;
    const worldH = this.world.base.height;
    let tx = this.player.x - vw / 2;
    let ty = this.player.y - vh / 2 - 6;
    if (worldW <= vw) tx = (worldW - vw) / 2;
    else tx = clamp(tx, 0, worldW - vw);
    if (worldH <= vh) ty = (worldH - vh) / 2;
    else ty = clamp(ty, 0, worldH - vh);
    const speed = 1 - Math.pow(0.0005, dt);
    this.camera.x = lerp(this.camera.x, tx, speed);
    this.camera.y = lerp(this.camera.y, ty, speed);
    if (Math.abs(this.camera.x - tx) < 0.2) this.camera.x = tx;
    if (Math.abs(this.camera.y - ty) < 0.2) this.camera.y = ty;
  }

  updateAmbient(dt: number) {
    const theme = ZONES[this.zone].theme;
    const night = this.darkness() > 0.3;
    const rate = theme.ambient === 'fireflies' || theme.ambient === 'sparkles' ? 0.9 : 1.6;
    if (Math.random() < dt * rate) {
      const x = this.camera.x + Math.random() * this.view.w;
      const y = this.camera.y + Math.random() * this.view.h;
      switch (theme.ambient) {
        case 'petals':
          this.particles.push({ x: this.camera.x - 30 + Math.random() * 40, y: this.camera.y + Math.random() * this.view.h * 0.5, vx: 12 + Math.random() * 10, vy: 8 + Math.random() * 6, life: 7, maxLife: 7, kind: 'petal', color: Math.random() < 0.5 ? '#f2b5c8' : '#f7d7df', size: Math.random() < 0.4 ? 2 : 1 });
          break;
        case 'pollen':
          this.particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 4, life: 4, maxLife: 4, kind: 'pollen', color: '#f8e6a4', size: 1 });
          break;
        case 'fireflies':
          if (night) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 6, life: 5, maxLife: 5, kind: 'firefly', color: Math.random() < 0.5 ? '#d9f7a8' : '#b6f2e4', size: 1 });
          else this.particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 5, maxLife: 5, kind: 'pollen', color: '#dcefc0', size: 1 });
          break;
        case 'blossom':
          this.particles.push({ x: this.camera.x - 30 + Math.random() * 40, y: this.camera.y + Math.random() * this.view.h * 0.5, vx: 14 + Math.random() * 12, vy: 10 + Math.random() * 8, life: 9, maxLife: 9, kind: 'petal', color: Math.random() < 0.5 ? '#f6c4d6' : '#ffe3ec', size: Math.random() < 0.5 ? 2 : 1 });
          break;
        case 'sparkles':
          this.particles.push({ x, y, vx: 0, vy: -3, life: 2, maxLife: 2, kind: 'spark', color: '#cfeee2', size: 1 });
          break;
      }
    }
    if (this.state.weather === 'drizzle') {
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: this.camera.x + Math.random() * (this.view.w + 40),
          y: this.camera.y - 10 + Math.random() * 20,
          vx: -22,
          vy: 190 + Math.random() * 40,
          life: 1.6,
          maxLife: 1.6,
          kind: 'rain',
          color: 'rgba(190,220,240,0.55)',
          size: 1,
        });
      }
    }
  }

  updateParticles(dt: number) {
    const cam = this.camera;
    const vw = this.view.w;
    const vh = this.view.h;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.kind === 'text') {
        p.y -= dt * 16;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'petal') {
        p.vx += Math.sin(this.time * 2 + p.x * 0.05) * dt * 6;
        p.vy += Math.cos(this.time * 1.4 + p.y * 0.04) * dt * 2;
      } else if (p.kind === 'firefly') {
        p.vx += (Math.random() - 0.5) * dt * 20;
        p.vy += (Math.random() - 0.5) * dt * 20;
        p.vx = clamp(p.vx, -8, 8);
        p.vy = clamp(p.vy, -8, 8);
      } else if (p.kind === 'spark') {
        p.vy += dt * 4;
      } else if (p.kind === 'pollen') {
        p.vx += Math.sin(this.time + p.y * 0.07) * dt * 3;
      }
      // offscreen
      if (p.x < cam.x - 60 || p.x > cam.x + vw + 60 || p.y < cam.y - 60 || p.y > cam.y + vh + 60) {
        // rain/petals spawned with world coords (ambient) or screen coords
        if (p.kind === 'petal' || p.kind === 'pollen' || p.kind === 'spark' || p.kind === 'rain') {
          if (p.x < cam.x - 60 || p.x > cam.x + vw + 60) this.particles.splice(i, 1);
        }
      }
    }
    if (this.particles.length > 340) this.particles.splice(0, this.particles.length - 340);
  }

  updateBreath(dt: number) {
    if (!this.breath.active) return;
    const cycle = 8; // 3.5 in, 2 hold, 3.5 out... simplified
    const t = this.breath.progress + dt;
    this.breath.progress = t;
    const phaseT = t % 6;
    this.breath.phase = phaseT < 2.4 ? 'in' : phaseT < 3.4 ? 'hold' : 'out';
    if (t >= 6 * 3) {
      this.finishBreathing();
    }
  }

  /* ---------------- interactions ---------------- */

  nearestSprout(maxDist = 44): SproutSave | null {
    let best: SproutSave | null = null;
    let bestD = maxDist;
    Object.values(this.state.sprouts).forEach((sp) => {
      const a = this.actors[sp.id];
      if (!a) return;
      const d = Math.hypot(a.x - this.player.x, (a.y - 6 - this.player.y) * 0.8);
      if (d < bestD) {
        bestD = d;
        best = sp;
      }
    });
    return best;
  }

  nearbyBerryBush(): { id: string; x: number; y: number } | null {
    for (let i = 0; i < this.world.placedProps.length; i++) {
      const { def, zone } = this.world.placedProps[i];
      if (def.kind !== 'berrybush') continue;
      const d = Math.hypot(def.x * TILE - this.player.x, def.y * TILE - this.player.y);
      if (d < 40) {
        return { id: `bush-${zone}-${i}`, x: def.x * TILE, y: def.y * TILE };
      }
    }
    return null;
  }

  nearbyWell(): boolean {
    const well = { x: (ZONE_RECT.meadow.x + 15.4) * TILE, y: (ZONE_RECT.meadow.y + 8.4) * TILE + 4 };
    return Math.hypot(well.x - this.player.x, well.y - this.player.y) < 44;
  }

  nearWater(): boolean {
    const px = this.player.x;
    const py = this.player.y;
    for (const zone of ZONE_ORDER) {
      const water = ZONES[zone].water?.[0];
      if (!water) continue;
      const r = ZONE_RECT[zone];
      const wx = (r.x + water.x) * TILE;
      const wy = (r.y + water.y) * TILE;
      const rx = water.rx * TILE;
      const ry = water.ry * TILE;
      // sample the ellipse outline and take the true pixel distance to the shore
      let best = Infinity;
      for (let i = 0; i < 48; i++) {
        const t = (i / 48) * Math.PI * 2;
        const ex = wx + Math.cos(t) * rx;
        const ey = wy + Math.sin(t) * ry;
        const d = (ex - px) * (ex - px) + (ey - py) * (ey - py);
        if (d < best) best = d;
      }
      if (best < 42 * 42) return true;
    }
    return false;
  }

  nearCottage() {
    const cx = (ZONE_RECT.meadow.x + 6) * TILE;
    const cy = (ZONE_RECT.meadow.y + 5.6) * TILE;
    return Math.hypot(cx - this.player.x, cy + 4 - this.player.y) < 62;
  }

  nearGate(): { zone: ZoneId; locked: boolean; anchor: { x: number; y: number } } | null {
    for (const g of GATES) {
      const ax = g.anchor.x * TILE;
      const ay = g.anchor.y * TILE;
      if (Math.hypot(ax - this.player.x, ay - this.player.y) < 34) {
        return { zone: g.to, locked: !this.state.unlocked[g.to], anchor: { x: ax, y: ay } };
      }
    }
    return null;
  }

  /** Mini-game booths live in the arcade zone; coordinates are zone-local tiles. */
  arcadeStations(): { gameId: MiniGameId; x: number; y: number; label: string }[] {
    const rect = ZONE_RECT.arcade;
    const local: { gameId: MiniGameId; x: number; y: number }[] = [
      { gameId: 'berrycatch', x: 1.4, y: 16.6 },
      { gameId: 'memory', x: 3.0, y: 17.4 },
      { gameId: 'firefly', x: 3.7, y: 12.2 },
      { gameId: 'melody', x: 3.7, y: 8.6 },
    ];
    return local.map((l) => ({
      gameId: l.gameId,
      x: (rect.x + l.x) * TILE,
      y: (rect.y + l.y) * TILE,
      label: MINI_GAME_BY_ID[l.gameId]?.name ?? 'Game',
    }));
  }

  nearStation(): { gameId: MiniGameId; x: number; y: number; label: string } | null {
    if (!this.state.unlocked.arcade) return null;
    for (const st of this.arcadeStations()) {
      if (Math.hypot(st.x - this.player.x, st.y - this.player.y) < 40) return st;
    }
    return null;
  }

  currentPrompt(): InteractPrompt | null {
    if (this.mode === 'place' || this.breath.active) return null;
    const sp = this.nearestSprout(46);
    if (sp) {
      const def = SPROUT_BY_ID[sp.id];
      return {
        kind: 'sprout',
        id: sp.id,
        label: def?.name ?? sp.id,
        action: 'Care',
        sproutId: sp.id,
      };
    }
    const station = this.nearStation();
    if (station) {
      return { kind: 'station', id: station.gameId, label: station.label, action: 'Play' };
    }
    const bush = this.nearbyBerryBush();
    if (bush) {
      const count = this.state.foraged[bush.id]?.count ?? 0;
      const day = this.state.foraged[bush.id]?.day ?? 0;
      const avail = day === this.state.day ? 3 - count : 3;
      return { kind: 'berrybush', id: bush.id, label: avail > 0 ? `${avail} berries ready` : 'Berries will return tomorrow', action: avail > 0 ? 'Gather' : 'Empty' };
    }
    if (this.nearbyWell()) return { kind: 'water', id: 'well', label: 'Old well', action: 'Refill can' };
    if (this.nearWater()) return { kind: 'water', id: 'pond', label: 'Still water', action: 'Refill can' };
    if (this.nearCottage()) {
      const can = this.partOfDay() === 'night' || this.state.clock >= 17 * 60;
      return { kind: 'door', id: 'cottage', label: 'Your cottage', action: can ? 'Sleep' : 'Rest until evening' };
    }
    const gate = this.nearGate();
    if (gate) {
      return { kind: 'sign', id: `gate-${gate.zone}`, label: ZONES[gate.zone].name, action: gate.locked ? 'Asleep' : 'Walk through' };
    }
    return null;
  }

  interact() {
    if (this.dialogue || this.story || this.letter || this.breath.active) return;
    if (this.mode === 'place') {
      this.tryPlaceAt(this.hoverWorld.x, this.hoverWorld.y);
      return;
    }
    const station = this.nearStation();
    if (station) {
      this.openMiniGame(station.gameId);
      return;
    }
    const sp = this.nearestSprout(46);
    if (sp) {
      this.openCare(sp.id);
      return;
    }
    if (this.nearbyBerryBush()) {
      this.gather();
      return;
    }
    if (this.nearbyWell() || this.nearWater()) {
      this.refillCan();
      return;
    }
    if (this.nearCottage()) {
      if (this.partOfDay() === 'night' || this.state.clock >= 17 * 60) this.endDay('You slept in your cottage.');
      else this.toastMsg('The cottage is warm and waiting. Come back after sunset to sleep.', 'soft');
      return;
    }
    const gate = this.nearGate();
    if (gate) {
      if (gate.locked) {
        const req = ZONES[gate.zone].unlock;
        this.toastMsg(`This path is still asleep. It needs ${req?.seeds} seeds and ${req?.harmony} harmony.`, 'warn', 5);
        this.sfx.play('locked');
      } else {
        this.walkTarget = { x: gate.anchor.x, y: gate.anchor.y + (this.zone === gate.zone ? 8 : -8) };
      }
      return;
    }
    const sign = this.nearestSign();
    if (sign) {
      this.toastMsg(TUTORIAL[0].hint + ' Press E near a sprout, the well, or a berry bush.', 'soft', 5);
    }
  }

  nearestSign() {
    const sign = ZONES[this.zone].props.find((p) => p.kind === 'sign');
    if (!sign) return false;
    const x = (ZONE_RECT[this.zone].x + sign.x) * TILE;
    const y = (ZONE_RECT[this.zone].y + sign.y) * TILE;
    return Math.hypot(x - this.player.x, y - this.player.y) < 40;
  }

  gather() {
    const bush = this.nearbyBerryBush();
    if (!bush) return;
    const rec = this.state.foraged[bush.id];
    const count = rec?.day === this.state.day ? rec.count : 0;
    if (count >= 3) {
      this.toastMsg('This bush is bare until tomorrow. The berries need time.', 'soft');
      return;
    }
    this.state.foraged[bush.id] = { day: this.state.day, count: count + 1 };
    this.state.berries += 1;
    this.state.stats.harvests++;
    this.recordEvent('harvest', 1);
    const a = this.world;
    void a;
    for (let i = 0; i < 6; i++) this.spawnParticle('spark', bush.x, bush.y - 10, { color: '#ff8fa8' });
    this.spawnText(bush.x, bush.y - 22, '+1 berry', '#ffd6df');
    this.sfx.play('pick');
    this.emit(true);
  }

  refillCan() {
    if (this.state.dew >= this.state.canMax) {
      this.toastMsg('Your watering can is already full.', 'soft');
      return;
    }
    this.state.dew = this.state.canMax;
    this.toastMsg('Watering can refilled.', 'good');
    for (let i = 0; i < 8; i++) this.spawnParticle('spark', this.player.x, this.player.y - 10, { color: '#bfe9f5' });
    this.sfx.play('water');
    this.emit(true);
  }

  openCare(id: string) {
    this.selectedId = id;
    this.sfx.play('select');
    if (this.state.flags.tutorialStep < 1 && !this.state.flags.tutorialSeen) {
      this.state.flags.tutorialStep = 1;
    }
    this.emit(true);
  }

  closeCare() {
    this.selectedId = null;
    this.emit(true);
  }

  teleportToZone(zone: ZoneId) {
    if (!this.state.unlocked[zone]) return;
    this.miniGame = null;
    this.zone = zone;
    this.player.x = this.world.spawnPoint(zone).x;
    this.player.y = this.world.spawnPoint(zone).y;
    this.camera.x = this.player.x - this.view.w / 2;
    this.camera.y = this.player.y - this.view.h / 2;
    this.toastMsg(`${ZONES[zone].name}. ${ZONES[zone].arrival ?? ''}`, 'good', 4);
    this.sfx.play('walkzone');
    this.emit(true);
  }

  /* ---------------- care actions ---------------- */

  care(id: string, action: ActionId) {
    const sp = this.state.sprouts[id];
    const def = SPROUT_BY_ID[id];
    const a = this.actors[id];
    if (!sp || !a || !def) return;
    if (sp.asleep && action !== 'tuckin') {
      this.toastMsg(`${def.name} is asleep. They need the rest.`, 'soft');
      return;
    }
    const line = (key: Parameters<typeof this.say>[1]) => this.say(sp, key);
    switch (action) {
      case 'feed': {
        if (this.state.berries <= 0) {
          this.toastMsg('No berries in your satchel. Gather some from a berry bush.', 'warn');
          this.sfx.play('locked');
          return;
        }
        this.state.berries--;
        sp.needs.hunger = clamp(sp.needs.hunger + 42, 0, 100);
        sp.needs.comfort = clamp(sp.needs.comfort + 8, 0, 100);
        sp.heart = clamp(sp.heart + 3, 0, 100);
        sp.growth = clamp(sp.growth + 2.2, 0, 100);
        this.state.stats.feeds++;
        this.recordEvent('feed', 1);
        this.doCareFx(a, '#ffd06a');
        line('feed');
        this.sfx.play('eat');
        break;
      }
      case 'water': {
        if (this.state.dew <= 0) {
          this.toastMsg('Your watering can is empty. Refill it at the well or the pond.', 'warn');
          this.sfx.play('locked');
          return;
        }
        this.state.dew--;
        sp.needs.hydration = clamp(sp.needs.hydration + 48, 0, 100);
        sp.needs.comfort = clamp(sp.needs.comfort + 5, 0, 100);
        sp.heart = clamp(sp.heart + 2, 0, 100);
        sp.growth = clamp(sp.growth + 2, 0, 100);
        this.state.stats.waters++;
        this.recordEvent('water', 1);
        this.doCareFx(a, '#a6dff5');
        line('water');
        this.sfx.play('water');
        break;
      }
      case 'cuddle': {
        sp.needs.comfort = clamp(sp.needs.comfort + 22, 0, 100);
        sp.calm = clamp(sp.calm + 8, 0, 100);
        sp.heart = clamp(sp.heart + 5, 0, 100);
        sp.trust = clamp(sp.trust + 2, 0, 100);
        sp.growth = clamp(sp.growth + 2.6, 0, 100);
        this.state.stats.cuddles++;
        this.recordEvent('cuddle', 1);
        this.doCareFx(a, '#ff9db8', 'heart');
        a.facing = this.player.x > a.x ? 1 : -1;
        line('cuddle');
        this.sfx.play('hug');
        if (sp.calm < 22) sp.calm = clamp(sp.calm + 4, 0, 100);
        if (a.crying) {
          a.crying = false;
          sp.needs.comfort = clamp(Math.max(sp.needs.comfort, 30) + 8, 0, 100);
          sp.calm = clamp(Math.max(sp.calm, 30) + 10, 0, 100);
          sp.cryGrace = this.time + 30;
          this.recordEvent('soothe', 1);
        }
        break;
      }
      case 'play': {
        if (sp.needs.energy < 12) {
          this.toastMsg(`${def.name} is too tired to play. A cuddle or a nap would help more.`, 'soft');
          return;
        }
        sp.needs.energy = clamp(sp.needs.energy - 9, 0, 100);
        sp.needs.comfort = clamp(sp.needs.comfort + 12, 0, 100);
        sp.heart = clamp(sp.heart + 5, 0, 100);
        sp.calm = clamp(sp.calm + 5, 0, 100);
        sp.growth = clamp(sp.growth + 2.4, 0, 100);
        this.state.stats.plays++;
        this.doCareFx(a, '#b7ec8a');
        line('play');
        this.sfx.play('play');
        break;
      }
      case 'sing': {
        sp.needs.comfort = clamp(sp.needs.comfort + 7, 0, 100);
        sp.calm = clamp(sp.calm + 11, 0, 100);
        sp.heart = clamp(sp.heart + 2, 0, 100);
        sp.growth = clamp(sp.growth + 1.6, 0, 100);
        this.doCareFx(a, '#e4c3ff');
        line('sing');
        this.sfx.play('sing');
        break;
      }
      case 'story': {
        if (sp.storiesToday >= 1) {
          this.toastMsg(`${def.name} has had a story today. They would love another tomorrow.`, 'soft');
          return;
        }
        this.openStory(id);
        break;
      }
      case 'breathe': {
        this.startBreathing();
        break;
      }
      case 'tuckin': {
        this.fallAsleep(id, false);
        break;
      }
      case 'soothe': {
        if (!a.crying) {
          sp.calm = clamp(sp.calm + 6, 0, 100);
          this.doCareFx(a, '#cfe8ff');
          line('breathe');
          return;
        }
        a.crying = false;
        a.cryingFor = 0;
        // Enough relief to actually leave the crisis, plus a grace period so the
        // same unmet need does not immediately re-trigger tears.
        sp.calm = clamp(Math.max(sp.calm, 34) + 22, 0, 100);
        sp.needs.comfort = clamp(Math.max(sp.needs.comfort, 34) + 16, 0, 100);
        sp.heart = clamp(sp.heart + 7, 0, 100);
        sp.trust = clamp(sp.trust + 9, 0, 100);
        sp.growth = clamp(sp.growth + 2.8, 0, 100);
        sp.cryGrace = this.time + 45;
        this.state.stats.soothed++;
        this.recordEvent('soothe', 1);
        this.doCareFx(a, '#cfe8ff', 'heart');
        line('soothe');
        this.sfx.play('soothe');
        this.toastMsg(`${def.name} is breathing more slowly now. You stayed.`, 'good');
        break;
      }
      case 'talk': {
        this.startTalk(id);
        return;
      }
    }
    this.checkStage(sp);
    this.emit(true);
  }

  doCareFx(a: Actor, color: string, kind: 'spark' | 'heart' = 'spark') {
    for (let i = 0; i < 9; i++) this.spawnParticle(kind, a.x + (Math.random() - 0.5) * 14, a.y - 14 - Math.random() * 12, { color });
    a.careT = 1.1;
    a.activity = 'care';
    a.bubble = { text: kind === 'heart' ? '\u2665' : '\u2726', kind: 'heart', t: 2 };
    this.spawnText(a.x, a.y - 34, kind === 'heart' ? '+love' : '+calm', kind === 'heart' ? '#ffb7c8' : '#d8f0ff');
  }

  say(sp: SproutSave, key: string) {
    const lines = LINES[sp.id];
    if (!lines) return;
    const mood = computeMood(sp, !!this.actors[sp.id]?.crying, sp.asleep);
    let arr = lines[key as keyof typeof lines];
    if (!arr || !arr.length) {
      if (mood === 'crying') arr = lines.crying;
      else if (mood === 'sad') arr = lines.sad;
      else arr = lines.greeting;
    }
    if (!arr || !arr.length) return;
    const text = arr[Math.floor(Math.random() * arr.length)];
    // Care reactions are ambient speech: they must never block the keeper's input.
    const sp2: SpeechData = {
      id: ++this.speechId,
      sproutId: sp.id,
      name: SPROUT_BY_ID[sp.id]?.name ?? 'Sprout',
      text,
    };
    this.speech = sp2;
    this.speechTimer = 5;
    this.onSpeech(sp2);
    this.sfx.play('talk');
    this.emit(true);
  }

  openStory(id: string) {
    const sp = this.state.sprouts[id];
    const def = SPROUT_BY_ID[id];
    if (!sp || !def) return;
    const story = STORIES[Math.floor((this.state.day + id.length) % STORIES.length)];
    this.story = { sproutId: id, name: def.name, title: story.title, paragraphs: story.body };
    this.onStory(this.story);
    this.sfx.play('page');
  }

  finishStory() {
    if (!this.story) return;
    const sp = this.state.sprouts[this.story.sproutId];
    if (sp) {
      sp.storiesToday++;
      sp.dayOfStories = this.state.day;
      sp.calm = clamp(sp.calm + 18, 0, 100);
      sp.needs.comfort = clamp(sp.needs.comfort + 12, 0, 100);
      sp.heart = clamp(sp.heart + 6, 0, 100);
      sp.trust = clamp(sp.trust + 5, 0, 100);
      sp.growth = clamp(sp.growth + 4, 0, 100);
      this.state.stats.stories++;
      this.recordEvent('story', 1);
      this.checkStage(sp);
    }
    this.story = null;
    this.onStory(null);
    this.sfx.play('page');
    this.emit(true);
  }

  startTalk(id: string) {
    const sp = this.state.sprouts[id];
    const def = SPROUT_BY_ID[id];
    const a = this.actors[id];
    if (!sp || !def) return;
    if (sp.asleep) {
      this.toastMsg(`${def.name} is asleep. Whisper, but let them rest.`, 'soft');
      return;
    }
    const mood = computeMood(sp, !!a?.crying, sp.asleep);
    const line = this.pickLine(id, mood);
    this.dialogue = {
      sproutId: id,
      name: def.name,
      text: line,
      options: TALK_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
      mood,
    };
    this.onDialogue(this.dialogue);
    this.sfx.play('talk');
  }

  pickLine(id: string, mood: Mood): string {
    const lines = LINES[id];
    const key: keyof typeof LINES[string] =
      mood === 'crying'
        ? 'crying'
        : mood === 'sad'
          ? 'sad'
          : mood === 'hungry'
            ? 'hungry'
            : mood === 'parched'
              ? 'parched'
              : mood === 'weary'
                ? 'weary'
                : mood === 'uneasy'
                  ? 'uneasy'
                  : mood === 'joyful'
                    ? 'joyful'
                    : 'greeting';
    const arr = (lines && lines[key]) || lines?.greeting || ['...'];
    const base = arr[Math.floor(Math.random() * arr.length)];
    const hour = (this.state.clock / 60) % 24;
    if (hour >= 21 && lines?.night && Math.random() < 0.35) return lines.night[0];
    if (this.state.weather === 'drizzle' && lines?.rain && Math.random() < 0.4) return lines.rain[0];
    return base;
  }

  chooseTalk(optionId: string) {
    if (!this.dialogue) return;
    const sp = this.state.sprouts[this.dialogue.sproutId];
    const opt = TALK_OPTIONS.find((o) => o.id === optionId);
    if (!sp || !opt) return;
    const a = this.actors[sp.id];
    const def = SPROUT_BY_ID[sp.id];
    sp.talksToday++;
    sp.dayOfTalks = this.state.day;
    const diminishing = sp.talksToday > 2 ? 0.35 : 1;
    sp.heart = clamp(sp.heart + opt.heart * diminishing, 0, 100);
    sp.calm = clamp(sp.calm + opt.calm * diminishing, 0, 100);
    sp.trust = clamp(sp.trust + opt.trust * diminishing, 0, 100);
    sp.growth = clamp(sp.growth + opt.growth * diminishing, 0, 100);
    this.state.stats.talks++;
    this.recordEvent('talk', 1);
    if (a) {
      a.careT = 1;
      a.activity = 'care';
      a.bubble = { text: '\u2665', kind: 'heart', t: 2 };
      this.doCareFx(a, '#ffd4de', 'heart');
    }
    if (a?.crying) {
      a.crying = false;
      sp.calm = clamp(Math.max(sp.calm, 30) + 8, 0, 100);
      sp.needs.comfort = clamp(Math.max(sp.needs.comfort, 30) + 6, 0, 100);
      sp.cryGrace = this.time + 30;
      this.recordEvent('soothe', 1);
    }
    this.checkStage(sp);
    const next = {
      sproutId: sp.id,
      name: def?.name ?? sp.id,
      text: opt.reply + (sp.talksToday > 2 ? `\n\n${def?.name ?? 'They'} yawns. "I am a bit talked-out now. But I am glad we talked."` : ''),
      options: [],
      mood: computeMood(sp, !!a?.crying, sp.asleep),
    };
    this.dialogue = next;
    this.onDialogue(next);
    this.sfx.play('chime');
    this.emit(true);
  }

  closeDialogue() {
    this.dialogue = null;
    this.onDialogue(null);
    this.emit(true);
  }

  closeSpeech() {
    this.speech = null;
    this.speechTimer = 0;
    this.onSpeech(null);
  }

  startBreathing() {
    if (this.breath.active) return;
    this.breath = { active: true, phase: 'in', progress: 0, cycles: 0 };
    this.paused = false;
    this.sfx.play('breathin');
    this.sfx.setBreathing(true);
    this.emit(true);
  }

  finishBreathing() {
    this.breath = { active: false, phase: 'rest', progress: 0, cycles: 0 };
    this.sfx.setBreathing(false);
    const zoneSprouts = this.allSproutsInZone(this.zone);
    zoneSprouts.forEach((sp) => {
      sp.calm = clamp(sp.calm + 20, 0, 100);
      sp.needs.comfort = clamp(sp.needs.comfort + 8, 0, 100);
      sp.heart = clamp(sp.heart + 3, 0, 100);
      sp.growth = clamp(sp.growth + 1.8, 0, 100);
      const a = this.actors[sp.id];
      if (a) this.doCareFx(a, '#cfe8ff');
      this.checkStage(sp);
    });
    this.state.stats.breathes++;
    this.state.stats.sprinkles += zoneSprouts.length;
    this.recordEvent('breathe', 1);
    this.toastMsg('You breathe together. The garden settles.', 'good');
    this.sfx.play('chime');
    this.emit(true);
  }

  cancelBreathing() {
    this.breath = { active: false, phase: 'rest', progress: 0, cycles: 0 };
    this.sfx.setBreathing(false);
    this.emit(true);
  }

  fallAsleep(id: string, auto: boolean) {
    const sp = this.state.sprouts[id];
    const a = this.actors[id];
    const def = SPROUT_BY_ID[id];
    if (!sp || !a || sp.asleep) return;
    sp.asleep = true;
    a.activity = 'sleep';
    a.crying = false;
    a.sleepT = 0;
    a.bubble = null;
    this.sfx.play('tuck');
    if (!auto) this.toastMsg(`${def?.name ?? 'They'} curls up and goes to sleep.`, 'good');
    this.emit(true);
  }

  wake(id: string) {
    const sp = this.state.sprouts[id];
    const a = this.actors[id];
    const def = SPROUT_BY_ID[id];
    if (!sp || !a) return;
    sp.asleep = false;
    a.activity = 'idle';
    a.idle = 0.5;
    this.toastMsg(`${def?.name ?? 'They'} rubs their eyes and stretches.`, 'soft');
    this.emit(true);
  }

  /* ---------------- mini games ---------------- */

  /** Ask the React layer to open the arcade hub (the games themselves live in the UI). */
  openMiniGame(id: MiniGameId) {
    if (!this.state.unlocked.arcade) {
      this.toastMsg('The arcade is still asleep. Wake it from the garden map.', 'warn');
      return;
    }
    this.miniGame = id;
    this.keys.clear();
    this.touchDir = { x: 0, y: 0 };
    this.walkTarget = null;
    this.sfx.play('select');
    window.dispatchEvent(new CustomEvent('ls-open-arcade', { detail: id }));
    this.emit(true);
  }

  closeMiniGame() {
    this.miniGame = null;
    // Let the React layer tear down the arcade overlay too.
    window.dispatchEvent(new CustomEvent('ls-close-arcade'));
    this.emit(true);
  }

  /** Called by the arcade UI when a round finishes. */
  finishMiniGame(id: MiniGameId, score: number, won: boolean) {
    const def = MINI_GAME_BY_ID[id];
    if (!def) return { seeds: 0, berries: 0, harmony: 0, best: 0, isBest: false };
    const prev = this.state.miniGames[id] ?? { plays: 0, best: 0, day: this.state.day };
    const isBest = score > prev.best;
    this.state.miniGames[id] = { plays: prev.plays + 1, best: Math.max(prev.best, score), day: this.state.day };
    // Seeds scale with the score, with a gentle bonus for beating your own record.
    const seeds = Math.max(2, Math.round(def.baseReward * (score / 100)) + (isBest ? 8 : 0));
    const berries = won ? 3 : 1;
    this.state.seeds += seeds;
    this.state.berries += berries;
    this.recordEvent('play', 1);
    if (isBest && prev.plays > 0) this.toastMsg(`New best in ${def.name}: ${score}!`, 'good', 5);
    this.sfx.play(isBest ? 'chime' : 'pick');
    this.save();
    this.emit(true);
    return { seeds, berries, harmony: 0, best: this.state.miniGames[id].best, isBest };
  }

  /* ---------------- decor & shop ---------------- */

  buyItem(id: string): boolean {
    const item = SHOP_BY_ID[id];
    if (!item) return false;
    if (this.state.seeds < item.price) {
      this.toastMsg(`Not enough seeds. ${item.name} costs ${item.price}.`, 'warn');
      this.sfx.play('locked');
      return false;
    }
    this.state.seeds -= item.price;
    this.state.owned[id] = (this.state.owned[id] ?? 0) + 1;
    this.state.flags.shopSeen = true;
    this.sfx.play('buy');
    this.toastMsg(`${item.name} is in your satchel. Place it anywhere in the garden.`, 'good', 4);
    this.emit(true);
    return true;
  }

  selectPlacement(id: string) {
    const item = SHOP_BY_ID[id];
    if (!item) return;
    if ((this.state.owned[id] ?? 0) <= 0) {
      if (!this.buyItem(id)) return;
    }
    this.placementItem = item;
    this.mode = 'place';
    this.placementPos = { x: this.player.x, y: this.player.y + 6 };
    this.placementValid = false;
    this.selectedId = null;
    this.sfx.play('select');
    this.emit(true);
  }

  cancelPlacement() {
    this.mode = 'play';
    this.placementItem = null;
    this.emit(true);
  }

  tryPlaceAt(x: number, y: number) {
    if (!this.placementItem) return;
    const item = this.placementItem;
    const zone = this.world.zoneAt(x, y);
    if (!zone) {
      this.toastMsg('You can only place things inside the garden.', 'warn');
      return;
    }
    if (!this.placementValid) {
      this.toastMsg('There is something in the way. Try a little patch of open ground.', 'warn');
      this.sfx.play('locked');
      return;
    }
    const dec: PlacedDecor = {
      uid: `d${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`,
      itemId: item.id,
      zone,
      x: Math.round(x / TILE) * TILE,
      y: Math.round(y / TILE) * TILE,
      v: Math.floor(Math.random() * 3),
    };
    this.state.decor.push(dec);
    this.state.owned[item.id] = Math.max(0, (this.state.owned[item.id] ?? 1) - 1);
    this.state.stats.decorPlaced++;
    this.recordEvent('decor', 1);
    this.rebuildWorld();
    for (let i = 0; i < 10; i++) this.spawnParticle('spark', dec.x, dec.y - 8, { color: '#ffe6a8' });
    this.spawnText(dec.x, dec.y - 24, `+${item.harmony} harmony`, '#d6f7b0');
    this.sfx.play('place');
    this.toastMsg(DECOR_FLAVOR[Math.floor(Math.random() * DECOR_FLAVOR.length)], 'good');
    if ((this.state.owned[item.id] ?? 0) <= 0) {
      this.mode = 'play';
      this.placementItem = null;
    }
    if (this.state.flags.tutorialStep < 4) this.state.flags.tutorialStep = 4;
    this.emit(true);
    this.save();
  }

  rebuildWorld() {
    this.world = new World(this.decorKindList());
  }

  removeDecor(uid: string) {
    const idx = this.state.decor.findIndex((d) => d.uid === uid);
    if (idx < 0) return;
    const d = this.state.decor[idx];
    const item = SHOP_BY_ID[d.itemId];
    this.state.decor.splice(idx, 1);
    if (item) {
      this.state.owned[item.id] = (this.state.owned[item.id] ?? 0) + 1;
      this.state.seeds += Math.floor(item.price * 0.6);
      this.toastMsg(`${item.name} packed away. ${Math.floor(item.price * 0.6)} seeds returned.`, 'soft');
    }
    this.rebuildWorld();
    this.sfx.play('pick');
    this.emit(true);
    this.save();
  }

  decorAt(x: number, y: number): PlacedDecor | null {
    for (let i = this.state.decor.length - 1; i >= 0; i--) {
      const d = this.state.decor[i];
      if (Math.abs(d.x - x) < 18 && Math.abs(d.y - y) < 16) return d;
    }
    return null;
  }

  /* ---------------- zones ---------------- */

  unlockZone(zone: ZoneId): boolean {
    const z = ZONES[zone];
    if (!z.unlock || this.state.unlocked[zone]) return false;
    const harmony = harmonyOf(this.state);
    if (this.state.seeds < z.unlock.seeds || harmony < z.unlock.harmony) {
      this.toastMsg(`${z.name} is not ready. It needs ${z.unlock.seeds} seeds and ${z.unlock.harmony} harmony.`, 'warn', 5);
      this.sfx.play('locked');
      return false;
    }
    this.state.seeds -= z.unlock.seeds;
    this.state.unlocked[zone] = true;
    // Chapters advance only by reading their letter, never by unlocking terrain,
    // otherwise a rich keeper could skip the story they have not lived yet.
    this.recordEvent('unlock', 1);
    for (let i = 0; i < 20; i++) this.spawnParticle('spark', this.player.x, this.player.y - 16, { color: '#ffe6a8' });
    this.sfx.play('unlock');
    this.toastMsg(`${z.name} has woken. ${z.blurb}`, 'good', 6);
    this.emit(true);
    this.save();
    return true;
  }

  checkZoneEntry() {
    const z = this.world.zoneAt(this.player.x, this.player.y);
    if (z && z !== this.zone) {
      if (!this.state.unlocked[z]) {
        // shouldn't happen, but push back
        return;
      }
      this.zone = z;
      if (!this.state.flags.zonesSeen?.includes(z)) {
        this.state.flags.zonesSeen.push(z);
        this.state.seenZones = this.state.flags.zonesSeen as ZoneId[];
        this.zoneWelcome(z);
      }
      if (this.state.flags.zonesSeen.length >= ZONE_ORDER.length) this.recordEvent('allzones', 1);
      this.emit(true);
    }
  }

  zoneWelcome(z: ZoneId) {
    const zone = ZONES[z];
    this.toastMsg(`${zone.name}. ${zone.arrival ?? ''}`, 'good', 5);
    this.sfx.play('walkzone');
    if (this.state.flags.tutorialStep < 2) this.state.flags.tutorialStep = 2;
  }

  /* ---------------- quests & day ---------------- */

  recordEvent(type: string, count: number) {
    const s = this.state;
    const ch = CHAPTERS.find((c) => c.id === s.flags.chapterSeen) ?? CHAPTERS[0];
    if (ch) {
      const prog = s.quests[ch.id];
      if (prog) {
        ch.tasks.forEach((t) => {
          if (t.type === type || (type === 'stage' && t.type === 'grow')) {
            prog.tasks[t.id] = Math.min(t.count, (prog.tasks[t.id] ?? 0) + count);
          }
        });
        if (!prog.done) {
          const all = ch.tasks.every((t) => (prog.tasks[t.id] ?? 0) >= t.count);
          if (all) {
            prog.done = true;
            this.toastMsg(`Chapter complete: ${ch.title}. Claim your letter in the Journal.`, 'good', 6);
            this.sfx.play('chime');
            this.checkChapterAdvance();
          }
        }
      }
    }
    if (s.daily && s.daily.day === s.day) {
      const d = s.daily;
      d.tasks.forEach((task) => {
        if (task.done) return;
        if (task.def.type === type) {
          task.progress = Math.min(task.def.count, task.progress + count);
          if (task.progress >= task.def.count) {
            task.done = true;
            this.sfx.play('chime');
            this.toastMsg(`Daily tending: ${task.def.label} — seeds await.`, 'good', 4);
          }
        }
      });
      d.allDone = d.tasks.every((t) => t.done);
    }
    this.emit();
  }

  checkChapterAdvance() {
    const s = this.state;
    const chIdx = CHAPTERS.findIndex((c) => c.id === (s.flags.chapterSeen || CHAPTERS[0].id));
    // do not auto-advance; the player claims the letter first
    void chIdx;
  }

  claimChapter(id: string) {
    const ch = CHAPTERS.find((c) => c.id === id);
    const prog = this.state.quests[id];
    if (!ch || !prog || !prog.done || prog.claimed) return;
    prog.claimed = true;
    this.state.seeds += ch.reward.seeds;
    if (ch.reward.item) this.state.owned[ch.reward.item] = (this.state.owned[ch.reward.item] ?? 0) + 1;
    this.state.flags.letters = [...new Set([...(this.state.flags.letters ?? []), ch.id])];
    this.letter = { id: ch.id, title: ch.title, from: 'The Old Willow', body: ch.letter };
    this.onLetter(this.letter);
    this.sfx.play('letter');
    const idx = CHAPTERS.findIndex((c) => c.id === id);
    const next = CHAPTERS[idx + 1];
    if (next) this.state.flags.chapterSeen = next.id;
    else this.state.flags.chapterSeen = CHAPTERS[CHAPTERS.length - 1].id;
    this.emit(true);
    this.save();
  }

  closeLetter() {
    this.letter = null;
    this.onLetter(null);
    this.emit(true);
  }

  claimDaily() {
    const d = this.state.daily;
    if (!d || !d.allDone || d.rewardClaimed) return;
    d.rewardClaimed = true;
    this.state.seeds += 20;
    this.toastMsg('Daily tending complete. +20 seeds.', 'good', 5);
    this.sfx.play('chime');
    this.emit(true);
  }

  endDay(reason: string) {
    const s = this.state;
    if (this.paused) return;
    const summary = {
      day: s.day,
      blooms: s.stats.blooms,
      hearts: Math.round(Object.values(s.sprouts).reduce((a, sp) => a + sp.heart, 0)),
    };
    this.daySummary = summary;
    s.day += 1;
    s.stats.daysPlayed++;
    s.clock = 6 * 60 + 15;
    s.weather = weatherForDay(s.day);
    s.dew = s.canMax;
    s.daily = makeDaily(s.day);
    s.flags.chapterSeen = s.flags.chapterSeen || CHAPTERS[0].id;
    // restore needs slightly
    Object.values(s.sprouts).forEach((sp) => {
      sp.asleep = false;
      sp.needs.energy = clamp(sp.needs.energy + 55, 0, 100);
      sp.needs.hunger = clamp(sp.needs.hunger + 18, 0, 100);
      sp.needs.hydration = clamp(sp.needs.hydration + 20, 0, 100);
      sp.needs.comfort = clamp(sp.needs.comfort + 18, 0, 100);
      sp.calm = clamp(sp.calm + 10, 0, 100);
      sp.talksToday = 0;
      sp.dayOfTalks = s.day;
      sp.storiesToday = 0;
      sp.dayOfStories = s.day;
      sp.cryGrace = 0;
      const a = this.actors[sp.id];
      if (a) {
        a.crying = false;
        a.cryingFor = 0;
        a.activity = 'idle';
      }
    });
    CHAPTERS.forEach((c) => {
      const prog = s.quests[c.id];
      if (prog?.done && !prog.claimed) {
        // still claimable
      }
    });
    // arrivals
    const arrivals = eligibleArrivals(s);
    arrivals.forEach((arr) => {
      const zone = s.unlocked[arr.zone] ? arr.zone : 'meadow';
      const rect = ZONE_RECT[zone];
      const spot = this.world.randomWalkable(zone, mulberry32(s.day * 31 + arr.sprout.length));
      const sp = makeSproutSave(arr.sprout, spot.x, spot.y, zone, 1);
      sp.heart = 4;
      sp.calm = 50;
      s.sprouts[arr.sprout] = sp;
      this.syncActors();
      this.toastMsg(`A new sprout arrived! ${arr.text}`, 'good', 8);
      this.onLetter({
        id: `arrival-${arr.sprout}`,
        title: `A new arrival: ${SPROUT_BY_ID[arr.sprout]?.name ?? ''}`,
        from: 'The Old Willow',
        body: `${arr.text}\n\nThey are staying in ${ZONES[zone].name}. Be gentle with the introductions. They have travelled a long way, in the way that small things travel.\n\n— The Old Willow`,
      });
      void rect;
    });
    this.actorSleepReset();
    this.player.x = this.world.spawnPoint('meadow').x;
    this.player.y = this.world.spawnPoint('meadow').y;
    this.zone = 'meadow';
    this.save();
    this.sfx.play('morning');
    this.sfx.setMusic(s.settings.music);
    this.toastMsg(`Day ${s.day} begins. ${WEATHER_LABEL[s.weather].note}`, 'good', 5);
    this.emit(true);
  }

  actorSleepReset() {
    this.syncActors();
  }

  /* ---------------- save / settings ---------------- */

  save() {
    this.state.zone = this.zone;
    saveState(this.state);
  }

  resetSave() {
    clearSave();
    this.state = createInitialState();
    this.world = new World();
    this.actors = {};
    this.syncActors();
    this.player.x = this.world.spawnPoint('meadow').x;
    this.player.y = this.world.spawnPoint('meadow').y;
    this.zone = 'meadow';
    this.started = true;
    this.showIntro = false;
    this.selectedId = null;
    this.mode = 'play';
    this.placementItem = null;
    this.particles = [];
    this.save();
    this.emit(true);
    this.toastMsg('A fresh garden. The soil is ready.', 'good');
  }

  setSetting(key: keyof GameState['settings'], value: boolean) {
    this.state.settings[key] = value;
    if (key === 'music') this.sfx.setMusic(value);
    if (key === 'sfx') this.sfx.setSfx();
    if (key === 'gentle') this.toastMsg(value ? 'Gentle pacing on. Needs change more slowly.' : 'Gentle pacing off. The garden keeps a fuller rhythm.', 'soft');
    this.emit(true);
    this.save();
  }

  startTutorialStep() {
    const s = this.state;
    if (s.flags.tutorialSeen) return;
    const step = s.flags.tutorialStep;
    if (step < 1 && s.stats.feeds > 0) s.flags.tutorialStep = 2;
    if (step < 2 && s.stats.waters > 0) s.flags.tutorialStep = 3;
    if (step < 3 && s.stats.talks > 0) s.flags.tutorialStep = 4;
    if (step < 4 && s.stats.decorPlaced > 0) s.flags.tutorialStep = 5;
    this.emit();
  }

  /* ---------------- particles ---------------- */

  spawnParticle(kind: Particle['kind'], x: number, y: number, opts: { color?: string; text?: string } = {}) {
    const life = kind === 'heart' ? 1.6 : 1 + Math.random() * 0.8;
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 26,
      vy: kind === 'heart' ? -18 - Math.random() * 10 : -14 - Math.random() * 22,
      life,
      maxLife: life,
      kind,
      color: opts.color ?? '#ffe6a8',
      size: kind === 'heart' ? 2 : 1,
      text: opts.text,
    });
  }

  spawnText(x: number, y: number, text: string, color: string) {
    this.particles.push({ x, y, vx: 0, vy: -18, life: 1.4, maxLife: 1.4, kind: 'text', color, size: 1, text });
  }

  /* ---------------- render ---------------- */

  render() {
    const ctx = this.ctx;
    const { w, h } = this.view;
    const cam = this.camera;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1c3021';
    ctx.fillRect(0, 0, w, h);

    const sx = Math.round(cam.x);
    const sy = Math.round(cam.y);
    ctx.save();
    ctx.translate(-sx, -sy);

    ctx.drawImage(this.world.base, 0, 0);
    this.world.drawWater(ctx, this.time, this.darkness());

    // shadow of player and sprouts drawn in sprite functions
    type Drawable = { y: number; draw: () => void };
    const drawables: Drawable[] = [];
    const px = this.player.x;
    const py = this.player.y;
    const inView = (x: number, y: number, pad = 80) => x > sx - pad && x < sx + w + pad && y > sy - pad && y < sy + h + pad;

    // props
    this.world.placedProps.forEach(({ def, zone }) => {
      const wx = def.x * TILE;
      const wy = def.y * TILE;
      if (!inView(wx, wy, 90)) return;
      drawables.push({
        y: wy,
        draw: () => this.drawPropCached(ctx, def.kind, wx, wy, zone, def.v ?? 0),
      });
    });

    // decorations ghost/target
    if (this.mode === 'place' && this.placementItem) {
      const gx = this.placementPos.x;
      const gy = this.placementPos.y;
      ctx.globalAlpha = 0.65;
      drawProp(ctx, this.placementItem.kind, gx, gy, this.zone, 0, this.time, 0);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = this.placementValid ? 'rgba(180,240,150,0.9)' : 'rgba(240,130,130,0.9)';
      ctx.lineWidth = 1;
      const w2 = Math.max(16, (this.placementItem.solid?.w ?? 18));
      ctx.strokeRect(Math.round(gx - w2 / 2) + 0.5, Math.round(gy - 6) + 0.5, w2, 12);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(Math.round(gx - 12) + 0.5, Math.round(gy - 8) + 0.5, 24, 16);
      ctx.setLineDash([]);
    }

    // sprouts
    Object.values(this.state.sprouts).forEach((sp) => {
      const a = this.actors[sp.id];
      if (!a) return;
      if (!inView(a.x, a.y, 70)) return;
      const def = SPROUT_BY_ID[sp.id];
      if (!def) return;
      const mood = computeMood(sp, a.crying, sp.asleep);
      const asleep = sp.asleep;
      drawables.push({
        y: a.y,
        draw: () => {
          const bobOffset = a.activity === 'care' ? -2 : 0;
          drawSprout(ctx, a.x, a.y + bobOffset, {
            stage: sp.stage,
            kind: def.kind,
            pal: def.palette,
            mood: asleep ? 'asleep' : a.crying ? 'crying' : mood,
            facing: a.facing,
            time: this.time + (a.x % 7),
            moving: a.moving,
            crying: a.crying,
            asleep,
            excited: a.activity === 'care',
          });
          if (a.bubble && !asleep) {
            this.drawBubble(ctx, a.x, a.y - (sp.stage >= 2 ? 34 : 28), a.bubble.text);
          }
          if (this.selectedId === sp.id) {
            const pulse = 0.4 + Math.sin(this.time * 4) * 0.15;
            ctx.strokeStyle = `rgba(255,240,190,${pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(Math.round(a.x), Math.round(a.y), 12, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        },
      });
    });

    drawables.push({ y: py, draw: () => drawPlayer(ctx, px, py, this.player.dir, this.player.moving, this.player.running, this.player.anim) });

    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach((d) => d.draw());

    // interaction prompt ring
    if (this.selectedId === null) {
      const sp = this.nearestSprout(46);
      if (sp) {
        const a = this.actors[sp.id];
        if (a) {
          const pulse = 0.5 + Math.sin(this.time * 5) * 0.2;
          ctx.strokeStyle = `rgba(255,246,214,${pulse})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(Math.round(a.x), Math.round(a.y), 10 + Math.sin(this.time * 3) * 1.5, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          this.drawNameTag(ctx, a.x, a.y - (sp.stage >= 2 ? 40 : 34), SPROUT_BY_ID[sp.id]?.name ?? '');
        }
      }
    }

    // gates (live)
    GATES.forEach((g) => {
      const gx = g.anchor.x * TILE;
      const gy = g.anchor.y * TILE;
      if (!inView(gx, gy, 80)) return;
      this.drawGate(ctx, gx, gy, this.state.unlocked[g.to], g.label);
    });

    // particles
    this.drawParticles(ctx, sx, sy);

    ctx.restore();

    // lighting
    this.drawLighting(ctx, sx, sy);

    // weather overlays
    this.drawWeather(ctx, w, h);

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(10,20,12,0)');
    vg.addColorStop(1, 'rgba(10,20,12,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // breath dim
    if (this.breath.active) {
      ctx.fillStyle = 'rgba(10, 22, 26, 0.45)';
      ctx.fillRect(0, 0, w, h);
    }

    // title overlay text can live in React
    void h;
  }

  drawPropCached(ctx: Ctx, kind: string, x: number, y: number, zone: ZoneId, variant: number) {
    const animated = kind === 'lamp' || kind === 'lanternpost' || kind === 'swing' || kind === 'windchime' || kind === 'crystal' || kind === 'pergola' || kind === 'blossom';
    if (animated) {
      drawProp(ctx, kind as Parameters<typeof drawProp>[1], x, y, zone, variant, this.time, this.darkness());
      return;
    }
    const key = `${kind}|${zone}|${variant % 3}`;
    let c = this.propCache.get(key);
    if (!c) {
      const big = kind === 'cottage' || kind === 'well' || kind === 'greenhouse';
      const cw = big ? 180 : 120;
      const chh = big ? 120 : 100;
      c = document.createElement('canvas');
      c.width = cw;
      c.height = chh;
      const cx = c.getContext('2d')!;
      cx.imageSmoothingEnabled = false;
      cx.translate(big ? 90 : 60, chh - 8);
      drawProp(cx, kind as Parameters<typeof drawProp>[1], 0, 0, zone, variant, 0, 0);
      this.propCache.set(key, c);
    }
    const big = kind === 'cottage' || kind === 'well' || kind === 'greenhouse';
    const ox = big ? 90 : 60;
    const oy = (big ? 120 : 100) - 8;
    ctx.drawImage(c, Math.round(x) - ox, Math.round(y) - oy);
  }

  drawBubble(ctx: Ctx, x: number, y: number, text: string) {
    ctx.font = '6px "Press Start 2P", monospace';
    const w = Math.max(12, ctx.measureText(text).width + 8);
    const bx = Math.round(x - w / 2);
    const by = Math.round(y - 12);
    R(ctx, bx, by, w, 12, 'rgba(28,36,24,0.85)');
    R(ctx, bx + 1, by + 1, w - 2, 10, 'rgba(250,247,231,0.95)');
    R(ctx, bx + Math.round(w / 2) - 1, by + 12, 2, 1, 'rgba(250,247,231,0.95)');
    R(ctx, bx + Math.round(w / 2), by + 13, 1, 1, 'rgba(250,247,231,0.95)');
    ctx.fillStyle = '#3a3327';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, by + 8);
    ctx.textAlign = 'left';
  }

  drawNameTag(ctx: Ctx, x: number, y: number, name: string) {
    ctx.font = '5px "Press Start 2P", monospace';
    const w = ctx.measureText(name).width + 6;
    R(ctx, Math.round(x - w / 2), Math.round(y - 7), Math.round(w), 9, 'rgba(24,32,22,0.6)');
    ctx.fillStyle = '#f7f2dd';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y);
    ctx.textAlign = 'left';
  }

  drawGate(ctx: Ctx, x: number, y: number, unlocked: boolean, label: string) {
    const night = this.darkness();
    // stone path
    R(ctx, x - 18, y - 2, 36, 4, '#8a8576');
    R(ctx, x - 16, y - 3, 32, 2, '#a5a08e');
    // posts
    for (const ox of [-16, 13]) {
      R(ctx, x + ox, y - 26, 4, 26, '#6b4f37');
      R(ctx, x + ox, y - 26, 1, 26, '#82633f');
      R(ctx, x + ox - 1, y - 28, 6, 3, '#846849');
    }
    if (unlocked) {
      // arched vines
      for (let i = 0; i < 10; i++) {
        const a = (i / 9) * Math.PI;
        const vx = x - 14 + Math.cos(Math.PI - a) * 0 - 0;
        void vx;
      }
      ctx.strokeStyle = '#4f7a44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 24, 15, Math.PI, 0);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI + (i / 7) * Math.PI;
        const vx = x + Math.cos(a) * 15;
        const vy = y - 24 + Math.sin(a) * 15;
        R(ctx, vx - 1, vy - 1, 2, 2, i % 2 ? '#6f9b54' : '#d9f0b0');
        if (i % 3 === 0) R(ctx, vx, vy + 1, 1, 1, '#f2c3d2');
      }
      // firefly lantern
      const glow = 0.5 + Math.sin(this.time * 2) * 0.2;
      R(ctx, x - 2, y - 36, 4, 4, `rgba(255,226,150,${0.6 + glow * 0.3})`);
      R(ctx, x - 3, y - 37, 6, 1, '#4a3a2a');
      if (night > 0.2) {
        const g = ctx.createRadialGradient(x, y - 34, 1, x, y - 34, 34);
        g.addColorStop(0, `rgba(255,220,150,${0.25 * night + 0.1})`);
        g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 34, y - 68, 68, 68);
      }
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(245,240,220,0.55)';
      ctx.fillText(label, x, y + 10);
      ctx.textAlign = 'left';
    } else {
      // locked: wooden gate with sleeping bud
      R(ctx, x - 13, y - 24, 27, 24, '#5c4530');
      for (let i = 0; i < 4; i++) {
        R(ctx, x - 12 + i * 7, y - 23, 5, 22, i % 2 ? '#6e5238' : '#63492f');
        R(ctx, x - 12 + i * 7, y - 23, 1, 22, '#7f6040');
      }
      R(ctx, x - 13, y - 14, 27, 2, '#4a3726');
      R(ctx, x - 13, y - 6, 27, 2, '#4a3726');
      R(ctx, x - 2, y - 12, 4, 5, '#c9a271');
      R(ctx, x - 1, y - 11, 2, 3, '#5a4632');
      // sleeping bud on top
      ellipse(ctx, x, y - 28, 6, 5, '#6b8a5a');
      ellipse(ctx, x - 1, y - 29, 4, 3, '#86a672');
      R(ctx, x - 1, y - 28, 2, 1, '#4f6b44');
      R(ctx, x + 3, y - 33, 2, 1, 'rgba(240,245,230,0.5)');
      R(ctx, x + 5, y - 36, 3, 1, 'rgba(240,245,230,0.35)');
    }
  }

  drawParticles(ctx: Ctx, sx: number, sy: number) {
    this.particles.forEach((p) => {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = p.kind === 'rain' ? 0.7 : alpha;
      ctx.fillStyle = p.color;
      if (p.kind === 'text') {
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(p.text ?? '', Math.round(p.x), Math.round(p.y));
        ctx.textAlign = 'left';
      } else if (p.kind === 'heart') {
        const s = Math.max(1, Math.round(p.size));
        R(ctx, p.x - s, p.y - s, s, s, p.color);
        R(ctx, p.x, p.y - s, s, s, p.color);
        R(ctx, p.x - s, p.y, 3 * s, 2 * s, p.color);
        R(ctx, p.x - s / 2, p.y + 2 * s, s * 2, s, p.color);
      } else if (p.kind === 'rain') {
        ctx.fillRect(p.x, p.y, 1, 4);
      } else if (p.kind === 'petal') {
        R(ctx, p.x, p.y, p.size, p.size === 2 ? 1 : 1, p.color);
      } else if (p.kind === 'firefly') {
        const glow = 0.5 + Math.sin(this.time * 3 + p.x) * 0.5;
        ctx.globalAlpha = alpha * (0.4 + glow * 0.6);
        ctx.fillRect(p.x - 1, p.y, 2, 1);
        ctx.fillRect(p.x, p.y - 1, 1, 2);
        ctx.globalAlpha = alpha * 0.15;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.kind === 'spark') {
          ctx.fillRect(p.x - 1, p.y, 2, 1);
        }
      }
    });
    ctx.globalAlpha = 1;
    void sx;
    void sy;
  }

  drawLighting(ctx: Ctx, sx: number, sy: number) {
    const dark = this.darkness();
    if (dark <= 0.01) return;
    const lc = this.lightCanvas;
    const lctx = lc.getContext('2d')!;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, lc.width, lc.height);
    lctx.fillStyle = `rgba(14, 22, 44, ${dark * 0.82})`;
    lctx.fillRect(0, 0, lc.width, lc.height);
    lctx.globalCompositeOperation = 'destination-out';
    const lights = [...this.world.lamps];
    lights.push({ x: this.player.x, y: this.player.y - 10, color: '255,220,160', radius: 78 });
    Object.values(this.state.sprouts).forEach((sp) => {
      if (sp.stage >= 2) {
        const a = this.actors[sp.id];
        if (a) lights.push({ x: a.x, y: a.y - 10, color: '255,240,200', radius: 30 });
      }
    });
    lights.forEach((l) => {
      const lx = l.x - sx;
      const ly = l.y - sy;
      if (lx < -l.radius || ly < -l.radius || lx > lc.width + l.radius || ly > lc.height + l.radius) return;
      const g = lctx.createRadialGradient(lx, ly, 1, lx, ly, l.radius);
      g.addColorStop(0, `rgba(0,0,0,${0.85})`);
      g.addColorStop(0.5, `rgba(0,0,0,${0.5})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.fillRect(lx - l.radius, ly - l.radius, l.radius * 2, l.radius * 2);
    });
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lc, 0, 0);
    // warm tint
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((l) => {
      const lx = l.x - sx;
      const ly = l.y - sy;
      if (lx < -l.radius || ly < -l.radius || lx > this.view.w + l.radius || ly > this.view.h + l.radius) return;
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, l.radius * 0.8);
      g.addColorStop(0, `rgba(${l.color},${0.16 * dark})`);
      g.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(lx - l.radius, ly - l.radius, l.radius * 2, l.radius * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  drawWeather(ctx: Ctx, w: number, h: number) {
    const part = this.partOfDay();
    if (part === 'dawn') {
      ctx.fillStyle = 'rgba(255, 190, 140, 0.06)';
      ctx.fillRect(0, 0, w, h);
    }
    if (this.state.weather === 'softclouds') {
      ctx.fillStyle = 'rgba(170, 190, 200, 0.04)';
      ctx.fillRect(0, 0, w, h);
    }
    if (this.state.weather === 'drizzle') {
      ctx.fillStyle = 'rgba(100, 130, 150, 0.08)';
      ctx.fillRect(0, 0, w, h);
    }
    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(220,230,255,${this.lightning})`;
      ctx.fillRect(0, 0, w, h);
      this.lightning = Math.max(0, this.lightning - 0.12);
    }
  }

  /* ---------------- input ---------------- */

  keyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (this.miniGame) {
      // The arcade handles its own input; swallow movement so the keeper stays put.
      if (k === 'escape') this.closeMiniGame();
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!this.started) return;
    if (this.dialogue || this.letter) {
      if (k === 'escape') {
        this.dialogue = null;
        this.onDialogue(null);
        this.letter = null;
        this.onLetter(null);
        this.emit(true);
      }
      return;
    }
    if (this.story) return;
    this.keys.add(k);
    if (k === 'escape') {
      if (this.mode === 'place') this.cancelPlacement();
      else if (this.selectedId) this.closeCare();
    }
    if (k === 'e' || k === 'enter') this.interact();
    const nearId = this.selectedId ?? this.nearestSprout(46)?.id ?? null;
    if (nearId) {
      if (!this.selectedId && ['f', 'r', 'c', 't', 'b', 'g', 'y', 'n', 'p'].includes(k)) this.openCare(nearId);
      if (k === 'f') this.care(nearId, 'feed');
      if (k === 'r') this.care(nearId, 'water');
      if (k === 'c') this.care(nearId, 'cuddle');
      if (k === 't') this.care(nearId, 'talk');
      if (k === 'b') this.startBreathing();
      if (k === 'p') this.care(nearId, 'play');
      if (k === 'g') this.care(nearId, 'sing');
      if (k === 'y') this.care(nearId, 'story');
      if (k === 'n') this.care(nearId, sp_asleep(this.state, nearId) ? 'tuckin' : 'tuckin');
    }
  }

  keyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  pointerMove(x: number, y: number) {
    this.pointer = { x, y };
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / rect.width;
    const wx = x * scale + this.camera.x;
    const wy = y * scale + this.camera.y;
    this.hoverWorld = { x: wx, y: wy };
    if (this.mode === 'place' && this.placementItem) {
      const snapped = { x: Math.round(wx / TILE) * TILE, y: Math.round(wy / TILE) * TILE };
      this.placementPos = snapped;
      this.placementValid = this.validatePlacement(snapped.x, snapped.y);
    }
  }

  pointerDown(x: number, y: number) {
    this.pointerMove(x, y);
    if (!this.started) return;
    if (this.mode === 'place') {
      this.tryPlaceAt(this.hoverWorld.x, this.hoverWorld.y);
      return;
    }
    const wx = this.hoverWorld.x;
    const wy = this.hoverWorld.y;
    // check sprout click
    let clicked: SproutSave | null = null;
    let best = 22;
    Object.values(this.state.sprouts).forEach((sp) => {
      const a = this.actors[sp.id];
      if (!a) return;
      const d = Math.hypot(a.x - wx, (a.y - 8 - wy) * 0.7);
      if (d < best) {
        best = d;
        clicked = sp;
      }
    });
    if (clicked) {
      const sp: SproutSave = clicked;
      const a = this.actors[sp.id];
      if (a) {
        const dist = Math.hypot(a.x - this.player.x, a.y - this.player.y);
        if (dist < 52) {
          this.openCare(sp.id);
        } else {
          this.walkTarget = { x: a.x + (this.player.x < a.x ? -14 : 14), y: a.y + 10 };
          this.pendingInteract = sp.id;
          this.toastMsg(`Walking over to ${SPROUT_BY_ID[sp.id]?.name ?? 'the sprout'}...`, 'soft', 2);
        }
      }
      return;
    }
    // click a gate sign
    const dec = this.decorAt(wx, wy);
    if (dec) {
      this.removeDecor(dec.uid);
      return;
    }
    this.walkTarget = { x: wx, y: wy };
    this.sfx.play('step', 0.4);
  }

  validatePlacement(x: number, y: number): boolean {
    const item = this.placementItem;
    if (!item) return false;
    if (!this.world.zoneAt(x, y)) return false;
    const w = item.solid?.w ?? 16;
    const h = item.solid?.h ?? 8;
    const points = [
      [x, y],
      [x - w / 2 + 4, y - 2],
      [x + w / 2 - 4, y - 2],
      [x - w / 2 + 4, y + 2],
      [x + w / 2 - 4, y + 2],
      [x, y - 8],
    ];
    for (const [px, py] of points) {
      if (!this.world.walkable(px, py, 1)) return false;
    }
    // distance from player
    if (Math.hypot(x - this.player.x, y - this.player.y) > 140) return false;
    // existing decor overlap
    for (const d of this.state.decor) {
      if (Math.abs(d.x - x) < 24 && Math.abs(d.y - y) < 18) return false;
    }
    // sprouts overlap
    for (const sp of Object.values(this.state.sprouts)) {
      const a = this.actors[sp.id];
      if (!a) continue;
      if (Math.abs(a.x - x) < 22 && Math.abs(a.y - y) < 16) return false;
    }
    return true;
  }

  touchMove(x: number, y: number, run = false) {
    this.touchDir = { x, y };
    this.runTouch = run;
  }

  setPaused(v: boolean) {
    this.paused = v;
    if (v) this.sfx.setMusic(false);
    else this.sfx.setMusic(this.state.settings.music);
    this.emit(true);
  }

  setTutorialStep(step: number) {
    this.state.flags.tutorialStep = step;
    this.emit();
  }

  dismissTutorial() {
    this.state.flags.tutorialSeen = true;
    this.state.flags.tutorialStep = TUTORIAL.length - 1;
    this.emit(true);
    this.save();
  }

  openShop() {
    window.dispatchEvent(new CustomEvent('ls-open-shop'));
  }

  setIntroSeen() {
    this.showIntro = false;
    this.state.flags.introSeen = true;
    this.emit(true);
  }

  setChapterSeen(id: string) {
    this.state.flags.chapterSeen = id;
    this.emit(true);
  }
}