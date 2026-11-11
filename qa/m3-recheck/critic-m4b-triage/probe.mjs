// critic-m4b-triage probes on the LIVE asset (m3-rc1-pre+246de09, sha 0bc5bb72…). usage: URL=http://127.0.0.1:4947/ node probe.mjs <engine> <case,...> [width]
// Release build: no window.eggfarm. State via crafted saves (fixtures/, mkfix.mjs) + real clock; reads only the DOM and localStorage.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=await import('/tmp/qa-live-246de09/node_modules/playwright-core/index.mjs');
const ENG=process.argv[2],CASES=process.argv[3].split(','),W=+(process.argv[4]||360),H=W>=1000?800:(W===390?844:800);
const URL=process.env.URL,BID='m3-rc1-pre+246de09',SHA='0bc5bb72df4ab0dee287d3e1d57b7d8178659a147dd6740738b3f0ea8f179a4c';
const OUT='/workspace/egg-farm-studio/qa/m3-recheck/critic-m4b-triage/';mkdirSync(`${OUT}shots/${ENG}`,{recursive:true});
const MAN=`${OUT}manifest-${ENG}-${W}.jsonl`,RES=`${OUT}results-${ENG}-${W}.jsonl`;
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:false,sessions:5};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
const log=(o)=>{appendFileSync(RES,JSON.stringify({engine:ENG,w:W,t:new Date().toISOString(),...o})+'\n');console.log(JSON.stringify(o).slice(0,400));};
const st=p=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {F:s.farmLevel,C:s.collectionLevel,H:s.hensLevel,V:s.eggValueLevel,coins:s.coinsCents,basket:s.basket}});
async function boot(fx,{w=W,h=H}={}){const c=await br.newContext({viewport:{width:w,height:h},hasTouch:false});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const raw=JSON.parse(readFileSync(`${OUT}fixtures/${fx}.json`,'utf8'));
 await p.goto(URL+'favicon.ico').catch(()=>{});
 await p.evaluate(([u,r])=>{localStorage.clear();r.savedAt=Date.now();localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify(r));},[UI,raw]);
 await p.goto(URL+'egg-farm.html');const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(bid!==BID)throw new Error('build-id '+bid);
 await p.getByText('Tap to start').click({timeout:90000});await p.waitForSelector('#collect',{timeout:30000});await p.waitForTimeout(800);
 if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click();
 return {c,p,errs,bid};}
async function openTab(p,tab){if(!(await p.locator('#p-upgrades').isVisible()))await p.locator('[data-nav=upgrades]').click();await p.locator(`[data-tab=${tab}]`).click();await p.waitForTimeout(300);await assertTab(p,tab);}
async function openMarket(p){await p.locator('[data-nav=market]').click();await p.waitForTimeout(300);await assertTab(p,'market');}
async function assertTab(p,want){const a=await p.evaluate(()=>{const up=document.querySelector('#p-upgrades'),mk=document.querySelector('#p-market');
 return {up:!!up&&!up.hidden,mk:!!mk&&!mk.hidden,tab:[...document.querySelectorAll('.tabs [data-tab].active')].map(e=>e.dataset.tab)}});
 const ok=want==='market'?a.mk&&!a.up:want==='farmview'?!a.mk&&!a.up:a.up&&a.tab.length===1&&a.tab[0]===want;if(!ok)throw new Error(`tab assert ${want} got ${JSON.stringify(a)}`);return want;}
let n=0;async function shot(p,cas,step,tab,extra={}){await assertTab(p,tab);const file=`shots/${ENG}/${cas}-${step}-w${W}.png`;await p.screenshot({path:OUT+file});n++;
 appendFileSync(MAN,JSON.stringify({file,asset_sha256:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:cas,step,asserted_tab:tab,state:await st(p),t:new Date().toISOString(),...extra})+'\n');}
const goal=p=>p.evaluate(()=>{const g=document.querySelector('#goal');const l=g.querySelector('.goal-label'),s=g.querySelector('.goal-status');return {hidden:g.hidden,label:l.textContent,status:s.textContent,aria:g.getAttribute('aria-label'),op:getComputedStyle(l).opacity,vis:g.getBoundingClientRect().height}});
const farmRows=p=>p.evaluate(()=>{const r=k=>{const e=document.querySelector(`#uRow .up[data-track=${k}]`);if(!e)return null;const b=e.querySelector('button.buy');const bb=b?.getBoundingClientRect();
 return {cls:e.className,eta:e.querySelector('.hint.eta')?.textContent??null,hint:[...e.querySelectorAll('.hint')].map(h=>h.textContent.trim()).filter(Boolean).join(' | '),price:b?.querySelector('.num')?.textContent??null,aff:b?b.getAttribute('aria-disabled')==='false':null,lock:e.querySelector('.lock')?.textContent??null,btnY:bb?Math.round(bb.top*10)/10:null,btnX:bb?Math.round(bb.left):null,rowH:Math.round(e.getBoundingClientRect().height)}};
 return {hens:r('hens'),eggValue:r('eggValue'),farm:r('farm'),coins:document.querySelector('#coins').textContent,basket:document.querySelector('#basket').textContent}});
const money=s=>{if(!s)return null;s=s.replace(/[$,]/g,'');const m=s.match(/^([\d.]+)([KMBT]?)$/);if(!m)return null;return +m[1]*({'':1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]);};
const etaS=t=>{if(!t)return null;if(/moment/.test(t))return 'moment';let m=t.match(/~(\d+):(\d\d):(\d\d)/);if(m)return +m[1]*3600+ +m[2]*60+ +m[3];m=t.match(/~(\d+):(\d\d)/);if(m)return +m[1]*60+ +m[2];
 m=t.match(/~(?:(\d+) min)?\s*(?:(\d+) s)?/);if(m&&(m[1]||m[2]))return (+m[1]||0)*60+(+m[2]||0);return null;};
// uRow / nav mutation counter installed in page
const watch=p=>p.evaluate(()=>{window.__mut={uRow:0,nav:0};new MutationObserver(()=>window.__mut.uRow++).observe(document.querySelector('#uRow'),{childList:true});
 new MutationObserver(()=>window.__mut.nav++).observe(document.querySelector('nav.actions'),{attributes:true,subtree:true,attributeFilter:['hidden']});});
const C={};
// ---- C1: goal bubble "Collection … Ready" while Farm is a few hundred $ away; buy Collection -> Farm ETA up
C.c1=async()=>{const {c,p,errs}=await boot('C1-F14-coll-ready');await openTab(p,'farm');await p.waitForTimeout(12000);
 const g0=await goal(p),r0=await farmRows(p);await shot(p,'C1','before-buy-collection','farm',{goal:g0,farm:r0.farm});
 await p.locator('#goal').click();await p.waitForTimeout(600);const tabAfterGoal=await p.evaluate(()=>document.querySelector('.tabs [data-tab].active')?.dataset.tab);
 await assertTab(p,'collection');const before=await st(p);await p.locator('#uRow .up button.buy').click();await p.waitForTimeout(400);const after=await st(p);
 await openTab(p,'farm');await p.waitForTimeout(1200);const g1=await goal(p),r1=await farmRows(p);await shot(p,'C1','after-buy-collection','farm',{goal:g1,farm:r1.farm});
 log({case:'C1',goal_before:g0,farm_before:r0.farm,coins_before:r0.coins,goalTapOpens:tabAfterGoal,bought:{C:[before.C,after.C],coins:[before.coins,after.coins]},goal_after:g1,farm_after:r1.farm,coins_after:r1.coins,errs});await c.close();};
// ---- P1/P2/C2/bubble: 90 s sample on the Farm tab, no input
C.sample=async(fx='MID-F14-saving',secs=90,tag='SAMPLE')=>{const {c,p,errs}=await boot(fx);await openTab(p,'farm');await watch(p);await shot(p,tag,'start','farm',{rows:await farmRows(p)});
 const S=[];let lastY=null,shifts=0,blank=0;const t0=Date.now();
 while(Date.now()-t0<secs*1000){const r=await farmRows(p),g=await goal(p),m=await p.evaluate(()=>({...window.__mut}));const t=(Date.now()-t0)/1000;
  const y=r.farm?.btnY;if(lastY!==null&&y!==null&&Math.abs(y-lastY)>0.5){shifts++;if(shifts<=3){await shot(p,tag,`farm-btn-shift${shifts}`,'farm',{from:lastY,to:y,rows:r});}S.push({t,shift:[lastY,y],rows:r});}
  if(y!==null)lastY=y;if(g.hidden||!g.label.trim()||g.vis<10)blank++;
  S.push({t:Math.round(t*10)/10,coins:r.coins,goal:`${g.label} | ${g.status}`,goalBlank:g.hidden||!g.label.trim(),farm:{eta:r.farm?.hint,y,price:r.farm?.price},hens:{cls:r.hens?.cls,eta:r.hens?.eta,price:r.hens?.price,lock:r.hens?.lock},value:{cls:r.eggValue?.cls,eta:r.eggValue?.eta,price:r.eggValue?.price,lock:r.eggValue?.lock},mut:m});
  await p.waitForTimeout(250);}
 await shot(p,tag,'end','farm',{rows:await farmRows(p)});
 // C2 check: any 'a moment' with shortfall/rate > 10 s, using the row's own price vs HUD coins
 const moments=S.filter(x=>x.hens?.eta==='Affordable in a moment'||x.value?.eta==='Affordable in a moment').map(x=>({t:x.t,coins:x.coins,hens:x.hens,value:x.value}));
 writeFileSync(`${OUT}sample-${tag}-${ENG}-${W}.json`,JSON.stringify(S,null,0));
 const m=await p.evaluate(()=>({...window.__mut}));log({case:tag,fx,secs,samples:S.length,farmBtnShifts:shifts,goalBlankSamples:blank,uRowChildListMutations:m.uRow,perSec:Math.round(m.uRow/secs*100)/100,moments:moments.slice(0,6),errs});await c.close();};
C.c2=async()=>C.sample('C2-F25-14k-short',45,'C2');
// ---- P3: a press whose down/up straddle a #uRow re-render loses the click (mouse); control taps register
C.tap=async()=>{const {c,p,errs}=await boot('TAP-F14-hens-cheap');await openTab(p,'farm');await watch(p);
 for(let i=0;i<40;i++){const r=await farmRows(p);if(/Ready in/.test(r.farm?.hint||''))break;await p.waitForTimeout(500);}
 const r0=await farmRows(p);await shot(p,'P3','start','farm',{rows:r0});const res=[];
 for(let k=0;k<3;k++){for(const mode of ['straddle','control']){
  const b=p.locator('#uRow .up[data-track=hens] button.buy');await b.scrollIntoViewIfNeeded();const bb=await b.boundingBox();const H0=(await st(p)).H;
  if(mode==='control'){await p.evaluate(()=>new Promise(r=>{const o=new MutationObserver(()=>{o.disconnect();r();});o.observe(document.querySelector('#uRow'),{childList:true});}));}
  await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
  let rerendered=false;if(mode==='straddle'){rerendered=await p.evaluate(()=>new Promise(r=>{const o=new MutationObserver(()=>{o.disconnect();r(true);});o.observe(document.querySelector('#uRow'),{childList:true});setTimeout(()=>r(false),3000);}));}
  await p.mouse.up();await p.waitForTimeout(500);const H1=(await st(p)).H;res.push({mode,rerenderedWhilePressed:rerendered,H:[H0,H1],registered:H1===H0+1});
  if(k===0)await shot(p,'P3',`${mode}-after`,'farm',{H:[H0,H1]});}}
 log({case:'P3-tap',res,errs});await c.close();};
// ---- C6 sell: Sell all vs per-order Sell buttons (same frame / next frame / rAF stalled)
C.sell=async(stall=false)=>{const {c,p,errs}=await boot('SELL-F14-basket400');await openMarket(p);await p.waitForTimeout(800);
 const read=()=>p.evaluate(()=>({sellAll:document.querySelector('#sellAll').textContent,sellAllDis:document.querySelector('#sellAll').getAttribute('aria-disabled'),basket:document.querySelector('#basket').textContent,
  rows:[...document.querySelectorAll('#mRows .order button')].map(b=>`${b.textContent.trim()}|${b.getAttribute('aria-disabled')}`)}));
 const pre=await read();await shot(p,'C6sell',`${stall?'stall-':''}before`,'market',pre);
 if(stall)await p.evaluate(()=>{window.requestAnimationFrame=()=>0;}); // emulate a stalled rAF (throttled/occluded frame) while the timer fallback keeps render() going
 // click + read in the same task, then after one rAF / 1.5 s
 const same=await p.evaluate(()=>{document.querySelector('#sellAll').click();return {sellAll:document.querySelector('#sellAll').textContent,basket:document.querySelector('#basket').textContent,rows:[...document.querySelectorAll('#mRows .order button')].map(b=>`${b.textContent.trim()}|${b.getAttribute('aria-disabled')}`)};});
 await p.waitForTimeout(1500);const later=await read();await shot(p,'C6sell',`${stall?'stall-':''}after-1500ms`,'market',later);
 log({case:stall?'C6-sell-rAFstalled':'C6-sell',pre,sameTask:same,after1500ms:later,errs});await c.close();};
C.sellstall=async()=>C.sell(true);
// ---- Claude Gamer: hidden #sellAll text read with the Market sheet closed
C.gamer=async()=>{const {c,p,errs}=await boot('GAMER-F7-868');await openMarket(p);await p.waitForTimeout(600);
 const a=await p.evaluate(()=>document.querySelector('#sellAll').textContent);await p.locator('#sellAll').click();await p.waitForTimeout(600);
 const b=await p.evaluate(()=>({t:document.querySelector('#sellAll').textContent,basket:document.querySelector('#basket').textContent,cust:document.querySelectorAll('#mRows .order').length}));
 await shot(p,'GAMER','market-open-after-sell','market',b);
 await p.locator('#p-market .close').click();await p.waitForTimeout(400);for(let i=0;i<4;i++){await p.locator('#collect').click();await p.waitForTimeout(300);}
 const hidden=await p.evaluate(()=>({sellAllText:document.querySelector('#sellAll').textContent,sheetHidden:document.querySelector('#p-market').hidden,visible:!!document.querySelector('#sellAll').getClientRects().length,basket:document.querySelector('#basket').textContent,queue:document.querySelectorAll('#queue .chip:not(.empty):not(.served):not(.more)').length}));
 await shot(p,'GAMER','farmview-sheet-closed','farmview',hidden);
 await openMarket(p);const reopened=await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r({t:document.querySelector('#sellAll').textContent,dis:document.querySelector('#sellAll').getAttribute('aria-disabled'),basket:document.querySelector('#basket').textContent,orders:document.querySelectorAll('#mRows .order').length})))));
 await shot(p,'GAMER','market-reopened','market',reopened);
 log({case:'GAMER-868',initial:a,afterSellAll:b,hiddenRead:hidden,reopened,errs});await c.close();};
// ---- C6 Manage all: appears when the first worker crosses 50% -> Workers cards / nav buttons move
C.ma=async()=>{const {c,p,errs}=await boot('MA-F14-energy51');await openTab(p,'workers');await watch(p);
 const pos=()=>p.evaluate(()=>{const r=e=>e?Math.round(e.getBoundingClientRect().top*10)/10:null,x=e=>e?Math.round(e.getBoundingClientRect().left):null;
  const ma=document.querySelector('#uRow [data-act=manageAll]');return {manageAll:ma?ma.textContent.trim():null,mhManageY:r(document.querySelector('#uRow [data-w=market_hand] [data-act=manage]')),hawkerManageY:r(document.querySelector('#uRow [data-w=hawker] [data-act=manage]')),
  navFarmX:x(document.querySelector('[data-nav=farm]')),navUpX:x(document.querySelector('[data-nav=upgrades]')),farmMA:!document.querySelector('.farm-manage-all').hidden,energy:[...document.querySelectorAll('#uRow .wk .meta')].map(m=>m.textContent).filter(t=>/Energy/.test(t))}});
 const p0=await pos();await shot(p,'C6ma','before','workers',p0);let p1=p0,t=0;const t0=Date.now();
 while(Date.now()-t0<40000){p1=await pos();if(p1.manageAll)break;await p.waitForTimeout(250);}t=(Date.now()-t0)/1000;
 await shot(p,'C6ma','after-manage-all-appears','workers',p1);const m=await p.evaluate(()=>({...window.__mut}));
 log({case:'C6-manageall',before:p0,after:p1,secs:t,uRowRerenders:m.uRow,navHiddenToggles:m.nav,errs});await c.close();};
// ---- C4: explainer lifetime on a migrated pre-v7 save
C.exp=async()=>{const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();await p.goto(URL+'favicon.ico').catch(()=>{});
 const raw=readFileSync(`${OUT}fixtures/pre-v7-F5-C15.json`,'utf8');await p.evaluate(([u,r])=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',r);},[UI,raw]);
 await p.goto(URL+'egg-farm.html');await p.getByText('Tap to start').click({timeout:90000});let wb=false,tOpen=null;
 for(let i=0;i<120&&tOpen===null;i++){if(!wb&&await p.locator('#wbCollect').isVisible().catch(()=>false)){await p.locator('#wbCollect').click();wb=true;}
  tOpen=await p.evaluate(()=>document.querySelector('.tracks-exp')?performance.now():null);if(tOpen===null)await p.waitForTimeout(100);}
 await shot(p,'C4','card-open','farmview',{});const tClose=await p.evaluate(()=>new Promise(r=>{const t=setInterval(()=>{if(!document.querySelector('.tracks-exp')){clearInterval(t);r(performance.now());}},20);setTimeout(()=>r(null),20000);}));
 const seen=await p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state.seenTracksExplainer);await shot(p,'C4','card-closed-untouched','farmview',{});
 log({case:'C4-explainer',welcomeBack:wb,openToCloseMs:tClose&&tOpen?Math.round(tClose-tOpen):null,seenTracksExplainer:seen});await c.close();};
// ---- P4: $18.2K glyph
C.p4=async()=>{const {c,p,errs}=await boot('P4-F19-18k');await openTab(p,'farm');const b=p.locator('#uRow .up[data-track=farm] button.buy');await b.scrollIntoViewIfNeeded();
 const info=await b.evaluate(e=>{const n=e.querySelector('.num');const cs=getComputedStyle(n);return {text:n.textContent,font:cs.fontFamily,weight:cs.fontWeight,size:cs.fontSize,fontsLoaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>`${f.family} ${f.weight}`)}});
 await assertTab(p,'farm');await b.screenshot({path:`${OUT}shots/${ENG}/P4-farm-btn-18.2K-w${W}.png`});
 appendFileSync(MAN,JSON.stringify({file:`shots/${ENG}/P4-farm-btn-18.2K-w${W}.png`,asset_sha256:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:'P4',step:'farm-buy-button',asserted_tab:'farm',state:await st(p),...info})+'\n');
 await shot(p,'P4','farm-tab','farm',info);log({case:'P4',info,errs});await c.close();};
for(const k of CASES){try{await C[k]();}catch(e){console.log('ERR',k,e.message.slice(0,300));log({case:k,error:e.message.slice(0,400)});for(const cx of br.contexts()){for(const pg of cx.pages())await pg.screenshot({path:`${OUT}debug-${ENG}-${W}-${k}.png`}).catch(()=>{});await cx.close().catch(()=>{});}}}
await br.close();console.log(`done ${ENG} ${W} shots=${n}`);
