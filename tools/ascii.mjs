import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,1200));

const renderAscii = async (kind, opts = {}) => page.evaluate(async ({ kind, opts }) => {
  const S = window.__sprites, C = window.__content;
  const c = document.createElement('canvas');
  c.width = opts.w || 48; c.height = opts.h || 48;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const pal = C.SPROUT_BY_ID[opts.sprout || 'pip'].palette;
  const kindOf = C.SPROUT_BY_ID[opts.sprout || 'pip'].kind;
  const cx = (opts.w||48)/2, cy = (opts.h||48)-10;
  if (kind === 'player') S.drawPlayer(ctx, cx, cy, opts.dir ?? 0, false, false, 1.0);
  else if (kind === 'sprout') S.drawSprout(ctx, cx, cy, { stage: opts.stage ?? 2, kind: kindOf, pal, mood: opts.mood || 'content', facing: 1, time: 0.4, moving: false, crying: opts.mood==='crying', asleep: opts.mood==='asleep' });
  else S.drawProp(ctx, opts.prop, cx, cy, opts.zone || 'meadow', opts.variant ?? 0, 1.2, 0);
  const img = ctx.getImageData(0,0,c.width,c.height).data;
  const lines = [];
  const cls = (r,g,b,a) => {
    if (a < 30) return '.';
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    const lum = (r*0.3+g*0.6+b*0.1);
    const sat = max - min;
    if (lum < 45) return '@';
    if (lum < 90) return '#';
    if (sat < 26) return lum > 190 ? 'W' : lum > 130 ? 'w' : 's';
    if (g >= r && g >= b) return lum > 150 ? 'G' : 'g';
    if (r > g && r > b) { if (g > b * 1.25) return lum > 170 ? 'Y' : 'y'; return lum > 150 ? 'P' : 'p'; }
    return lum > 170 ? 'C' : 'c';
  };
  const stepX = opts.stepX || 1, stepY = opts.stepY || 1;
  for (let y = 0; y < c.height; y += stepY) {
    let row = '';
    for (let x = 0; x < c.width; x += stepX) {
      const i = (y * c.width + x) * 4;
      row += cls(img[i], img[i+1], img[i+2], img[i+3]);
    }
    lines.push(row);
  }
  return lines.join('\n');
}, { kind, opts });

const show = async (label, kind, opts) => {
  const art = await renderAscii(kind, opts);
  console.log('\n=== ' + label + ' ===');
  console.log(art);
};

await show('KEEPER (facing down)', 'player', { w: 20, h: 32, dir: 0 });
await show('KEEPER (facing left)', 'player', { w: 20, h: 32, dir: 2 });
await show('PIP stage 2 content', 'sprout', { w: 24, h: 34, sprout: 'pip', stage: 2, mood: 'content' });
await show('PIP stage 3 joyful', 'sprout', { w: 24, h: 34, sprout: 'pip', stage: 3, mood: 'joyful' });
await show('TILLY crying', 'sprout', { w: 24, h: 34, sprout: 'tilly', stage: 2, mood: 'crying' });
await show('WISP stage 1 asleep', 'sprout', { w: 24, h: 34, sprout: 'wisp', stage: 1, mood: 'asleep' });
await show('COTTAGE', 'prop', { w: 80, h: 76, prop: 'cottage', zone: 'meadow' });
await show('TREE', 'prop', { w: 40, h: 52, prop: 'tree', zone: 'meadow' });
await show('BLOSSOM', 'prop', { w: 40, h: 60, prop: 'blossom', zone: 'orchard' });
await show('GIANT MUSHROOM', 'prop', { w: 40, h: 48, prop: 'mushroomGiant', zone: 'whisper', variant: 1 });
await show('WELL', 'prop', { w: 40, h: 46, prop: 'well', zone: 'meadow' });
await show('ARCH', 'prop', { w: 44, h: 52, prop: 'arch', zone: 'meadow' });
await browser.close();
