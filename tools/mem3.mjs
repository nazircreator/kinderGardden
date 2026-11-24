import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,800));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.openMiniGame('memory'); });
await new Promise(r=>setTimeout(r,900));

const res = await page.evaluate(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const cards = () => [...document.querySelectorAll('.mg-card')];
  // discover the deck: click each card once, recording faces (waits out mismatches)
  const faces = new Array(12).fill('');
  for (let i=0;i<12;i++) {
    const cs = cards();
    cs[i].click();
    await sleep(150);
    faces[i] = cs[i].textContent.trim();
    await sleep(820);
  }
  // build pair map
  const groups = {};
  faces.forEach((f,i)=>{ (groups[f] ||= []).push(i); });
  const pairs = Object.values(groups).filter(g=>g.length===2);
  // now click each pair
  for (const [a,b] of pairs) {
    cards()[a].click(); await sleep(160);
    cards()[b].click(); await sleep(420);
  }
  await sleep(600);
  return { faces, pairs, finished: !!document.querySelector('.arcade-result'), score: document.querySelector('.ar-num')?.textContent ?? null,
           matched: cards().filter(c=>c.classList.contains('matched')).length };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
