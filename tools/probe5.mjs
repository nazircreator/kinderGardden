import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,900));
const startGame = async () => {
  const ok = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x=>/gate|continue your garden/i.test(x.textContent||''));
    if (b) { b.click(); return b.textContent.trim(); } return null;
  });
  await new Promise(r=>setTimeout(r,900));
  return ok;
};
await startGame();
const measure = () => page.evaluate(() => {
  const r = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
  const c = document.querySelector('canvas.game-canvas');
  const vp = document.querySelector('.viewport');
  return {
    win: { w: innerWidth, h: innerHeight },
    hud: r(document.querySelector('.hud')),
    stage: r(document.querySelector('.stage')),
    viewport: r(vp),
    rail: r(document.querySelector('.rail')),
    nav: r(document.querySelector('.bottom-nav')),
    dpad: r(document.querySelector('.dpad')),
    touch: r(document.querySelector('.touch-actions')),
    canvasBacking: c ? [c.width, c.height] : null,
    engineView: window.__engine ? { w: window.__engine.view.w, h: window.__engine.view.h } : null,
    overflowY: document.documentElement.scrollHeight > innerHeight + 2,
    titleVisible: !!document.querySelector('.title-screen'),
  };
});
console.log('DESKTOP', JSON.stringify(await measure()));
await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,700));
await startGame();
console.log('MOBILE ', JSON.stringify(await measure()));
await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,700));
await startGame();
console.log('TABLET ', JSON.stringify(await measure()));
await page.setViewport({ width: 1280, height: 720 });
await new Promise(r=>setTimeout(r,700));
await startGame();
console.log('LAPTOP ', JSON.stringify(await measure()));
await browser.close();
