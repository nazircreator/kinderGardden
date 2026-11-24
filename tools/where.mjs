import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,800));
const out = await page.evaluate(() => {
  const e = window.__engine;
  const T = 16;
  const pos = (x,y) => ({ tile:[+(x/T).toFixed(1), +(y/T).toFixed(1)], zone: e.world.zoneAt(x,y), terrain: e.world.terrainAt(x,y), walkable: e.world.walkable(x,y,5) });
  const spr = Object.values(e.state.sprouts).map(s => ({ id:s.id, ...pos(s.x,s.y) }));
  return {
    player: pos(e.player.x, e.player.y),
    zone: e.zone,
    sprouts: spr,
    zoneSpawns: Object.fromEntries(['meadow','pond','sunroot','whisper','orchard'].map(z => {
      const p = e.world.spawnPoint(z);
      return [z, { tile:[+(p.x/T).toFixed(1), +(p.y/T).toFixed(1)], zone:e.world.zoneAt(p.x,p.y), walkable:e.world.walkable(p.x,p.y,5) }];
    })),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
