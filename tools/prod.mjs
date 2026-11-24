import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; const failed=[];
page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if(m.type()==='error') errors.push('console: '+m.text()); });
page.on('requestfailed', r=>failed.push(r.url()+' '+r.failure()?.errorText));
await page.goto('http://127.0.0.1:5179/', { waitUntil:'networkidle2', timeout: 60000 });
await new Promise(r=>setTimeout(r,1500));
const before = await page.evaluate(()=>({ text: document.body.innerText.slice(0,80), devHook: '__engine' in window, canvases: document.querySelectorAll('canvas').length }));
// start game through UI only (no dev hooks available in prod build)
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,1200));
await page.keyboard.down('d'); await new Promise(r=>setTimeout(r,700)); await page.keyboard.up('d');
await page.keyboard.press('e');
await new Promise(r=>setTimeout(r,700));
const after = await page.evaluate(()=>({
  hud: !!document.querySelector('.hud'),
  rail: !!document.querySelector('.rail'),
  careOpen: !!document.querySelector('[aria-label^="Care for"]'),
  seedsChip: [...document.querySelectorAll('.chip')].map(c=>c.textContent.trim()).slice(0,6),
  save: !!localStorage.getItem('little-sprouts-save-v1'),
  bodyLen: document.body.innerText.length,
}));
await page.screenshot({ path: 'shots/prod-care.png' });
console.log(JSON.stringify({ before, after, errors, failed }, null, 1));
await browser.close();
