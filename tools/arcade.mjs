import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message+' | '+(e.stack||'').split('\n')[1]));
page.on('console', m=>{ if(m.type()==='error' && !/404/.test(m.text())) errors.push('console: '+m.text()); });
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));

const out = await page.evaluate(() => {
  const e = window.__engine;
  const T = 16;
  // geometry: is the arcade reachable and walkable?
  const geo = { unlocked: e.state.unlocked.arcade, rect: null, spawn: null, stations: [], gateTiles: [] };
  const sp = e.world.spawnPoint('arcade');
  geo.spawn = { tile:[+(sp.x/T).toFixed(1), +(sp.y/T).toFixed(1)], zone: e.world.zoneAt(sp.x,sp.y), walkable: e.world.walkable(sp.x,sp.y,5) };
  geo.stations = e.arcadeStations().map(st => ({ id: st.gameId, tile:[+(st.x/T).toFixed(1),+(st.y/T).toFixed(1)], zone: e.world.zoneAt(st.x,st.y), walkable: e.world.walkable(st.x,st.y,5), dist: Math.hypot(st.x-sp.x, st.y-sp.y).toFixed(0) }));
  // gate tiles between orchard and arcade
  const gate = e.world.gateList.find(g=>g.id==='gate-arcade');
  geo.gate = gate ? { anchor: gate.anchor, tiles: gate.tiles.map(t=>({t:[t.x,t.y], walk: e.world.walkable(t.x*T+8,t.y*T+8,4)})) } : null;
  // walkable corridor from orchard spawn to arcade spawn
  const path = [];
  for (let x=50; x<=75; x++) {
    const wx = x*T+8, wy = 11*T+8;
    path.push(e.world.walkable(wx,wy,4) ? '.' : '#');
  }
  geo.corridorRow11 = path.join('');
  return geo;
});
console.log(JSON.stringify(out, null, 1));

// unlock arcade and open each mini-game through the engine -> hub -> play
await page.evaluate(() => {
  const e = window.__engine;
  e.state.unlocked.arcade = true;
  e.state.seeds = 999;
  e.teleportToZone('arcade');
});
await new Promise(r=>setTimeout(r,700));
const prompt = await page.evaluate(() => window.__engine.currentPrompt());
console.log('prompt in arcade:', JSON.stringify(prompt));
const opened = await page.evaluate(() => { window.__engine.openMiniGame('berrycatch'); return true; });
await new Promise(r=>setTimeout(r,900));
const hub = await page.evaluate(() => ({
  hubOpen: !!document.querySelector('.arcade-hub-grid'),
  cards: [...document.querySelectorAll('.arcade-card .ac-name')].map(x=>x.textContent),
  gameOpen: !!document.querySelector('.mg-field'),
}));
console.log('hub:', JSON.stringify(hub));
await page.screenshot({ path:'shots/arcade-hub.png' });
console.log('errors:', errors);
await browser.close();
