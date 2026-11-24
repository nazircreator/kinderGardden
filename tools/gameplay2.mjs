import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if(m.type()==='error' && !/404/.test(m.text())) errors.push('console: '+m.text()); });
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.state.seeds=500; e.teleportToZone('arcade'); });
await new Promise(r=>setTimeout(r,600));

// open hub, play memory, solve it by reading the deck from the DOM order is not possible;
// instead solve by brute force with full knowledge: click pairs by matching revealed faces.
await page.evaluate(() => { window.__engine.openMiniGame('memory'); });
await new Promise(r=>setTimeout(r,800));

// Solve properly: flip one card, then flip candidates one at a time until it matches.
let solved = false;
for (let guard=0; guard<120 && !solved; guard++) {
  solved = await page.evaluate(() => !!document.querySelector('.arcade-result'));
  if (solved) break;
  // open the first hidden card
  const first = await page.evaluate(() => {
    const cards=[...document.querySelectorAll('.mg-card')];
    const idx = cards.findIndex(c=>!c.classList.contains('open')&&!c.classList.contains('matched'));
    if (idx>=0) cards[idx].click();
    return idx;
  });
  if (first < 0) break;
  await new Promise(r=>setTimeout(r,260));
  // try every other hidden card until the pair is matched
  let matchedNow = false;
  for (let t=0; t<12 && !matchedNow; t++) {
    const r = await page.evaluate((fi) => {
      const cards=[...document.querySelectorAll('.mg-card')];
      if (cards[fi]?.classList.contains('matched')) return 'matched';
      const idx = cards.findIndex((c,i)=>i!==fi && !c.classList.contains('open') && !c.classList.contains('matched'));
      if (idx>=0) cards[idx].click();
      return idx;
    }, first);
    if (r === 'matched') { matchedNow = true; break; }
    await new Promise(r=>setTimeout(r,820));
  }
  await new Promise(r=>setTimeout(r,200));
}
await new Promise(r=>setTimeout(r,700));
const memRes = await page.evaluate(() => ({
  finished: !!document.querySelector('.arcade-result'),
  score: document.querySelector('.ar-num')?.textContent ?? null,
  detail: document.querySelector('.arcade-result p')?.textContent ?? null,
}));
console.log('MEMORY solved:', JSON.stringify(memRes));

// collect and verify seeds/berries changed through the real UI
const before = await page.evaluate(()=>({seeds:window.__engine.state.seeds, berries:window.__engine.state.berries}));
const collected = await page.evaluate(() => {
  const b=[...document.querySelectorAll('.ar-actions .btn')].find(x=>/collect/i.test(x.textContent||''));
  if(b){b.click(); return true;} return false;
});
await new Promise(r=>setTimeout(r,900));
const after = await page.evaluate(()=>({
  seeds:window.__engine.state.seeds, berries:window.__engine.state.berries,
  saved: window.__engine.state.miniGames,
  hubClosed: !document.querySelector('.arcade-modal'),
}));
console.log('COLLECT:', collected, JSON.stringify({before, after}));

// berry catch: play until timer expires (shorten by forcing state)
await page.evaluate(() => { window.__engine.openMiniGame('berrycatch'); });
await new Promise(r=>setTimeout(r,900));
const berryInfo = await page.evaluate(() => ({ fallers: document.querySelectorAll('.mg-faller').length, hud: document.querySelector('.mg-hud')?.textContent }));
console.log('BERRY:', JSON.stringify(berryInfo));
await page.screenshot({ path: 'shots/arcade-berry.png' });

// melody: verify the demo sequence plays and clicking works
await page.evaluate(() => { window.__engine.closeMiniGame(); });
await new Promise(r=>setTimeout(r,300));
await page.evaluate(() => { window.__engine.openMiniGame('melody'); });
await new Promise(r=>setTimeout(r,3000));
const melody = await page.evaluate(() => ({
  pips: document.querySelectorAll('.mg-pip').length,
  turn: document.querySelector('.mg-timer')?.textContent,
  flowers: document.querySelectorAll('.mg-flower').length,
}));
console.log('MELODY:', JSON.stringify(melody));

// firefly clicking
await page.evaluate(() => { window.__engine.closeMiniGame(); });
await new Promise(r=>setTimeout(r,300));
await page.evaluate(() => { window.__engine.openMiniGame('firefly'); });
await new Promise(r=>setTimeout(r,2000));
const f1 = await page.evaluate(()=>document.querySelectorAll('.mg-fly').length);
await page.evaluate(() => { const f=document.querySelector('.mg-fly'); f&&f.click(); });
await new Promise(r=>setTimeout(r,500));
const f2 = await page.evaluate(()=>({ flies: document.querySelectorAll('.mg-fly').length, caught: document.querySelector('.mg-hud .mg-stat')?.textContent }));
console.log('FIREFLY:', f1, '->', JSON.stringify(f2));
console.log('errors:', errors);
await browser.close();
