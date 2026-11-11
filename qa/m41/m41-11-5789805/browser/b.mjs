// PR #60 @ 5789805 browser checks (Chromium blocking). usage: node b.mjs <engine> <width> <suite: ex|rel|f20>
// ex  : release build:html of 5789805 (dist-html, no QA hook): migrated-save Ex1 (F5/C15) + Ex2 (F0/C30), N-1 keeps lock, N unlocks.
// rel : released asset m3-rc1-pre+246de09 (sha 0bc5bb72...): Ex1 bug confirmation (expect the old F+1 label).
// f20 : QA-only build:qa of 5789805 with balance.json farmMaxLevel=20 (mirrors the PR's own f20 unit-test balance) for the
//       B1-9 'Max for this farm' row layout + aria; plus MAX at the cap and a normal lock row next to it.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=(await import('/tmp/qa-m41-11-5789805/node_modules/playwright-core/index.mjs')).default;
const [ENG,W,SUITE]=[process.argv[2],+process.argv[3],process.argv[4]];const H=800;const BASE=process.env.BASE||'http://127.0.0.1:4893/';
const E='/workspace/egg-farm-studio/qa/m41/m41-11-5789805/';const OUT=E+'browser/';mkdirSync(`${E}shots/${ENG}`,{recursive:true});
const CFG={ex:{dir:'html/',page:'egg-farm.html',bid:'m3-rc1-pre+5789805',sha:'4768f8a5b6ceb2f141ed2ffc740bebfc09a63224bc27bf81a1c9b9f5cce8e8fd'},
 rel:{dir:'rel/',page:'egg-farm.html',bid:'m3-rc1-pre+246de09',sha:'0bc5bb72df4ab0dee287d3e1d57b7d8178659a147dd6740738b3f0ea8f179a4c'},
 f20:{dir:'',page:'',bid:'m3-rc1-pre+5789805+dirty',sha:'qa-only build (balance.json farmMaxLevel=20)'}}[SUITE];
const MAN=`${OUT}entries-${SUITE}-${ENG}-${W}.jsonl`;writeFileSync(MAN,'');const LOG=`${OUT}probes-${SUITE}-${ENG}-${W}.jsonl`;writeFileSync(LOG,'');
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('FAIL',m)}return c};
const st=p=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {F:s.farmLevel,C:s.collectionLevel,H:s.hensLevel,V:s.eggValueLevel,tracksV7:s.tracksV7??null,v6BackupId:s.v6BackupId??null,coins:s.coinsCents}});
async function boot(fx){const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+CFG.dir+'favicon-none').catch(()=>{});
 await p.evaluate(([u,r])=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u));if(r)localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},[UI,fx?readFileSync(`${E}fixtures/${fx}.json`,'utf8'):null]);
 await p.goto(BASE+CFG.dir+CFG.page);
 const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);
 const hud=await p.evaluate(()=>document.body.innerText.match(/build [^\s]+/)?.[0]??null);
 if(!ok(bid===CFG.bid,`runtime build-id ${bid} != ${CFG.bid}`))throw new Error('bid');
 await p.getByText('Tap to start').click({timeout:60000});
 for(let i=0;i<25;i++){await p.waitForTimeout(300);
  if(await p.locator('#wbCollect').isVisible().catch(()=>false)){await p.locator('#wbCollect').click({timeout:3000}).catch(()=>{});continue;}
  if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false)){await p.locator('.tracks-exp button').first().click({timeout:3000}).catch(()=>{});continue;}
  if(i>4)break;}
 await p.waitForTimeout(400);return {c,p,errs,bid,hud};}
async function farmTab(p){if(!await p.locator('[data-tab=farm]').isVisible().catch(()=>false))await p.locator('[data-nav=upgrades]').click({timeout:10000});
 await p.locator('[data-tab=farm]').click({timeout:5000});await p.waitForTimeout(400);}
async function assertTab(p){const t=await p.evaluate(()=>[...document.querySelectorAll('[role=tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').map(e=>e.dataset.tab));if(!ok(t.length===1&&t[0]==='farm',`active tab ${t}`))throw new Error('tab');return t[0];}
async function rowInfo(p,key){const r=p.locator(`.tracks .up[data-track=${key}]`);await r.scrollIntoViewIfNeeded();await p.waitForTimeout(250);
 return r.evaluate(e=>{const b=e.getBoundingClientRect();const lk=e.querySelector('.lock'),mx=e.querySelector('.maxed');const el=lk||mx;const eb=el?.getBoundingClientRect();
  return {text:e.innerText.replace(/\s+/g,' ').trim(),lockText:lk?.textContent??null,lockAria:lk?.getAttribute('aria-label')??null,rowAria:e.getAttribute('aria-label'),role:e.getAttribute('role'),maxed:mx?.textContent??null,farmMaxPill:!!e.querySelector('.maxed.farm-max'),
   button:!!e.querySelector('button'),num:!!e.querySelector('.num'),eta:!!e.querySelector('.eta'),affordable:!!e.querySelector('.affordable'),best:e.classList.contains('best'),
   glyph:lk?getComputedStyle(lk,'::before').content:null,
   visible:b.height>0&&b.top>=0&&b.bottom<=innerHeight+1,
   el:el?{sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight,left:eb.left,right:eb.right,rowLeft:b.left,rowRight:b.right,lines:Math.round(eb.height/parseFloat(getComputedStyle(el).lineHeight||'20')),ws:getComputedStyle(el).whiteSpace}:null,
   docOverflow:document.documentElement.scrollWidth>innerWidth}});}
async function shot(p,cas,step,key,extra={}){const tab=await assertTab(p);const info=await rowInfo(p,key);ok(info.visible,`${cas}/${step} row not visible`);
 const other=await rowInfo(p,key==='hens'?'eggValue':'hens');await p.locator(`.tracks .up[data-track=${key}]`).scrollIntoViewIfNeeded();
 const s=await p.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {F:s.farmLevel,H:s.hensLevel,V:s.eggValueLevel,tracksV7:s.tracksV7??null,v6BackupId:s.v6BackupId??null}}catch{return null}});
 const goalAria=await p.evaluate(()=>document.querySelector('#goal')?.getAttribute('aria-label')??null);
 const file=`shots/${ENG}/${SUITE}-${cas}-${step}-w${W}.png`;await p.screenshot({path:E+file});
 const lay=info.el;if(lay)ok(lay.sw<=lay.cw&&lay.right<=lay.rowRight+0.5&&lay.left>=lay.rowLeft-0.5,`${cas}/${step} clip ${JSON.stringify(lay)}`);ok(!info.docOverflow,`${cas}/${step} page overflow-x`);
 const e={file,sha:'5789805911ad7f96c23fdf42d06a1854a936c0c3',build_id:CFG.bid,asset_sha256:CFG.sha,engine:ENG,size:`${W}x${H}`,case:cas,step,asserted_tab:tab,row:key,row_info:info,other_row:{key:key==='hens'?'eggValue':'hens',lockText:other.lockText,lockAria:other.lockAria,rowAria:other.rowAria,maxed:other.maxed,text:other.text},goal_aria:goalAria,state:s,...extra};appendFileSync(MAN,JSON.stringify(e)+'\n');return info;}
async function buyFarm(p){const b0=(await st(p)).F;await p.locator('.tracks .up[data-track=farm] button.buy').click({timeout:5000});await p.waitForTimeout(500);const b1=(await st(p)).F;ok(b1===b0+1,`farm buy ${b0}->${b1}`);return b1;}
async function tryEgg(p){const r=p.locator('.tracks .up[data-track=eggValue]');const v0=(await st(p)).V;const has=await r.locator('button.buy').count();
 if(has)await r.locator('button.buy').click();else{await r.click({force:true}).catch(()=>{});await p.keyboard.press('Enter');}
 await p.waitForTimeout(500);const v1=(await st(p)).V;return {attempt:has?'tap Buy':'no Buy button: tap row + Enter',V_before:v0,V_after:v1,bought:v1>v0};}
async function run(n,fn){try{await fn()}catch(e){ok(false,`${n} threw ${e.message.slice(0,200)}`);for(const c of br.contexts())for(const pg of c.pages())await pg.screenshot({path:`${OUT}debug-${SUITE}-${ENG}-${W}-${n}.png`}).catch(()=>{});for(const c of br.contexts())await c.close().catch(()=>{})}}
if(SUITE==='ex'||SUITE==='rel'){
 await run('ex1',async()=>{const {c,p,errs,bid,hud}=await boot('pre-v7-F5-C15');const m=await st(p);ok(m.tracksV7===1&&!!m.v6BackupId,`ex1 migration marker ${JSON.stringify(m)}`);ok(m.F===5&&m.V===9,`ex1 F/V ${JSON.stringify(m)}`);
  await farmTab(p);const exp=SUITE==='ex'?7:6;
  let t=await tryEgg(p);let i=await shot(p,'ex1-F5C15','F5-locked','eggValue',{tryBuy:t,migrated:m,bid,hud});ok(i.lockText===`Needs Farm L${exp}`&&i.lockAria===`Egg value, level 9, locked. Needs Farm level ${exp}.`,`ex1 F5 label ${i.lockText} | ${i.lockAria}`);ok(!t.bought,'ex1 bought at F5');
  if(SUITE==='ex'){await buyFarm(p);t=await tryEgg(p);i=await shot(p,'ex1-F5C15','F6-N-1-still-locked','eggValue',{tryBuy:t});ok(i.lockText==='Needs Farm L7'&&!t.bought,`ex1 F6 ${i.lockText} bought=${t.bought}`);
   await buyFarm(p);i=await shot(p,'ex1-F5C15','F7-N-unlocked','eggValue');ok(!i.lockText&&i.button,`ex1 F7 not unlocked ${i.text}`);t=await tryEgg(p);ok(t.bought&&t.V_after===10,`ex1 F7 buy ${JSON.stringify(t)}`);await shot(p,'ex1-F5C15','F7-bought-V10','eggValue',{tryBuy:t});}
  else{await buyFarm(p);t=await tryEgg(p);i=await shot(p,'ex1-F5C15','F6-claimed-level-still-locked','eggValue',{tryBuy:t});ok(!t.bought,'rel F6 bought?');}
  appendFileSync(LOG,JSON.stringify({case:'ex1',errs})+'\n');await c.close();});
 if(SUITE==='ex')await run('ex2',async()=>{const {c,p,errs}=await boot('pre-v7-F0-C30');const m=await st(p);ok(m.tracksV7===1&&!!m.v6BackupId&&m.F===0&&m.V===12,`ex2 marker ${JSON.stringify(m)}`);await farmTab(p);const walk=[];
  for(let F=0;F<=10;F++){const t0=F<10?await tryEgg(p):null;const step=F===0?'F0-locked':F===9?'F9-N-1-still-locked':F===10?'F10-N-unlocked':null;
   const i=step?await shot(p,'ex2-F0C30',step,'eggValue',{tryBuy:t0,...(F===0?{migrated:m}:{})}):await rowInfo(p,'eggValue');walk.push({F,lockText:i.lockText,lockAria:i.lockAria,button:i.button,tryBuy:t0});
   if(F<10){ok(i.lockText==='Needs Farm L10'&&i.lockAria==='Egg value, level 12, locked. Needs Farm level 10.'&&!t0.bought,`ex2 F${F} ${i.lockText} ${i.lockAria} bought=${t0?.bought}`);await buyFarm(p);}
   else{ok(!i.lockText&&i.button,'ex2 F10 not unlocked');const t=await tryEgg(p);ok(t.bought&&t.V_after===13,`ex2 F10 buy ${JSON.stringify(t)}`);walk.push({F,after:t});await shot(p,'ex2-F0C30','F10-bought-V13','eggValue',{tryBuy:t});}}
  appendFileSync(LOG,JSON.stringify({case:'ex2',walk,errs})+'\n');await c.close();});
}
if(SUITE==='f20'){
 await run('f20',async()=>{const {c,p,errs,bid}=await boot(null);await farmTab(p);
  const set=(F,H,V,coins)=>p.evaluate(([F,H,V,coins])=>{const g=window.eggfarm;g.state={...g.state,tracksV7:1,farmLevel:F,hensLevel:H,eggValueLevel:V,coinsCents:coins};window.eggfarmUi.render();},[F,H,V,coins]);
  const fm=await p.evaluate(()=>[window.eggfarm.balance.farmMaxLevel,window.eggfarm.balance.maxLevel]);ok(fm[0]===20&&fm[1]===30,`f20 balance ${fm}`);
  for(const [F,coins] of [[15,1e15],[20,0]]){await set(F,18,25,coins);await p.waitForTimeout(1200);
   let i=await shot(p,'farmmax',`F${F}-V25-H18-${coins?'rich':'broke'}`,'eggValue',{balance:fm});
   ok(i.rowAria==='Egg value, level 25. Max for this farm.'&&i.maxed==='Max for this farm'&&i.farmMaxPill&&!i.lockText&&!i.button&&!i.num&&!i.eta&&!i.affordable&&!i.best&&i.role==='group',`farmmax row ${JSON.stringify(i)}`);
   ok(i.el&&i.el.ws==='nowrap',`farmmax nowrap ${i.el?.ws}`);
   const ga=await p.evaluate(()=>document.querySelector('#goal')?.getAttribute('aria-label')??'');ok(!/Egg value/.test(ga),`goal strip targets Egg value: ${ga}`);
   const h=await shot(p,'farmmax',`F${F}-H18-neighbour`,'hens');if(F===15)ok(h.lockText==='Needs Farm L16'&&h.lockAria==='Hens, level 18, locked. Needs Farm level 16.',`neighbour ${h.lockText}|${h.lockAria}`);}
  await set(29,30,30,0);await p.waitForTimeout(800);let i=await shot(p,'max-at-cap','F29-V30-H30','eggValue');ok(i.maxed==='MAX'&&!i.farmMaxPill&&i.rowAria==='Egg value, level 30, max.'&&!i.button,`MAX row ${JSON.stringify(i)}`);
  appendFileSync(LOG,JSON.stringify({case:'f20',errs,bid})+'\n');await c.close();});
}
await br.close();console.log(`done ${SUITE} ${ENG} ${W} fails=${fails.length}`);appendFileSync(LOG,JSON.stringify({done:true,fails})+'\n');
