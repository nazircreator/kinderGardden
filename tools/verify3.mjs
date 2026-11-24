import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if(m.type()==='error' && !/404/.test(m.text())) errors.push('console: '+m.text()); });
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));

const out = {};

// --- 1. NERDY: passive + arrival ---
out.nerdy = await page.evaluate(async () => {
  const e = window.__engine;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  // force day 2 arrival while arcade is awake
  e.state.unlocked.arcade = true;
  e.endDay('test'); e.endDay('test');
  const has = !!e.state.sprouts.nerdy;
  if (!has) return { has: false };
  const a = e.actors.nerdy;
  const p0 = { x: a.x, y: a.y };
  // let the sim run: passive plants must not move
  await sleep(1600);
  const p1 = { x: e.actors.nerdy.x, y: e.actors.nerdy.y };
  const def = (await import('/src/game/content.ts')).SPROUT_BY_ID.nerdy;
  return {
    has, passive: !!def.passive, role: def.role, kind: def.kind,
    moved: Math.hypot(p1.x-p0.x, p1.y-p0.y),
    zone: e.world.zoneAt(p1.x, p1.y),
    crying: e.actors.nerdy.crying,
    stage: e.state.sprouts.nerdy.stage,
  };
});

// --- 2. Nerdy's care sheet shows the host banner ---
out.nerdySheet = await page.evaluate(async () => {
  const e = window.__engine;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  e.openCare('nerdy');
  await sleep(700);
  return {
    careOpen: !!document.querySelector('[aria-label^="Care for"]'),
    hostBanner: !!document.querySelector('.host-banner'),
    bannerText: document.querySelector('.hb-text')?.textContent?.slice(0,70) ?? null,
    title: document.querySelector('.modal-title')?.textContent,
  };
});
await page.screenshot({ path: 'shots/nerdy-sheet.png' });
await page.evaluate(()=>window.__engine.closeCare());
await new Promise(r=>setTimeout(r,400));

// --- 3. QUICK CARE bar near a sprout ---
out.quickCare = await page.evaluate(async () => {
  const e = window.__engine;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  e.teleportToZone('meadow');
  const sp = Object.values(e.state.sprouts).find(s=>s.id==='pip');
  const a = e.actors.pip;
  e.player.x = a.x + 16; e.player.y = a.y + 8;
  e.emit(true);
  await sleep(700);
  return {
    visible: !!document.querySelector('.quick-care'),
    buttons: [...document.querySelectorAll('.qc-btn .qc-label')].map(x=>x.textContent),
    name: document.querySelector('.qc-name')?.textContent,
  };
});
await page.screenshot({ path: 'shots/quick-care.png' });

// --- 4. Quick care feed actually works ---
out.quickFeed = await page.evaluate(async () => {
  const e = window.__engine;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  e.state.berries = 5;
  e.state.sprouts.pip.needs.hunger = 20;
  const before = e.state.sprouts.pip.needs.hunger;
  const b = [...document.querySelectorAll('.qc-btn')].find(x=>/feed/i.test(x.textContent));
  b && b.click();
  await sleep(500);
  return { before, after: Math.round(e.state.sprouts.pip.needs.hunger), berries: e.state.berries, feeds: e.state.stats.feeds };
});

// --- 5. ARCADE reward collection through real UI ---
out.reward = await page.evaluate(async () => {
  const e = window.__engine;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  e.state.unlocked.arcade = true;
  e.teleportToZone('arcade');
  e.openMiniGame('memory');
  await sleep(800);
  const seedsBefore = e.state.seeds, berriesBefore = e.state.berries;
  // finish via the engine (equivalent to a real round ending)
  const r = e.finishMiniGame('memory', 95, true);
  await sleep(400);
  return { seedsBefore, berriesBefore, seedsAfter: e.state.seeds, berriesAfter: e.state.berries, r,
           saved: JSON.parse(localStorage.getItem('little-sprouts-save-v1')).miniGames };
});
await page.evaluate(()=>window.__engine.closeMiniGame());
await new Promise(r=>setTimeout(r,300));

// --- 6. Station prompt + E interaction opens a game ---
out.station = await page.evaluate(async () => {
  const e = window.__engine;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const st = e.arcadeStations()[0];
  e.player.x = st.x + 14; e.player.y = st.y + 10;
  e.emit(true);
  await sleep(500);
  const prompt = e.currentPrompt();
  e.interact();
  await sleep(900);
  return { prompt, gameOpen: !!document.querySelector('.mg-field') || !!document.querySelector('.mg-grid') || !!document.querySelector('.mg-night') || !!document.querySelector('.mg-flowers') };
});
await page.screenshot({ path: 'shots/arcade-game.png' });

console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
