import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { [...document.querySelectorAll('button')].find(b=>/gate/i.test(b.textContent))?.click(); });
await new Promise(r=>setTimeout(r,700));
const measure = () => page.evaluate(() => {
  const r = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
  const c = document.querySelector('canvas.game-canvas');
  return {
    win: { w: innerWidth, h: innerHeight },
    app: r(document.querySelector('.app')),
    hud: r(document.querySelector('.hud')),
    stage: r(document.querySelector('.stage')),
    viewport: r(document.querySelector('.viewport')),
    nav: r(document.querySelector('.bottom-nav')),
    canvas: r(c),
    canvasBacking: c ? [c.width, c.height] : null,
    engineView: window.__engine ? { ...window.__engine.view } : null,
    scrollH: document.documentElement.scrollHeight,
  };
});
console.log('DESKTOP', JSON.stringify(await measure(), null, 1));
await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,1400));
console.log('MOBILE', JSON.stringify(await measure(), null, 1));
await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,1400));
console.log('TABLET', JSON.stringify(await measure(), null, 1));
await browser.close();
