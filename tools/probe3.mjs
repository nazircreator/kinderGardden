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
  const dom = document.querySelector('canvas.game-canvas');
  const before = { same: e.canvas === dom, domW: dom.width, engineW: e.canvas.width, view: {...e.view} };
  e.resize();
  const after = { domW: dom.width, engineW: e.canvas.width, view: {...e.view}, css: dom.style.width+'x'+dom.style.height };
  const allCanvases = [...document.querySelectorAll('canvas')].map(c=>c.className+' '+c.width+'x'+c.height);
  return { before, after, allCanvases, parentTag: dom.parentElement.className };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
