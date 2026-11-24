import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(() => {
  const e = window.__engine;
  const c = document.querySelector('canvas.game-canvas');
  const vp = c?.parentElement;
  return {
    hasEngine: !!e,
    view: e ? { ...e.view } : null,
    cam: e ? { ...e.camera } : null,
    player: e ? { ...e.player } : null,
    canvas: c ? { w: c.width, h: c.height, cssW: c.style.width, cssH: c.style.height } : null,
    vpRect: vp ? { w: vp.getBoundingClientRect().width, h: vp.getBoundingClientRect().height } : null,
    worldSize: e ? { w: e.world.base.width, h: e.world.base.height } : null,
    started: e?.started,
    showIntro: e?.showIntro,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
