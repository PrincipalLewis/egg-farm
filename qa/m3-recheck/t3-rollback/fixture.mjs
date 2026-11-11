import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire('/tmp/rc1pt1/clone/package.json')('playwright-core');
const srv = spawn('npx', ['vite','preview','--outDir','../rel','--port','5322','--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true, cwd:'/tmp/rc1pt1/clone' });
const URL='http://127.0.0.1:5322/'; for (let i=0;i<80;i++){ try{await fetch(URL);break;}catch{await new Promise(r=>setTimeout(r,250));} }
const snap = p => p.evaluate(async()=>{const ls={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k);} let idb=null; try{idb=(await indexedDB.databases()).map(d=>d.name);}catch(e){idb='n/a '+e.message} return {ls,idb};});
const res={};
for (const [n,l] of [['chromium',()=>pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']})],['firefox',()=>pw.firefox.launch()],['webkit',()=>pw.webkit.launch()]]) {
  const br=await l(); const ctx=await br.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
  await p.goto(URL); await p.getByText('Tap to start').click().catch(()=>{}); await p.waitForTimeout(1500);
  const cb=await p.locator('#collect').boundingBox(); for(let i=0;i<10;i++){await p.mouse.click(cb.x+5,cb.y+5);await p.waitForTimeout(150);}
  await p.waitForTimeout(12000);
  const s0=await snap(p); const save=JSON.parse(s0.ls['eggfarm.save']);
  save.version=6; save.state.wageFracCents=0; save.state.coinsCents=123456; save.state.farmLevel=7;
  // recompute sum over state (FNV-1a) so only the version is "wrong"
  const st=JSON.stringify(save.state); let h=0x811c9dc5; for(let i=0;i<st.length;i++){h^=st.charCodeAt(i);h=Math.imul(h,0x01000193);} save.sum=(h>>>0).toString(16).padStart(8,'0');
  const fx=JSON.stringify(save); fs.writeFileSync(`fixture-v6-${n}.json`,fx);
  // install fixture in a fresh page load before any app script
  await p.goto('about:blank'); await p.goto(URL+'nonexistent.txt').catch(()=>{});
  await p.evaluate(f=>{localStorage.setItem('eggfarm.save',f);localStorage.removeItem('eggfarm.save.bak');},fx);
  const before=await snap(p);
  await p.goto(URL); await p.waitForTimeout(2000);
  const ui=await p.evaluate(()=>document.body.innerText.slice(0,600));
  await p.getByText('Tap to start').click({timeout:2000}).catch(()=>{}); 
  const dlg=await p.evaluate(()=>[...document.querySelectorAll('[role=dialog],.modal')].filter(e=>e.offsetParent).map(e=>e.innerText).join(' | '));
  await p.waitForTimeout(70000);
  const after=await snap(p);
  const diff={}; for(const k of new Set([...Object.keys(before.ls),...Object.keys(after.ls)])) if(before.ls[k]!==after.ls[k]) diff[k]={before:before.ls[k]?.slice(0,120)??null,after:after.ls[k]?.slice(0,160)??null};
  const main=JSON.parse(after.ls['eggfarm.save']);
  const corrupt=Object.keys(after.ls).filter(k=>k.startsWith('eggfarm.save.corrupt.')&&k!=='eggfarm.save.corrupt.index');
  res[n]={idbBefore:before.idb,idbAfter:after.idb,mainAfter:{version:main.version,coins:main.state.coinsCents,F:main.state.farmLevel},fixtureByteIdenticalInCorruptKey:corrupt.some(k=>after.ls[k]===fx),corruptKeys:corrupt,mainUnchanged:after.ls['eggfarm.save']===fx,dlg,ui:ui.slice(0,300),diffKeys:Object.keys(diff),diff};
  await br.close();
}
fs.writeFileSync('fixture-result.json',JSON.stringify(res,null,1)); console.log(JSON.stringify(res,null,1)); try{process.kill(-srv.pid)}catch{}
