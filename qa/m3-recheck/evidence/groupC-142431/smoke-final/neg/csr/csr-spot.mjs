// [v5-ui harness copy 2026-10-29] Parametrised: QA_WT, QA_EV (results dir, trailing /), QA_BID (asserted in-page on every load; no hard-coded prefix), QA_SHA7, AXE (default artifacts/v5-ui/tools/axe-core-4.14.0). Original header below refers to its source run.
// UI QA RC1 (#67 @ 5d9efa6) WebKit/Firefox spot check: corrupt-save recovery dialog layouts (#63 CSR; seeding copied from Saves QA
// qa/m3-scripts/csr-m41-7-ui.mjs + qa/m41/csr-fixtures/raw) and tracks-explainer card layouts (main view, Upgrades sheet; plain + refund).
// Checks per state: nothing off-screen, no clipped text (scrollWidth<=clientWidth / children inside card), buttons >= 44 (primary >= 48),
// keyboard focus visible (Tab -> :focus-visible outline/box-shadow), build-id verified in-page.
// usage: QA_BID=<prefix>+5d9efa6 node csr-spot.mjs <firefox|webkit|chromium> <width>   (own OS-assigned port, never :4173)
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';import {ringDecision,RING_RULE} from './focus-ring.mjs';   // (d) RC-7import http from 'node:http';import {join,extname} from 'node:path';
// (d) RC-7: focus-ring.mjs import above. RC-14 fix 1 (HoQ delta ab81d91b): this comment used to sit on the import line and commented out the http/path imports (ReferenceError at the server line).
const [ENG,WS]=process.argv.slice(2);const W=+WS;const H={360:640,390:844}[W]??800;
const WT=process.env.QA_WT;const BID=process.env.QA_BID;if(!WT||!BID?.endsWith('+'+process.env.QA_SHA7)||/dirty/.test(BID))throw new Error('QA_WT/QA_BID/QA_SHA7');
const pw=(await import(WT+'/node_modules/playwright-core/index.mjs')).default;
const E=process.env.QA_EV;const SD=`shots/csr/${ENG}/`;mkdirSync(E+SD,{recursive:true});
const OUT=`${E}csr/csr-spot-${ENG}-${W}.jsonl`;writeFileSync(OUT,'');
const FX=new globalThis.URL('../fixtures/csr-raw/',import.meta.url).pathname;const raw=n=>readFileSync(FX+n,'utf8');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(WT,'dist-qa',p);if(!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));}).listen(0,'127.0.0.1',()=>r(s));});
const URL=`http://127.0.0.1:${srv.address().port}/`;
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];let checks=0;const ok=(c,m,d)=>{checks++;if(!c){fails.push(m);console.log('FAIL',m,JSON.stringify(d??'').slice(0,300));}return c;};
const rec=o=>appendFileSync(OUT,JSON.stringify({engine:ENG,size:`${W}x${H}`,build_id:BID,t:new Date().toISOString(),...o})+'\n');
const CASES=[
 {id:'M1',ls:{'eggfarm.save':raw('MAIN-OQ1-abc.json'),'eggfarm.save.bak':raw('BAK-valid-F20-seq4-older.json')}},
 {id:'M1cf',ls:{'eggfarm.save':raw('MAIN-OQ1-abc.json'),'eggfarm.save.bak':raw('BAK-valid-F20-seq4-older.json')},failKey:'^eggfarm\\.save\\.corrupt'},
 {id:'M2',ls:{'eggfarm.save':raw('MAIN-L17-badsum.json'),'eggfarm.save.v6_backup':raw('V6B-valid-unmarked-F12-T-3h.json')}},
 {id:'M3',ls:{'eggfarm.save':raw('MAIN-OQ1-abc.json'),'eggfarm.save.bak':raw('BAK-invalid-neg1.json'),'eggfarm.save.v6_backup':raw('V6B-invalid-raw-abc.json')}},
 {id:'M4',ls:{'eggfarm.save':raw('MAIN-OQ1-abc.json'),'eggfarm.save.bak':raw('BAK-invalid-neg1.json')},idbHang:true},
 {id:'M5',ls:{'eggfarm.save':raw('MAIN-OQ1-abc.json'),'eggfarm.save.bak':raw('BAK-valid-F20-seq4-older.json')},failKey:'^eggfarm\\.lease$'},
 {id:'LEGACY-Q',ls:{'eggfarm.save':raw('MAIN-OQ1-abc.json')},failKey:'^eggfarm\\.save\\.corrupt'},
 {id:'LEGACY-cantsave',ls:{'eggfarm.save':raw('BAK-valid-F20-seq4-older.json')},failKey:'^eggfarm\\.lease$'},
];
const INIT=({ls,failKey,idbHang})=>{const set=Storage.prototype.setItem;
 if(!sessionStorage.getItem('qa.seeded')){localStorage.clear();for(const [k,v] of Object.entries(ls))set.call(localStorage,k,v);sessionStorage.setItem('qa.seeded','1');}
 window.__seeded=new Promise(r=>{const d=indexedDB.deleteDatabase('eggfarm');d.onsuccess=d.onerror=d.onblocked=()=>r();});
 if(idbHang){const f=IDBFactory.prototype;const orig=f.open;f.open=function(n,v){if(n==='eggfarm')return {};return orig.call(this,n,v);};}
 if(failKey){const re=new RegExp(failKey);Storage.prototype.setItem=function(k,v){if(this===localStorage&&re.test(k))throw new DOMException('qa quota','QuotaExceededError');return set.call(this,k,v);};}};
// generic layout measure of a container: everything inside viewport, text not clipped, children inside container, tap targets
const LAYOUT=sel=>{const L=document.querySelector(sel);if(!L)return null;const R=e=>e.getBoundingClientRect();const lr=R(L);
 const vis=e=>{const r=R(e),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none';};
 const nm=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
 const els=[...L.querySelectorAll('*')].filter(vis);
 const off=els.filter(e=>{const r=R(e);return r.left<-0.5||r.top<-0.5||r.right>innerWidth+0.5||r.bottom>innerHeight+0.5;}).map(e=>({n:nm(e),r:[R(e).left,R(e).top,R(e).right,R(e).bottom].map(Math.round)}));
 const card=L.matches('.recovery-layer')?L.querySelector('.recovery-card'):L;const cr=card?R(card):lr;
 const outside=els.filter(e=>card&&card.contains(e)&&e!==card).filter(e=>{const r=R(e);return r.left<cr.left-0.5||r.right>cr.right+0.5||r.top<cr.top-0.5||r.bottom>cr.bottom+0.5;}).map(e=>nm(e));
 const clip=els.filter(e=>e.textContent.trim()&&((e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&getComputedStyle(e).overflowX!=='visible')||(e.scrollHeight>e.clientHeight+1&&e.clientHeight>0&&getComputedStyle(e).overflowY==='hidden')||getComputedStyle(e).textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth)).map(e=>({n:nm(e),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight}));
 const btns=[...L.querySelectorAll('button,a[href],[role=button]')].filter(vis).map(b=>({n:nm(b),text:b.textContent.trim(),h:+R(b).height.toFixed(2),w:+R(b).width.toFixed(2)}));
 return {rect:[cr.left,cr.top,cr.right,cr.bottom].map(v=>Math.round(v)),off,outside,clip,btns,overflowX:document.documentElement.scrollWidth>innerWidth};};
// (d) RC-7 (was :46-48): STY reads the computed outline/box-shadow of every focusable element inside `within` BEFORE any Tab (unfocused baseline,
// keyed by a per-element index stored in a WeakMap, no DOM change); FOCUS returns the focused element's raw style + its baseline; the decision is
// ringDecision() in node (focus-ring.mjs: :focus-visible AND an outline/ring that differs from the unfocused style; the drop shadow never counts).
const STY=within=>{const q='button,a[href],[role=button],input,select,textarea,[tabindex]';const els=[...document.querySelectorAll(within)].flatMap(w=>[...w.querySelectorAll(q)]);
 const m=window.__qaBase=window.__qaBase??new WeakMap();for(const e of els){if(m.has(e))continue;const cs=getComputedStyle(e);if(e===document.activeElement)continue;m.set(e,{outlineParts:{style:cs.outlineStyle,width:cs.outlineWidth,color:cs.outlineColor,offset:cs.outlineOffset},boxShadow:cs.boxShadow});}return els.length;};
// an element that was ALREADY focused when STY ran (autofocus) gets its unfocused baseline after one more Tab moves focus off it; Shift+Tab restores
const LATE=()=>{const m=window.__qaBase;return (window.__qaSeenEls??[]).map(e=>{if(!m.has(e)&&e!==document.activeElement){const cs=getComputedStyle(e);m.set(e,{outlineParts:{style:cs.outlineStyle,width:cs.outlineWidth,color:cs.outlineColor,offset:cs.outlineOffset},boxShadow:cs.boxShadow});}return m.get(e)??null;});};
const FOCUS=()=>{const a=document.activeElement;if(!a||a===document.body)return null;const cs=getComputedStyle(a);let fv=false;try{fv=a.matches(':focus-visible');}catch{}
 const base=window.__qaBase?.get(a)??null;const L=window.__qaSeenEls=window.__qaSeenEls??[];let idx=L.indexOf(a);if(idx<0){L.push(a);idx=L.length-1;}
 return {idx,n:a.tagName+(a.id?'#'+a.id:'')+'.'+[...a.classList].join('.'),text:a.textContent.trim().slice(0,30),focusVisible:fv,outline:`${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,outlineParts:{style:cs.outlineStyle,width:cs.outlineWidth,color:cs.outlineColor,offset:cs.outlineOffset},boxShadow:cs.boxShadow,base};};
const judge=f=>{const d=ringDecision(f,f?.base);return {...f,visibleRing:d.ok,ringWhy:d.why,rule:RING_RULE};};
async function tabTo(p,within){await p.evaluate(STY,within);const seen=[];for(let i=0;i<8;i++){await p.keyboard.press('Tab');await p.waitForTimeout(120);const f=await p.evaluate(FOCUS);const inside=await p.evaluate(w=>!!document.activeElement?.closest(w),within);if(f&&inside){seen.push(judge(f));if(seen.length>=2)break;}}
 if(seen.some(f=>!f.base)){await p.keyboard.press('Tab');await p.waitForTimeout(120);const b=await p.evaluate(LATE);await p.keyboard.press('Shift+Tab');await p.waitForTimeout(120);return seen.map(f=>f.base?f:{...judge({...f,base:b[f.idx]??null}),baseLate:true});}
 return seen;}
// ---- 1. recovery dialogs
for(const c of CASES){const ctx=await br.newContext({viewport:{width:W,height:H}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 try{await p.addInitScript(INIT,{ls:c.ls,failKey:c.failKey??null,idbHang:!!c.idbHang});await p.goto(URL);await p.evaluate(()=>window.__seeded);
  const bid=await p.evaluate(()=>document.querySelector('meta[name="build-id"]')?.content);if(!ok(bid===BID,`${c.id}: runtime build-id ${bid}`))throw new Error('bid');
  await p.getByText('Tap to start').click();const shown=await p.locator('.recovery-layer').waitFor({state:'visible',timeout:8000}).then(()=>true,()=>false);
  if(!ok(shown,`${c.id}: dialog shown`)){await p.screenshot({path:E+SD+`dlg-${c.id}-noshow-w${W}.png`});await ctx.close();continue;}
  await p.evaluate(async()=>{const L=document.querySelector('.recovery-layer');const fin=L.getAnimations({subtree:true}).filter(a=>(a.effect?.getTiming?.().iterations??1)!==Infinity).map(a=>a.finished.catch(()=>null));await Promise.race([Promise.all(fin),new Promise(r=>setTimeout(r,3000))]);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await p.waitForTimeout(300);
  const st=await p.evaluate(()=>{const L=document.querySelector('.recovery-layer');return {outcome:L.dataset.outcome??null,notice:L.dataset.notice??null,title:L.querySelector('#rcT')?.textContent,modalOpen:document.getElementById('modal-layer')?.classList.contains('open')??null,explainer:!!document.querySelector('.tracks-exp')};});
  const lay=await p.evaluate(LAYOUT,'.recovery-layer');const f1=SD+`dlg-${c.id}-settled-w${W}.png`;await p.screenshot({path:E+f1});
  ok(lay.off.length===0,`${c.id}: nothing off-screen`,lay.off);ok(lay.outside.length===0,`${c.id}: nothing outside the card`,lay.outside);ok(lay.clip.length===0,`${c.id}: no clipped text`,lay.clip);ok(!lay.overflowX,`${c.id}: no page overflow-x`);
  const go=lay.btns.find(b=>/rcGo/.test(b.n)),ex=lay.btns.find(b=>/rcExport/.test(b.n));
  if(st.notice){ok(go&&go.h>=48,`${c.id}: primary >= 48`,go);if(ex)ok(ex.h>=44,`${c.id}: Export >= 44`,ex);}
  else lay.btns.forEach(b=>ok(b.h>=44,`${c.id}: button ${b.text} >= 44`,b));
  const foc=await tabTo(p,'.recovery-layer');const f2=SD+`dlg-${c.id}-focus-w${W}.png`;await p.screenshot({path:E+f2});
  ok(foc.length>=1&&foc.every(f=>f.visibleRing),`${c.id}: keyboard focus visible on dialog controls`,foc);
  rec({section:'dialog',case:c.id,state:st,layout:lay,focus:foc,shots:[f1,f2],pageerrors:errs});ok(errs.length===0,`${c.id}: no page errors`,errs);
  console.log(`dialog ${c.id} notice=${st.notice} outcome=${st.outcome} off=${lay.off.length} clip=${lay.clip.length} outside=${lay.outside.length} btns=${lay.btns.map(b=>b.text+':'+b.h).join(',')} focus=${foc.map(f=>f.n+':'+f.visibleRing).join(',')}`);
 }catch(e){ok(false,`${c.id} threw ${e.message.slice(0,200)}`);}await ctx.close();}
// ---- 2. tracks-explainer card layouts
async function openGame(){const ctx=await br.newContext({viewport:{width:W,height:H}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qaS')){sessionStorage.setItem('qaS','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));}});
 await p.goto(URL);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!ok(bid===BID,`explainer: runtime build-id ${bid}`))throw new Error('bid');
 await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,farmLevel:3,hensLevel:2,eggValueLevel:2,collectionLevel:1,seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coinsCents:5e7};window.eggfarmUi.render();});
 await p.waitForTimeout(300);return {ctx,p,errs};}
const showCard=async(p,r)=>{await p.evaluate(r=>{document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e=>e.remove());const g=window.eggfarm;g.migrationRefundCents=r;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();},r);await p.waitForSelector('.tracks-exp',{state:'attached',timeout:3000});await p.waitForTimeout(400);};
for(const view of ['main','sheet-farm','sheet-collection'])for(const refund of [0,123450]){let ctx;try{const o=await openGame();ctx=o.ctx;const p=o.p;
 if(view!=='main'){await p.locator('[data-nav=upgrades]').click();await p.waitForTimeout(350);await p.locator(`[data-tab=${view.split('-')[1]}]`).click();await p.waitForTimeout(400);}
 const ctxState=await p.evaluate(()=>({sheetOpen:(()=>{const s=document.querySelector('#p-upgrades');return !!s&&s.getClientRects().length>0&&!s.hasAttribute('hidden');})(),activeTab:[...document.querySelectorAll('[data-tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').filter(e=>e.getClientRects().length).map(e=>e.dataset.tab)}));
 if(view==='main')ok(!ctxState.sheetOpen,`explainer ${view}: sheet closed`,ctxState);else ok(ctxState.sheetOpen&&ctxState.activeTab.join()===view.split('-')[1],`explainer ${view}: sheet open, tab ${view.split('-')[1]} active`,ctxState);
 await showCard(p,refund);const place=await p.evaluate(()=>{const e=document.querySelector('.tracks-exp');return {place:e?.dataset.place,vis:getComputedStyle(e).visibility};});
 const lay=await p.evaluate(LAYOUT,'.tracks-exp');const tag=`exp-${view}-${refund?'refund':'plain'}`;const f1=SD+`${tag}-w${W}.png`;await p.screenshot({path:E+f1});
 if(place.place!=='none'){ok(lay.off.length===0,`${tag}: nothing off-screen`,lay.off);ok(lay.outside.length===0,`${tag}: nothing outside the card`,lay.outside);ok(lay.clip.length===0,`${tag}: no clipped text`,lay.clip);
  const gi=lay.btns.find(b=>/Got it/.test(b.text));ok(gi&&gi.h>=44&&gi.w>=44,`${tag}: Got it >= 44`,gi);}
 ok(!lay.overflowX,`${tag}: no page overflow-x`);
 // keyboard focus: focus Got it via Tab sequence (fallback: .focus() then Tab/Shift+Tab to get :focus-visible)
 let foc=await tabTo(p,'.tracks-exp');if(!foc.length){await p.evaluate(()=>document.querySelector('.tracks-exp-ok')?.focus());await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');await p.waitForTimeout(120);const f=await p.evaluate(FOCUS);if(f&&/tracks-exp-ok/.test(f.n))foc=[{...judge(f),via:'focus()+Shift+Tab/Tab'}];}
 const f2=SD+`${tag}-focus-w${W}.png`;await p.screenshot({path:E+f2});
 if(place.place!=='none')ok(foc.length>=1&&foc.every(f=>f.visibleRing),`${tag}: keyboard focus visible on Got it`,foc);
 rec({section:'explainer',view,refund,ctxState,place,layout:lay,focus:foc,shots:[f1,f2],pageerrors:o.errs});ok(o.errs.length===0,`${tag}: no page errors`,o.errs);
 console.log(`${tag} place=${place.place}/${place.vis} rect=${lay.rect} off=${lay.off.length} clip=${lay.clip.length} outside=${lay.outside.length} btns=${lay.btns.map(b=>b.text+':'+b.h).join(',')} focus=${foc.map(f=>f.n+':'+f.visibleRing).join(',')}`);
}catch(e){ok(false,`explainer ${view}/${refund} threw ${e.message.slice(0,200)}`);}await ctx?.close();}
await br.close();srv.close();rec({done:true,checks,fails});console.log(`done csr-spot ${ENG} ${W} checks=${checks} fails=${fails.length}`);process.exit(0);
