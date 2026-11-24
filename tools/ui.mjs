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

const S = () => page.evaluate(() => {
  const e = window.__engine;
  return { selected: e.selectedId, dialogue: !!e.dialogue, opts: e.dialogue?.options?.length ?? 0, careOpen: !!document.querySelector('[aria-label^="Care for"]'), dlgOpen: !!document.querySelector('.dialogue'), dlgText: document.querySelector('.dlg-text')?.textContent?.slice(0,60) ?? null, prompt: e.currentPrompt()?.label ?? null, near: e.nearestSprout(46)?.id ?? null };
});

const report = {};
// walk toward the nearest sprout then interact
await page.evaluate(() => {
  const e = window.__engine;
  const sp = Object.values(e.state.sprouts)[0];
  const a = e.actors[sp.id];
  e.player.x = a.x + 18; e.player.y = a.y + 6;
});
await new Promise(r=>setTimeout(r,400));
report.beforeInteract = await S();
await page.keyboard.press('e');
await new Promise(r=>setTimeout(r,600));
report.afterE = await S();
await page.screenshot({ path: 'shots/ui-care.png' });

// feed via keyboard
await page.keyboard.press('f');
await new Promise(r=>setTimeout(r,500));
report.afterFeed = await page.evaluate(() => ({ berries: window.__engine.state.berries, feeds: window.__engine.state.stats.feeds }));

// talk
await page.keyboard.press('t');
await new Promise(r=>setTimeout(r,600));
report.afterT = await S();
await page.screenshot({ path: 'shots/ui-talk.png' });

// choose an option
const chose = await page.evaluate(() => { const b=document.querySelector('.dlg-option'); if(b){b.click(); return b.textContent.trim().slice(0,40);} return null; });
report.choseOption = chose;
await new Promise(r=>setTimeout(r,600));
report.afterChoice = await S();
await page.screenshot({ path: 'shots/ui-talk-reply.png' });
await page.keyboard.press('Escape');
await new Promise(r=>setTimeout(r,400));

// crying -> soothe button present
report.crying = await page.evaluate(() => {
  const e = window.__engine;
  const id = Object.keys(e.state.sprouts)[0];
  e.state.sprouts[id].needs.comfort = 3; e.state.sprouts[id].calm = 3;
  e.actors[id].crying = true;
  e.openCare(id);
  return true;
});
await new Promise(r=>setTimeout(r,600));
report.sootheVisible = await page.evaluate(() => {
  const btns=[...document.querySelectorAll('.action-btn')].map(b=>b.textContent.replace(/[A-Z]$/,'').trim());
  const soothe=[...document.querySelectorAll('.action-btn')].find(b=>/soothe/i.test(b.textContent));
  return { buttons: btns, hasSoothe: !!soothe, sootheClass: soothe?.className ?? null, mood: document.querySelector('.np-sub')?.textContent };
});
await page.screenshot({ path: 'shots/ui-crying.png' });
const soothed = await page.evaluate(() => { const b=[...document.querySelectorAll('.action-btn')].find(x=>/soothe/i.test(x.textContent)); if(b){b.click(); return true;} return false; });
report.soothClicked = soothed;
await new Promise(r=>setTimeout(r,600));
report.afterSoothe = await page.evaluate(() => ({ crying: window.__engine.actors[Object.keys(window.__engine.state.sprouts)[0]].crying, calm: Math.round(window.__engine.state.sprouts[Object.keys(window.__engine.state.sprouts)[0]].calm), soothed: window.__engine.state.stats.soothed }));
await page.keyboard.press('Escape');

// shop: buy & place through real UI clicks
await page.keyboard.press('k');
await new Promise(r=>setTimeout(r,700));
await page.evaluate(() => { window.__engine.state.seeds = 300; });
await new Promise(r=>setTimeout(r,300));
const buyPlace = await page.evaluate(() => {
  const card = document.querySelector('.shop-card');
  const btns = [...card.querySelectorAll('button')];
  const bp = btns.find(b=>/buy & place/i.test(b.textContent));
  if (bp) { bp.click(); return true; } return false;
});
report.buyPlaceClicked = buyPlace;
await new Promise(r=>setTimeout(r,700));
report.placeMode = await page.evaluate(() => ({ mode: window.__engine.mode, item: window.__engine.placementItem?.id ?? null, owned: window.__engine.state.owned }));
// move mouse to a valid spot near player and click
report.placed = await page.evaluate(() => {
  const e = window.__engine;
  const T=16;
  for (let dx=-4; dx<=4; dx++) for (let dy=-3; dy<=3; dy++) {
    const x = Math.round(e.player.x/T)*T + dx*T, y = Math.round(e.player.y/T)*T + dy*T;
    if (e.validatePlacement(x,y)) { e.placementPos={x,y}; e.placementValid=true; e.tryPlaceAt(x,y); return { x, y, decor: e.state.decor.length }; }
  }
  return null;
});
await page.keyboard.press('Escape');
await new Promise(r=>setTimeout(r,500));
report.afterPlace = await page.evaluate(() => ({ decor: window.__engine.state.decor.length, stats: window.__engine.state.stats.decorPlaced, harmony: window.__engine.snapshot().harmony }));

console.log(JSON.stringify({ report, errors }, null, 1));
await browser.close();
