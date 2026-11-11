import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire('/tmp/rc1pt1/clone/package.json')('playwright-core');
const [eng, mode, port, durS] = process.argv.slice(2); // mode: fg | rm | hidden | freeze | cpu
const srv = spawn('npx', ['vite','preview','--outDir','../rel','--port',port,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true, cwd:'/tmp/rc1pt1/clone' });
const URL=`http://127.0.0.1:${port}/`; for (let i=0;i<80;i++){ try{await fetch(URL);break;}catch{await new Promise(r=>setTimeout(r,250));} }
const br = eng==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[eng].launch();
const ctx=await br.newContext({viewport:{width:390,height:844}, reducedMotion: mode==='rm'?'reduce':'no-preference'}); const p=await ctx.newPage();
await p.addInitScript(()=>{ window.__fl=[]; const born=new Map();
  new MutationObserver(ms=>{const t=performance.now(); for(const m of ms){ for(const n of m.addedNodes) if(n.classList?.contains('floater')) born.set(n,{t,txt:n.textContent,cls:n.className});
    for(const n of m.removedNodes) if(born.has(n)){const b=born.get(n); __fl.push({txt:b.txt,cls:b.cls,life:t-b.t}); born.delete(n);} }}).observe(document,{subtree:true,childList:true});
  window.__live=()=>[...born.entries()].map(([n,b])=>({txt:b.txt,age:performance.now()-b.t,connected:n.isConnected,op:getComputedStyle(n).opacity}));
});
await p.goto(URL); await p.getByText('Tap to start').click().catch(()=>{}); await p.waitForTimeout(800);
const close=async()=>{await p.keyboard.press('Escape').catch(()=>{}); for(const c of await p.locator('.panel.open .close').all()) await c.click({timeout:500,force:true}).catch(()=>{});};
const skip=async()=>{for(const s of ['#wbCollect','.modal button.btn','.coach button']){const l=p.locator(s).first(); if(await l.isVisible().catch(()=>false)) await l.click({timeout:500}).catch(()=>{});}};
let cdp=null; if(eng==='chromium'&&(mode==='freeze'||mode==='cpu'||mode==='hidden')) cdp=await ctx.newCDPSession(p);
if(cdp&&mode==='cpu') await cdp.send('Emulation.setCPUThrottlingRate',{rate:20});
const t0=Date.now(); let sells=0, worst=[], it=0;
while(Date.now()-t0<durS*1000){ it++;
  await skip(); const cb=await p.locator('#collect').boundingBox().catch(()=>null);
  if(cb) for(let i=0;i<10;i++){await p.mouse.click(cb.x+cb.width/2,cb.y+cb.height/2); await p.waitForTimeout(60);}
  const chip=p.locator('.queue .chip:not(.empty):not(.served)').first();
  if(!(await chip.isVisible().catch(()=>false))) await p.locator('[data-nav=market]').click({force:true,timeout:500}).catch(()=>{});
  { await chip.click({force:true,timeout:800}).catch(()=>{});
    for(let k=0;k<4;k++){ const b=p.locator('#mRows button[data-id]:not([aria-disabled=true]), #sellAll:not([aria-disabled=true])').first(); if(await b.isVisible().catch(()=>false)){await b.click({timeout:500,force:true}).catch(()=>{}); sells++;} }
    if(it%3===0){ await close(); await chip.click({force:true,timeout:500}).catch(()=>{}); } // sell then panel open/close
    await close(); }
  if(it%5===0){ await p.setViewportSize({width:it%10?1280:390,height:it%10?800:844}); }
  if(it%4===0){ const b=p.locator('#uRow button[data-kind]').first(); await b.click({timeout:500,force:true}).catch(()=>{}); await close(); }
  if((mode==='hidden'||mode==='freeze') && it%3===0){
    // sell then immediately background
    if(mode==='hidden'){ const p2=await ctx.newPage(); await p2.goto('about:blank'); await p2.bringToFront(); await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}); await p2.waitForTimeout(20000); await p2.close(); await p.bringToFront(); await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}); }
    if(mode==='freeze'){ const L=await p.evaluate(()=>__live().length); await cdp.send('Page.setWebLifecycleState',{state:'frozen'}); await new Promise(r=>setTimeout(r,30000)); worst.push({frozenLive:L}); await cdp.send('Page.setWebLifecycleState',{state:'active'}); }
  }
  const live=await p.evaluate(()=>__live()); const old=live.filter(x=>x.age>1000); if(old.length) worst.push({t:(Date.now()-t0)/1000,old});
}
await p.waitForTimeout(2000);
const fl=await p.evaluate(()=>__fl); const live=await p.evaluate(()=>__live());
const lives=fl.map(x=>x.life).sort((a,b)=>a-b);
const out={eng,mode,durS:+durS,sells,floaters:fl.length,sale:fl.filter(x=>x.txt.startsWith('+$')).length,maxLifeMs:Math.round(lives.at(-1)??0),p99:Math.round(lives[Math.floor(lives.length*.99)]??0),over1s:fl.filter(x=>x.life>1000).slice(0,10),stillLive:live,worst:worst.slice(0,10)};
fs.writeFileSync(`t3-${eng}-${mode}.json`,JSON.stringify(out,null,1)); console.log(JSON.stringify(out));
await br.close(); try{process.kill(-srv.pid)}catch{}
