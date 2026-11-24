import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.URL || 'http://127.0.0.1:5178/';
const OUT = 'shots';
const EXEC = process.env.CHROME || '/usr/bin/google-chrome';

const browser = await puppeteer.launch({
  executablePath: EXEC,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url() + ' ' + r.failure()?.errorText));

const steps = [];
const shot = async (name, ms = 600) => {
  await new Promise((r) => setTimeout(r, ms));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  steps.push(name);
};

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await shot('01-title', 1400);

// start a new game
const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find((x) => /open the garden gate/i.test(x.textContent || ''));
  if (b) { b.click(); return true; }
  return false;
});
steps.push('clicked-start:' + clicked);
await shot('02-after-start', 1200);

// walk around a bit
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await new Promise((r) => setTimeout(r, ms));
  await page.keyboard.up(key);
};
await hold('d', 900);
await hold('s', 700);
await shot('03-walked', 500);

// open care on nearest sprout via E
await page.keyboard.press('e');
await shot('04-care', 900);
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));

// talk
await page.keyboard.press('t');
await shot('05-talk', 800);
const chose = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.dlg-option')][0];
  if (b) { b.click(); return true; } return false;
});
steps.push('chose-option:' + chose);
await shot('06-talk-reply', 900);
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));

// open modals
const clickText = async (sel, text) => page.evaluate((s, t) => {
  const el = [...document.querySelectorAll(s)].find((x) => new RegExp(t, 'i').test(x.textContent || ''));
  if (el) { el.click(); return true; } return false;
}, sel, text);

await page.keyboard.press('j');
await shot('07-journal', 800);
await page.keyboard.press('Escape');
await page.keyboard.press('m');
await shot('08-map', 800);
await page.keyboard.press('Escape');
await page.keyboard.press('k');
await shot('09-shop', 800);

// buy & place
const bought = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.shop-card')];
  const c = cards[0];
  const b = c && [...c.querySelectorAll('button')].find((x) => /buy/i.test(x.textContent));
  if (b) { b.click(); return true; } return false;
});
steps.push('bought:' + bought);
await new Promise((r) => setTimeout(r, 300));
await page.keyboard.press('Escape');
await shot('10-after-buy', 700);

// place mode
await page.keyboard.press('k');
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.shop-card')];
  const c = cards[0];
  const b = c && [...c.querySelectorAll('button')].find((x) => /place/i.test(x.textContent));
  if (b) b.click();
});
await shot('11-place-mode', 700);
await page.mouse.move(720, 470);
await new Promise((r) => setTimeout(r, 300));
await page.mouse.click(720, 470);
await shot('12-placed', 800);
await page.keyboard.press('Escape');

// breath
await page.keyboard.press('b');
await shot('13-breath', 1500);
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));

// feed + water nearest
await page.keyboard.press('f');
await new Promise((r) => setTimeout(r, 500));
await page.keyboard.press('r');
await shot('14-fed', 700);
await page.keyboard.press('Escape');

// run for a while to let time pass & day change
await page.keyboard.down('Shift');
await hold('d', 1200);
await page.keyboard.up('Shift');
await shot('15-day', 600);

// mobile view
await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await shot('16-mobile', 1200);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.bottom-nav button')].find((x) => /sprouts/i.test(x.textContent));
  b && b.click();
});
await shot('17-mobile-sprouts', 900);

const state = await page.evaluate(() => {
  const canv = document.querySelector('canvas.game-canvas');
  return {
    canvas: canv ? { w: canv.width, h: canv.height, css: canv.style.width + 'x' + canv.style.height } : null,
    save: !!localStorage.getItem('little-sprouts-save-v1'),
    saveSize: (localStorage.getItem('little-sprouts-save-v1') || '').length,
  };
});

console.log(JSON.stringify({ steps, state, errors: errors.slice(0, 40) }, null, 2));
await browser.close();
