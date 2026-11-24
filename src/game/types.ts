export interface Vec {
  x: number;
  y: number;
}

export type ZoneId = 'meadow' | 'sunroot' | 'whisper' | 'pond' | 'orchard' | 'arcade';

export type Personality = 'sunny' | 'shy' | 'wise' | 'bold' | 'tender' | 'sleepy' | 'dreamy';

export type SproutKind = 'bud' | 'flower' | 'herb' | 'berry' | 'mushroom' | 'clover' | 'pumpkin';

export type Mood =
  | 'joyful'
  | 'content'
  | 'uneasy'
  | 'hungry'
  | 'parched'
  | 'weary'
  | 'sad'
  | 'crying'
  | 'asleep'
  | 'excited';

export type Weather = 'sunny' | 'softclouds' | 'drizzle' | 'starry';

export type ActionId =
  | 'feed'
  | 'water'
  | 'cuddle'
  | 'play'
  | 'sing'
  | 'story'
  | 'breathe'
  | 'tuckin'
  | 'talk'
  | 'soothe';

export interface SproutPalette {
  body: string;
  shade: string;
  light: string;
  leaf: string;
  leafDark: string;
  accent: string;
  accentDark: string;
  cheek: string;
}

export interface SproutDef {
  id: string;
  name: string;
  personality: Personality;
  kind: SproutKind;
  palette: SproutPalette;
  homeZone: ZoneId;
  blurb: string;
  likes: string;
  quirk: string;
  arrival: string;
  /** Passive plants stay rooted where they were planted and never wander. */
  passive?: boolean;
  /** Special story role, used to change how the care sheet reads. */
  role?: 'host';
}

export interface Needs {
  hunger: number;
  hydration: number;
  energy: number;
  comfort: number;
}

export type SproutActivity = 'wander' | 'idle' | 'sleep' | 'cry' | 'care';

export interface SproutSave {
  id: string;
  zone: ZoneId;
  x: number;
  y: number;
  facing: 1 | -1;
  stage: 0 | 1 | 2 | 3;
  growth: number;
  heart: number;
  calm: number;
  trust: number;
  needs: Needs;
  talksToday: number;
  dayOfTalks: number;
  storiesToday: number;
  dayOfStories: number;
  lastCryNotice: number;
  cryGrace: number;
  asleep: boolean;
  bloomSeen: boolean;
}

export type PropKind =
  | 'tree'
  | 'pine'
  | 'blossom'
  | 'bush'
  | 'berrybush'
  | 'cottage'
  | 'greenhouse'
  | 'well'
  | 'fence'
  | 'lamp'
  | 'mushroomGiant'
  | 'mushroomSmall'
  | 'sunflower'
  | 'scarecrow'
  | 'rock'
  | 'lily'
  | 'reeds'
  | 'arch'
  | 'swing'
  | 'pergola'
  | 'sign'
  | 'stump'
  | 'crystal'
  | 'flowerPatch'
  | 'lanternpost'
  | 'bench'
  | 'birdbath'
  | 'windchime'
  | 'stone'
  | 'stumpseat'
  | 'tent'
  | 'booth'
  | 'balloons'
  | 'prizeShelf'
  | 'bunting'
  | 'targetWall'
  | 'pumpkin'
  | 'arcadeSign'
  | 'stringLight'
  | 'carousel';

export interface PropDef {
  kind: PropKind;
  x: number;
  y: number;
  v?: number;
  flip?: boolean;
  shadow?: boolean;
}

export interface PathDef {
  pts: Vec[];
  width: number;
}

export interface WaterDef {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface ZoneTheme {
  grass: [string, string, string, string];
  path: [string, string, string];
  water: [string, string, string, string];
  tree: [string, string, string, string, string];
  ambient: 'petals' | 'pollen' | 'fireflies' | 'sparkles' | 'blossom' | 'confetti';
  fog?: string;
  darkness: number;
  pathStyle?: 'sand' | 'soil' | 'stone' | 'moss';
}

export interface ZoneDef {
  id: ZoneId;
  name: string;
  subtitle: string;
  blurb: string;
  theme: ZoneTheme;
  unlock?: { seeds: number; harmony: number };
  spawn: Vec;
  paths: PathDef[];
  water?: WaterDef[];
  props: PropDef[];
  paddies?: { x: number; y: number; w: number; h: number }[];
  arrival?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  harmony: number;
  kind: PropKind;
  category: 'cosy' | 'garden' | 'pantry';
  solid?: { w: number; h: number };
  size: 'small' | 'medium' | 'large';
  glow?: number;
  zone?: ZoneId[];
}

export interface PlacedDecor {
  uid: string;
  itemId: string;
  zone: ZoneId;
  x: number;
  y: number;
  v: number;
}

export type QuestTaskType =
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

export interface QuestTaskDef {
  id: string;
  type: QuestTaskType;
  count: number;
  label: string;
}

export interface ChapterDef {
  id: string;
  title: string;
  intro: string;
  reward: { seeds: number; item?: string };
  tasks: QuestTaskDef[];
  letter: string;
}

export interface QuestProgress {
  tasks: Record<string, number>;
  done: boolean;
  claimed: boolean;
}

export interface DailyTaskDef {
  id: string;
  type: QuestTaskType;
  count: number;
  label: string;
  reward: number;
}

export interface DailyProgress {
  day: number;
  tasks: { def: DailyTaskDef; progress: number; done: boolean }[];
  allDone: boolean;
  rewardClaimed: boolean;
}

export interface Stats {
  feeds: number;
  waters: number;
  talks: number;
  cuddles: number;
  plays: number;
  stories: number;
  breathes: number;
  soothed: number;
  decorPlaced: number;
  harvests: number;
  sprinkles: number;
  blooms: number;
  stagesGrown: number;
  daysPlayed: number;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  gentle: boolean;
  hints: boolean;
}

export interface Flags {
  introSeen: boolean;
  tutorialSeen: boolean;
  tutorialStep: number;
  letters: string[];
  shopSeen: boolean;
  zonesSeen: string[];
  chapterSeen: string;
  bloomGift: boolean;
  firstRain: boolean;
  plantedWelcome: boolean;
}

export interface PlacedLamp {
  x: number;
  y: number;
  color: string;
  radius: number;
}

export type MiniGameId = 'berrycatch' | 'memory' | 'firefly' | 'melody';

export interface MiniGameSave {
  plays: number;
  best: number;
  day: number;
}

export interface MiniGameDef {
  id: MiniGameId;
  name: string;
  blurb: string;
  howTo: string;
  icon: 'berries' | 'journal' | 'trust' | 'sing';
  color: string;
  baseReward: number;
}

export interface ArcadeStation {
  gameId: MiniGameId;
  x: number;
  y: number;
  label: string;
}

export interface GameState {
  version: number;
  keeperName: string;
  day: number;
  clock: number;
  weather: Weather;
  zone: ZoneId;
  seeds: number;
  berries: number;
  dew: number;
  canMax: number;
  unlocked: Record<ZoneId, boolean>;
  sprouts: Record<string, SproutSave>;
  decor: PlacedDecor[];
  owned: Record<string, number>;
  quests: Record<string, QuestProgress>;
  daily: DailyProgress | null;
  stats: Stats;
  settings: Settings;
  flags: Flags;
  foraged: Record<string, { day: number; count: number }>;
  miniGames: Record<string, MiniGameSave>;
  seenZones: ZoneId[];
  lastSavedAt: number;
}

export interface SproutView {
  id: string;
  name: string;
  stage: 0 | 1 | 2 | 3;
  mood: Mood;
  moodLabel: string;
  needs: Needs;
  heart: number;
  calm: number;
  trust: number;
  zone: ZoneId;
  gap: { heart: number; calm: number; trust: number; growth: number; nextStage: number | null };
  talksToday: number;
  storiesToday: number;
  isCrying: boolean;
  asleep: boolean;
  activity: SproutActivity;
}

export interface QuestView {
  id: string;
  title: string;
  intro: string;
  tasks: { id: string; label: string; progress: number; count: number; done: boolean }[];
  reward: { seeds: number; item?: string };
  done: boolean;
  claimed: boolean;
  letter: string;
}

export interface DailyView {
  tasks: { id: string; label: string; progress: number; count: number; done: boolean; reward: number }[];
  allDone: boolean;
  claimed: boolean;
}

export interface InteractPrompt {
  kind: 'sprout' | 'water' | 'berrybush' | 'door' | 'sign' | 'station';
  id: string;
  label: string;
  action: string;
  sproutId?: string;
}

export interface EngineSnapshot {
  ready: boolean;
  title: boolean;
  zone: ZoneId;
  zoneName: string;
  day: number;
  clock: number;
  clockLabel: string;
  partOfDay: 'dawn' | 'morning' | 'day' | 'evening' | 'night';
  weather: Weather;
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
  daily: DailyView | null;
  chapters: QuestView[];
  prompt: InteractPrompt | null;
  placement: null | { item: ShopItem; valid: boolean };
  mode: 'play' | 'decorate' | 'place';
  keeperName: string;
  settings: Settings;
  flags: Flags;
  stats: Stats;
  owned: Record<string, number>;
  decor: PlacedDecor[];
  letters: LetterView[];
  zoneUnlocks: { id: ZoneId; name: string; subtitle: string; blurb: string; unlocked: boolean; seeds: number; harmony: number; canAfford: boolean; meetsHarmony: boolean; hours: string }[];
  toast: { id: number; text: string; tone?: 'good' | 'soft' | 'warn' } | null;
  miniGames: Record<string, MiniGameSave>;
  arcadeUnlocked: boolean;
  miniGame: MiniGameId | null;
  showIntro: boolean;
  paused: boolean;
  hasSave: boolean;
  saveAge: number;
}

export interface LetterView {
  id: string;
  title: string;
  body: string;
  from: string;
  day: number;
}