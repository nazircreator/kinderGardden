import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { window.__engine.state.unlocked.arcade = true; });
await new Promise(r=>setTimeout(r,300));

const state = () => page.evaluate(() => ({
  hub: !!document.querySelector('.arcade-hub-grid'),
  game: !!(document.querySelector('.mg-field')||document.querySelector('.mg-grid')||document.querySelector('.mg-night')||document.querySelector('.mg-flowers')),
  result: !!document.querySelector('.arcade-result'),
  engineGame: window.__engine.miniGame,
}));

const out = {};
out.initial = await state();
await page.keyboard.press('l'); await new Promise(r=>setTimeout(r,800));
out.afterL = await state();
await page.keyboard.press('Escape'); await new Promise(r=>setTimeout(r,600));
out.afterEscHub = await state();

// open a game from the hub, then Escape closes it
await page.keyboard.press('l'); await new Promise(r=>setTimeout(r,700));
await page.evaluate(() => { const c=[...document.querySelectorAll('.arcade-card')].find(x=>/berry/i.test(x.textContent||'')); c&&c.click(); });
await new Promise(r=>setTimeout(r,900));
out.inGame = await state();
await page.keyboard.press('Escape'); await new Promise(r=>setTimeout(r,700));
out.afterEscGame = await state();

// movement restored after closing
const p0 = await page.evaluate(()=>({x:window.__engine.player.x,y:window.__engine.player.y}));
await page.keyboard.down('d'); await new Promise(r=>setTimeout(r,600)); await page.keyboard.up('d');
const p1 = await page.evaluate(()=>({x:window.__engine.player.x,y:window.__engine.player.y}));
out.movementRestored = Math.round(Math.hypot(p1.x-p0.x,p1.y-p0.y));
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
