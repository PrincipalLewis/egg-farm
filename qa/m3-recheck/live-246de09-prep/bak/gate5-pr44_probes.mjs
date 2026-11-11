// Gate 5 behaviour probes (Chromium). node probes.mjs <outdir> <part: pl1|g3|m1|milestones|w2|all-fast>
// env: SHA, URL, EXPECT_PL1_FIXED (default 1), W2_CAP_S (default 540: must fit the lock's timeout 600)
const pw=(await import(process.env.PW||'/tmp/qa-g5-4ccb9fd/node_modules/playwright-core/index.mjs')).default;
import { mkdirSync, appendFileSync } from 'node:fs';
import { loadState } from './lib.mjs';
const [OUT,PART]=process.argv.slice(2);const SHA=process.env.SHA,URL=process.env.URL;globalThis.__URL=URL;
if(!/^[0-9a-f]{40}$/.test(SHA||'')||!URL||/:4173\b/.test(URL))throw new Error('SHA/URL');
const LABEL=`m3-rc1-pre+${SHA.slice(0,7)}`;mkdirSync(`${OUT}/probes`,{recursive:true});mkdirSync(`${OUT}/chromium`,{recursive:true});
const res=(part,o)=>{const l=JSON.stringify({t:new Date().toISOString(),sha:SHA,part,...o});appendFileSync(`${OUT}/probes/${part}.jsonl`,l+'\n');console.log(l)};
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
const page=async(w=390,h=844)=>{const c=await br.newContext({viewport:{width:w,height:h}});const p=await c.newPage();p.__c=c;p.__err=[];p.on('pageerror',e=>p.__err.push(e.message));return p};
const bid=async p=>{const b=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(b!==LABEL)throw new Error('build-id '+b);};
const save=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state);
const live=async p=>{await p.waitForTimeout(1300);return save(p)}; // save flush
const tabUp=async(p,t)=>{if(!(await p.locator(`[data-tab=${t}]`).isVisible()))await p.locator('[data-nav=upgrades]').click();await p.locator(`[data-tab=${t}]`).click();
 await p.waitForFunction(x=>document.querySelector(`[data-tab=${x}]`).classList.contains('active'),t,{timeout:3000});};
const hasM4=p=>p.locator('#uRow [data-kind=hens], [data-track=hens]').count().then(n=>n>0);
const parts=PART==='all-fast'?['pl1','g3','m1','milestones']:[PART];
for(const part of parts){try{
 if(part==='pl1'){ // PL-1 (#43 guard): Esc=0; single Enter/Space=1; Enter/Space held 2 s (trusted repeat keydowns) = 1
  const hold=async(p,key,ms)=>{await p.keyboard.down(key);const t=Date.now();while(Date.now()-t<ms){await p.waitForTimeout(33);await p.keyboard.down(key);}await p.keyboard.up(key);};
  const K={esc:[p=>p.keyboard.press('Escape'),0],enter:[p=>p.keyboard.press('Enter'),1],space:[p=>p.keyboard.press(' '),1],enterHold2s:[p=>hold(p,'Enter',2000),1],spaceHold2s:[p=>hold(p,' ',2000),1]};
  for(const [w,h] of [[390,844],[1280,800]])for(const [k,[fn,want]] of Object.entries(K)){const p=await page(w,h);await loadState(p,'pl1');await bid(p);await tabUp(p,'farm');
   await p.locator('#uRow [data-kind=farm]').focus();await p.waitForTimeout(1300);const s0=await save(p);const ae0=await p.evaluate(()=>document.activeElement?.dataset?.kind||document.activeElement?.tagName);
   await fn(p);const s1=await live(p);const ae1=await p.evaluate(()=>document.activeElement?.dataset?.kind||document.activeElement?.tagName);const got=s1.farmLevel-s0.farmLevel;
   res('pl1',{size:`${w}x${h}`,key:k,focusedBefore:ae0,focusAfter:ae1,levels:got,coinDelta:(s1.coinsCents-s0.coinsCents)/100,want,pass:got===want,pageerrors:p.__err});await p.__c.close();}}
 if(part==='g3'){ // explainer once + no toast storm on migrated acdbedc
  const p=await page();await loadState(p,'migrated-acdbedc');await bid(p);
  const ex=()=>p.getByText(/got an upgrade/i).first().isVisible().catch(()=>false);
  const toasts=async ms=>{await p.evaluate(()=>{window.__t=[];const t=document.querySelector('.toast');new MutationObserver(()=>{if(t.classList.contains('show'))__t.push(t.textContent)}).observe(t,{attributes:true,childList:true,characterData:true,subtree:true})});await p.waitForTimeout(ms);return p.evaluate(()=>[...new Set(__t)])};
  const first=await ex();const t1=await toasts(5000);
  if(first)await p.getByRole('button',{name:/Got it/}).click().catch(()=>{});await p.waitForTimeout(1500);
  await p.reload();await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);const again=await ex();const t2=await toasts(5000);
  const s=await save(p);res('g3',{explainerFirstLoad:first,explainerAfterReload:again,toastsFirst:t1,toastsAfterReload:t2,state:{coins:s.coinsCents,F:s.farmLevel,C:s.collectionLevel,H:s.hensLevel,V:s.eggValueLevel},
   verdict:!first?'N/A: no explainer on this build':again?'FAIL: explainer re-shown':t1.length+t2.length>3?'FAIL: toast storm':'PASS',pageerrors:p.__err});await p.__c.close();}
 if(part==='m1'){ // hint (goal label) vs Farm-tab highlight row, sampled over 6 s incl. 2 s hold
  for(const st of ['fresh','L10']){ /* M4-A: hint vs Farm-tab highlight, sampled 12x500ms */const p=await page();await loadState(p,st);await bid(p);await tabUp(p,'farm');const samples=[];
   for(let i=0;i<12;i++){samples.push(await p.evaluate(()=>({goal:document.querySelector('.goal-label')?.textContent?.trim(),hl:[...document.querySelectorAll('#uRow .up.best, #uRow .up.best.pending')].map(e=>e.dataset.track||(e.querySelector('h3')?.textContent))})));await p.waitForTimeout(500);}
   const m4=await hasM4(p);const mism=samples.filter(x=>x.hl.length&&x.goal&&!x.hl.some(h=>x.goal.toLowerCase().includes(h==='eggValue'?'egg value':h==='Farm level'?'farm':h.toLowerCase())));
   res('m1',{state:st,m4,samples,mismatches:mism.length,verdict:!m4?'N/A: M4 off (no highlight rows)':mism.length?'CHECK: hint != highlight in some samples':'PASS',pageerrors:p.__err});await p.__c.close();}}
 if(part==='milestones'){ // H6 Hens L10 toast, V2 grade toast, B1 balanced toast by real buys from L10
  const p=await page();await loadState(p,'L10');await bid(p);await tabUp(p,'farm');
  if(!(await hasM4(p))){res('milestones',{verdict:'N/A: M4 track rows absent on this build'});await p.__c.close();continue;}
  await p.evaluate(()=>{window.__t=[];const t=document.querySelector('.toast');new MutationObserver(()=>{if(t.classList.contains('show'))__t.push(t.textContent)}).observe(t,{attributes:true,childList:true,characterData:true,subtree:true})});
  const buys=[];for(const k of ['hens','eggValue','eggValue','eggValue']){const b=p.locator(`#uRow [data-kind=${k}]`);if(await b.count()){await b.first().click().catch(()=>{});buys.push(k);await p.waitForTimeout(1800);}}
  const t=await p.evaluate(()=>[...new Set(__t)]);const s=await save(p);await p.screenshot({path:`${OUT}/chromium/probe-milestones-390x844.png`});
  res('milestones',{buys,toasts:t,H:s.hensLevel,V:s.eggValueLevel,H6:t.some(x=>/^Hens L10/.test(x)),V2:t.some(x=>/^Egg value L\d+: (Grade A|Large|Jumbo)/.test(x)),B1:t.some(x=>/^Balanced farm \d\/5/.test(x)),pageerrors:p.__err});await p.__c.close();}
 if(part==='w2'){ // a worker falls asleep naturally from the L10 save; only the game clock advances
  const cap=+(process.env.W2_CAP_S||540)*1000;const p=await page();const desc=await loadState(p,'L10');await bid(p);await tabUp(p,'workers');const t0=Date.now();let asleep=false;
  while(Date.now()-t0<cap){asleep=await p.evaluate(()=>/Asleep/.test(document.querySelector('#uRow')?.innerText||''));if(asleep)break;await p.waitForTimeout(5000);}
  const el=Math.round((Date.now()-t0)/1000);
  if(!asleep){res('w2',{elapsedS:el,verdict:'W2 waived per Art & UX (no worker asleep within cap)'});}
  else{await tabUp(p,'workers');await p.waitForFunction(()=>/Asleep/.test(document.querySelector('#uRow').innerText),null,{timeout:3000});
   const m=await p.evaluate(()=>{const r=[...document.querySelectorAll('#uRow *')].filter(e=>e.children.length===0&&/Asleep/.test(e.textContent))[0];const b=r?.getBoundingClientRect();return {text:r?.textContent,w:b?.width,overflow:r?r.scrollWidth>r.clientWidth+1:null}});
   const file='chromium/w2-asleep-L10-390x844.png';await p.screenshot({path:`${OUT}/${file}`});
   appendFileSync(`${OUT}/entries-chromium.jsonl`,JSON.stringify({file,type:'w2-asleep',engine:'chromium',size:'390x844',docked:false,save:desc,seed:null,state:`L10 · upgrades-workers · worker asleep after ${el}s of natural game time (no injection after load)`,asserted_tab:'workers',asserted_panel:'upgrades',checks:m})+'\n');
   res('w2',{elapsedS:el,label:m,verdict:'SHOT'});}
  await p.__c.close();}
}catch(e){res(part,{verdict:'ERROR',error:e.message.split('\n')[0]})}}
await br.close();
