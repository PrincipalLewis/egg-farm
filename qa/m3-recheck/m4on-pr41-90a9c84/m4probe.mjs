// M4-on delta probe for 90a9c84. node m4probe.mjs <dir> <sha7> <port> <engine> <outdir> <part: gen|loop|hl|p3|layout|shots>
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import { mkdirSync, appendFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const [DIR,SHA,PORT,ENG,OUT,PART]=process.argv.slice(2); const base=`http://127.0.0.1:${PORT}/`; mkdirSync(OUT,{recursive:true});
if(PORT==='4173')process.exit(3);
const EV='/workspace/egg-farm-studio/qa/m3-recheck/m4on-pr41-90a9c84';
const srv=spawn('npx',['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'],{cwd:DIR,stdio:'ignore',detached:true});
const kill=()=>{try{process.kill(-srv.pid,'SIGTERM')}catch{}}; setTimeout(()=>{kill();process.exit(2)},570000).unref();
for(let i=0;i<120;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,250))}}
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
const st=(F,C,c,o={})=>({coinsCents:c,coop:0,basket:0,collectionLevel:C,farmLevel:F,customers:[],nextCustomerInS:(PART==='shots'||PART==='loop'?60:1e9),nextCustomerId:9,rng:5,pendingOfflineEggs:0,celebratedTier:2,workers:{},graderTier:0,manageCdS:0,coopFullS:0,...o});
const m4=(F,C,H,V,c,o={})=>st(F,C,c,{hensLevel:H,eggValueLevel:V,tracksV7:1,v6BackupId:'qa-m4on-'+F+C+H+V,celebratedMilestones:[],...o});
const CUST=[{id:1,demand:6,filled:0,waitedS:1},{id:2,demand:8,filled:0,waitedS:2},{id:3,demand:4,filled:0,waitedS:3}];
const STATES={capped:m4(3,19,3,3,2000),normal:m4(3,2,3,3,100),market:m4(3,4,3,3,500,{basket:5,coop:6,customers:CUST}),rich:m4(4,6,4,4,500000,{basket:5}),lock:m4(3,6,6,6,900000),
 v6capped:st(3,19,2000),v6rich:st(4,6,500000,{basket:5})};
let ACD={}; if(existsSync(`${EV}/acdbedc-saves.json`)) ACD=JSON.parse(readFileSync(`${EV}/acdbedc-saves.json`,'utf8'));
let bad=0; const errs=[]; const log=o=>{console.log(JSON.stringify({ENG,SHA,...o}))};
const settle=async p=>{for(let i=0;i<30;i++){const t=await p.evaluate(()=>!!document.querySelector('.toast.show,#toast.show')); if(!t)return; await p.waitForTimeout(300);}};
async function open(w,h,state){const ctx=await br.newContext({viewport:{width:w,height:h},hasTouch:w<900});const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push(`${w}x${h} ${state} pageerror ${e.message}`)); p.on('console',m=>{if(m.type()==='error')errs.push(`${w}x${h} ${state} console.error ${m.text()}`)});
 const raw=state.startsWith('acd:')?ACD[state.slice(4)]:JSON.stringify({version:6,savedAt:Date.now(),state:STATES[state]});
 await p.addInitScript(([u,s])=>{if(sessionStorage.getItem('x'))return;localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',s);sessionStorage.setItem('x','1')},[UI,raw]);
 await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm);
 const bid=await p.evaluate(()=>document.documentElement.outerHTML.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/)?.[0]||null);
 if(bid!==`m3-rc1-pre+${SHA}`){bad++;log({BIDFAIL:bid})}
 await p.waitForTimeout(600); await settle(p); return {ctx,p,bid};}
const m4rt=p=>p.evaluate(()=>{const s=window.eggfarm.state; return {tracksV7:s.tracksV7??null,H:s.hensLevel,V:s.eggValueLevel,F:s.farmLevel,C:s.collectionLevel,pending:!!window.eggfarm.tracksMigrationPending}});
const docked=w=>w>=960;
async function go(p,w,view){ const [nav,tab]=view.split(':');
 if(nav==='settings'){ await p.locator('#settings').click({force:true}); await p.waitForTimeout(900); return p.evaluate(sha=>{const e=[...document.querySelectorAll('.version')].find(e=>/Egg Farm /.test(e.textContent)); const v=e?.textContent||null; const vis=!!(e&&e.getClientRects().length); return {label:v,labelVisible:vis,ok:vis&&(v||'').includes('m3-rc1-pre+'+sha)}},SHA); }
 if(!docked(w)){ await p.evaluate(()=>document.querySelectorAll('.sheet:not([hidden]) .close').forEach(b=>b.click())); await p.waitForTimeout(400); if(nav!=='farm') await p.locator(`[data-nav=${nav}]`).click({force:true}); }
 if(tab){ await p.locator(`[data-tab=${tab}]`).first().click(); await p.waitForSelector('#uRow .up, #uRow .wk',{timeout:5000}).catch(()=>{}); }
 await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(700); await settle(p);
 return p.evaluate(([nav,tab])=>{const vis=s=>{const e=document.querySelector(s);return !!(e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0)};
  const t=document.querySelector('.tabs button.active')?.dataset.tab||null;
  const r={navOpen:{market:vis('#p-market'),upgrades:vis('#p-upgrades')},activeTab:t,collect:vis('#collect'),m4ui:{tracks:vis('#uRow .tracks'),balanced:vis('#uRow .balanced'),hensRow:vis('#uRow [data-track=hens]'),best:document.querySelector('#uRow .up.best')?.dataset.track||null,bestPending:!!document.querySelector('#uRow .up.best.pending')}};
  r.tabCard= tab==='farm'? (r.m4ui.tracks&&r.m4ui.hensRow&&!!document.querySelector('#uRow [data-track=farm]')) : tab==='collection'? [...document.querySelectorAll('#uRow .up h3')].some(h=>h.textContent==='Collect per tap') : tab==='workers'? !!document.querySelector('#uRow [data-w]') : true;
  r.ok= nav==='farm'? r.collect : nav==='market'? r.navOpen.market && vis('#sellAll') : (r.navOpen.upgrades && t===tab && !!document.querySelector(`[data-tab=${tab}].active`) && r.tabCard);
  return r},[nav,tab]);}
const strictSel=(p,sel)=>p.evaluate(sel=>{const cards=[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length); if(!cards.length)return {err:'nocard:'+sel,ov:[],out:[]};
 const R=e=>{const a=e.getBoundingClientRect();return [a.left,a.top,a.right,a.bottom]}; const nm=e=>(e.className||e.tagName)+':'+e.textContent.trim().slice(0,24); const ov=[],out=[];
 for(const card of cards){ const els=[...card.querySelectorAll('h3,.hint,.btn,.link,.lock,.maxed,.ms-hint,.meta,.tier,li,.ic,.segs,.balanced>span,.maxed')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&(e.matches('.btn,.ic')||!e.closest('.btn,.ic')));
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j]; if(a.contains(b)||b.contains(a))continue; const A=R(a),B=R(b); const x=Math.min(A[2],B[2])-Math.max(A[0],B[0]),y=Math.min(A[3],B[3])-Math.max(A[1],B[1]); if(x>0.5&&y>0.5)ov.push([card.dataset.track||card.className,nm(a),nm(b),+x.toFixed(1),+y.toFixed(1)])}
  const cr=R(card); els.forEach(e=>{const q=R(e);if(q[2]-q[0]>0&&(q[0]<cr[0]-0.5||q[2]>cr[2]+0.5||q[1]<cr[1]-0.5||q[3]>cr[3]+0.5))out.push(nm(e))}); }
 const d=document.documentElement; const lim=[...document.querySelectorAll('#uRow .hint.limit')].find(e=>e.getClientRects().length);
 return {cards:cards.length,ov,out,lim:!!lim,limPos:lim?getComputedStyle(lim).position:null,need:/Need \$/.test(cards.map(c=>c.textContent).join('')),sw:d.scrollWidth,cw:d.clientWidth}},sel);
const layoutM=p=>p.evaluate(()=>{const d=document.documentElement; const shown=e=>e.getClientRects().length&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden';
  const wide=[...document.querySelectorAll('.l1, button, .btn, .lock, .ms-hint, .balanced span')].filter(shown).filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>(e.id||e.className)+':'+e.textContent.trim().slice(0,20)+`(${e.scrollWidth}>${e.clientWidth})`);
  const small=[...document.querySelectorAll('button, .btn, a[href], [role=button], [role=tab]')].filter(shown).map(e=>{const q=e.getBoundingClientRect();return [(e.id||e.className)+':'+e.textContent.trim().slice(0,18),Math.round(q.width),Math.round(q.height)]}).filter(x=>x[1]>0&&(x[1]<44||x[2]<44));
  const buys=[...document.querySelectorAll('#uRow .btn.buy')].filter(shown).map(e=>({aff:e.classList.contains('affordable'),h:Math.round(e.getBoundingClientRect().height*100)/100}));
  const need=[...document.querySelectorAll('button, .btn')].filter(shown).filter(e=>/^\s*Need /.test(e.textContent)).map(e=>Math.round(e.getBoundingClientRect().height*100)/100);
  return {sw:d.scrollWidth,cw:d.clientWidth,wide,small,unaffBuyH:buys.filter(x=>!x.aff).map(x=>x.h),buyH:buys.map(x=>x.h),needBtnH:need}});
if(PART==='gen'){ const out={}; for(const k of ['v6capped','v6rich']){ const {ctx,p,bid}=await open(390,844,k); await p.waitForTimeout(4000);
  await p.evaluate(()=>{try{window.eggfarm.save()}catch(e){}}); await p.waitForTimeout(500);
  const raw=await p.evaluate(()=>localStorage.getItem('eggfarm.save')); out[k]=raw; const j=JSON.parse(raw); log({GEN:k,bid,version:j.version,savedAt:j.savedAt,tracksV7:j.state.tracksV7??null,hens:j.state.hensLevel??null,F:j.state.farmLevel,C:j.state.collectionLevel,coins:j.state.coinsCents}); await ctx.close(); }
 writeFileSync(`${EV}/acdbedc-saves.json`,JSON.stringify(out,null,1)); }
if(PART==='loop'){ const {ctx,p,bid}=await open(390,844,'market'); const r0=await m4rt(p); const S=()=>p.evaluate(()=>({c:window.eggfarm.state.coinsCents,b:window.eggfarm.state.basket,coop:window.eggfarm.state.coop}));
 const s0=await S(); const v=await go(p,390,'farm'); for(let i=0;i<4;i++){await p.locator('#collect').click({force:true});await p.waitForTimeout(300)} const s1=await S();
 const vm=await go(p,390,'market'); await p.locator('#sellAll').click({force:true}); await p.waitForTimeout(800); const s2=await S();
 await p.evaluate(()=>{const g=window.eggfarm; g.state={...g.state,coinsCents:g.state.coinsCents+5e7}}); const vu=await go(p,390,'upgrades:farm');
 const buys={}; for(const t of ['hens','eggValue','farm']){ const before=await m4rt(p); await p.locator(`#uRow [data-track=${t}] .btn.buy`).click(); await p.waitForTimeout(600); buys[t]=[before,await m4rt(p)]; }
 const ok=bid===`m3-rc1-pre+${SHA}`&&r0.tracksV7===1&&v.ok&&vm.ok&&vu.ok&&s1.b>s0.b&&s2.c>s0.c&&buys.hens[1].H===buys.hens[0].H+1&&buys.eggValue[1].V===buys.eggValue[0].V+1&&buys.farm[1].F===buys.farm[0].F+1;
 await p.waitForTimeout(2500); const vu2=await go(p,390,'upgrades:farm'); await p.screenshot({path:`${OUT}/loop-${ENG}-after-buys.png`});
 if(!ok)bad++; log({LOOP:1,ok,bid,r0,s0,s1,s2,buys,vu2}); await ctx.close(); }
if(PART==='hl'){ const {ctx,p}=await open(390,844,'normal'); const v=await go(p,390,'upgrades:farm');
 const snap=()=>p.evaluate(()=>({best:document.querySelector('#uRow .up.best')?.dataset.track||null,pending:!!document.querySelector('#uRow .up.best.pending'),eta:document.querySelector('#uRow .hint.eta')?.textContent||null,coins:window.eggfarm.state.coinsCents}));
 const a=await snap(); const t0=Date.now(); await p.evaluate(()=>{const g=window.eggfarm; g.state={...g.state,coinsCents:1e9}}); let b1=null,dt=null;
 for(let i=0;i<60;i++){b1=await snap(); if(b1.best&&!b1.pending){dt=Date.now()-t0;break} await p.waitForTimeout(50)}
 const seq=[]; for(let i=0;i<12;i++){ await p.evaluate(()=>{const g=window.eggfarm; g.state={...g.state,coinsCents:g.state.coinsCents+137}}); await p.waitForTimeout(250); seq.push((await snap()).best); }
 const flips=seq.filter((x,i)=>i&&x!==seq[i-1]).length; const ok=v.ok&&!!a.best&&a.pending&&!!a.eta&&dt!==null&&dt<1500&&flips===0; if(!ok)bad++;
 log({HL:1,ok,view:v,unaffordable:a,firstAffordable:b1,dtMs:dt,stableSeq:seq,flips}); await ctx.close(); }
if(PART==='p3'){ for(const [w,h] of [[360,800],[375,800],[375,700],[390,844],[430,932],[1280,800]]){ const {ctx,p}=await open(w,h,'capped'); const v=await go(p,w,'upgrades:collection');
  await p.evaluate(()=>[...document.querySelectorAll('#uRow .up')].find(e=>/Collect per tap/.test(e.textContent))?.scrollIntoView({block:'center'})); await p.waitForTimeout(300);
  const r=await strictSel(p,'#uRow .up'); const pass=v.ok&&!r.err&&r.ov.length===0&&r.out.length===0&&r.sw<=r.cw&&r.need&&r.lim&&r.limPos==='static'; if(!pass)bad++; log({P3:1,w,h,pass,view:v,...r});
  await p.locator('#uRow .up',{hasText:'Collect per tap'}).first().screenshot({path:`${OUT}/p3-${ENG}-${w}x${h}-capped-collectiontab-card.png`}); await ctx.close(); } }
if(PART==='layout'){ const L=[[360,800],[375,800],[390,844],[1280,800]];
 for(const [w,h] of L) for(const state of ['capped','rich','lock']){ const {ctx,p}=await open(w,h,state); const rt=await m4rt(p);
  for(const view of ['upgrades:farm','upgrades:collection','farm']){ const v=await go(p,w,view); const r=await layoutM(p); const s=view==='upgrades:farm'?await strictSel(p,'#uRow .tracks .up, #uRow .balanced'):{ov:[],out:[]};
   const pass=v.ok&&rt.tracksV7===1&&r.sw<=r.cw&&r.wide.length===0&&r.small.length===0&&r.buyH.every(x=>x>=44)&&r.needBtnH.every(x=>x>=44)&&s.ov.length===0&&s.out.length===0&&!s.err; if(!pass)bad++;
   log({LAYOUT:1,w,h,state,view,pass,view_ok:v.ok,m4ui:v.m4ui,rt,...r,ov:s.ov,out:s.out,err:s.err}); }
  await ctx.close(); }
 for(const [w,h] of L){ const {ctx,p}=await open(w,h,'market'); const v=await go(p,w,'market'); const r=await layoutM(p); const pass=v.ok&&r.sw<=r.cw&&r.wide.length===0&&r.small.length===0&&r.needBtnH.every(x=>x>=44); if(!pass)bad++; log({LAYOUT:1,w,h,state:'market',view:'market',pass,view_ok:v.ok,...r}); await ctx.close(); } }
if(PART==='shots'){ const S=[[360,800],[375,800],[390,844],[1280,800]];
 const V=[['farm','market','farm main view, M4 on, 3 customers'],['market','market','Market sheet, 3 orders (Need-state rows), Sell all'],['upgrades:farm','capped','Upgrades > Farm (M4 tracks: Balanced strip, Hens, Egg value, Farm), all rows Need/ETA, highlight pending'],['upgrades:farm','rich','Upgrades > Farm (M4 tracks), F4 H4 V4 $5000, highlight best (affordable)'],['upgrades:collection','capped','Upgrades > Collection, F3/C19 $20, .hint.limit (PM4-P3 state)'],['settings','normal','Settings open, build label m3-rc1-pre+'+SHA+' (HUD label check)']];
 const ACDV=[['upgrades:farm','acd:v6rich','acdbedc-written v6 save (pre-M4, F4/C6 $5000) loaded on '+SHA+' -> migrated, Upgrades > Farm M4 tracks'],['upgrades:farm','acd:v6capped','acdbedc-written v6 save (pre-M4, F3/C19 $20) loaded on '+SHA+' -> migrated, Upgrades > Farm M4 tracks']];
 const jobs=[]; for(const [w,h] of S) for(const x of V) jobs.push([w,h,...x]); jobs.push([390,844,...ACDV[0]],[1280,800,...ACDV[1]]);
 for(const [w,h,view,state,desc] of jobs){ const {ctx,p,bid}=await open(w,h,state); const rt=await m4rt(p); const v=await go(p,w,view);
  const okM4= view==='settings'||view==='farm'||view==='market'||view==='upgrades:collection' ? rt.tracksV7===1 : (rt.tracksV7===1&&v.m4ui.tracks&&v.m4ui.balanced);
  const name=`${ENG}/${view.replace(':','-')}-${state.replace('acd:','acdbedc-')}-${w}x${h}.png`; mkdirSync(`${OUT}/${ENG}`,{recursive:true});
  await p.screenshot({path:`${OUT}/${name}`}); if(!v.ok||!okM4)bad++;
  appendFileSync(`${OUT}/entries-${ENG}.jsonl`,JSON.stringify({file:name,engine:ENG,size:`${w}x${h}`,docked:w>=960,save:state.startsWith('acd:')?`acdbedc save ${state.slice(4)} (qa/m3-recheck/m4on-pr41-90a9c84/acdbedc-saves.json, written by build m3-rc1-pre+acdbedc)`:`inline ${state} (m4probe.mjs STATES)`,acdbedcSave:state.startsWith('acd:'),seed:null,state:desc,asserted:v,m4runtime:rt,m4ok:okM4,bid})+'\n'); log({SHOT:name,ok:v.ok&&okM4,rt,...v}); await ctx.close(); } }
await br.close(); kill(); for(const e of errs)console.log('ERR',e); console.log('CONSOLE_ERRORS',errs.length); console.log('BAD',bad); process.exit(0);
