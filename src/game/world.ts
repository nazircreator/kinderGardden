import { GATES, TILE, WORLD_TILES_X, WORLD_TILES_Y, ZONE_RECT, ZONES, ZONE_ORDER, clamp, hash2 } from './content';
import type { PropDef, ZoneId } from './types';
import { drawProp, drawSprout, ellipse, R, shadowEllipse } from './sprites';
import type { Ctx } from './sprites';

export type Terrain = 0 | 1 | 2 | 3 | 4 | 5; // grass, path, water, paddy, forest, gate

export interface LampLight {
  x: number;
  y: number;
  color: string;
  radius: number;
}

export interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZONE_FOR_RECT = (tx: number, ty: number): ZoneId | null => {
  for (const id of ZONE_ORDER) {
    const r = ZONE_RECT[id];
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return id;
  }
  return null;
};

export class World {
  tiles: Terrain[] = new Array(WORLD_TILES_X * WORLD_TILES_Y).fill(4);
  zone: (ZoneId | null)[] = new Array(WORLD_TILES_X * WORLD_TILES_Y).fill(null);
  base: HTMLCanvasElement;
  decorLayer: HTMLCanvasElement;
  props: PropDef[] = [];
  placedProps: { def: PropDef; zone: ZoneId }[] = [];
  lamps: LampLight[] = [];
  solidRects: SolidRect[] = [];
  gateList = GATES;
  gateTileSet = new Set<string>();

  constructor(decor: { kind: PropDef['kind']; x: number; y: number; zone: ZoneId }[] = []) {
    this.base = document.createElement('canvas');
    this.base.width = WORLD_TILES_X * TILE;
    this.base.height = WORLD_TILES_Y * TILE;
    this.decorLayer = document.createElement('canvas');
    this.decorLayer.width = this.base.width;
    this.decorLayer.height = this.base.height;
    this.buildTiles();
    this.buildProps(decor);
    this.renderBase();
    this.renderDecor();
  }

  idx(tx: number, ty: number) {
    return ty * WORLD_TILES_X + tx;
  }

  inBounds(tx: number, ty: number) {
    return tx >= 0 && ty >= 0 && tx < WORLD_TILES_X && ty < WORLD_TILES_Y;
  }

  buildTiles() {
    // Assign zones
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        this.zone[this.idx(tx, ty)] = ZONE_FOR_RECT(tx, ty);
      }
    }
    // Forest default, then clear zone interiors
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        this.zone[this.idx(tx, ty)] = ZONE_FOR_RECT(tx, ty);
        this.tiles[this.idx(tx, ty)] = this.zone[this.idx(tx, ty)] ? 0 : 4;
      }
    }

    // gates/corridors
    const corridor = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const tiles: { x: number; y: number }[] = [];
      let x = from.x;
      let y = from.y;
      const dx = Math.abs(to.x - x);
      const dy = Math.abs(to.y - y);
      const sx = to.x > x ? 1 : -1;
      const sy = to.y > y ? 1 : -1;
      let err = dx - dy;
      for (let i = 0; i < 200; i++) {
        tiles.push({ x, y });
        if (x === to.x && y === to.y) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
      return tiles;
    };
    const gateInfo: { x: number; y: number; w: number; h: number; anchor: { x: number; y: number } }[] = [
      { x: 24, y: 19, w: 2, h: 4, anchor: { x: 25, y: 22 } },
      { x: 45, y: 19, w: 2, h: 4, anchor: { x: 46, y: 22 } },
      { x: 22, y: 31, w: 2, h: 2, anchor: { x: 24, y: 31 } },
      { x: 47, y: 33, w: 2, h: 2, anchor: { x: 49, y: 33 } },
      // narrow side gate from the orchard out to the Lantern Arcade
      { x: 70, y: 10, w: 1, h: 3, anchor: { x: 71, y: 11 } },
    ];
    gateInfo.forEach((g) => {
      for (let y = g.y; y < g.y + g.h; y++) {
        for (let x = g.x; x < g.x + g.w; x++) {
          if (!this.inBounds(x, y)) continue;
          this.tiles[this.idx(x, y)] = 5;
          this.zone[this.idx(x, y)] = this.zone[this.idx(x, y)] ?? null;
          this.gateTileSet.add(`${x},${y}`);
        }
      }
    });
    // connect gate corridors with a short cobble spur
    const spurs: { x: number; y: number }[][] = [
      [{ x: 24, y: 19 }, { x: 24, y: 18 }, { x: 24, y: 17 }, { x: 24, y: 16 }],
      [{ x: 45, y: 19 }, { x: 45, y: 18 }, { x: 45, y: 17 }, { x: 45, y: 16 }],
      [{ x: 23, y: 31 }, { x: 23, y: 30 }],
      [{ x: 48, y: 33 }, { x: 48, y: 32 }],
      // connect the arcade gate to the orchard path
      [{ x: 69, y: 11 }, { x: 69, y: 10 }, { x: 70, y: 9 }],
    ];
    spurs.forEach((spur) =>
      spur.forEach((p) => {
        if (this.inBounds(p.x, p.y) && this.zone[this.idx(p.x, p.y)]) {
          this.tiles[this.idx(p.x, p.y)] = 5;
        }
      }),
    );

    // paths inside zones
    ZONE_ORDER.forEach((id) => {
      const rect = ZONE_RECT[id];
      const zone = ZONES[id];
      zone.paths.forEach((path) => {
        const worldPts = path.pts.map((p) => ({ x: rect.x + p.x, y: rect.y + p.y }));
        for (let s = 0; s < worldPts.length - 1; s++) {
          const seg = corridor(worldPts[s], worldPts[s + 1]);
          seg.forEach((p) => {
            for (let dy = -path.width; dy <= path.width; dy++) {
              for (let dx = -path.width; dx <= path.width; dx++) {
                const tx = Math.round(p.x + dx);
                const ty = Math.round(p.y + dy);
                if (!this.inBounds(tx, ty)) continue;
                if (dx * dx + dy * dy > path.width * path.width + 0.4) continue;
                if (this.zone[this.idx(tx, ty)] !== id) continue;
                if (this.tiles[this.idx(tx, ty)] === 2) continue;
                this.tiles[this.idx(tx, ty)] = 1;
              }
            }
          });
        }
      });
    });

    // water
    ZONE_ORDER.forEach((id) => {
      const rect = ZONE_RECT[id];
      const zone = ZONES[id];
      zone.water?.forEach((w) => {
        const cx = rect.x + w.x;
        const cy = rect.y + w.y;
        for (let ty = Math.floor(cy - w.ry - 2); ty <= Math.ceil(cy + w.ry + 2); ty++) {
          for (let tx = Math.floor(cx - w.rx - 2); tx <= Math.ceil(cx + w.rx + 2); tx++) {
            if (!this.inBounds(tx, ty)) continue;
            const nx = (tx + 0.5 - cx) / w.rx;
            const ny = (ty + 0.5 - cy) / w.ry;
            if (nx * nx + ny * ny <= 1) {
              this.tiles[this.idx(tx, ty)] = 2;
            }
          }
        }
      });
    });

    // paddies
    ZONE_ORDER.forEach((id) => {
      const rect = ZONE_RECT[id];
      ZONES[id].paddies?.forEach((p) => {
        for (let y = 0; y < p.h; y++) {
          for (let x = 0; x < p.w; x++) {
            const tx = Math.floor(rect.x + p.x + x);
            const ty = Math.floor(rect.y + p.y + y);
            if (!this.inBounds(tx, ty)) continue;
            if (this.tiles[this.idx(tx, ty)] === 2) continue;
            this.tiles[this.idx(tx, ty)] = 3;
          }
        }
      });
    });

    // soft edge: remove forest immediately outside zone so paths/gates look connected
    for (let pass = 0; pass < 2; pass++) {
      for (let ty = 1; ty < WORLD_TILES_Y - 1; ty++) {
        for (let tx = 1; tx < WORLD_TILES_X - 1; tx++) {
          if (this.tiles[this.idx(tx, ty)] !== 4) continue;
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++)
            for (let dx = -1; dx <= 1 && !near; dx++) {
              const t = this.tiles[this.idx(tx + dx, ty + dy)];
              if (t === 1 || t === 5 || t === 3) near = true;
            }
          if (near && pass === 0) this.tiles[this.idx(tx, ty)] = 4;
        }
      }
    }
  }

  buildProps(decor: { kind: PropDef['kind']; x: number; y: number; zone: ZoneId }[]) {
    this.placedProps = [];
    this.lamps = [];
    this.solidRects = [];
    ZONE_ORDER.forEach((id) => {
      const rect = ZONE_RECT[id];
      ZONES[id].props.forEach((p, i) => {
        const def = { ...p, x: rect.x + p.x, y: rect.y + p.y };
        this.placedProps.push({ def, zone: id });
      });
    });
    decor.forEach((d) => {
      this.placedProps.push({ def: { kind: d.kind, x: d.x, y: d.y }, zone: d.zone });
    });
    this.placedProps.sort((a, b) => a.def.y - b.def.y);

    this.placedProps.forEach(({ def, zone }) => {
      const kind = def.kind;
      if (kind === 'lamp' || kind === 'lanternpost' || kind === 'crystal' || kind === 'pergola' || kind === 'windchime') {
        this.lamps.push({
          x: def.x * TILE,
          y: def.y * TILE,
          color: kind === 'crystal' ? '160,235,225' : kind === 'windchime' ? '255,235,190' : '255,214,140',
          radius: kind === 'pergola' ? 90 : kind === 'crystal' ? 55 : 70,
        });
      }
      if (kind === 'windchime') {
        this.solidRects.push({ x: def.x * TILE - 4, y: def.y * TILE - 26, w: 8, h: 4 });
      }
      // collision footprint for large props
      const footprint: Partial<Record<PropDef['kind'], [number, number, number, number]>> = {
        tree: [-4, -5, 8, 5],
        pine: [-4, -5, 8, 5],
        blossom: [-4, -5, 8, 5],
        cottage: [-26, -12, 52, 12],
        well: [-13, -10, 26, 10],
        arch: [-15, -3, 30, 3],
        swing: [-15, -3, 30, 3],
        pergola: [-22, -4, 44, 4],
        scarecrow: [-2, -2, 4, 2],
        bush: [-8, -3, 16, 3],
        berrybush: [-9, -3, 18, 3],
        mushroomGiant: [-4, -4, 8, 4],
        bench: [-14, -3, 28, 3],
        birdbath: [-5, -3, 10, 3],
        crystal: [-3, -3, 6, 3],
        stone: [-6, -2, 12, 2],
        stump: [-6, -3, 12, 3],
        stumpseat: [-6, -3, 12, 3],
        sunflower: [-2, -2, 4, 2],
        fence: [-8, -2, 16, 2],
        reeds: [-6, -2, 12, 2],
      };
      const fp = footprint[kind];
      if (fp) {
        this.solidRects.push({ x: def.x * TILE + fp[0], y: def.y * TILE + fp[1], w: fp[2], h: fp[3] });
      }
    });
  }

  isGateTile(tx: number, ty: number) {
    return this.gateTileSet.has(`${tx},${ty}`);
  }

  terrainAt(x: number, y: number): Terrain {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!this.inBounds(tx, ty)) return 4;
    return this.tiles[this.idx(tx, ty)];
  }

  zoneAt(x: number, y: number): ZoneId | null {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!this.inBounds(tx, ty)) return null;
    return this.zone[this.idx(tx, ty)];
  }

  walkable(x: number, y: number, r = 5): boolean {
    const points = [
      [x, y],
      [x - r, y],
      [x + r, y],
      [x, y - r],
      [x, y + r],
      [x - r * 0.7, y - r * 0.7],
      [x + r * 0.7, y - r * 0.7],
      [x - r * 0.7, y + r * 0.7],
      [x + r * 0.7, y + r * 0.7],
    ];
    for (const [px, py] of points) {
      const t = this.terrainAt(px, py);
      if (t === 2 || t === 4) return false;
      if (this.zoneAt(px, py) === null && t !== 5 && t !== 1) return false;
    }
    for (const s of this.solidRects) {
      if (x + r > s.x && x - r < s.x + s.w && y + r > s.y - 1 && y - r < s.y + s.h) return false;
    }
    return true;
  }

  /** Pixel coords of zone spawn, checking walkability */
  /** Zone spawn points are stored in zone-local tiles; convert to world pixels. */
  spawnPoint(zone: ZoneId) {
    const z = ZONES[zone];
    const rect = ZONE_RECT[zone];
    return { x: (rect.x + z.spawn.x) * TILE, y: (rect.y + z.spawn.y) * TILE };
  }

  randomWalkable(zone: ZoneId, rng: () => number): { x: number; y: number } {
    const rect = ZONE_RECT[zone];
    for (let i = 0; i < 120; i++) {
      const tx = rect.x + 1.2 + rng() * (rect.w - 2.4);
      const ty = rect.y + 1.6 + rng() * (rect.h - 3);
      const x = tx * TILE;
      const y = ty * TILE;
      if (this.walkable(x, y, 7)) return { x, y };
    }
    return this.spawnPoint(zone);
  }

  gateNear(x: number, y: number, dist = 20): { zone: ZoneId; to: ZoneId; gate: typeof GATES[number] } | null {
    for (const g of GATES) {
      const gx = g.anchor.x * TILE;
      const gy = g.anchor.y * TILE;
      const dx = gx - x;
      const dy = gy - y;
      if (dx * dx + dy * dy < dist * dist) {
        return { zone: g.from, to: g.to, gate: g };
      }
    }
    return null;
  }

  /* ---------------- static render ---------------- */

  renderBase() {
    const ctx = this.base.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.base.width, this.base.height);
    this.drawGrass(ctx);
    this.drawPaths(ctx);
    this.drawPaddies(ctx);
    this.drawWaterStatic(ctx);
    this.drawForest(ctx);
    this.drawGateDecor(ctx);
  }

  drawGrass(ctx: Ctx) {
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        const t = this.tiles[this.idx(tx, ty)];
        const z = this.zone[this.idx(tx, ty)];
        if (!z && t === 4) continue;
        const zone = z ? ZONES[z] : ZONES.meadow;
        const col = zone.theme.grass;
        const h = hash2(tx, ty);
        const px = tx * TILE;
        const py = ty * TILE;
        const base = h > 0.72 ? col[2] : h > 0.35 ? col[0] : col[1];
        R(ctx, px, py, TILE, TILE, base);
        // scattered blades
        const n = 2 + Math.floor(h * 3);
        for (let i = 0; i < n; i++) {
          const hx = hash2(tx * 3 + i, ty * 5 + 1);
          const hy = hash2(tx * 7 + 2, ty * 3 + i);
          const bx = px + Math.floor(hx * (TILE - 2));
          const by = py + Math.floor(hy * (TILE - 2));
          R(ctx, bx, by, 1, 2, i % 3 === 0 ? col[3] : col[2]);
          if (i === 0) R(ctx, bx + 1, by + 1, 1, 1, col[3]);
        }
        if (t === 3) continue;
      }
    }
  }

  drawPaths(ctx: Ctx) {
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        const t = this.tiles[this.idx(tx, ty)];
        if (t !== 1 && t !== 3 && t !== 5) continue;
        const z = this.zone[this.idx(tx, ty)];
        const zone = z ? ZONES[z] : ZONES.meadow;
        const pal = zone.theme.path;
        const px = tx * TILE;
        const py = ty * TILE;
        if (t === 3) continue;
        // base
        const h = hash2(tx * 2, ty * 3);
        if (t === 5) {
          R(ctx, px, py, TILE, TILE, '#8f8878');
          for (let i = 0; i < 4; i++) {
            const bx = px + (i % 2) * 8;
            const by = py + Math.floor(i / 2) * 8;
            R(ctx, bx + 1, by + 1, 6, 6, i % 2 ? '#a49d8c' : '#9b9483');
            R(ctx, bx + 1, by + 1, 6, 1, '#b3ac99');
            R(ctx, bx + 1, by + 6, 6, 1, '#7c7668');
          }
          continue;
        }
        R(ctx, px, py, TILE, TILE, pal[0]);
        for (let i = 0; i < 9; i++) {
          const hx = hash2(tx * 5 + i, ty * 11 + 3);
          const hy = hash2(tx * 13 + 1, ty * 7 + i);
          R(ctx, px + Math.floor(hx * 15), py + Math.floor(hy * 15), 1, 1, i % 2 ? pal[1] : pal[2]);
        }
        // grass creeping edges
        const n = this.tiles[this.idx(tx, ty - 1)];
        const s = this.tiles[this.idx(tx, ty + 1)];
        const w = this.tiles[this.idx(tx - 1, ty)];
        const e = this.tiles[this.idx(tx + 1, ty)];
        const grassCol = zone.theme.grass[0];
        if (n !== 1 && n !== 5) {
          for (let i = 0; i < 5; i++) R(ctx, px + i * 3 + (h > 0.5 ? 1 : 0), py, 2, 2, grassCol);
        }
        if (s !== 1 && s !== 5) {
          for (let i = 0; i < 5; i++) R(ctx, px + i * 3, py + TILE - 2, 2, 2, grassCol);
        }
        if (w !== 1 && w !== 5) {
          for (let i = 0; i < 5; i++) R(ctx, px, py + i * 3, 2, 2, grassCol);
        }
        if (e !== 1 && e !== 5) {
          for (let i = 0; i < 5; i++) R(ctx, px + TILE - 2, py + i * 3, 2, 2, grassCol);
        }
      }
    }
  }

  drawPaddies(ctx: Ctx) {
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        if (this.tiles[this.idx(tx, ty)] !== 3) continue;
        const z = this.zone[this.idx(tx, ty)];
        const px = tx * TILE;
        const py = ty * TILE;
        R(ctx, px, py, TILE, TILE, '#6f5436');
        for (let r = 0; r < 4; r++) {
          R(ctx, px, py + r * 4 + 1, TILE, 2, r % 2 ? '#7d6040' : '#634a2f');
          R(ctx, px, py + r * 4 + 1, TILE, 1, '#8a6b46');
        }
        const h = hash2(tx, ty);
        const seed = ['#79b45a', '#8cc96a', '#6ba84e', '#a3d07a'][Math.floor(h * 4)];
        R(ctx, px + 3, py + 2, 1, 3, seed);
        R(ctx, px + 2, py + 3, 1, 1, seed);
        R(ctx, px + 4, py + 2, 1, 1, seed);
        R(ctx, px + 10, py + 7, 1, 3, seed);
        R(ctx, px + 9, py + 8, 1, 1, seed);
        R(ctx, px + 11, py + 7, 1, 1, seed);
      }
    }
  }

  drawWaterStatic(ctx: Ctx) {
    const zonesWithWater = ZONE_ORDER.filter((z) => ZONES[z].water?.length);
    zonesWithWater.forEach((id) => {
      const rect = ZONE_RECT[id];
      const water = ZONES[id].water![0];
      const cx = (rect.x + water.x) * TILE;
      const cy = (rect.y + water.y) * TILE;
      const rx = water.rx * TILE;
      const ry = water.ry * TILE;
      // bank
      ellipse(ctx, cx, cy + 2, rx + 8, ry + 7, '#6a5f47');
      ellipse(ctx, cx, cy, rx + 5, ry + 5, '#7d7154');
      ellipse(ctx, cx, cy - 1, rx, ry, ZONES[id].theme.water[1]);
      ellipse(ctx, cx, cy - 1, rx - 5, ry - 4, ZONES[id].theme.water[0]);
      // sandy edge
      for (let i = 0; i < 60; i++) {
        const a = hash2(i, 7) * Math.PI * 2;
        const rr = 0.86 + hash2(i + 3, 9) * 0.13;
        const px = cx + Math.cos(a) * rx * rr;
        const py = cy + Math.sin(a) * ry * rr;
        ctx.fillStyle = i % 2 ? '#b3a07a' : '#9c8b68';
        ctx.fillRect(px, py, 2, 1);
      }
      // reeds around edge
      for (let i = 0; i < 24; i++) {
        const a = hash2(i + 40, 3) * Math.PI * 2;
        if (Math.sin(a) > 0.4) continue;
        const px = cx + Math.cos(a) * (rx + 3);
        const py = cy + Math.sin(a) * (ry + 3);
        R(ctx, px, py - 6, 1, 6, '#5f8a4a');
        R(ctx, px + 1, py - 4, 1, 3, '#76a35a');
      }
    });
  }

  drawForest(ctx: Ctx) {
    // soft dark backdrop under any unowned tile
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        if (this.tiles[this.idx(tx, ty)] !== 4) continue;
        const px = tx * TILE;
        const py = ty * TILE;
        R(ctx, px, py, TILE, TILE, '#2f4a33');
        for (let i = 0; i < 4; i++) {
          const hx = hash2(tx * 3 + i, ty * 9 + 2);
          const hy = hash2(tx * 11 + 4, ty * 5 + i);
          R(ctx, px + Math.floor(hx * 15), py + Math.floor(hy * 15), 2, 2, i % 2 ? '#365439' : '#294130');
        }
      }
    }
    // draw forest canopy bottom-up for depth
    const list: { x: number; y: number; v: number }[] = [];
    for (let ty = 0; ty < WORLD_TILES_Y; ty++) {
      for (let tx = 0; tx < WORLD_TILES_X; tx++) {
        if (this.tiles[this.idx(tx, ty)] !== 4) continue;
        const h = hash2(tx * 17, ty * 13);
        if (h > 0.62) list.push({ x: tx, y: ty, v: h });
      }
    }
    list.sort((a, b) => a.y - b.y);
    list.forEach(({ x, y, v }) => {
      const px = x * TILE + 8;
      const py = (y + 0.35) * TILE;
      const nearZone = this.zoneNear(x, y);
      const cols = nearZone ? ZONES[nearZone].theme.tree : ['#24402c', '#2c4c33', '#1d3527', '#3b6040', '#16281d'];
      shadowEllipse(ctx, px, py, 10, 3, 0.25);
      R(ctx, px - 1, py - 12, 3, 12, '#4a3a2a');
      const cy = py - 20 - v * 5;
      ellipse(ctx, px, cy, 11 + v * 3, 9 + v * 2, cols[0]);
      ellipse(ctx, px - 3, cy - 3, 8, 6, cols[1]);
      ellipse(ctx, px + 3, cy + 1, 7, 5, cols[2]);
      ellipse(ctx, px - 1, cy - 5, 5, 4, cols[3]);
      R(ctx, px - 5, cy - 7, 2, 1, cols[3]);
      R(ctx, px + 4, cy - 2, 1, 1, cols[4]);
    });
  }

  zoneNear(tx: number, ty: number): ZoneId | null {
    let best: ZoneId | null = null;
    let bestD = 999;
    for (const id of ZONE_ORDER) {
      const r = ZONE_RECT[id];
      const dx = Math.max(r.x - tx, 0, tx - (r.x + r.w - 1));
      const dy = Math.max(r.y - ty, 0, ty - (r.y + r.h - 1));
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return bestD <= 36 ? best : null;
  }

  drawGateDecor(ctx: Ctx) {
    // small stone arch markers at each corridor
    GATES.forEach((g) => {
      const px = g.anchor.x * TILE;
      const py = (g.anchor.y + 0.5) * TILE;
      R(ctx, px - 14, py - 2, 8, 2, '#8f8878');
      R(ctx, px + 6, py - 2, 8, 2, '#8f8878');
      R(ctx, px - 15, py - 4, 10, 2, '#a49d8c');
      R(ctx, px + 5, py - 4, 10, 2, '#a49d8c');
      for (let i = 0; i < 6; i++) R(ctx, px - 12 + i * 4, py - 5 - (i % 2), 3, 2, i % 2 ? '#9b9483' : '#b0a996');
    });
  }

  renderDecor() {
    const ctx = this.decorLayer.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.decorLayer.width, this.decorLayer.height);
    this.placedProps.forEach(({ def, zone }) => {
      drawProp(ctx, def.kind, def.x * TILE, def.y * TILE, zone, def.v ?? 0, 0, 0);
    });
  }

  drawWater(ctx: Ctx, time: number, night: number) {
    const zonesWithWater = ZONE_ORDER.filter((z) => ZONES[z].water?.length);
    zonesWithWater.forEach((id) => {
      const rect = ZONE_RECT[id];
      const water = ZONES[id].water![0];
      const cx = (rect.x + water.x) * TILE;
      const cy = (rect.y + water.y) * TILE;
      const rx = water.rx * TILE - 5;
      const ry = water.ry * TILE - 4;
      const cols = ZONES[id].theme.water;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 1, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 14; i++) {
        const ph = time * (0.25 + (i % 5) * 0.06) + i * 1.7;
        const yy = cy - ry + ((ph * 6) % (ry * 2));
        const ww = 14 + Math.sin(ph) * 6;
        const xx = cx - rx + ((i * 37 + Math.floor(ph * 3) * 5) % (rx * 2));
        ctx.fillStyle = i % 3 === 0 ? cols[2] : cols[3];
        ctx.globalAlpha = 0.35 + Math.sin(ph * 2) * 0.12;
        ctx.fillRect(Math.round(xx - ww / 2), Math.round(yy), Math.round(ww), 1);
      }
      // glints
      for (let i = 0; i < 8; i++) {
        const ang = i * 0.8 + time * 0.1;
        const gx = cx + Math.cos(ang) * rx * 0.7;
        const gy = cy + Math.sin(ang) * ry * 0.6;
        ctx.globalAlpha = 0.25 + Math.sin(time * 2 + i) * 0.18;
        ctx.fillStyle = '#e9fbff';
        ctx.fillRect(gx, gy, 2, 1);
      }
      ctx.restore();
      // dragonfly
      const dx = cx + Math.sin(time * 0.5) * (rx + 12);
      const dy = cy - ry - 8 + Math.sin(time * 1.3) * 8;
      ctx.fillStyle = 'rgba(150,220,240,0.6)';
      ctx.fillRect(dx - 2, dy, 2, 1);
      ctx.fillRect(dx + 1, dy, 2, 1);
      R(ctx, dx, dy, 1, 3, '#39525a');
      R(ctx, dx, dy + 3, 1, 1, '#6fa0a8');
    });
  }
}

export const tileCenter = (tx: number, ty: number) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
export const pixelToTile = (x: number, y: number) => ({ tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) });
export { clamp, TILE };