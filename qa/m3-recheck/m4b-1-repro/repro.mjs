// M4B-1 / M4B-2 independent repro. usage: node repro.mjs <engine> <width>  (URL env, own server)
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=await import('/tmp/qa-live-246de09/node_modules/playwright-core/index.mjs');
const [ENG,W]=[process.argv[2],+process.argv[3]];const H=800;const URL=process.env.URL;const BID=process.env.BID||'m3-rc1-pre+246de09';
const ASSET_SHA=process.env.ASSET_SHA||'0bc5bb72df4ab0dee287d3e1d57b7d8178659a147dd6740738b3f0ea8f179a4c';
const OUT=process.env.OUTDIR||'/workspace/egg-farm-studio/qa/m3-recheck/m4b-1-repro/';const FXD=process.env.FXDIR||'/workspace/egg-farm-studio/qa/m3-recheck/m4b-1-repro/fixtures/';mkdirSync(`${OUT}shots/${ENG}`,{recursive:true});
const MAN=`${OUT}entries-${ENG}-${W}.jsonl`,PROBE=`${OUT}probes-${ENG}-${W}.jsonl`;writeFileSync(MAN,'');writeFileSync(PROBE,'');
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
const fail=[];const ok=(c,m)=>{if(!c){fail.push(m);throw new Error('ASSERT '+m)}};
const st=p=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {F:s.farmLevel,C:s.collectionLevel,H:s.hensLevel,V:s.eggValueLevel,tracksV7:s.tracksV7,v6BackupId:s.v6BackupId??null,coins:s.coinsCents}});
async function boot(fx){const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();const log=[];p.on('pageerror',e=>log.push('pageerror '+e.message));
 const raw=readFileSync(`${FXD}${fx}.json`,'utf8');
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(([u,r])=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},[UI,raw]);
 await p.goto(URL+'egg-farm.html');const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);ok(bid===BID,`build-id ${bid}`);
 const pre=await st(p);ok(pre.tracksV7===undefined,`pre-tap save already migrated ${JSON.stringify(pre)}`);
 await p.getByText('Tap to start').click({timeout:60000});let exp=null,wb=null;
 for(let i=0;i<30&&!exp;i++){await p.waitForTimeout(400);
  if(!wb&&await p.locator('#wbCollect').isVisible().catch(()=>false)){wb=await p.evaluate(()=>document.querySelector('#wbCollect')?.closest('[role=dialog],.panel,.layer,div')?.innerText.replace(/\s+/g,' ').slice(0,160)??'wb');await p.locator('#wbCollect').click({timeout:3000});continue;}
  exp=await p.evaluate(()=>{const e=document.querySelector('.tracks-exp');return e&&e.getBoundingClientRect().height?e.innerText.replace(/\s+/g,' '):null})}
 if(exp)await p.locator('.tracks-exp button').first().click({timeout:3000});await p.waitForTimeout(600);
 const post=await st(p);ok(post.tracksV7===1&&!!post.v6BackupId,`migration marker missing ${JSON.stringify(post)}`);
 appendFileSync(PROBE,JSON.stringify({fx,bid,pre,post,welcomeBack:wb,explainer:exp})+'\n');return {c,p,log,pre,post,exp};}
async function farmTab(p){const nav=p.locator('[data-nav=upgrades]');if(await nav.isVisible().catch(()=>false)){const open=await p.locator('[data-tab=farm]').isVisible().catch(()=>false);if(!open)await nav.click({timeout:8000});}
 await p.locator('[data-tab=farm]').click({timeout:5000});await p.waitForTimeout(400);}
async function assertTab(p){const t=await p.evaluate(()=>{const a=[...document.querySelectorAll('[role=tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true');return a.map(e=>e.dataset.tab)});ok(t.length===1&&t[0]==='farm',`active tab ${t}`);return 'farm';}
async function rowInfo(p,key){const r=p.locator(`.tracks .up[data-track=${key}]`);ok(await r.count()===1,`row ${key} count`);await r.scrollIntoViewIfNeeded();await p.waitForTimeout(250);
 const vis=await r.evaluate(e=>{const b=e.getBoundingClientRect();return b.height>0&&b.top>=0&&b.bottom<=innerHeight+1&&getComputedStyle(e).visibility!=='hidden'});ok(vis,`row ${key} not in viewport`);
 return r.evaluate(e=>({text:e.innerText.replace(/\s+/g,' ').trim(),lockText:e.querySelector('.lock')?.textContent.trim()??null,aria:e.querySelector('.lock')?.getAttribute('aria-label')??null,buy:!!e.querySelector('button.buy'),fx:[...e.querySelectorAll('ul.fx li')].map(l=>l.innerText.replace(/\s+/g,' ').trim())}));}
let n=0;async function shot(p,cas,step,key,extra){const tab=await assertTab(p);const info=await rowInfo(p,key);const s=await st(p);n++;
 const file=`shots/${ENG}/${cas}-${step}-w${W}.png`;await p.screenshot({path:OUT+file});
 const e={file,asset_sha256:ASSET_SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:cas,step,asserted_tab:tab,row:key,row_visible:true,row_text:info.text,lock_text:info.lockText,aria:info.aria,buy_button:info.buy,fx:info.fx,state:s,...extra};appendFileSync(MAN,JSON.stringify(e)+'\n');return e;}
async function buyFarm(p){const b0=(await st(p)).F;await p.locator('.tracks .up[data-track=farm] button.buy').click({timeout:5000});await p.waitForTimeout(600);const b1=(await st(p)).F;ok(b1===b0+1,`farm buy ${b0}->${b1}`);return b1;}
async function tryEgg(p){const r=p.locator('.tracks .up[data-track=eggValue]');const v0=(await st(p)).V;const hasBuy=await r.locator('button.buy').count();
 if(hasBuy){await r.locator('button.buy').click();}else{await r.locator('.lock').click({force:true}).catch(()=>{});await r.click({force:true}).catch(()=>{});await p.keyboard.press('Enter');}
 await p.waitForTimeout(600);const v1=(await st(p)).V;return {attempt:hasBuy?'tap Buy':'tap lock/row + Enter (no Buy button)',V_before:v0,V_after:v1,unlocked:v1>v0};}
async function run(name,fn){try{await fn();}catch(e){for(const c of br.contexts())for(const pg of c.pages())await pg.screenshot({path:`${OUT}debug-${ENG}-${W}-${name}.png`}).catch(()=>{});for(const c of br.contexts())await c.close().catch(()=>{});console.log('ERR',name,e.message.slice(0,300));appendFileSync(PROBE,JSON.stringify({case:name,error:e.message.slice(0,300)})+'\n')}}
await run('ex1',async()=>{const {c,p,post,log}=await boot('pre-v7-F5-C15');await farmTab(p);
 let t=await tryEgg(p);await shot(p,'ex1-F5C15','F5-locked','eggValue',{tryBuy:t,migrated:post});
 await buyFarm(p);t=await tryEgg(p);await shot(p,'ex1-F5C15','F6-claimed-level','eggValue',{tryBuy:t});
 await buyFarm(p);const pre=await rowInfo(p,'eggValue');await shot(p,'ex1-F5C15','F7-unlocked-before-buy','eggValue',{});t=await tryEgg(p);await shot(p,'ex1-F5C15','F7-real-unlock-bought','eggValue',{rowBeforeBuy:pre,tryBuy:t});
 appendFileSync(PROBE,JSON.stringify({case:'ex1',pageerrors:log})+'\n');await c.close();});
await run('ex2',async()=>{const {c,p,post,log}=await boot('pre-v7-F0-C30');await farmTab(p);const walk=[];
 for(let F=0;F<=10;F++){const pre=await rowInfo(p,'eggValue');if(F===10)await shot(p,'ex2-F0C30','F10-unlocked-before-buy','eggValue',{});const t=await tryEgg(p);walk.push({F,lockText:pre.lockText,aria:pre.aria,buy:pre.buy,...t});
  if([0,1,9].includes(F))await shot(p,'ex2-F0C30',`F${F}${F===1?'-claimed-level':'-locked'}`,'eggValue',{tryBuy:t,...(F===0?{migrated:post}:{})});
  if(F===10)await shot(p,'ex2-F0C30','F10-real-unlock-bought','eggValue',{rowBeforeBuy:pre,tryBuy:t});
  if(t.unlocked&&F<10){walk.push({note:'unlocked early'});}
  if(F<10)await buyFarm(p);}
 appendFileSync(PROBE,JSON.stringify({case:'ex2',walk,pageerrors:log})+'\n');await c.close();});
await run('m4b2',async()=>{const {c,p,log}=await boot('pre-v7-F27-C0');await farmTab(p);
 for(const F of [27,28,29,30]){await shot(p,'m4b2-farmrow',`F${F}`,'farm',{});if(F<30)await buyFarm(p);}
 appendFileSync(PROBE,JSON.stringify({case:'m4b2',pageerrors:log})+'\n');await c.close();});
await br.close();console.log(`done ${ENG} ${W} shots=${n} fails=${fail.length}`,fail.join(' | '));
