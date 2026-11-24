import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));

const out = await page.evaluate(async () => {
  const e = window.__engine; const sleep = ms => new Promise(r=>setTimeout(r,ms));
  e.state.berries = 5; e.state.dew = 5;
  // stand right next to Pip specifically
  const a = e.actors.pip;
  e.player.x = a.x + 12; e.player.y = a.y + 6;
  e.emit(true); await sleep(600);
  const shown = document.querySelector('.qc-name')?.textContent;
  const h0 = Math.round(e.state.sprouts.pip.needs.hunger);
  const w0 = Math.round(e.state.sprouts.pip.needs.hydration);
  e.state.sprouts.pip.needs.hunger = 15;
  e.state.sprouts.pip.needs.hydration = 15;
  [...document.querySelectorAll('.qc-btn')].find(x=>/feed/i.test(x.textContent))?.click();
  await sleep(400);
  [...document.querySelectorAll('.qc-btn')].find(x=>/water/i.test(x.textContent))?.click();
  await sleep(400);
  return { shown, hunger: `${h0} -> ${Math.round(e.state.sprouts.pip.needs.hunger)}`, hydration: `${w0} -> ${Math.round(e.state.sprouts.pip.needs.hydration)}`, berries: e.state.berries, dew: e.state.dew };
});
console.log('QUICK CARE targets correct sprout:', JSON.stringify(out));

// Nerdy still needs care (his needs decay) but never cries or wanders
const nerdy = await page.evaluate(async () => {
  const e = window.__engine; const sleep = ms => new Promise(r=>setTimeout(r,ms));
  e.state.unlocked.arcade = true; e.endDay('t'); e.endDay('t');
  const sp = e.state.sprouts.nerdy; if (!sp) return { has:false };
  sp.needs = { hunger: 60, hydration: 60, energy: 60, comfort: 60 };
  const a = e.actors.nerdy; const p0 = { x:a.x, y:a.y };
  // drop comfort very low and confirm he still does not cry
  sp.needs.comfort = 3; sp.calm = 3;
  for (let i=0;i<600;i++) e.updateNeeds(0.05);
  await sleep(1500);
  return { has:true, hunger: Math.round(sp.needs.hunger), moved: Math.hypot(a.x-p0.x,a.y-p0.y), crying: a.crying, activity: a.activity, stage: sp.stage };
});
console.log('NERDY passive/calm:', JSON.stringify(nerdy));

// can still be cared for and grow
const care = await page.evaluate(async () => {
  const e = window.__engine;
  e.state.berries = 5;
  const g0 = e.state.sprouts.nerdy.growth;
  e.care('nerdy','feed'); e.care('nerdy','cuddle'); e.care('nerdy','talk');
  return { growth: `${Math.round(g0)} -> ${Math.round(e.state.sprouts.nerdy.growth)}`, heart: Math.round(e.state.sprouts.nerdy.heart) };
});
console.log('NERDY care works:', JSON.stringify(care));
console.log('errors:', errors);
await browser.close();
