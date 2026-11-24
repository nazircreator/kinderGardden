import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||'')); b&&b.click(); });
await new Promise(r=>setTimeout(r,700));
const out = await page.evaluate(() => {
  const e = window.__engine;
  e.state.seeds = 999;
  const bought = e.buyItem('lanternpost');
  e.selectPlacement('lanternpost');
  const trials = [];
  for (const [x,y] of [[12*16,15*16],[13*16,15*16],[10*16,16*16],[20*16,14*16],[7*16,14*16],[15*16,16*16]]) {
    const v = e.validatePlacement(x,y);
    const zone = e.world.zoneAt(x,y);
    const walk = e.world.walkable(x,y,1);
    trials.push({ x:x/16, y:y/16, valid:v, zone, walk });
  }
  // place at a spot that validates
  const good = trials.find(t=>t.valid);
  let placed = null;
  if (good) { e.placementPos={x:good.x*16,y:good.y*16}; e.placementValid=true; e.tryPlaceAt(good.x*16, good.y*16); placed = e.state.decor.length; }
  return { bought, owned: e.state.owned, mode: e.mode, trials, placed, decor: e.state.decor, player: {x:e.player.x/16,y:e.player.y/16} };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
