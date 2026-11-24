import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const logs=[];
page.on('console', m => logs.push(m.type()+': '+m.text()));
page.on('pageerror', e => logs.push('PAGEERROR: '+e.message+'\n'+e.stack));
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,1500));
const info = await page.evaluate(() => ({
  bodyText: document.body.innerText.slice(0, 600),
  buttons: [...document.querySelectorAll('button')].map(b=>b.textContent.trim().slice(0,40)),
  canvases: [...document.querySelectorAll('canvas')].map(c=>({cls:c.className, w:c.width, h:c.height})),
  rootHTML: document.getElementById('root').innerHTML.length,
}));
console.log(JSON.stringify({info, logs}, null, 2));
await browser.close();
