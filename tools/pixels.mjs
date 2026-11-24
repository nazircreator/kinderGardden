import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,1500));
const out = await page.evaluate(() => {
  const e = window.__engine;
  const c = document.createElement('canvas');
  c.width = e.canvas.width; c.height = e.canvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(e.canvas, 0, 0);
  const d = ctx.getImageData(0,0,c.width,c.height).data;
  const hist = new Map();
  for (let i=0;i<d.length;i+=4) {
    const k = `${d[i]},${d[i+1]},${d[i+2]}`;
    hist.set(k, (hist.get(k)||0)+1);
  }
  const top = [...hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12);
  const samples = [];
  for (const [fx,fy] of [[0.5,0.5],[0.25,0.5],[0.75,0.5],[0.5,0.25],[0.5,0.75],[0.15,0.15],[0.85,0.85]]) {
    const x = Math.floor(c.width*fx), y = Math.floor(c.height*fy);
    const i = (y*c.width+x)*4;
    samples.push({ at:`${fx},${fy}`, rgb:[d[i],d[i+1],d[i+2]] });
  }
  return { canvas:[c.width,c.height], view:{...e.view}, camera:{x:Math.round(e.camera.x),y:Math.round(e.camera.y)}, darkness:+e.darkness().toFixed(3), clock: e.clockLabel(), weather: e.state.weather, top, samples };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
