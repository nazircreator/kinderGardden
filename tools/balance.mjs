import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,600));
const out = await page.evaluate(() => {
  const e = window.__engine;
  const id = Object.keys(e.state.sprouts)[0];
  const sp = e.state.sprouts[id];
  const marks = {};
  sp.needs = { hunger: 66, hydration: 70, energy: 62, comfort: 62 };
  sp.calm = 60;
  const sample = () => ({ h:+sp.needs.hunger.toFixed(1), w:+sp.needs.hydration.toFixed(1), e:+sp.needs.energy.toFixed(1), c:+sp.needs.comfort.toFixed(1), calm:+sp.calm.toFixed(1) });
  marks.t0 = sample();
  // simulate exactly one in-game day (1200 minutes) at gentle pacing
  const minutesPerTick = 1200 / 1200;
  for (let i=0;i<1200;i++) { e.state.clock = 360 + i*minutesPerTick; e.updateNeeds(minutesPerTick * 0.42); }
  marks.after1day = sample();
  for (let i=0;i<1200;i++) { e.state.clock = 360 + i*minutesPerTick; e.updateNeeds(minutesPerTick * 0.42); }
  marks.after2days = sample();
  return { id, marks };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
