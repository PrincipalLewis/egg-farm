// usage: node dump.mjs <engine> <width> <fix|main> <URL(dir with index.html of build:qa)> <expectBid>
// Uses the build:qa debug handle window.eggfarm / window.eggfarmUi (compiled out of release) to set levels and read rows.
import {writeFileSync,appendFileSync} from 'node:fs';
const pw=await import('/tmp/qa-m4b1fix-88130a7/node_modules/playwright-core/index.mjs');
const [ENG,W,LBL,URL,BID]=[process.argv[2],+process.argv[3],process.argv[4],process.argv[5],process.argv[6]];const H=800;
const OUT='/workspace/egg-farm-studio/qa/m3-recheck/m4b-1-fix-88130a7/';const MAN=`${OUT}entries-${LBL}-${ENG}-${W}.jsonl`;writeFileSync(MAN,'');
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(u=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u));indexedDB.deleteDatabase('eggfarm')},UI);
await p.goto(URL);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(bid!==BID)throw new Error('build-id '+bid);
await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);
for(let i=0;i<10;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click();if(await p.locator('.tracks-exp button').isVisible().catch(()=>false))await p.locator('.tracks-exp button').click();await p.waitForTimeout(200);}
const fresh=await p.evaluate(()=>({t7:window.eggfarm.state.tracksV7,F:window.eggfarm.state.farmLevel,max:window.eggfarm.balance.maxLevel,fm:window.eggfarm.balance.farmMaxLevel??null,cof:[window.eggfarm.balance.m4.hens.capOverFarm,window.eggfarm.balance.m4.eggValue.capOverFarm],m4:window.eggfarm.balance.m4.enabled}));
await p.evaluate(()=>{window.eggfarmUi.openPanel('upgrades');document.querySelector('[data-tab=farm]').click();});await p.waitForTimeout(300);
const tab=async()=>p.evaluate(()=>[...document.querySelectorAll('[role=tab]')].filter(e=>e.classList.contains('active')).map(e=>e.dataset.tab).join());
// set levels + read both track rows
const readAt=(F,Hh,V)=>p.evaluate(async([F,Hh,V])=>{const g=window.eggfarm;g.state={...g.state,farmLevel:F,hensLevel:Hh,eggValueLevel:V,coinsCents:0};window.eggfarmUi.render();
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const row=k=>{const e=document.querySelector(`.tracks .up[data-track=${k}]`);if(!e)return null;const lk=e.querySelector('.lock');return {lock:lk?.textContent??null,aria:lk?.getAttribute('aria-label')??null,max:!!e.querySelector('.maxed'),groupAria:e.getAttribute('aria-label'),buy:!!e.querySelector('button.buy')}};
 return {F,H:Hh,V,hens:row('hens'),eggValue:row('eggValue'),activeTab:[...document.querySelectorAll('[role=tab].active')].map(e=>e.dataset.tab).join()};},[F,Hh,V]);
const out={eng:ENG,w:W,lbl:LBL,bid,fresh,grid:[],errs};
// AC2 grid: every fresh-reachable state F 0..30, track level 0..min(30,F+3) (both tracks set to the same L)
const mx=fresh.max;if(tab&&await tab()!=='farm')throw new Error('tab');
for(let F=0;F<=mx;F++)for(let L=0;L<=Math.min(mx,F+3);L++)out.grid.push(await readAt(F,L,L));
// (d) capped config: every above-cap level F 0..29, L cap(F)+1..29 (migrated-only states) + L=30
out.above=[];for(let F=0;F<mx;F++)for(let L=Math.min(mx,F+3)+1;L<=mx;L++)out.above.push(await readAt(F,L,L));
writeFileSync(`${OUT}dumps/labels-${LBL}-${ENG}-${W}.json`,JSON.stringify(out,null,0));
// shots: (d) edge F0/L29 + F26/L29 + F29/L30, row visible + tab asserted
async function shot(name,F,Hh,V,key,extra={}){const r=await readAt(F,Hh,V);const t=await tab();if(t!=='farm')throw new Error('tab '+t);
 const loc=p.locator(`.tracks .up[data-track=${key}]`);await loc.scrollIntoViewIfNeeded();await p.waitForTimeout(200);
 const vis=await loc.evaluate(e=>{const b=e.getBoundingClientRect();return b.height>0&&b.top>=0&&b.bottom<=innerHeight+1});if(!vis)throw new Error('row not visible '+name);
 const file=`shots/${LBL}-${ENG}-${name}-w${W}.png`;await p.screenshot({path:OUT+file});
 appendFileSync(MAN,JSON.stringify({file,build_id:bid,engine:ENG,size:`${W}x${H}`,case:name,asserted_tab:t,row:key,row_visible:true,row_text:await loc.evaluate(e=>e.innerText.replace(/\s+/g,' ').trim()),lock_text:r[key].lock,aria:r[key].aria,max:r[key].max,state:{F,H:Hh,V},...extra})+'\n');}
await shot('capped-F0-V29',0,0,29,'eggValue');await shot('capped-F26-H29',26,29,0,'hens');await shot('capped-F29-V30',29,0,30,'eggValue');
if(LBL==='fix'){ // (c) L30+ harness: runtime balance override (maxLevel 55, farmMaxLevel 50; 31-long tables padded with their last value)
 const ov=await p.evaluate(()=>{const g=window.eggfarm,b0=g.balance,pad=x=>Array.isArray(x)?(x.length===b0.maxLevel+1?[...x,...Array(25).fill(x[x.length-1])]:x.map(pad)):(x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,pad(v)])):x);
  const nb={...pad(b0),maxLevel:55,farmMaxLevel:50};g.b=nb;return {max:g.balance.maxLevel,fm:g.balance.farmMaxLevel,cap:[g.balance.m4.hens.capOverFarm,g.balance.m4.eggValue.capOverFarm],costsLen:g.balance.m4.eggValue.costs.length};});
 out.l30=ov;out.l30grid=[];for(const F of [40,47,49,50])for(const L of [50,51,52,53,54,55])out.l30grid.push(await readAt(F,L,L));
 writeFileSync(`${OUT}dumps/labels-${LBL}-${ENG}-${W}.json`,JSON.stringify(out,null,0));
 await shot('l30-F50-H53',50,53,54,'hens',{override:ov});await shot('l30-F50-V54',50,53,54,'eggValue',{override:ov});await shot('l30-F49-V52',49,52,52,'eggValue',{override:ov});await shot('l30-F50-H55',50,55,55,'hens',{override:ov});await shot('l30-F50-V55',50,55,55,'eggValue',{override:ov});}
console.log(`done ${LBL} ${ENG} ${W} grid=${out.grid.length} above=${out.above.length} errs=${errs.length}`);await br.close();
