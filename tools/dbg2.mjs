import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.state.seeds=999; e.teleportToZone('arcade'); });
await new Promise(r=>setTimeout(r,800));
const before = await page.evaluate(() => ({
  arcadeUnlocked: window.__engine.snapshot().arcadeUnlocked,
  hudBtns: [...document.querySelectorAll('.hud-actions .icon-btn')].map(b=>b.getAttribute('title')),
  scrims: document.querySelectorAll('.scrim').length,
}));
console.log('BEFORE', JSON.stringify(before));
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.hud-actions .icon-btn')].find(x=>/arcade/i.test(x.getAttribute('title')||''));
  if (b) { b.click(); return true; } return false;
});
await new Promise(r=>setTimeout(r,800));
const after = await page.evaluate(() => ({
  clicked: true,
  hubGrid: !!document.querySelector('.arcade-hub-grid'),
  scrims: document.querySelectorAll('.scrim').length,
  modals: [...document.querySelectorAll('.modal-title')].map(x=>x.textContent),
  cards: [...document.querySelectorAll('.ac-name')].map(x=>x.textContent),
}));
console.log('CLICKED', clicked, JSON.stringify(after));
await browser.close();
