import type {
  ChapterDef,
  MiniGameDef,
  Personality,
  PropDef,
  PropKind,
  ShopItem,
  SproutDef,
  Vec,
  ZoneDef,
  ZoneId,
} from './types';

export const WORLD_TILES_X = 76;
export const WORLD_TILES_Y = 44;
export const TILE = 16;

export const HOUR_RATE = 0.42; // real seconds per in-game minute
export const DAY_START = 6 * 60;
export const DAY_END = 26 * 60;
export const MINUTE_MS = HOUR_RATE * 1000;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function hash2(x: number, y: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const PERSONALITY_LABEL: Record<Personality, string> = {
  sunny: 'Sunny',
  shy: 'Shy',
  wise: 'Wise',
  bold: 'Brave',
  tender: 'Tender',
  sleepy: 'Sleepy',
  dreamy: 'Dreamy',
};

export const kindLabel: Record<string, string> = {
  bud: 'little sprout',
  flower: 'flowerling',
  herb: 'herbling',
  berry: 'berryling',
  mushroom: 'mushroomling',
  clover: 'cloverling',
  pumpkin: 'pumpkinling',
};

export const STAGE_NAMES = ['Seedling', 'Sprout', 'Budling', 'Bloomed'] as const;
export const STAGE_GROWTH = [0, 25, 60, 100];
export const STAGE_THRESHOLDS = [25, 60, 100, Infinity];

export interface ZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ZONE_RECT: Record<ZoneId, ZoneRect> = {
  meadow: { x: 24, y: 22, w: 23, h: 21 },
  pond: { x: 2, y: 2, w: 25, h: 18 },
  sunroot: { x: 45, y: 2, w: 25, h: 18 },
  whisper: { x: 2, y: 22, w: 20, h: 21 },
  orchard: { x: 49, y: 22, w: 21, h: 21 },
  arcade: { x: 71, y: 2, w: 5, h: 19 },
};

export interface GateDef {
  id: string;
  from: ZoneId;
  to: ZoneId;
  tiles: Vec[];
  anchor: Vec;
  label: string;
}

export const GATES: GateDef[] = [
  {
    id: 'gate-pond',
    from: 'meadow',
    to: 'pond',
    tiles: [
      { x: 24, y: 20 },
      { x: 25, y: 20 },
      { x: 24, y: 21 },
      { x: 25, y: 21 },
    ],
    anchor: { x: 24.5, y: 20.4 },
    label: 'Dewdrop Pond',
  },
  {
    id: 'gate-sunroot',
    from: 'meadow',
    to: 'sunroot',
    tiles: [
      { x: 45, y: 20 },
      { x: 46, y: 20 },
      { x: 45, y: 21 },
      { x: 46, y: 21 },
    ],
    anchor: { x: 45.5, y: 20.4 },
    label: 'Sunroot Terrace',
  },
  {
    id: 'gate-whisper',
    from: 'meadow',
    to: 'whisper',
    tiles: [
      { x: 22, y: 31 },
      { x: 23, y: 31 },
      { x: 22, y: 32 },
      { x: 23, y: 32 },
    ],
    anchor: { x: 22.5, y: 31.4 },
    label: 'Whisper Hollow',
  },
  {
    id: 'gate-orchard',
    from: 'meadow',
    to: 'orchard',
    tiles: [
      { x: 47, y: 33 },
      { x: 48, y: 33 },
      { x: 47, y: 34 },
      { x: 48, y: 34 },
    ],
    anchor: { x: 47.5, y: 33.4 },
    label: 'Moonlit Orchard',
  },
  {
    id: 'gate-arcade',
    from: 'orchard',
    to: 'arcade',
    tiles: [
      { x: 70, y: 10 },
      { x: 70, y: 11 },
      { x: 70, y: 12 },
    ],
    anchor: { x: 70.4, y: 11.4 },
    label: 'Lantern Arcade',
  },
];

const P = (
  over: Partial<ShopItem> & Pick<ShopItem, 'id' | 'name' | 'description' | 'price' | 'harmony' | 'kind' | 'category' | 'size'>,
): ShopItem => ({ ...over });

export const SHOP_ITEMS: ShopItem[] = [
  P({
    id: 'lanternpost',
    name: 'Firefly Lantern',
    description: 'A little glass lantern that hums with warm light. Plants feel braver near it.',
    price: 12,
    harmony: 1,
    kind: 'lanternpost',
    category: 'cosy',
    size: 'small',
    glow: 34,
    solid: { w: 10, h: 5 },
  }),
  P({
    id: 'bench',
    name: 'Mossy Bench',
    description: 'For sitting together when the day is too loud.',
    price: 16,
    harmony: 1,
    kind: 'bench',
    category: 'cosy',
    size: 'medium',
    solid: { w: 28, h: 8 },
  }),
  P({
    id: 'birdbath',
    name: 'Bird Bath',
    description: 'Sparrows splash here. The sound calms everyone within earshot.',
    price: 18,
    harmony: 2,
    kind: 'birdbath',
    category: 'cosy',
    size: 'small',
    solid: { w: 12, h: 8 },
  }),
  P({
    id: 'windchime',
    name: 'Wind Chime',
    description: 'Three shells that speak only when the breeze visits.',
    price: 14,
    harmony: 1,
    kind: 'windchime',
    category: 'cosy',
    size: 'small',
    glow: 18,
  }),
  P({
    id: 'swing',
    name: 'Petal Swing',
    description: 'A gentle swing beneath the boughs. Giggles included.',
    price: 34,
    harmony: 3,
    kind: 'swing',
    category: 'cosy',
    size: 'large',
    solid: { w: 26, h: 6 },
  }),
  P({
    id: 'arch',
    name: 'Rose Arch',
    description: 'A flowering threshold. Paths feel like invitations under it.',
    price: 30,
    harmony: 2,
    kind: 'arch',
    category: 'garden',
    size: 'medium',
    solid: { w: 28, h: 4 },
  }),
  P({
    id: 'pergola',
    name: 'Moon Pergola',
    description: 'A quiet frame for climbing vines and late conversations.',
    price: 60,
    harmony: 4,
    kind: 'pergola',
    category: 'garden',
    size: 'large',
    solid: { w: 44, h: 8 },
    glow: 28,
  }),
  P({
    id: 'sunflower',
    name: 'Sunflower',
    description: 'Tall, cheerful, and always facing the kindest light.',
    price: 8,
    harmony: 1,
    kind: 'sunflower',
    category: 'garden',
    size: 'small',
  }),
  P({
    id: 'flowerPatch',
    name: 'Flower Patch',
    description: 'A handful of wildflowers. Bees approve.',
    price: 6,
    harmony: 1,
    kind: 'flowerPatch',
    category: 'garden',
    size: 'small',
  }),
  P({
    id: 'bush',
    name: 'Soft Bush',
    description: 'A round green cushion. Perfect for hiding, not for worrying.',
    price: 10,
    harmony: 1,
    kind: 'bush',
    category: 'garden',
    size: 'small',
    solid: { w: 18, h: 8 },
  }),
  P({
    id: 'blossom',
    name: 'Blossom Tree',
    description: 'Pink petals fall all season. The sprouts think it is magic.',
    price: 40,
    harmony: 3,
    kind: 'blossom',
    category: 'garden',
    size: 'large',
    solid: { w: 14, h: 10 },
  }),
  P({
    id: 'pine',
    name: 'Whisper Pine',
    description: 'A quiet evergreen that keeps secrets and blocks the wind.',
    price: 32,
    harmony: 2,
    kind: 'pine',
    category: 'garden',
    size: 'large',
    solid: { w: 14, h: 10 },
  }),
  P({
    id: 'mushroomGiant',
    name: 'Giant Mushroom',
    description: 'A soft red canopy. Smells like rain and old stories.',
    price: 22,
    harmony: 2,
    kind: 'mushroomGiant',
    category: 'garden',
    size: 'medium',
    solid: { w: 18, h: 8 },
  }),
  P({
    id: 'lily',
    name: 'Lily Cluster',
    description: 'Floating blossoms. Best placed near water, but they are forgiving.',
    price: 8,
    harmony: 1,
    kind: 'lily',
    category: 'garden',
    size: 'small',
  }),
  P({
    id: 'stone',
    name: 'Warm Stone',
    description: 'Sun-soaked and smooth. A favourite napping spot.',
    price: 4,
    harmony: 1,
    kind: 'stone',
    category: 'garden',
    size: 'small',
    solid: { w: 14, h: 6 },
  }),
  P({
    id: 'berrybush',
    name: 'Berry Bush',
    description: 'Produces three hand-picked berries every morning.',
    price: 20,
    harmony: 1,
    kind: 'berrybush',
    category: 'pantry',
    size: 'small',
    solid: { w: 18, h: 8 },
  }),
  P({
    id: 'sign',
    name: 'Little Signpost',
    description: 'For directions, names, or tiny encouraging notes.',
    price: 6,
    harmony: 1,
    kind: 'sign',
    category: 'cosy',
    size: 'small',
    solid: { w: 8, h: 4 },
  }),
  P({
    id: 'stumpseat',
    name: 'Stump Seat',
    description: 'A sturdy stump worn smooth by many small sit-downs.',
    price: 9,
    harmony: 1,
    kind: 'stumpseat',
    category: 'cosy',
    size: 'small',
    solid: { w: 14, h: 6 },
  }),
];

export const SHOP_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));

const treeTheme = {
  meadow: ['#3d6b34', '#4e8241', '#2e5429', '#6ba354', '#203c1e'] as [string, string, string, string, string],
  sunroot: ['#52703a', '#6a8c45', '#3e5a2c', '#91a95c', '#2b4022'] as [string, string, string, string, string],
  whisper: ['#263f3a', '#33524b', '#1a2e2b', '#4a6f60', '#122524'] as [string, string, string, string, string],
  pond: ['#355d45', '#477c56', '#284a37', '#5f976b', '#1d372a'] as [string, string, string, string, string],
  orchard: ['#40543a', '#566d42', '#2f402d', '#7a8f58', '#263421'] as [string, string, string, string, string],
};

export const ZONES: Record<ZoneId, ZoneDef> = {
  meadow: {
    id: 'meadow',
    name: 'Heartmeadow',
    subtitle: 'Home clearing',
    blurb: 'The warm middle of the garden. Your cottage, a creaky well, and room to grow.',
    theme: {
      grass: ['#5a8f47', '#4f8440', '#639a4e', '#457637'],
      path: ['#b99b6f', '#ab8b60', '#c9ad82'],
      water: ['#5e9bb0', '#4c849c', '#8cc3cf', '#3a6c85'],
      tree: treeTheme.meadow,
      ambient: 'petals',
      darkness: 0,
      pathStyle: 'soil',
    },
    spawn: { x: 11.5, y: 12 },
    paths: [
      { pts: [{ x: 6.9, y: 5.3 }, { x: 7.6, y: 7.8 }, { x: 9.8, y: 10.4 }, { x: 11.5, y: 12.6 }], width: 1 },
      { pts: [{ x: 11.5, y: 12.6 }, { x: 9.2, y: 10 }, { x: 5.4, y: 6.6 }, { x: 2.4, y: 3 }, { x: 0.4, y: 0.4 }], width: 1 },
      { pts: [{ x: 11.5, y: 12.6 }, { x: 14.2, y: 10 }, { x: 17.6, y: 5.8 }, { x: 20.4, y: 2.6 }, { x: 22.2, y: 0.4 }], width: 1 },
      { pts: [{ x: 11.5, y: 12.6 }, { x: 8.4, y: 13.2 }, { x: 4.6, y: 12.2 }, { x: 1.6, y: 9.6 }, { x: 0.2, y: 9.4 }], width: 1 },
      { pts: [{ x: 11.5, y: 12.6 }, { x: 14.6, y: 13 }, { x: 18.2, y: 12.3 }, { x: 21.4, y: 11.6 }, { x: 22.6, y: 11.4 }], width: 1 },
      { pts: [{ x: 11.5, y: 12.6 }, { x: 11.4, y: 16 }, { x: 11.8, y: 20 }], width: 1 },
    ],
    props: [
      { kind: 'cottage', x: 6, y: 5.6 },
      { kind: 'well', x: 15.4, y: 8.4 },
      { kind: 'sign', x: 12.9, y: 14.8, v: 1 },
      { kind: 'fence', x: 9.4, y: 4.0, v: 1 }, { kind: 'fence', x: 10.4, y: 4.0, v: 1 }, { kind: 'fence', x: 2.4, y: 8.6 },
      { kind: 'tree', x: 2.6, y: 5.4 }, { kind: 'tree', x: 18.6, y: 15.6 }, { kind: 'tree', x: 20.4, y: 7.4 },
      { kind: 'tree', x: 4.6, y: 17.4 }, { kind: 'tree', x: 15.8, y: 2.4 },
      { kind: 'blossom', x: 3.6, y: 13.2 }, { kind: 'blossom', x: 18.4, y: 2.6 },
      { kind: 'pine', x: 0.9, y: 18.2 }, { kind: 'pine', x: 21.6, y: 17.8 },
      { kind: 'berrybush', x: 8.6, y: 17.6 }, { kind: 'berrybush', x: 17.6, y: 9.2 }, { kind: 'berrybush', x: 3.4, y: 14.8 },
      { kind: 'bush', x: 9, y: 8.6 }, { kind: 'bush', x: 14.2, y: 16.8 }, { kind: 'bush', x: 21.2, y: 5.8 },
      { kind: 'flowerPatch', x: 10.4, y: 8.2 }, { kind: 'flowerPatch', x: 13.9, y: 15.4 }, { kind: 'flowerPatch', x: 19.2, y: 10.6 },
      { kind: 'mushroomSmall', x: 7.4, y: 12.2 }, { kind: 'mushroomSmall', x: 16.8, y: 17.2 },
      { kind: 'rock', x: 13.2, y: 3.4 }, { kind: 'stump', x: 16.2, y: 12.2 },
      { kind: 'lamp', x: 12.6, y: 10.2 }, { kind: 'lamp', x: 8.4, y: 13.8 },
    ],
    arrival: 'A soft morning in Heartmeadow. The gate creaks open behind you.',
  },
  pond: {
    id: 'pond',
    name: 'Dewdrop Pond',
    subtitle: 'Still water',
    blurb: 'A quiet mirror of a pond, ringed with reeds. Drizzle is always welcome here.',
    unlock: { seeds: 60, harmony: 2 },
    spawn: { x: 22.4, y: 16.2 },
    theme: {
      grass: ['#4c8560', '#578f69', '#427855', '#6ba077'],
      path: ['#c4b089', '#b29c77', '#d4c19b'],
      water: ['#4f93a8', '#3f7b93', '#87c3cd', '#2f6279'],
      tree: treeTheme.pond,
      ambient: 'petals',
      darkness: 0,
      pathStyle: 'sand',
    },
    paths: [
      { pts: [{ x: 23, y: 17.4 }, { x: 21.8, y: 15.2 }, { x: 19.4, y: 13.2 }, { x: 16.4, y: 12.6 }, { x: 13, y: 14.2 }, { x: 9.4, y: 15.8 }, { x: 5.4, y: 16.2 }, { x: 2.6, y: 15.4 }], width: 1 },
      { pts: [{ x: 18.4, y: 13 }, { x: 19.6, y: 10.6 }, { x: 18.8, y: 8 }, { x: 20, y: 5 }, { x: 21.4, y: 2.4 }], width: 1 },
    ],
    water: [{ x: 10.4, y: 7.2, rx: 8.1, ry: 5.1 }],
    props: [
      { kind: 'tree', x: 2.6, y: 3.2 }, { kind: 'tree', x: 20.8, y: 3.4 }, { kind: 'pine', x: 0.9, y: 7.8 },
      { kind: 'blossom', x: 20.4, y: 15 }, { kind: 'blossom', x: 2.6, y: 12.4 },
      { kind: 'reeds', x: 3.8, y: 9.6 }, { kind: 'reeds', x: 18.8, y: 6.2 }, { kind: 'reeds', x: 5.4, y: 5.6 },
      { kind: 'reeds', x: 17.2, y: 11 }, { kind: 'reeds', x: 8.4, y: 11.6 },
      { kind: 'lily', x: 8.2, y: 8.6 }, { kind: 'lily', x: 13.6, y: 5.2 }, { kind: 'lily', x: 15.4, y: 9.2 },
      { kind: 'lily', x: 6.6, y: 4.4 },
      { kind: 'rock', x: 12.8, y: 12.4 }, { kind: 'rock', x: 21.6, y: 10.4 }, { kind: 'rock', x: 5.2, y: 12.8 },
      { kind: 'birdbath', x: 21.8, y: 17.2 },
      { kind: 'bench', x: 12.4, y: 15.2 },
      { kind: 'berrybush', x: 3.2, y: 16.8 }, { kind: 'bush', x: 22.6, y: 8.2 },
      { kind: 'flowerPatch', x: 19.4, y: 16.4 }, { kind: 'flowerPatch', x: 9.6, y: 17.4 },
      { kind: 'mushroomSmall', x: 4.2, y: 14.2 }, { kind: 'mushroomSmall', x: 23.4, y: 13.2 },
      { kind: 'lamp', x: 19.8, y: 14.6 }, { kind: 'fence', x: 23.4, y: 3, v: 1 }, { kind: 'fence', x: 23.4, y: 4, v: 1 },
    ],
    arrival: 'Dragonflies stitch the air together. The water holds the sky without dropping it.',
  },
  sunroot: {
    id: 'sunroot',
    name: 'Sunroot Terrace',
    subtitle: 'Warm terraces',
    blurb: 'Golden light and long soil beds where the boldest little sprouts love to dig.',
    unlock: { seeds: 100, harmony: 5 },
    spawn: { x: 2.4, y: 16.2 },
    theme: {
      grass: ['#799545', '#8aa052', '#6d8840', '#9cac5e'],
      path: ['#c8a877', '#b6956a', '#d8ba8c'],
      water: ['#62a4a6', '#4f8b8e', '#93c8c5', '#3b7074'],
      tree: treeTheme.sunroot,
      ambient: 'pollen',
      darkness: 0,
      pathStyle: 'sand',
    },
    paths: [
      { pts: [{ x: 0.4, y: 17 }, { x: 2.6, y: 15.6 }, { x: 5.2, y: 13.6 }, { x: 9.2, y: 12 }, { x: 13.2, y: 10.4 }, { x: 16.2, y: 8.6 }, { x: 18.4, y: 6.4 }, { x: 19.2, y: 3 }], width: 1 },
      { pts: [{ x: 9.2, y: 12 }, { x: 7.4, y: 9.6 }, { x: 4.6, y: 7.4 }, { x: 2.6, y: 5.4 }], width: 1 },
      { pts: [{ x: 13.2, y: 10.4 }, { x: 14.6, y: 13.2 }, { x: 16, y: 15.4 }, { x: 19.4, y: 16 }], width: 1 },
    ],
    paddies: [
      { x: 5.5, y: 3.2, w: 4.4, h: 2.6 },
      { x: 11.6, y: 3.2, w: 3.4, h: 2.6 },
      { x: 5.4, y: 8.4, w: 4, h: 2.4 },
      { x: 12.2, y: 12.8, w: 3.8, h: 2.2 },
      { x: 18.8, y: 10.4, w: 3.6, h: 2.2 },
    ],
    props: [
      { kind: 'scarecrow', x: 8.8, y: 6.4 }, { kind: 'scarecrow', x: 15.2, y: 10.8 },
      { kind: 'sunflower', x: 4.2, y: 6.8 }, { kind: 'sunflower', x: 10.4, y: 7.2 }, { kind: 'sunflower', x: 16.4, y: 4.8 },
      { kind: 'sunflower', x: 20.6, y: 13.4 }, { kind: 'sunflower', x: 8.2, y: 15.8 },
      { kind: 'tree', x: 2, y: 2.6 }, { kind: 'tree', x: 18.2, y: 2.4 }, { kind: 'tree', x: 22.8, y: 4.4 },
      { kind: 'pine', x: 23.4, y: 15.4 }, { kind: 'pine', x: 6.8, y: 16.8 },
      { kind: 'blossom', x: 0.8, y: 10.8 }, { kind: 'blossom', x: 13.4, y: 16.2 },
      { kind: 'berrybush', x: 10.2, y: 9.2 }, { kind: 'berrybush', x: 17.6, y: 7.2 },
      { kind: 'rock', x: 12.4, y: 6.2 }, { kind: 'rock', x: 22.4, y: 8.8 }, { kind: 'rock', x: 1.8, y: 14.2 },
      { kind: 'bush', x: 12.4, y: 12.2 }, { kind: 'bush', x: 4.4, y: 12.4 },
      { kind: 'flowerPatch', x: 20.8, y: 16.4 }, { kind: 'flowerPatch', x: 7.2, y: 11.6 },
      { kind: 'lamp', x: 2.6, y: 12.6 }, { kind: 'fence', x: 11.4, y: 6.4, v: 1 }, { kind: 'fence', x: 12.4, y: 6.4, v: 1 },
      { kind: 'fence', x: 22.4, y: 12.4, v: 1 },
    ],
    arrival: 'The terrace is warm underfoot. Somewhere bees are arguing about flowers.',
  },
  whisper: {
    id: 'whisper',
    name: 'Whisper Hollow',
    subtitle: 'Shaded hollow',
    blurb: 'A cool, quiet hollow of giant mushrooms and glowing crystals. Feelings echo here.',
    unlock: { seeds: 160, harmony: 10 },
    spawn: { x: 17.4, y: 10.4 },
    theme: {
      grass: ['#3c665a', '#446f61', '#345b50', '#527d6c'],
      path: ['#7d7a62', '#6b6854', '#8e8a70'],
      water: ['#426e7d', '#345a6b', '#6b9aa0', '#264553'],
      tree: treeTheme.whisper,
      ambient: 'fireflies',
      fog: 'rgba(20, 40, 38, 0.12)',
      darkness: 0.18,
      pathStyle: 'moss',
    },
    paths: [
      { pts: [{ x: 19.4, y: 9.4 }, { x: 16.4, y: 8.4 }, { x: 13, y: 7.6 }, { x: 9.2, y: 7 }, { x: 5.2, y: 6.2 }, { x: 2, y: 7 }], width: 1 },
      { pts: [{ x: 13, y: 7.6 }, { x: 13.4, y: 11 }, { x: 12.4, y: 14 }], width: 1 },
      { pts: [{ x: 5.2, y: 6.2 }, { x: 5.6, y: 10.4 }, { x: 6, y: 13.4 }], width: 1 },
    ],
    props: [
      { kind: 'mushroomGiant', x: 3.6, y: 4.4, v: 1 }, { kind: 'mushroomGiant', x: 13.8, y: 4, v: 2 },
      { kind: 'mushroomGiant', x: 4.4, y: 15, v: 1 }, { kind: 'mushroomGiant', x: 15.2, y: 16.6, v: 2 },
      { kind: 'mushroomGiant', x: 18.2, y: 13.6, v: 1 },
      { kind: 'mushroomSmall', x: 9.2, y: 4.6 }, { kind: 'mushroomSmall', x: 12.4, y: 5.8 },
      { kind: 'mushroomSmall', x: 7.2, y: 11.6 }, { kind: 'mushroomSmall', x: 15.4, y: 9.4 },
      { kind: 'tree', x: 1.4, y: 2.6 }, { kind: 'tree', x: 17.4, y: 2.6 }, { kind: 'tree', x: 17.4, y: 18.6 },
      { kind: 'pine', x: 1.2, y: 18.4 }, { kind: 'blossom', x: 10.4, y: 17.8 },
      { kind: 'crystal', x: 8.4, y: 12.6, v: 1 }, { kind: 'crystal', x: 12, y: 13.6, v: 2 },
      { kind: 'crystal', x: 5.6, y: 10.6, v: 1 },
      { kind: 'rock', x: 6.8, y: 16.6 }, { kind: 'rock', x: 18.6, y: 16.4 }, { kind: 'rock', x: 2.4, y: 9.4 },
      { kind: 'stump', x: 10.2, y: 10.4 }, { kind: 'bench', x: 11.4, y: 13.2 },
      { kind: 'windchime', x: 16.4, y: 6.4 },
      { kind: 'lanternpost', x: 9.4, y: 14.4 }, { kind: 'lanternpost', x: 6.4, y: 3.4 },
      { kind: 'berrybush', x: 3.2, y: 12 }, { kind: 'lily', x: 14.4, y: 17.4 },
      { kind: 'reeds', x: 2.4, y: 17.4 }, { kind: 'flowerPatch', x: 16.4, y: 11.4 },
    ],
    arrival: 'The air is cool and smells of rain. The mushrooms lean in, listening.',
  },
  arcade: {
    id: 'arcade',
    name: 'Lantern Arcade',
    subtitle: 'Little festival',
    blurb: 'Strings of lanterns, a striped tent, and four little games. Nerdy the pumpkin keeps the score.',
    unlock: { seeds: 140, harmony: 7 },
    spawn: { x: 2.5, y: 11.4 },
    theme: {
      grass: ['#5c7a52', '#68875b', '#527049', '#7d9a68'],
      path: ['#c9a06d', '#b78d5c', '#dcb684'],
      water: ['#6aa3b8', '#548ba0', '#9fcbd8', '#3f7186'],
      tree: treeTheme.orchard,
      ambient: 'confetti',
      darkness: 0.06,
      pathStyle: 'sand',
    },
    paths: [
      { pts: [{ x: 0.4, y: 11.4 }, { x: 1.8, y: 11.4 }], width: 1 },
    ],
    props: [
      { kind: 'arcadeSign', x: 1.4, y: 9.4 },
      { kind: 'tent', x: 2.6, y: 5.4 },
      { kind: 'booth', x: 1.4, y: 15.6 },
      { kind: 'booth', x: 2.9, y: 16.4, flip: true },
      { kind: 'carousel', x: 3.6, y: 11.2 },
      { kind: 'targetWall', x: 1.4, y: 12.8 },
      { kind: 'prizeShelf', x: 3.6, y: 7.6 },
      { kind: 'balloons', x: 3.9, y: 15.2 },
      { kind: 'bunting', x: 1.6, y: 3.4 },
      { kind: 'bunting', x: 3.2, y: 3.4 },
      { kind: 'stringLight', x: 2.4, y: 8.2 },
      { kind: 'stringLight', x: 3.2, y: 13.4 },
      { kind: 'pumpkin', x: 3.2, y: 17.8, v: 1 },
      { kind: 'pumpkin', x: 1.2, y: 17.6, v: 2 },
      { kind: 'pumpkin', x: 2.2, y: 18.6, v: 0 },
      { kind: 'lanternpost', x: 1.2, y: 7.4 },
      { kind: 'lanternpost', x: 4.2, y: 10.4 },
      { kind: 'bench', x: 3.6, y: 18.2 },
      { kind: 'flowerPatch', x: 2.4, y: 3.6 },
      { kind: 'flowerPatch', x: 4.2, y: 5.8 },
      { kind: 'bush', x: 4.4, y: 3.4 },
      { kind: 'berrybush', x: 1.2, y: 5.6 },
    ],
    arrival: 'Lanterns sway over the grass. Somebody has been practising a welcome speech.',
  },
  orchard: {
    id: 'orchard',
    name: 'Moonlit Orchard',
    subtitle: 'Blossom rows',
    blurb: 'Rows of sleeping blossom trees. At night the whole orchard glows with tiny lights.',
    unlock: { seeds: 240, harmony: 16 },
    spawn: { x: 2.4, y: 11.4 },
    theme: {
      grass: ['#4b7045', '#557a4d', '#43653e', '#628655'],
      path: ['#a99a86', '#978876', '#c0b09a'],
      water: ['#527f9a', '#426a86', '#84aab8', '#315774'],
      tree: treeTheme.orchard,
      ambient: 'blossom',
      darkness: 0.1,
      pathStyle: 'stone',
    },
    paths: [
      { pts: [{ x: 0.4, y: 11.4 }, { x: 3.6, y: 10.8 }, { x: 7.6, y: 10.2 }, { x: 11.6, y: 9.6 }, { x: 15.6, y: 9.8 }, { x: 19.4, y: 9.2 }], width: 1 },
      { pts: [{ x: 11.6, y: 9.6 }, { x: 12.2, y: 6 }, { x: 12.2, y: 2.4 }], width: 1 },
    ],
    props: [
      { kind: 'blossom', x: 6.2, y: 6.2 }, { kind: 'blossom', x: 10.6, y: 6.2 }, { kind: 'blossom', x: 15.8, y: 6.2 },
      { kind: 'blossom', x: 19.6, y: 6.4 },
      { kind: 'blossom', x: 6, y: 15.2 }, { kind: 'blossom', x: 10.4, y: 15.6 }, { kind: 'blossom', x: 15.6, y: 15.4 },
      { kind: 'blossom', x: 19.4, y: 15.2 },
      { kind: 'swing', x: 8.4, y: 12.6 },
      { kind: 'pergola', x: 12.4, y: 2.8 },
      { kind: 'lanternpost', x: 3.4, y: 12.4 }, { kind: 'lanternpost', x: 17.4, y: 12.4 },
      { kind: 'bench', x: 7, y: 9 }, { kind: 'bench', x: 15.4, y: 13.2 },
      { kind: 'stumpseat', x: 3.4, y: 16.4 }, { kind: 'windchime', x: 12.6, y: 12.6 },
      { kind: 'flowerPatch', x: 4.4, y: 13.6 }, { kind: 'flowerPatch', x: 17.6, y: 17.2 },
      { kind: 'bush', x: 2.2, y: 8.6 }, { kind: 'bush', x: 20.4, y: 9.2 },
      { kind: 'berrybush', x: 2.2, y: 17.4 }, { kind: 'berrybush', x: 19.2, y: 3.2 },
      { kind: 'stone', x: 9.6, y: 9.2 }, { kind: 'stone', x: 14.4, y: 11.2 },
      { kind: 'lily', x: 10.8, y: 3.4 },
      { kind: 'mushroomSmall', x: 17.6, y: 13.2 }, { kind: 'fence', x: 4.4, y: 3.4 }, { kind: 'fence', x: 5.4, y: 3.4 },
      { kind: 'tree', x: 19.8, y: 19.4 }, { kind: 'pine', x: 0.9, y: 3.6 },
    ],
    arrival: 'Petals drift like slow snow. The old trees remember every sprout that napped beneath them.',
  },
};

export const ZONE_ORDER: ZoneId[] = ['meadow', 'pond', 'sunroot', 'whisper', 'orchard', 'arcade'];

export const ZONE_UNLOCK_TOAST: Record<ZoneId, string> = {
  meadow: 'Heartmeadow is yours.',
  pond: 'Dewdrop Pond has woken. The dragonflies have been expecting you.',
  sunroot: 'Sunroot Terrace has woken. The bees are delighted.',
  whisper: 'Whisper Hollow has woken. The mushrooms lean in.',
  orchard: 'Moonlit Orchard has woken. Petals fall like slow snow.',
  arcade: 'Lantern Arcade has woken. Somebody lit every lantern at once.',
};

const palette = (
  body: string,
  shade: string,
  light: string,
  leaf: string,
  leafDark: string,
  accent: string,
  accentDark: string,
  cheek: string,
) => ({ body, shade, light, leaf, leafDark, accent, accentDark, cheek });

export const SPROUTS: SproutDef[] = [
  {
    id: 'pip',
    name: 'Pip',
    personality: 'sunny',
    kind: 'flower',
    palette: palette('#f6d477', '#d8ac4f', '#ffe9a8', '#77b95a', '#4e8a3a', '#f39a5c', '#c76f3a', '#f2a08a'),
    homeZone: 'meadow',
    blurb: 'A sunflower seed who decided the world is mostly good.',
    likes: 'warm stones and being included',
    quirk: 'hums when nervous',
    arrival: 'Pip arrived in a cracked teacup and has refused to leave since.',
  },
  {
    id: 'fern',
    name: 'Fern',
    personality: 'shy',
    kind: 'herb',
    palette: palette('#c7dda2', '#9fb87d', '#e3f0c4', '#65a45c', '#436f3d', '#8fbf9b', '#5f8d70', '#efb0a2'),
    homeZone: 'meadow',
    blurb: 'A fern who prefers the edges of rooms, and always notices small kindnesses.',
    likes: 'quiet corners and being asked twice',
    quirk: 'covers their face when happy',
    arrival: 'Fern was found asleep under a watering can.',
  },
  {
    id: 'bramble',
    name: 'Bramble',
    personality: 'bold',
    kind: 'berry',
    palette: palette('#d98bb5', '#ad628d', '#f0aed1', '#6ea85a', '#4a7b3e', '#8a4f97', '#65366f', '#f3a0b0'),
    homeZone: 'sunroot',
    blurb: 'A berry sprout with scraped knees and enormous plans.',
    likes: 'races and being trusted with things',
    quirk: 'claims not to be scared of thunderstorms',
    arrival: 'Bramble tumbled down the terrace steps and pretended that was intentional.',
  },
  {
    id: 'tilly',
    name: 'Tilly',
    personality: 'tender',
    kind: 'mushroom',
    palette: palette('#efe0c2', '#c9b795', '#fff2d9', '#86b26f', '#5c8549', '#d8736b', '#a54c4a', '#f0a49c'),
    homeZone: 'whisper',
    blurb: 'A mushroomling who cries at sad songs and hands out damp little hugs.',
    likes: 'being held and small ceremonies',
    quirk: 'apologises to mushrooms before picking them',
    arrival: 'Tilly followed the smell of rain all the way into Whisper Hollow.',
  },
  {
    id: 'wisp',
    name: 'Wisp',
    personality: 'dreamy',
    kind: 'clover',
    palette: palette('#d5e6c8', '#a9c49b', '#eef7e5', '#8ccf9a', '#5f9a6c', '#b9a7e0', '#8777b0', '#eab8cf'),
    homeZone: 'pond',
    blurb: 'A clover who watches clouds and sometimes forgets to blink.',
    likes: 'stories and long silences',
    quirk: 'names the dragonflies',
    arrival: 'Wisp drifted in with the dragonflies and stayed for the water.',
  },
  {
    id: 'sage',
    name: 'Sage',
    personality: 'wise',
    kind: 'herb',
    palette: palette('#b9c9dd', '#909fb4', '#dbe8f4', '#7fa97d', '#54775a', '#c9b07a', '#9c8855', '#e6b3b8'),
    homeZone: 'orchard',
    blurb: 'An old-souled sprout who gives surprisingly good advice for someone so small.',
    likes: 'shade, tea, and being believed',
    quirk: 'collects smooth stones and worries',
    arrival: 'Sage was already sitting under the oldest tree, as if expected.',
  },
  {
    id: 'nimbus',
    name: 'Nimbus',
    personality: 'sleepy',
    kind: 'mushroom',
    palette: palette('#cfc3e3', '#a89abb', '#e7dcf7', '#84ad8a', '#557a60', '#8a7ab0', '#665680', '#ecb0c6'),
    homeZone: 'whisper',
    blurb: 'A very small cloud who is always almost awake, and always glad you came.',
    likes: 'pillows, dusk, and being sung to',
    quirk: 'falls asleep mid-sentence',
    arrival: 'Nimbus was found curled inside a giant mushroom cap.',
  },
  {
    id: 'nerdy',
    name: 'Nerdy',
    personality: 'wise',
    kind: 'pumpkin',
    passive: true,
    role: 'host',
    palette: palette('#e79a3c', '#bd7526', '#f7c473', '#6f9b54', '#4a6f3a', '#7a4a2a', '#54321c', '#e8b48a'),
    homeZone: 'arcade',
    blurb: 'A pumpkin in round glasses who keeps the arcade scores and worries about the lanterns.',
    likes: 'quiet corners, lists, and being asked for advice',
    quirk: 'explains the rules twice, just in case',
    arrival: 'Nerdy was already behind the prize shelf, alphabetising it.',
  },
  {
    id: 'poppy',
    name: 'Poppy',
    personality: 'sunny',
    kind: 'flower',
    palette: palette('#f09a92', '#c7746e', '#ffc2bb', '#7cb56d', '#548c4a', '#e8c85f', '#b39232', '#f6b0a2'),
    homeZone: 'sunroot',
    blurb: 'A poppy of enormous feelings and equally enormous kindness.',
    likes: 'dancing and making others laugh',
    quirk: 'laughs at their own jokes first',
    arrival: 'Poppy arrived with a bouquet for you and a plan for a garden party.',
  },
];

export const SPROUT_BY_ID: Record<string, SproutDef> = Object.fromEntries(SPROUTS.map((s) => [s.id, s]));

export const STARTING_SPROUTS = ['pip', 'fern'];

export const MINI_GAMES: MiniGameDef[] = [
  {
    id: 'berrycatch',
    name: 'Berry Catch',
    blurb: 'Berries tumble from the bunting. Catch them in your basket.',
    howTo: 'Move with the mouse, arrow keys, or A/D. Catch berries, dodge the falling stones. You have 45 seconds.',
    icon: 'berries',
    color: '#d9607e',
    baseReward: 18,
  },
  {
    id: 'memory',
    name: 'Memory Garden',
    blurb: 'Flip the leaf cards and find every matching pair.',
    howTo: 'Click two cards to turn them over. Matching pairs stay open. Finish in as few flips as you can.',
    icon: 'journal',
    color: '#6f9b54',
    baseReward: 22,
  },
  {
    id: 'firefly',
    name: 'Firefly Glow',
    blurb: 'Catch the fireflies as they drift through the dark.',
    howTo: 'Click the fireflies before they fade. They get quicker and shyer as you go.',
    icon: 'trust',
    color: '#e3c05a',
    baseReward: 20,
  },
  {
    id: 'melody',
    name: 'Melody Blooms',
    blurb: 'Repeat the flower song. Each round adds one more note.',
    howTo: 'Watch the flowers light up, then click them back in the same order. One new note each round.',
    icon: 'sing',
    color: '#b9a7e0',
    baseReward: 24,
  },
];

export const MINI_GAME_BY_ID: Record<string, MiniGameDef> = Object.fromEntries(MINI_GAMES.map((g) => [g.id, g]));

export const ARRIVALS: { day: number; sprout: string; zone: ZoneId; text: string }[] = [
  { day: 3, sprout: 'bramble', zone: 'sunroot', text: 'Bramble was watching from the terrace gate. They had a pebble for you, "for luck".' },
  { day: 5, sprout: 'wisp', zone: 'pond', text: 'Wisp was waiting at the pond, counting dragonflies. They lost count at the same one twice.' },
  { day: 7, sprout: 'tilly', zone: 'whisper', text: 'Tilly was found under a mushroom, making a small bed of moss. They offered to share it.' },
  { day: 10, sprout: 'nimbus', zone: 'whisper', text: 'Nimbus fell out of a mushroom cap, apologised to the mushroom, and fell asleep.' },
  { day: 13, sprout: 'sage', zone: 'orchard', text: 'Sage was reading stones in the orchard. They said the garden had been expecting you for a long time.' },
  { day: 16, sprout: 'poppy', zone: 'sunroot', text: 'Poppy arrived with a bouquet, announcing that every garden needs a party.' },
  { day: 2, sprout: 'nerdy', zone: 'arcade', text: 'Nerdy has set up shop behind the prize shelf. He has a clipboard and strong opinions about lantern placement.' },
];

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'ch1',
    title: 'First Roots',
    intro: 'Pip and Fern are new to the garden, and so are you. Start small. Stay close.',
    reward: { seeds: 24, item: 'lanternpost' },
    tasks: [
      { id: 'feed3', type: 'feed', count: 3, label: 'Feed a sprout 3 times' },
      { id: 'soothe1', type: 'soothe', count: 1, label: 'Soothe a sprout through a hard moment' },
      { id: 'talk2', type: 'talk', count: 2, label: 'Talk with a sprout 2 times' },
      { id: 'decor1', type: 'decor', count: 1, label: 'Place something cosy in the garden' },
    ],
    letter: `Dear Keeper,

The garden chose well. Pip has already told every leaf you have arrived, twice.

There is no rush here. A sprout grows best when it is allowed to be small for a while. Water them, listen to them, and let the weeds be for another day.

We leave a little lantern by the path. Lanterns help with all sorts of fears.

With the soil's affection,
The Old Willow`,
  },
  {
    id: 'ch2',
    title: 'Open Gates',
    intro: 'The garden has more to show you. Let the paths breathe, and meet whoever has been waiting.',
    reward: { seeds: 40, item: 'blossom' },
    tasks: [
      { id: 'unlock1', type: 'unlock', count: 1, label: 'Wake another part of the garden' },
      { id: 'story2', type: 'story', count: 2, label: 'Read a story to a sprout' },
      { id: 'breathe2', type: 'breathe', count: 2, label: 'Breathe together twice' },
      { id: 'water6', type: 'water', count: 6, label: 'Water sprouts 6 times' },
    ],
    letter: `Keeper,

I heard the gate at Sunroot sigh open. Good. Gardens grow in two directions: outward into new ground, and inward into new courage.

Bramble will test you. Let them. Being trusted with something breakable is how brave little ones learn to be gentle.

Take the blossom cutting. Plant it somewhere you will see often.

— The Old Willow`,
  },
  {
    id: 'ch3',
    title: 'Hollow Echoes',
    intro: 'Some feelings are too big to carry alone. Whisper Hollow is listening.',
    reward: { seeds: 60, item: 'windchime' },
    tasks: [
      { id: 'cuddle5', type: 'cuddle', count: 5, label: 'Cuddle your sprouts 5 times' },
      { id: 'soothe3', type: 'soothe', count: 3, label: 'Soothe 3 hard moments' },
      { id: 'harvest2', type: 'harvest', count: 2, label: 'Gather berries twice' },
      { id: 'talk6', type: 'talk', count: 6, label: 'Talk with sprouts 6 times' },
    ],
    letter: `Keeper,

Tilly cried today because a cloud looked lonely. There is no fixing that. There is only sitting with it.

You do not have to make feelings smaller. You only have to make the room big enough.

The hollow will be quiet for you now. We hung a wind chime so the silence has a voice.

— The Old Willow`,
  },
  {
    id: 'ch4',
    title: 'Still Water',
    intro: 'At the pond, everyone learns their own reflection. Meet Wisp, and learn the art of doing nothing together.',
    reward: { seeds: 80, item: 'bench' },
    tasks: [
      { id: 'breathe4', type: 'breathe', count: 4, label: 'Breathe with the garden 4 times' },
      { id: 'decor3', type: 'decor', count: 3, label: 'Place 3 more decorations' },
      { id: 'grow3', type: 'grow', count: 3, label: 'Help a sprout grow 3 stages' },
      { id: 'harmony8', type: 'harmony', count: 8, label: 'Reach 8 garden harmony' },
    ],
    letter: `Keeper,

The pond does not hurry the rain. Neither should you.

Wisp will ask you impossible questions: Where do clouds sleep? Who taught the bees to dance? Do not answer too quickly. Sometimes the question is the hug.

A bench by the water. Sit on it with someone.

— The Old Willow`,
  },
  {
    id: 'ch5',
    title: 'Moonlit Blossoms',
    intro: 'The orchard blooms only for those who stay. Walk the long rows and see how far you have grown.',
    reward: { seeds: 100, item: 'pergola' },
    tasks: [
      { id: 'bloom1', type: 'bloom', count: 1, label: 'Help a sprout bloom fully' },
      { id: 'talk9', type: 'talk', count: 9, label: 'Talk with sprouts 9 times' },
      { id: 'allzones', type: 'allzones', count: 1, label: 'Visit every part of the garden' },
      { id: 'decor6', type: 'decor', count: 6, label: 'Place 6 decorations' },
    ],
    letter: `Keeper,

You have made a place where small things can be honest. That is rare, and I do not say it lightly.

Sage has opinions about stones and about you. Mostly good ones. Poppy keeps trying to hang bunting from the pergola.

Blooming is not the end of growing. It is the part where a sprout can finally look back and see the whole path.

— The Old Willow`,
  },
  {
    id: 'ch6',
    title: 'A Garden That Grows',
    intro: 'There is no final page. Keep tending. Keep talking. The garden keeps opening.',
    reward: { seeds: 200, item: 'swing' },
    tasks: [
      { id: 'bloom3', type: 'bloom', count: 3, label: 'Help 3 sprouts bloom' },
      { id: 'harmony20', type: 'harmony', count: 20, label: 'Reach 20 garden harmony' },
      { id: 'unlock4', type: 'unlock', count: 4, label: 'Wake 4 garden areas' },
      { id: 'soothe9', type: 'soothe', count: 9, label: 'Soothe 9 hard moments' },
    ],
    letter: `Keeper,

The garden is yours now. Not as a thing to finish, but as a thing to keep.

There will be grey days. Some sprouts will sit in the rain and not want to come inside. You will sit with them. That is the whole secret.

Thank you for growing with us.

— The Old Willow`,
  },
];

export const DAILY_POOL: { type: import('./types').QuestTaskType; count: number; label: string; reward: number }[] = [
  { type: 'feed', count: 2, label: 'Feed someone twice', reward: 8 },
  { type: 'water', count: 3, label: 'Water three thirsty sprouts', reward: 8 },
  { type: 'talk', count: 2, label: 'Have a real conversation', reward: 10 },
  { type: 'cuddle', count: 2, label: 'Give two soft cuddles', reward: 8 },
  { type: 'story', count: 1, label: 'Read a story under the sky', reward: 10 },
  { type: 'breathe', count: 1, label: 'Breathe with the garden', reward: 7 },
  { type: 'harvest', count: 1, label: 'Gather berries for tea', reward: 6 },
  { type: 'soothe', count: 1, label: 'Sit with someone who is crying', reward: 12 },
  { type: 'decor', count: 1, label: 'Make the garden a little lovelier', reward: 8 },
  { type: 'play', count: 1, label: 'Play an arcade game with Nerdy', reward: 9 },
];

export const STORIES: { title: string; body: string[] }[] = [
  {
    title: 'The Cloud Who Forgot How to Rain',
    body: [
      'Once a small cloud was so worried about doing it wrong that it held all its rain inside.',
      'The garden waited. The pond got low. Nobody told the cloud off.',
      'One evening a sprout said, "You can rain on me first, if you like."',
      'The cloud let go, very gently. And the garden said thank you for every single drop.',
    ],
  },
  {
    title: 'The Seed That Was Not Ready',
    body: [
      'A seed stayed in the dark longer than the others. It heard them sprouting above and felt behind.',
      'The seed\u2019s friend whispered through the soil: "Roots grow down before leaves grow up."',
      'When the seed finally opened, its roots were the deepest in the garden, and it held everybody steady in the storm.',
    ],
  },
  {
    title: 'The Firefly Who Was Afraid of the Dark',
    body: [
      'A firefly was scared of the dark, which was an awkward thing to admit.',
      'The old willow said, "You do not have to be brave all at once. Just glow a little."',
      'So the firefly glowed the smallest glow. And another firefly saw it and glowed back.',
      'By midnight the whole hollow was full of small brave lights, none of them alone.',
    ],
  },
  {
    title: 'The Snail Who Missed the Party',
    body: [
      'The snail was invited to a party at the far end of the garden. It took two days to arrive.',
      'The party was over. The snail sat on the empty path feeling very small.',
      'But the sprouts had saved it a slice of berry cake, and they sat with it until sunrise.',
      'The snail was late, and still completely welcome.',
    ],
  },
  {
    title: 'A Promise Made of Moss',
    body: [
      'Two sprouts made a promise: whenever one of them was sad, the other would come and sit.',
      'For a long time nobody was sad, and the promise slept like a cat.',
      'Then one grey morning it was needed. And the moss was soft, and the sitting was enough.',
      'This is how a garden remembers things.',
    ],
  },
];

export const MOOD_LABEL: Record<string, string> = {
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

export const moodQuote: Record<string, string> = {
  joyful: 'The whole garden feels brighter when you are here.',
  content: 'This is nice. I am glad we are doing this.',
  uneasy: 'Something feels a bit wobbly today.',
  hungry: 'My tummy is making small thunder.',
  parched: 'I am a little dry. Could we find water?',
  weary: 'My leaves are heavy. Maybe a rest?',
  sad: 'I do not know why, but everything feels far away.',
  crying: 'I need someone to stay. Please stay.',
  asleep: 'zzz...',
  excited: 'Did you see? Did you see what I did?',
};

export const WEATHER_LABEL: Record<string, { label: string; note: string }> = {
  sunny: { label: 'Sunny', note: 'Plants grow a little faster.' },
  softclouds: { label: 'Soft clouds', note: 'A gentle, unhurried day.' },
  drizzle: { label: 'Drizzle', note: 'Everyone is being watered for free.' },
  starry: { label: 'Starry', note: 'Calm settles in after dark.' },
};

export const propLabel: Record<PropKind, string> = {
  tent: 'Striped tent',
  booth: 'Game booth',
  balloons: 'Balloons',
  prizeShelf: 'Prize shelf',
  bunting: 'Bunting',
  targetWall: 'Target wall',
  pumpkin: 'Pumpkin',
  arcadeSign: 'Arcade sign',
  stringLight: 'String lights',
  carousel: 'Little carousel',
  tree: 'Tree',
  pine: 'Pine',
  blossom: 'Blossom tree',
  bush: 'Bush',
  berrybush: 'Berry bush',
  cottage: 'Cottage',
  greenhouse: 'Greenhouse',
  well: 'Well',
  fence: 'Fence',
  lamp: 'Garden lamp',
  mushroomGiant: 'Mushroom',
  mushroomSmall: 'Mushroom',
  sunflower: 'Sunflower',
  scarecrow: 'Scarecrow',
  rock: 'Rock',
  lily: 'Water lily',
  reeds: 'Reeds',
  arch: 'Garden arch',
  swing: 'Swing',
  pergola: 'Pergola',
  sign: 'Sign',
  stump: 'Stump',
  crystal: 'Glow crystal',
  flowerPatch: 'Wildflowers',
  lanternpost: 'Lantern',
  bench: 'Bench',
  birdbath: 'Birdbath',
  windchime: 'Wind chime',
  stone: 'Stone',
  stumpseat: 'Stump seat',
};

export const DECOR_FLAVOR = [
  'A small thing, but the garden notices.',
  'Something warm settles into the ground.',
  'The air feels a little friendlier here.',
  'A sprout stops to look. This is a good sign.',
];