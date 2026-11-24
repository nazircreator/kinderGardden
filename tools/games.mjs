import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message+' | '+(e.stack||'').split('\n')[1]));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.state.seeds=999; e.teleportToZone('arcade'); });
await new Promise(r=>setTimeout(r,600));

// open the hub via the HUD arcade button
const hudBtn = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.hud-actions .icon-btn')].find(x=>/arcade/i.test(x.getAttribute('title')||''));
  if (b) { b.click(); return true; } return false;
});
await new Promise(r=>setTimeout(r,700));
const hub = await page.evaluate(() => ({
  hubOpen: !!document.querySelector('.arcade-hub-grid'),
  cards: [...document.querySelectorAll('.arcade-card .ac-name')].map(x=>x.textContent),
}));
console.log('HUD button opened hub:', hudBtn, JSON.stringify(hub));
await page.screenshot({ path:'shots/arcade-hub.png' });

const results = {};
// --- play each game and simulate a finish ---
const playGame = async (name, sim) => {
  await page.evaluate((n) => {
    const card = [...document.querySelectorAll('.arcade-card')].find(c => new RegExp(n,'i').test(c.textContent||''));
    card && card.click();
  }, name);
  await new Promise(r=>setTimeout(r,900));
  const info = await page.evaluate(() => ({
    berry: !!document.querySelector('.mg-field'),
    memory: !!document.querySelector('.mg-grid'),
    firefly: !!document.querySelector('.mg-night'),
    melody: !!document.querySelector('.mg-flowers'),
    cards: document.querySelectorAll('.mg-card').length,
    flies: document.querySelectorAll('.mg-fly').length,
    flowers: document.querySelectorAll('.mg-flower').length,
  }));
  if (sim) await sim(page);
  return info;
};

results.berrycatch = await playGame('Berry Catch', async (p) => {
  await new Promise(r=>setTimeout(r,1500));
  // steer to catch: just let it run briefly then force end
  await p.evaluate(() => { const el=document.querySelector('.mg-field'); if(el){ const r=el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true})); } });
  await new Promise(r=>setTimeout(r,1200));
});
await page.screenshot({ path:'shots/game-berry.png' });

// leave game
await page.evaluate(() => window.__engine.closeMiniGame());
await page.evaluate(() => { const b=[...document.querySelectorAll('.modal-close')].pop(); b&&b.click(); });
await new Promise(r=>setTimeout(r,500));

results.memory = await playGame('Memory', async (p) => {
  // click all cards twice to finish quickly (matches found by brute force)
  for (let i=0;i<12;i++) {
    await p.evaluate(() => {
      const cards=[...document.querySelectorAll('.mg-card')];
      const hidden=cards.filter(c=>!c.classList.contains('open')&&!c.classList.contains('matched'));
      if (hidden.length>=2){ hidden[0].click(); hidden[1].click(); }
    });
    await new Promise(r=>setTimeout(r,320));
    const done = await p.evaluate(()=>!!document.querySelector('.arcade-result'));
    if (done) break;
  }
});
await page.screenshot({ path:'shots/game-memory.png' });
const memResult = await page.evaluate(()=>({ finished: !!document.querySelector('.arcade-result'), score: document.querySelector('.ar-num')?.textContent }));
results.memoryResult = memResult;

await page.evaluate(() => { const b=[...document.querySelectorAll('.modal-close')].pop(); b&&b.click(); });
await new Promise(r=>setTimeout(r,500));
results.firefly = await playGame('Firefly', async (p) => {
  for (let i=0;i<14;i++) {
    await p.evaluate(() => { const f=document.querySelector('.mg-fly'); f&&f.click(); });
    await new Promise(r=>setTimeout(r,220));
  }
});
await page.screenshot({ path:'shots/game-firefly.png' });
await page.evaluate(() => { const b=[...document.querySelectorAll('.modal-close')].pop(); b&&b.click(); });
await new Promise(r=>setTimeout(r,500));

results.melody = await playGame('Melody', async (p) => {
  await new Promise(r=>setTimeout(r,2200));
  // click flowers to try to match (may fail, which is fine - tests the end path)
  for (let i=0;i<4;i++) {
    await p.evaluate((idx) => { const f=[...document.querySelectorAll('.mg-flower')]; if(f.length) f[idx%f.length].click(); }, i);
    await new Promise(r=>setTimeout(r,700));
  }
});
await page.screenshot({ path:'shots/game-melody.png' });

// rewards: finish a game and check seeds increase
const reward = await page.evaluate(() => {
  const e = window.__engine;
  const before = { seeds: e.state.seeds, berries: e.state.berries };
  const r = e.finishMiniGame('memory', 88, true);
  return { before, after: { seeds: e.state.seeds, berries: e.state.berries }, reward: r, saved: !!JSON.parse(localStorage.getItem('little-sprouts-save-v1')).miniGames };
});
console.log('rewards:', JSON.stringify(reward));
console.log('game info:', JSON.stringify(results));
console.log('errors:', errors);
await browser.close();
