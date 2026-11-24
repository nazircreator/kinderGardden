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

const out = {};
// P near a sprout => plays with them, does NOT open arcade
out.pNearSprout = await page.evaluate(async () => {
  const e=window.__engine; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  e.state.unlocked.arcade = true;
  const a=e.actors.pip; e.player.x=a.x+14; e.player.y=a.y+6; e.emit(true); await sleep(500);
  const before = { comfort: e.state.sprouts.pip.needs.comfort, energy: e.state.sprouts.pip.needs.energy };
  return { before };
});
await page.keyboard.press('p');
await new Promise(r=>setTimeout(r,600));
out.pResult = await page.evaluate(() => {
  const e=window.__engine;
  return { comfort: Math.round(e.state.sprouts.pip.needs.comfort), energy: Math.round(e.state.sprouts.pip.needs.energy), arcadeOpen: !!document.querySelector('.arcade-hub-grid'), careOpen: !!document.querySelector('[aria-label^="Care for"]') };
});
await page.keyboard.press('Escape');
await new Promise(r=>setTimeout(r,400));

// L opens the arcade
await page.keyboard.press('l');
await new Promise(r=>setTimeout(r,800));
out.lKey = await page.evaluate(() => ({ hubOpen: !!document.querySelector('.arcade-hub-grid'), cards: document.querySelectorAll('.arcade-card').length }));
await page.keyboard.press('Escape');
await new Promise(r=>setTimeout(r,300));

// Escape closes the arcade
out.escClosed = await page.evaluate(() => !document.querySelector('.arcade-hub-grid'));

// movement is blocked while a game is open
await page.evaluate(() => window.__engine.openMiniGame('berrycatch'));
await new Promise(r=>setTimeout(r,900));
const posBefore = await page.evaluate(()=>({x:window.__engine.player.x,y:window.__engine.player.y}));
await page.keyboard.down('d'); await new Promise(r=>setTimeout(r,600)); await page.keyboard.up('d');
const posAfter = await page.evaluate(()=>({x:window.__engine.player.x,y:window.__engine.player.y}));
out.movementBlocked = { moved: Math.hypot(posAfter.x-posBefore.x, posAfter.y-posBefore.y) };

console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
