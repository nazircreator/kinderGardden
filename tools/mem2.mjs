import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
page.on('console', m=>{ if(/MGDBG/.test(m.text())) console.log(m.text()); });
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,800));
await page.evaluate(() => { const e=window.__engine; e.state.unlocked.arcade=true; e.openMiniGame('memory'); });
await new Promise(r=>setTimeout(r,900));

// Reveal the deck by clicking each card once, reading faces, then report
const info = await page.evaluate(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const cards = () => [...document.querySelectorAll('.mg-card')];
  const faces = [];
  // click every card once with a pause; open state auto-clears after mismatch
  for (let i=0;i<12;i++) {
    const cs = cards();
    cs[i].click();
    await sleep(160);
    faces.push(cs[i].textContent.trim());
    await sleep(800);
  }
  return {
    count: cards().length,
    faces,
    matchedNow: cards().filter(c=>c.classList.contains('matched')).length,
    openNow: cards().filter(c=>c.classList.contains('open')).length,
    finished: !!document.querySelector('.arcade-result'),
    hud: document.querySelector('.mg-hud')?.textContent,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
