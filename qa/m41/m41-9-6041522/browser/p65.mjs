// QA-owned probe for PR #65 (M41-9 Art Minors UX-M1/M2/M3/M5) + Art rulings R-a/R-b. Re-runnable on any SHA:
//   node p65.mjs <chromium|firefox|webkit> <width> <after-full-sha>
// AFTER = /tmp/qa-m41-9-<sha7>/dist-qa (built by gates/run-gates.sh), BEFORE = /tmp/qa-m41-9-base-dd223f5/dist-qa (clean main).
// Own static servers on OS-assigned free ports (never 4173). Evidence -> qa/m41/m41-9-<sha7>/{browser,shots}. Run under the flock.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';import http from 'node:http';import {join,extname} from 'node:path';
const [ENG,WS,SHA]=process.argv.slice(2);const W=+WS;const S7=SHA.slice(0,7);const H={360:640,375:667,390:844}[W]??800;
const AFTER_WT=`/tmp/qa-m41-9-${S7}`,BEFORE_WT='/tmp/qa-m41-9-base-dd223f5';
const pw=(await import(`${AFTER_WT}/node_modules/playwright-core/index.mjs`)).default;
const E=`/workspace/egg-farm-studio/qa/m41/m41-9-${S7}/`;mkdirSync(`${E}shots/${ENG}`,{recursive:true});mkdirSync(`${E}browser`,{recursive:true});
const OUT=`${E}browser/entries-${ENG}-${W}.jsonl`;writeFileSync(OUT,'');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
function serve(dir){return new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(dir,p);
 if(!f.startsWith(dir)||!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));});
 s.listen(0,'127.0.0.1',()=>r({url:`http://127.0.0.1:${s.address().port}/`,stop:()=>s.close()}));});}
const SRV={after:await serve(`${AFTER_WT}/dist-qa`),before:await serve(`${BEFORE_WT}/dist-qa`)};const BID={after:`m3-rc1-pre+${S7}`,before:'m3-rc1-pre+dd223f5'};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const obs=[];const ok=(lab,c,m,d)=>{if(lab==='after'&&!c){fails.push(m);console.log('FAIL',m,JSON.stringify(d??'').slice(0,300));}if(lab==='before'&&!c)obs.push(m);return c;};
const rec=o=>appendFileSync(OUT,JSON.stringify({sha:SHA,engine:ENG,size:`${W}x${H}`,...o})+'\n');
async function shot(p,lab,name){const f=`shots/${ENG}/${lab}-${name}-w${W}.png`;await p.screenshot({path:E+f});return f;}
async function open(lab,extra={}){const c=await br.newContext({viewport:{width:W,height:H},...extra});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa65')){sessionStorage.setItem('qa65','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));}});
 await p.goto(SRV[lab].url);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(bid!==BID[lab]){fails.push(`${lab} runtime build-id ${bid} != ${BID[lab]}`);throw new Error('build-id');}
 await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coinsCents:5e5};window.eggfarmUi.render();});
 await p.waitForTimeout(700);return {c,p,errs,bid};}
const showCard=async(p,refund=0)=>{await p.evaluate(r=>{document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.migrationRefundCents=r;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();},refund);await p.waitForSelector('.tracks-exp',{timeout:3000});await p.waitForTimeout(350);};
const activeTab=p=>p.evaluate(()=>[...document.querySelectorAll('[data-tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').filter(e=>e.getClientRects().length).map(e=>e.dataset.tab));
const sheetOpen=p=>p.evaluate(()=>{const s=document.querySelector('#p-upgrades');return !!s&&s.getClientRects().length>0;});
async function openUpgrades(p,tab='farm'){if(!await sheetOpen(p))await p.locator('[data-nav=upgrades]').click();await p.waitForTimeout(350);await p.locator(`[data-tab=${tab}]`).click();await p.waitForTimeout(350);}
const ring=p=>p.evaluate(()=>{const a=document.activeElement,cs=a&&getComputedStyle(a);return a?{el:a.tagName+(a.dataset.nav?`[data-nav=${a.dataset.nav}]`:'')+(a.dataset.tab?`[data-tab=${a.dataset.tab}]`:'')+(a.id?'#'+a.id:''),style:cs.outlineStyle,width:cs.outlineWidth,color:cs.outlineColor,kbd:a.classList.contains('kbd-focus')}:null;});
const ringOk=r=>!!r&&r.style!=='none'&&parseFloat(r.width)>=3&&/43,\s*121,\s*168/.test(r.color);
const R=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};},s);
const hit=(a,b)=>!!a&&!!b&&a.l<b.r-0.5&&b.l<a.r-0.5&&a.t<b.b-0.5&&b.t<a.b-0.5;
// Sweep of the touched surface: tap targets >=44, clipped labels, page overflow, rects of key elements (for layout-shift diff vs base)
const sweep=p=>p.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight;};
 const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.dataset.nav?`[nav=${e.dataset.nav}]`:'')+(e.dataset.tab?`[tab=${e.dataset.tab}]`:'')+(e.dataset.id?`[id=${e.dataset.id}]`:'')+'.'+[...e.classList].slice(0,3).join('.')+':'+(e.textContent||'').trim().slice(0,24);
 const taps=[...document.querySelectorAll('button,[role=button],a[href],[data-tab]')].filter(vis).filter(e=>!e.closest('[inert],[aria-hidden=true]')).map(e=>{const r=e.getBoundingClientRect();return {n:name(e),h:Math.round(r.height*10)/10,w:Math.round(r.width*10)/10};});
 const clip=[...document.querySelectorAll('button,button *,.order .l1,.order .l1 *,.save-warn,.tracks-exp h2,.tracks-exp p,.tabs button,.goal-label,.up h3,.up p')].filter(vis).filter(e=>e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&getComputedStyle(e).overflowX!=='visible').map(e=>({n:name(e),sw:e.scrollWidth,cw:e.clientWidth}));
 const rect=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(v=>Math.round(v));};
 return {taps,small:taps.filter(t=>t.h<44||t.w<44),clip,overflowX:document.documentElement.scrollWidth>innerWidth,
  rects:Object.fromEntries(['#collect','nav.actions','#goal','#meter','.hud','#p-upgrades','#p-upgrades .tabs','#p-upgrades .up','#p-market','.order','.save-warn','.tracks-exp'].map(s=>[s,rect(s)]))};});
// R-b: Buy buttons covered by the card; after dismiss, elementFromPoint(Buy centre) must hit Buy
const buys=p=>p.evaluate(()=>{const card=document.querySelector('.tracks-exp');return [...document.querySelectorAll('#p-upgrades .up button.buy,#p-upgrades .up button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;}).map(b=>{const r=b.getBoundingClientRect();
 const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);let cov=0;for(const fx of [.1,.5,.9])for(const fy of [.2,.5,.8]){const x=document.elementFromPoint(r.left+fx*r.width,r.top+fy*r.height);if(card&&card.contains(x))cov++;}
 return {row:b.closest('.up')?.querySelector('h3')?.textContent??'',t:Math.round(r.top),h:r.height,centreHitsBuy:b===t||b.contains(t),coveredPts:cov};});});
const sections={};
for(const lab of ['before','after']){const L=lab;
 // --- UX-M1 (sheet closed -> bottom-nav Upgrades; sheet open -> active tab)
 try{const {c,p}=await open(L);const m1=[];
  for(const sh of ['closed','open'])for(const how of ['esc','gotit']){if(sh==='open')await openUpgrades(p,'farm');await showCard(p);
   if(how==='esc')await p.keyboard.press('Escape');else await p.locator('.tracks-exp-ok').click();await p.waitForTimeout(250);
   const tab=sh==='open'?await activeTab(p):null;const r=await ring(p);const f=await shot(p,L,`M1-${sh}-${how}`);
   const want=sh==='open'?`BUTTON[data-tab=${tab?.[0]}]`:'BUTTON[data-nav=upgrades]';
   ok(L,(sh==='closed'||(tab?.length===1&&tab[0]==='farm'))&&r?.el===want&&ringOk(r),`UX-M1 ${how} sheet-${sh}: focus ${want} with 3px #2B79A8 ring`,r);m1.push({sh,how,tab,ring:r,shot:f});
   // ring clears on next pointer press
   await p.mouse.click(5,H/2);await p.waitForTimeout(100);const r2=await ring(p);if(how==='gotit')m1[m1.length-1].afterPointer=r2;}
  // no forced ring on card-body tap / timeout
  await showCard(p);await p.locator('.tracks-exp h2').click();await p.waitForTimeout(200);const rb=await ring(p);ok(L,!rb?.kbd,'UX-M1 card-body tap does not force .kbd-focus',rb);
  rec({section:'UX-M1',lab:L,build_id:BID[L],m1,bodyTap:rb});await c.close();}catch(e){ok(L,false,`UX-M1 threw ${e.message.slice(0,150)}`);}
 // --- UX-M2 no-storage notice vs Collect
 try{const {c,p}=await open(L);await p.evaluate(()=>window.eggfarm.onStorageFail?.());await p.waitForSelector('.save-warn',{timeout:3000}).catch(()=>{});await p.waitForTimeout(300);
  const n=await R(p,'.save-warn'),col=await R(p,'#collect'),goal=await R(p,'#goal'),meter=await R(p,'#meter');
  const pts=await p.evaluate(()=>{const c=document.querySelector('#collect').getBoundingClientRect();const out=[];for(const fx of [.05,.5,.95])for(const fy of [.08,.5,.92]){const t=document.elementFromPoint(c.left+fx*c.width,c.top+fy*c.height);out.push(t?.closest('#collect')?1:0);}return out;});
  await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,coop:20,basket:0};});await p.waitForTimeout(150);const b0=await p.evaluate(()=>window.eggfarm.state.basket);
  const f=await shot(p,L,'M2-no-storage');await p.locator('#collect').click({timeout:3000}).catch(()=>{});await p.waitForTimeout(250);const b1=await p.evaluate(()=>window.eggfarm.state.basket);
  const sw=await sweep(p);
  ok(L,!!n&&!hit(n,col)&&pts.every(x=>x)&&b1>b0,'UX-M2 notice clear of Collect; Collect fully hit-testable and tappable',{n,col,pts,b0,b1});
  rec({section:'UX-M2',lab:L,notice:n,collect:col,goal,meter,overGoal:hit(n,goal),overMeter:hit(n,meter),collectPts:pts,basket:[b0,b1],sweep:sw,shot:f});await c.close();}catch(e){ok(L,false,`UX-M2 threw ${e.message.slice(0,150)}`);}
 // --- UX-M3 + R-b: sheet open + card (plain / refund), tabs fully visible; Buy coverage; dismiss & expiry make Buy tappable
 for(const refund of [0,123450])for(const end of ['gotit','timeout'])try{const {c,p}=await open(L);await openUpgrades(p,'farm');const tab=await activeTab(p);
  await showCard(p,refund);const card=await R(p,'.tracks-exp');const place=await p.evaluate(()=>document.querySelector('.tracks-exp')?.dataset.place??null);
  const tabs=await p.evaluate(()=>[...document.querySelectorAll('[data-tab]')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect(),card=document.querySelector('.tracks-exp');let cov=0;
   for(const fx of [.15,.5,.85])for(const fy of [.2,.5,.8]){const t=document.elementFromPoint(r.left+fx*r.width,r.top+fy*r.height);if(card&&card.contains(t))cov++;}return {tab:e.dataset.tab,h:r.height,cov,inView:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};}));
  const bu=await buys(p);const hasDismiss=await p.evaluate(()=>{const b=document.querySelector('.tracks-exp-ok');if(!b)return null;const r=b.getBoundingClientRect();return {text:b.textContent,h:r.height,w:r.width};});
  const f1=await shot(p,L,`M3-sheet-card${refund?'-refund':''}`);const sw=await sweep(p);
  ok(L,tab.length===1&&tab[0]==='farm','active tab farm before measurement',tab);
  ok(L,tabs.length>=3&&tabs.every(t=>t.cov===0&&t.inView),`UX-M3 every [data-tab] fully visible (refund ${!!refund})`,{place,card,tabs});
  if(end==='gotit'){await p.locator('.tracks-exp-ok').click();await p.waitForTimeout(250);}else{await p.waitForTimeout(8400);}
  const gone=await p.evaluate(()=>!document.querySelector('.tracks-exp'));await p.waitForTimeout(200);const bu2=await buys(p);const f2=await shot(p,L,`Rb-after-${end}${refund?'-refund':''}`);
  const coveredWhileUp=bu.filter(b=>b.coveredPts>0).map(b=>b.row);
  ok(L,gone&&bu2.length>0&&bu2.every(b=>b.centreHitsBuy&&b.coveredPts===0),`R-b after ${end}: card gone and every visible Buy centre hits Buy (refund ${!!refund})`,{gone,bu2});
  ok(L,!!hasDismiss&&hasDismiss.h>=44,'R-b card has a >=44px dismiss control (Got it) and 8 s auto-dismiss',hasDismiss);
  rec({section:'UX-M3+R-b',lab:L,refund,end,tab,place,card,tabs,buysWhileUp:bu,coveredWhileUp,dismiss:hasDismiss,goneAfter:gone,buysAfter:bu2,sweep:sw,shots:[f1,f2]});await c.close();}catch(e){ok(L,false,`UX-M3 threw ${e.message.slice(0,150)}`);}
 // --- UX-M5: pop + coin, fade copy 150 ms; reduced motion (system + in-game flag) none
 try{const {c,p}=await open(L);await p.evaluate(()=>{window.__fx=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&/exp-pop|exp-coin|tracks-exp-out/.test(n.className)){const a=n.getAnimations?.()[0];window.__fx.push({cls:n.className,text:(n.textContent||'').trim(),t:performance.now(),ariaHidden:n.getAttribute('aria-hidden'),inert:n.hasAttribute('inert'),ids:n.querySelectorAll('[id]').length});}}).observe(document.body,{childList:true});});
  await showCard(p,123450);await p.waitForTimeout(-250+300);const fpop=await shot(p,L,'M5-refund-pop-live');const pop=await p.evaluate(()=>{const e=document.querySelector('.exp-pop');if(!e)return null;const cs=getComputedStyle(e),a=e.getAnimations()[0];return {text:e.textContent.trim(),font:cs.fontSize,color:cs.color,stroke:cs.webkitTextStrokeWidth??null,dur:a?.effect?.getTiming().duration};});
  await p.waitForTimeout(900);const popGone=await p.evaluate(()=>!document.querySelector('.exp-pop,.exp-coin'));
  await p.keyboard.press('Escape');await p.waitForTimeout(40);const fade=await p.evaluate(()=>{const e=document.querySelector('.tracks-exp-out');const a=e?.getAnimations()[0];return {card:!!document.querySelector('.tracks-exp'),out:!!e,name:a?.animationName,dur:a?.effect?.getTiming().duration,ariaHidden:e?.getAttribute('aria-hidden'),inert:e?.hasAttribute('inert'),ids:e?e.querySelectorAll('[id]').length:null,pe:e?getComputedStyle(e).pointerEvents:null};});
  const ffade=await shot(p,L,'M5-close-fade-live');await p.waitForTimeout(300);const fadeGone=await p.evaluate(()=>!document.querySelector('.tracks-exp-out'));const fx=await p.evaluate(()=>window.__fx);
  ok(L,!!pop&&pop.text==='+$1.2K'&&fx.some(f=>/exp-coin/.test(f.cls)&&f.ariaHidden==='true')&&fx.some(f=>/exp-pop/.test(f.cls)&&f.ariaHidden==='true')&&popGone,'UX-M5 refund pop + coin, aria-hidden, gone after 800 ms',{pop,fx,popGone});
  ok(L,!fade.card&&fade.out&&fade.name==='expout'&&fade.dur===150&&fade.ariaHidden==='true'&&fade.inert&&fade.ids===0&&fade.pe==='none'&&fadeGone,'UX-M5 close: card gone at once, inert aria-hidden 150 ms fade copy',{fade,fadeGone});
  rec({section:'UX-M5',lab:L,pop,popGone,fade,fadeGone,fx,shots:[fpop,ffade]});await c.close();}catch(e){ok(L,false,`UX-M5 threw ${e.message.slice(0,150)}`);}
 for(const mode of ['system','flag'])try{const {c,p}=await open(L,mode==='system'?{reducedMotion:'reduce'}:{});if(mode==='flag')await p.evaluate(()=>document.documentElement.classList.add('reduced-motion'));
  await p.evaluate(()=>{window.__fx=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&/exp-pop|exp-coin|tracks-exp-out/.test(n.className))window.__fx.push(n.className);}).observe(document.body,{childList:true});});
  await showCard(p,123450);const f=await shot(p,L,`M5-reduced-${mode}-card`);await p.keyboard.press('Escape');await p.waitForTimeout(30);const r=await p.evaluate(()=>({fx:window.__fx,card:!!document.querySelector('.tracks-exp')}));
  ok(L,r.fx.length===0&&!r.card,`UX-M5 reduced motion (${mode}): no pop / fade, instant close`,r);rec({section:'UX-M5-rm',lab:L,mode,...r,shot:f});await c.close();}catch(e){ok(L,false,`UX-M5 rm threw ${e.message.slice(0,150)}`);}
 // --- Regression sweep, steady states (no card/notice): Farm main, Upgrades farm/collection tabs, Market with orders
 try{const {c,p}=await open(L);const st={};st.main={sweep:await sweep(p),shot:await shot(p,L,'reg-main')};
  for(const tab of ['farm','collection']){await openUpgrades(p,tab);const t=await activeTab(p);ok(L,t.length===1&&t[0]===tab,`active tab ${tab}`,t);st[`up-${tab}`]={tab:t,sweep:await sweep(p),shot:await shot(p,L,`reg-up-${tab}`)};}
  rec({section:'regression',lab:L,states:st});await c.close();}catch(e){ok(L,false,`regression threw ${e.message.slice(0,150)}`);}
 // --- R-a: order card text floor 12px, wraps, never clips (Market), normal + huge counts
 for(const [nm,cust,basket,arguments_lv] of [['normal',[{id:901,demand:6,filled:2,waitedS:0},{id:902,demand:24,filled:0,waitedS:0},{id:903,demand:120,filled:119,waitedS:0}],50],
   ['max-real',[{id:921,demand:75,filled:74,waitedS:0},{id:922,demand:75,filled:0,waitedS:0},{id:923,demand:68,filled:67,waitedS:0}],200,{farmLevel:30,hensLevel:30,eggValueLevel:30,collectionLevel:30}],
   ['huge',[{id:911,demand:999999,filled:123456,waitedS:0},{id:912,demand:1234567890,filled:987654321,waitedS:0},{id:913,demand:9.99e14,filled:5e14,waitedS:0},{id:914,demand:1e17,filled:9.9e16,waitedS:0}],1e15]])
  try{const {c,p}=await open(L);await p.evaluate(([cu,bk,lv])=>{const g=window.eggfarm;g.state={...g.state,...(lv??{}),customers:cu,basket:bk,nextCustomerInS:1e9,nextCustomerId:999};window.eggfarmUi.render();},[cust,basket,arguments_lv]);
   await p.locator('[data-nav=market]').click();await p.waitForTimeout(500);const nav=await p.evaluate(()=>[...document.querySelectorAll('[data-nav].active,[data-nav][aria-current]')].map(e=>e.dataset.nav));
   const ra=await p.evaluate(()=>[...document.querySelectorAll('.order')].filter(e=>e.getClientRects().length).map(o=>{const l1=o.querySelector('.l1');const card=o.getBoundingClientRect();
    const parts=[l1,...l1.querySelectorAll('*'),...o.querySelectorAll('.sell,.sell *')].map(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {cls:e.className||e.tagName,text:e.textContent,fs:parseFloat(cs.fontSize),sw:e.scrollWidth,cw:e.clientWidth,ws:cs.whiteSpace,to:cs.textOverflow,ov:cs.overflowX,
     inCard:r.left>=card.left-0.5&&r.right<=card.right+0.5&&r.top>=card.top-0.5&&r.bottom<=card.bottom+0.5,lines:Math.round(r.height/parseFloat(cs.lineHeight==='normal'?cs.fontSize*1.2:cs.lineHeight))};});
    const egg=o.querySelector('.l1 .egg');const er=egg?.getBoundingClientRect();return {id:o.dataset.row,text:l1.textContent,aria:o.querySelector('.txt')?.getAttribute('aria-label'),parts,eggsPresent:!!egg&&/eggs/.test(egg.textContent)&&er.width>0,
     eggsClipped:egg?egg.scrollWidth>egg.clientWidth+0.5:null,cardH:card.height};}));
   const f=await shot(p,L,`Ra-order-${nm}`);
   const bad=ra.flatMap(o=>o.parts.filter(x=>x.fs<12||(x.sw>x.cw+0.5&&x.cw>0&&x.ov!=='visible')||!x.inCard).map(x=>({id:o.id,...x})));
   ok(L,ra.length>0&&bad.length===0&&ra.every(o=>o.eggsPresent&&!o.eggsClipped),`R-a order card (${nm}): font>=12, no clipped/ellipsised text, 'eggs' present`,bad.slice(0,6));
   rec({section:'R-a',lab:L,state:nm,nav,orders:ra,violations:bad,shot:f});await c.close();}catch(e){ok(L,false,`R-a ${nm} threw ${e.message.slice(0,150)}`);}
}
rec({done:true,fails,beforeDefects:obs,early:true});await Promise.race([br.close(),new Promise(r=>setTimeout(r,15000))]);SRV.after.stop();SRV.before.stop();console.log(`done ${ENG} ${W} after-fails=${fails.length} before-defects=${obs.length}`);process.exit(0);
