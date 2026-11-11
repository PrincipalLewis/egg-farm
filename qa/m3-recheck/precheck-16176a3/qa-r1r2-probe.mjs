import { chromium, webkit } from 'playwright-core'; import { spawn } from 'node:child_process';
const port = 4321; const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',''+port,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
for (let i=0;i<40;i++){ try{ await fetch(`http://127.0.0.1:${port}/`); break;}catch{ await new Promise(r=>setTimeout(r,250)); } }
let bad=0; const ok=(k,v,d)=>{ if(!v) bad++; console.log(v?'PASS':'FAIL',k,JSON.stringify(d)); };
for (const [en, L] of [['chromium', ()=>chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']})], ['webkit', ()=>webkit.launch()]]) {
 const br = await L();
 for (const [w,h] of [[360,640],[390,844],[1280,800]]) {
  const ctx = await br.newContext({ viewport:{width:w,height:h}, hasTouch: w<900 }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm); await p.waitForTimeout(700);
  const st = () => p.evaluate(() => { const o=document.querySelector('.onb'); const r=o?.getBoundingClientRect(); return { onb: !!o && getComputedStyle(o).display!=='none' && getComputedStyle(o).visibility!=='hidden' && r.width>0, txt: document.querySelector('.onb-txt')?.textContent }; });
  const before = await st();
  await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await p.waitForTimeout(500);
  const during = await p.evaluate(() => { const dlg=[...document.querySelectorAll('[role=dialog],[role=alertdialog],.modal')].find(d=>d.getBoundingClientRect().width>0); const t=dlg?.querySelector('h2,h1,.title'); const tr=t?.getBoundingClientRect();
    const hit = tr ? document.elementFromPoint(tr.left+tr.width/2, tr.top+tr.height/2) : null; const o=document.querySelector('.onb'), s=document.querySelector('.onb-skip');
    const vis = e => !!e && getComputedStyle(e).display!=='none' && getComputedStyle(e).visibility!=='hidden' && e.getBoundingClientRect().width>0;
    // sample grid over dialog: any point hitting onboarding?
    let cover=0; if (dlg){ const r=dlg.getBoundingClientRect(); for(let x=r.left+4;x<r.right;x+=20) for(let y=r.top+4;y<Math.min(r.bottom,innerHeight);y+=20){ const e=document.elementFromPoint(x,y); if(e?.closest('.onb,.onb-skip')) cover++; } }
    return { dialog: !!dlg, title: t?.textContent, titleHitInDialog: !!hit && dlg.contains(hit), onbVisible: vis(o), skipVisible: vis(s), coverPts: cover }; });
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); const after = await st();
  ok(`R1 ${en} ${w}x${h}`, before.onb && during.dialog && !during.onbVisible && !during.skipVisible && during.coverPts===0 && during.titleHitInDialog && after.onb, { before, during, after });
  await ctx.close();
  // R2 with FTUE done
  const c2 = await br.newContext({ viewport:{width:w,height:h}, hasTouch: w<900 }); const q = await c2.newPage();
  await q.addInitScript(()=>localStorage.setItem('eggfarm.ui', JSON.stringify({onboardingDone:true,workersIntroA:true,workersIntroB:true,seenSlots:6})));
  await q.goto(`http://127.0.0.1:${port}/`); await q.getByText('Tap to start').click({force:true}).catch(()=>{}); await q.waitForFunction(()=>window.eggfarm);
  await q.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await q.waitForTimeout(500);
  const r = await q.evaluate(async () => { const a=document.querySelector('.font-credits a'); a.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,200)); const rs=[...a.getClientRects()]; const b=rs[0];
    const at = y => document.elementFromPoint(b.left+b.width/2, y)?.closest('a')===a;
    return { rects: rs.length, h: Math.round(b.height*10)/10, w: Math.round(b.width), hitTop: at(b.top+1), hitBottom: at(b.bottom-1), hitMid: at(b.top+b.height/2) }; });
  ok(`R2 ${en} ${w}x${h}`, r.h>=44 && r.hitTop && r.hitBottom && r.hitMid, r); await c2.close();
 }
 await br.close();
}
process.kill(-srv.pid); process.exit(bad?1:0);
