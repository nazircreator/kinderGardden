import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('ERR', e.message));
await page.goto('http://127.0.0.1:5178/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/gate|continue/i.test(x.textContent||''));b&&b.click();});
await new Promise(r=>setTimeout(r,900));

const scene = async (label, setup) => {
  if (setup) { await page.evaluate(setup); await new Promise(r=>setTimeout(r,700)); }
  const art = await page.evaluate(() => {
    const e = window.__engine;
    const src = e.canvas;
    const W = 104, H = 46;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, W, H);
    const d = ctx.getImageData(0,0,W,H).data;
    const cls = (r,g,b) => {
      const max=Math.max(r,g,b), min=Math.min(r,g,b), lum=r*0.3+g*0.6+b*0.1, sat=max-min;
      if (lum < 38) return '@';
      if (sat < 24) return lum>185?'W':lum>125?'w':'s';
      if (g>=r && g>=b) return lum>150?'G':lum>95?'g':'d';
      if (r>g && r>b) return (g>b*1.2)? (lum>165?'Y':'y') : (lum>150?'P':'p');
      return lum>165?'C':'c';
    };
    const rows=[];
    for (let y=0;y<H;y++){ let s=''; for(let x=0;x<W;x++){const i=(y*W+x)*4; s+=cls(d[i],d[i+1],d[i+2]);} rows.push(s); }
    return rows.join('\n');
  });
  console.log('\n=== '+label+' ===');
  console.log(art);
};

await scene('HEARTMEADOW (start)');
await scene('HEARTMEADOW near cottage', () => { const e=window.__engine; e.player.x=(24+6)*16; e.player.y=(22+9)*16; e.camera.x=e.player.x-250; e.camera.y=e.player.y-160; });
const force = (z) => `const e=window.__engine; e.state.unlocked['${z}']=true; e.teleportToZone('${z}'); e.camera.x=e.player.x-e.view.w/2; e.camera.y=e.player.y-e.view.h/2;`;
await scene('DEWDROP POND', new Function(force('pond')));
await scene('SUNROOT TERRACE', new Function(force('sunroot')));
await scene('WHISPER HOLLOW', new Function(force('whisper')));
await scene('MOONLIT ORCHARD', new Function(force('orchard')));
await scene('LANTERN ARCADE', new Function("const e=window.__engine; e.state.unlocked.arcade=true; e.state.sprouts.nerdy || (function(){})(); e.teleportToZone('arcade'); e.camera.x=e.player.x-e.view.w/2; e.camera.y=e.player.y-e.view.h/2;"));
await scene('LANTERN ARCADE at night', new Function("const e=window.__engine; e.state.unlocked.arcade=true; e.teleportToZone('arcade'); e.state.clock=21*60; e.camera.x=e.player.x-e.view.w/2; e.camera.y=e.player.y-e.view.h/2;"));
await scene('NIGHT in meadow', () => { const e=window.__engine; e.teleportToZone('meadow'); e.state.clock = 21*60; e.player.x=(24+11.5)*16; e.player.y=(22+12.6)*16; });
await scene('LOCKED GATE (pond, before unlock)', () => { const e=window.__engine; e.state.unlocked.pond=false; e.player.x=(24+2)*16; e.player.y=(22-2)*16; e.camera.x=e.player.x-250; e.camera.y=e.player.y-160; });
await browser.close();
