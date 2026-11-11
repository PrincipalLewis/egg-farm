import { createRequire } from 'node:module'; import { spawn } from 'node:child_process';
const pw = createRequire('/tmp/rc1pt1/clone/package.json')('playwright-core');
const srv = spawn('npx', ['vite','preview','--outDir','../rel','--port','5321','--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true, cwd:'/tmp/rc1pt1/clone' });
const URL='http://127.0.0.1:5321/'; for (let i=0;i<80;i++){ try{await fetch(URL);break;}catch{await new Promise(r=>setTimeout(r,250));} }
const br = await pw.chromium.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox'] });
const out={};
for (const [name,vp] of [['390',{width:390,height:844}],['desktop',{width:1280,height:800}]]) {
  const ctx=await br.newContext({viewport:vp}); const p=await ctx.newPage(); const errs=[], cons=[];
  p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error') cons.push(m.text()); });
  p.setDefaultTimeout(4000);
  await p.goto(URL); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
  const top = await p.evaluate(()=>document.body.innerText.match(/build [0-9a-f]{7}/)?.[0]??null);
  const st=()=>p.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {c:s.coinsCents,F:s.farmLevel,C:s.collectionLevel};}catch{return null}});
  const skip=async()=>{for(const s of ['#wbCollect','.modal button.btn','.coach button','[data-coach] button']){const l=p.locator(s).first(); if(await l.isVisible().catch(()=>false)) await l.click().catch(()=>{});}};
  const close=async()=>{await p.keyboard.press('Escape').catch(()=>{}); for(const c of await p.locator('.panel.open .close').all()) await c.click({timeout:800,force:true}).catch(()=>{}); await p.waitForTimeout(200);};
  const t0=Date.now(); let last=t0, maxGap=0, buys=0, firstBuy=null, stuck=0;
  while(Date.now()-t0<150000){
    await skip();
    const cb=await p.locator('#collect').boundingBox().catch(()=>null);
    if(cb) for(let i=0;i<8;i++){await p.mouse.click(cb.x+cb.width/2,cb.y+cb.height/2); await p.waitForTimeout(120);} else stuck++;
    const chip=p.locator('.queue .chip:not(.empty):not(.served)').first();
    if(await chip.isVisible().catch(()=>false)){await chip.click({force:true}).catch(()=>{}); await p.waitForTimeout(250); const sa=p.locator('#sellAll'); if(await sa.isVisible().catch(()=>false)&&await sa.getAttribute('aria-disabled')!=='true') await sa.click().catch(()=>{}); await close();}
    await close(); await p.locator('[data-nav=upgrades]').click({force:true,timeout:1500}).catch(()=>{}); await p.waitForTimeout(300);
    for(let k=0;k<3;k++){const b=p.locator('#uRow button[data-kind][aria-disabled=false], #uRow button[data-kind].affordable').first(); if(await b.isVisible().catch(()=>false)){await b.click({timeout:1500}).catch(()=>{}); buys++; const n=Date.now(); maxGap=Math.max(maxGap,n-last); last=n; firstBuy??=(n-t0)/1000; await p.waitForTimeout(250);} else break;}
    await close();
  }
  maxGap=Math.max(maxGap,Date.now()-last);
  await p.screenshot({path:`/tmp/rc1pt1/smoke-${name}.png`});
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  out[name]={top,buys,firstBuy,maxGapS:maxGap/1000,end:await st(),errs,cons:cons.slice(0,5),stuck,overflow};
  await ctx.close();
}
console.log(JSON.stringify(out,null,1)); await br.close(); try{process.kill(-srv.pid)}catch{}
