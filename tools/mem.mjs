import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,800));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.openMiniGame('memory'); });
await new Promise(r=>setTimeout(r,900));

const log = await page.evaluate(async () => {
  const sleep = (ms) => new Promise(r=>setTimeout(r,ms));
  const cards = () => [...document.querySelectorAll('.mg-card')];
  const face = (i) => cards()[i]?.textContent?.trim() || '';
  const known = new Map();   // face -> index
  const done = new Set();
  let flips = 0;

  const clickCard = async (i) => { cards()[i].click(); flips++; await sleep(140); };

  for (let guard=0; guard<60; guard++) {
    if (document.querySelector('.arcade-result')) break;
    const cs = cards();
    const openIdx = cs.map((c,i)=>({c,i})).filter(o=>o.c.classList.contains('open')).map(o=>o.i);
    if (openIdx.length === 1) {
      // a card is open and waiting for its partner
      const f = face(openIdx[0]);
      const partner = known.get(f);
      if (partner !== undefined && partner !== openIdx[0] && !done.has(partner)) {
        await clickCard(partner);
        done.add(partner); done.add(openIdx[0]);
      } else {
        // unknown partner: try a card whose face we do not know yet
        const unknown = cs.map((c,i)=>({c,i})).filter(o=>!o.c.classList.contains('open') && !o.c.classList.contains('matched') && !known.has(face(o.i)));
        if (!unknown.length) { await sleep(200); continue; }
        await clickCard(unknown[0].i);
        const f2 = face(unknown[0].i);
        if (f2) { if (known.get(f) === undefined) known.set(f, openIdx[0]); known.set(f2, unknown[0].i); }
        if (f2 === f) { done.add(openIdx[0]); done.add(unknown[0].i); }
      }
      await sleep(780);
      continue;
    }
    // nothing open: flip the first unknown card
    const unknown = cs.map((c,i)=>({c,i})).filter(o=>!o.c.classList.contains('open') && !o.c.classList.contains('matched'));
    if (!unknown.length) { await sleep(200); continue; }
    await clickCard(unknown[0].i);
    const f = face(unknown[0].i);
    if (f && known.get(f) === undefined) known.set(f, unknown[0].i);
  }
  return { finished: !!document.querySelector('.arcade-result'), score: document.querySelector('.ar-num')?.textContent ?? null,
           detail: document.querySelector('.arcade-result p')?.textContent ?? null, flips };
});
console.log('MEMORY:', JSON.stringify(log));
console.log('errors:', errors);
await browser.close();
