import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message, (e.stack||'').split('\n')[1]));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,800));

// direct call test
const direct = await page.evaluate(() => {
  const e=window.__engine;
  e.state.sprouts.pip.needs.comfort = 40; e.state.sprouts.pip.needs.energy = 80;
  const before = { c: e.state.sprouts.pip.needs.comfort, en: e.state.sprouts.pip.needs.energy };
  e.care('pip','play');
  return { before, after: { c: e.state.sprouts.pip.needs.comfort, en: e.state.sprouts.pip.needs.energy }, plays: e.state.stats.plays };
});
console.log('DIRECT care(play):', JSON.stringify(direct));

// via key
const viaKey = await page.evaluate(async () => {
  const e=window.__engine; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const a=e.actors.pip; e.player.x=a.x+14; e.player.y=a.y+6; e.emit(true); await sleep(400);
  e.state.sprouts.pip.needs.comfort = 40; e.state.sprouts.pip.needs.energy = 80;
  e.selectedId = null;
  return { comfort: e.state.sprouts.pip.needs.comfort, energy: e.state.sprouts.pip.needs.energy, near: e.nearestSprout(46)?.id, selected: e.selectedId };
});
await page.keyboard.press('p');
await new Promise(r=>setTimeout(r,500));
const afterKey = await page.evaluate(() => {
  const e=window.__engine;
  return { comfort: Math.round(e.state.sprouts.pip.needs.comfort), energy: Math.round(e.state.sprouts.pip.needs.energy), plays: e.state.stats.plays, selected: e.selectedId };
});
console.log('VIA KEY before:', JSON.stringify(viaKey));
console.log('VIA KEY after:', JSON.stringify(afterKey));
await browser.close();
