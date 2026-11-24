import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,800));

const flow = await page.evaluate(() => {
  const e = window.__engine;
  const log = [];
  const ids = Object.keys(e.state.sprouts);
  // ch1: feed x3, soothe x1, talk x2, decor x1
  e.state.berries = 50; e.state.dew = 50; e.state.seeds = 500;
  for (let i=0;i<3;i++) e.care(ids[0], 'feed');
  for (let i=0;i<2;i++) { e.startTalk(ids[1]); e.chooseTalk('listen'); e.closeDialogue(); }
  // force a cry and soothe it
  e.actors[ids[0]].crying = true; e.state.sprouts[ids[0]].needs.comfort = 3; e.state.sprouts[ids[0]].calm = 3;
  e.care(ids[0], 'soothe');
  e.buyItem('lanternpost');
  e.selectPlacement('lanternpost');
  const T=16, bx=Math.round(e.player.x/T)*T, by=Math.round(e.player.y/T)*T;
  outer: for (let r=1;r<=6;r++) for (let dx=-r;dx<=r;dx++) for (let dy=-r;dy<=r;dy++) {
    const x=bx+dx*T,y=by+dy*T;
    if (e.validatePlacement(x,y)) { e.placementPos={x,y}; e.placementValid=true; e.tryPlaceAt(x,y); break outer; }
  }
  e.cancelPlacement();
  const snap = e.snapshot();
  log.push({ stage:'ch1 tasks', tasks: snap.quest.tasks.map(t=>`${t.id}:${t.progress}/${t.count}`), done: snap.quest.done });
  const before = { seeds: snap.seeds, letters: snap.flags.letters.length, chapterSeen: snap.flags.chapterSeen, owned: {...snap.owned} };
  e.claimChapter('ch1');
  const s2 = e.snapshot();
  log.push({ stage:'after claim ch1', seeds: s2.seeds, letters: s2.flags.letters, chapterSeen: s2.flags.chapterSeen, ownedLantern: s2.owned.lanternpost, questNow: s2.quest.id, letterOpen: !!e.letter });
  e.closeLetter();
  // verify reward was granted exactly once
  const seedsAfter = e.state.seeds;
  e.claimChapter('ch1');
  log.push({ stage:'double claim blocked', seedsUnchanged: e.state.seeds === seedsAfter, letters: e.state.flags.letters.length });
  // ch2 progress through normal play: unlock a zone, story, breathe, water
  e.state.seeds = 5000;
  Object.values(e.state.sprouts).forEach(sp=>{ sp.heart=100; });
  e.unlockZone('pond');
  Object.keys(e.state.sprouts).forEach(id=>{ e.openStory(id); e.finishStory(); });
  e.startBreathing(); e.breath.progress = 17.9; e.updateBreath(0.5);
  e.state.dew = 50;
  Object.keys(e.state.sprouts).forEach(id=>{ for(let i=0;i<3;i++) e.care(id,'water'); });
  const s3 = e.snapshot();
  log.push({ stage:'ch2', id: s3.quest.id, tasks: s3.quest.tasks.map(t=>`${t.id}:${t.progress}/${t.count}`), done: s3.quest.done });
  e.claimChapter('ch2');
  const s4 = e.snapshot();
  log.push({ stage:'after claim ch2', chapterSeen: s4.flags.chapterSeen, letters: s4.flags.letters, quest: s4.quest.id, unlocked: s4.unlocked });
  return { log, before };
});
console.log(JSON.stringify({ flow, errors }, null, 1));
await browser.close();
