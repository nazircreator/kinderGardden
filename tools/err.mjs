import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', e.message, '\n', e.stack));
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,1000));
await page.evaluate(() => { [...document.querySelectorAll('button')].find(b=>/gate/i.test(b.textContent))?.click(); });
await new Promise(r=>setTimeout(r,800));
await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await new Promise(r=>setTimeout(r,1200));
console.log('done');
await browser.close();
