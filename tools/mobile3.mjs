import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
const start = async () => { await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();}); await new Promise(r=>setTimeout(r,900)); };
await start();
const measure = () => page.evaluate(() => {
  const r = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
  return {
    win:{w:innerWidth,h:innerHeight},
    hud: r(document.querySelector('.hud')),
    viewport: r(document.querySelector('.viewport')),
    nav: r(document.querySelector('.bottom-nav')),
    quickCare: r(document.querySelector('.quick-care')),
    overflowY: document.documentElement.scrollHeight > innerHeight + 2,
    qcOverflow: (() => { const q=document.querySelector('.quick-care'); return q ? q.scrollWidth > q.clientWidth + 2 : null; })(),
  };
});
console.log('DESKTOP', JSON.stringify(await measure()));

// open arcade on desktop
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.teleportToZone('arcade'); });
await new Promise(r=>setTimeout(r,600));
await page.evaluate(() => { const b=[...document.querySelectorAll('.hud-actions .icon-btn')].find(x=>/arcade/i.test(x.getAttribute('title')||'')); b&&b.click(); });
await new Promise(r=>setTimeout(r,800));
await page.screenshot({ path:'shots/arcade-hub.png' });
// open berry catch
await page.evaluate(() => { const c=[...document.querySelectorAll('.arcade-card')].find(x=>/berry/i.test(x.textContent||'')); c&&c.click(); });
await new Promise(r=>setTimeout(r,1200));
await page.screenshot({ path:'shots/arcade-berry.png' });

await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,600));
await start();
console.log('MOBILE ', JSON.stringify(await measure()));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.teleportToZone('arcade'); });
await new Promise(r=>setTimeout(r,700));
await page.evaluate(() => { const b=[...document.querySelectorAll('.hud-actions .icon-btn')].find(x=>/arcade/i.test(x.getAttribute('title')||'')); b&&b.click(); });
await new Promise(r=>setTimeout(r,900));
await page.screenshot({ path:'shots/arcade-mobile.png' });
const mobileHub = await page.evaluate(() => ({ grid: !!document.querySelector('.arcade-hub-grid'), cards: document.querySelectorAll('.arcade-card').length }));
await page.evaluate(() => { const c=[...document.querySelectorAll('.arcade-card')].find(x=>/memory/i.test(x.textContent||'')); c&&c.click(); });
await new Promise(r=>setTimeout(r,1000));
await page.screenshot({ path:'shots/game-memory-mobile.png' });
console.log('MOBILE HUB', JSON.stringify(mobileHub));
console.log('errors:', errors);
await browser.close();
