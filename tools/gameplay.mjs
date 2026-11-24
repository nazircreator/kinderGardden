import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack||'').split('\n')[1]));
page.on('console', m => { if (m.type()==='error' && !/404/.test(m.text())) errors.push('CONSOLE: ' + m.text()); });
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||'')); b&&b.click(); });
await new Promise(r=>setTimeout(r,800));

const ev = (fn, ...args) => page.evaluate(fn, ...args);
const snap = () => ev(() => {
  const e = window.__engine;
  const s = e.snapshot();
  return { day: s.day, seeds: s.seeds, harmony: s.harmony, zone: s.zone, unlocked: s.unlocked,
    sprouts: s.sprouts.map(x=>({id:x.id, stage:x.stage, mood:x.mood, heart:Math.round(x.heart), calm:Math.round(x.calm), trust:Math.round(x.trust), zone:x.zone, asleep:x.asleep, crying:x.isCrying, needs:x.needs})),
    stats: s.stats, dew: s.dew, berries: s.berries, weather: s.weather, quest: s.quest && {id:s.quest.id, done:s.quest.done, claimed:s.quest.claimed, tasks:s.quest.tasks.map(t=>`${t.id}:${t.progress}/${t.count}`)},
    daily: s.daily && { done:s.daily.allDone, claimed:s.daily.rewardClaimed, tasks: s.daily.tasks.map(t=>`${t.def.type}:${t.progress}/${t.def.count}`)},
    decor: s.decor.length, letters: s.flags.letters, chapterSeen: s.flags.chapterSeen };
});

const results = {};
results.start = await snap();

// --- care every sprout a few times through the engine API (mirrors UI buttons) ---
await ev(() => {
  const e = window.__engine;
  const ids = Object.keys(e.state.sprouts);
  ids.forEach((id) => {
    e.care(id, 'feed'); e.care(id, 'water'); e.care(id, 'cuddle'); e.care(id, 'play'); e.care(id, 'sing');
  });
});
results.afterCare = await snap();

// --- talk (with option) for each sprout ---
await ev(() => {
  const e = window.__engine;
  Object.keys(e.state.sprouts).forEach((id) => { e.startTalk(id); e.chooseTalk('listen'); e.closeDialogue(); e.startTalk(id); e.chooseTalk('wonder'); e.closeDialogue(); });
});
results.afterTalk = await snap();

// --- stories ---
await ev(() => { const e = window.__engine; Object.keys(e.state.sprouts).forEach((id)=>{ e.openStory(id); e.finishStory(); }); });
results.afterStory = await snap();

// --- breathing ---
await ev(() => { const e = window.__engine; e.startBreathing(); e.breath.progress = 17.9; e.updateBreath(0.5); });
results.afterBreath = await snap();

// --- gather berries, refill can ---
await ev(() => {
  const e = window.__engine;
  e.state.berries = 0;
  e.player.x = 8.6*16; e.player.y = 17.6*16 + 20;   // near meadow berry bush
  for (let i=0;i<4;i++) e.gather();
  e.player.x = (24+15.4)*16; e.player.y = (22+8.4)*16 + 24;
  e.refillCan();
});
results.afterGather = await snap();

// --- buy + place decor until chapter 1 & 2 decor goals met ---
await ev(() => {
  const e = window.__engine;
  e.state.seeds = 500;
  ['lanternpost','bench','flowerPatch','stone','berrybush','sign'].forEach((id) => { e.buyItem(id); });
  // place near the keeper: validatePlacement requires items within reach
  const placeNear = (id) => {
    e.selectPlacement(id);
    const T = 16;
    const bx = Math.round(e.player.x / T) * T;
    const by = Math.round(e.player.y / T) * T;
    for (let r = 1; r <= 6; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const x = bx + dx * T, y = by + dy * T;
          if (!e.validatePlacement(x, y)) continue;
          e.placementPos = { x, y };
          e.placementValid = true;
          e.tryPlaceAt(x, y);
          e.cancelPlacement();
          return true;
        }
      }
    }
    e.cancelPlacement();
    return false;
  };
  ['lanternpost','bench','flowerPatch','stone','berrybush','sign'].forEach(placeNear);
});
results.afterDecor = await snap();

// --- unlock zones ---
await ev(() => {
  const e = window.__engine;
  e.state.seeds = 3000;
  e.state.sprouts && Object.values(e.state.sprouts).forEach(sp => { sp.heart = 100; sp.stage = 3; sp.growth = 100; });
  ['pond','sunroot','whisper','orchard'].forEach(z => e.unlockZone(z));
});
results.afterUnlock = await snap();

// --- visit all zones ---
await ev(() => { const e = window.__engine; ['pond','sunroot','whisper','orchard','meadow'].forEach(z=>e.teleportToZone(z)); });
results.afterVisit = await snap();

// --- claim chapters ---
await ev(() => { const e = window.__engine; e.chapters?.forEach?.(()=>{}); ['ch1','ch2','ch3','ch4','ch5','ch6'].forEach(id=>e.claimChapter(id)); });
results.afterClaim = await snap();

// --- day rollover: advance clock past end of day ---
await ev(() => { const e = window.__engine; e.state.clock = 25*60 + 58; e.updateClock(600); });
await new Promise(r=>setTimeout(r,400));
results.afterDay2 = await snap();

// --- force more days to trigger arrivals ---
for (let i=0;i<16;i++) {
  await ev(() => { const e = window.__engine; e.endDay('test'); });
}
results.afterManyDays = await snap();

// --- save / load round trip ---
results.persist = await ev(() => {
  const e = window.__engine;
  e.save();
  const raw = localStorage.getItem('little-sprouts-save-v1');
  const parsed = JSON.parse(raw);
  return { bytes: raw.length, day: parsed.day, sprouts: Object.keys(parsed.sprouts), decor: parsed.decor.length, seeds: parsed.seeds, unlocked: parsed.unlocked };
});

// --- reload page and continue ---
await page.reload({ waitUntil: 'networkidle2' });
await new Promise(r=>setTimeout(r,900));
const reloadTitle = await ev(() => document.body.innerText.slice(0,120));
await ev(() => { const b=[...document.querySelectorAll('button')].find(x=>/continue/i.test(x.textContent||'')); b&&b.click(); });
await new Promise(r=>setTimeout(r,900));
results.afterReload = await snap();
results.reloadTitleHadContinue = /continue/i.test(reloadTitle);

// --- crying / soothe path ---
results.crying = await ev(() => {
  const e = window.__engine;
  const id = Object.keys(e.state.sprouts)[0];
  const sp = e.state.sprouts[id];
  sp.needs.comfort = 5; sp.calm = 5;
  e.actors[id].crying = true;
  e.care(id, 'soothe');
  return { id, cryingAfter: e.actors[id].crying, calm: Math.round(sp.calm), trust: Math.round(sp.trust), soothed: e.state.stats.soothed };
});

// --- stage progression ---
results.growth = await ev(() => {
  const e = window.__engine;
  const id = Object.keys(e.state.sprouts)[0];
  const sp = e.state.sprouts[id];
  sp.stage = 0; sp.growth = 0;
  const before = sp.stage;
  for (let i=0;i<400;i++) { sp.needs = {hunger:100,hydration:100,energy:100,comfort:100}; sp.growth += 1; e.checkStage(sp); }
  return { id, before, after: sp.stage, blooms: e.state.stats.blooms, stagesGrown: e.state.stats.stagesGrown };
});

// --- long simulation: 3 in-game days of neglect to check nothing breaks ---
results.neglect = await ev(() => {
  const e = window.__engine;
  const id = Object.keys(e.state.sprouts)[0];
  const sp = e.state.sprouts[id];
  sp.needs = { hunger: 100, hydration: 100, energy: 100, comfort: 100 };
  for (let i=0;i<6000;i++) e.updateNeeds(0.05);
  return { hunger: Math.round(sp.needs.hunger), hydration: Math.round(sp.needs.hydration), calm: Math.round(sp.calm), crying: e.actors[id].crying, growth: Math.round(sp.growth) };
});

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
