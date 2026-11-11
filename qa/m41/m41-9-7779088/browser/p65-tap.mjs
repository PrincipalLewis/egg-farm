// Hard case (Art 21:50/21:55 CCR M1): FIRST real tap on each visible Buy while the tracks tip card is SHOWING.
// usage: node p65-tap.mjs <chromium|firefox|webkit> <width> <after-full-sha>   (AFTER=/tmp/qa-m41-9-<sha7>/dist-qa, BEFORE=clean dd223f5)
// For plain + refund-line card, Upgrades Farm and Collection tabs, input mouse (page.mouse.click) and touch (hasTouch, touchscreen.tap):
// re-arm state + card before EACH Buy, tap the Buy centre once, record purchase, card dismissal, elementFromPoint at the tap point,
// every preventDefault/stopPropagation call on pointer/touch/mouse/click events (with stack), and the click's real target.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';import http from 'node:http';import {join,extname} from 'node:path';
const [ENG,WS,SHA]=process.argv.slice(2);const W=+WS,S7=SHA.slice(0,7),H={360:640,375:667,390:844,412:915,430:932,1280:800}[W]??800;
const AFTER_WT=process.env.QA_WT??`/tmp/qa-m41-9-${S7}`,BEFORE_WT='/tmp/qa-m41-9-base-dd223f5';
const pw=(await import(`${AFTER_WT}/node_modules/playwright-core/index.mjs`)).default;
const E=`/workspace/egg-farm-studio/qa/m41/m41-9-${S7}/`;mkdirSync(`${E}shots/${ENG}`,{recursive:true});mkdirSync(`${E}browser`,{recursive:true});const OUT=`${E}browser/tap-${ENG}-${W}.jsonl`;writeFileSync(OUT,'');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const serve=dir=>new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(dir,p);if(!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));}).listen(0,'127.0.0.1',()=>r({url:`http://127.0.0.1:${s.address().port}/`,s}));});
const SRV={after:await serve(`${AFTER_WT}/dist-qa`),before:await serve(`${BEFORE_WT}/dist-qa`)};const BID={after:`m3-rc1-pre+${S7}`,before:'m3-rc1-pre+dd223f5'};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const rec=o=>appendFileSync(OUT,JSON.stringify({sha:SHA,engine:ENG,size:`${W}x${H}`,...o})+'\n');const errs=[];
const BASE={farmLevel:3,hensLevel:2,eggValueLevel:2,collectionLevel:1,coinsCents:5e7};
for(const lab of ['before','after'])for(const input of ['mouse','touch']){let c;try{
 c=await br.newContext({viewport:{width:W,height:H},hasTouch:input==='touch',isMobile:false});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa65t')){sessionStorage.setItem('qa65t','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));}
  // instrumentation: log every preventDefault / stopPropagation on input events, and the click target seen at window capture
  window.__ev=[];const T=/^(pointer|touch|mouse|click)/;for(const m of ['preventDefault','stopPropagation','stopImmediatePropagation']){const o=Event.prototype[m];Event.prototype[m]=function(){if(T.test(this.type))window.__ev.push({call:m,type:this.type,target:(this.target?.className||this.target?.tagName||'')+'',cur:this.currentTarget===document?'document':this.currentTarget===window?'window':(this.currentTarget?.className||this.currentTarget?.tagName||'')+'',phase:this.eventPhase,stack:(new Error().stack||'').split('\n').slice(1,4).join(' | ')});return o.apply(this,arguments);};}
  window.__pops=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&/exp-pop|exp-coin/.test(n.className||''))window.__pops.push({cls:n.className,cardUp:!!document.querySelector('.tracks-exp'),t:performance.now()});}).observe(document,{childList:true,subtree:true});
  for(const t of ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click'])window.addEventListener(t,e=>window.__ev.push({seen:t,target:(e.target?.className||e.target?.tagName||'')+'',inCard:!!e.target?.closest?.('.tracks-exp'),buy:e.target?.closest?.('button.btn')?.dataset?.kind??null}),true);});
 await p.goto(SRV[lab].url);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(bid!==BID[lab])throw new Error(`build-id ${bid}`);
 await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());});
 await p.locator('[data-nav=upgrades]').click();await p.waitForTimeout(400);
 for(const tab of ['farm','collection'])for(const refund of [0,123450]){
  await p.locator(`[data-tab=${tab}]`).click();await p.waitForTimeout(300);
  const reset=()=>p.evaluate(st=>{document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,...st,customers:[],nextCustomerInS:1e9,seenTracksExplainer:true};window.eggfarmUi.render();},BASE);
  await reset();await p.waitForTimeout(250);
  // visible Buy buttons whose centre is in the viewport AND hit-testable with no card up
  const list=await p.evaluate(()=>[...document.querySelectorAll('#uRow button.btn[data-kind]')].map((b,i)=>{const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;const t=document.elementFromPoint(x,y);return {i,kind:b.dataset.kind,x,y,top:r.top,bottom:r.bottom,ok:r.height>0&&y>0&&y<innerHeight&&!!t&&(t===b||b.contains(t))};}).filter(b=>b.ok));
  for(const bt of list){await reset();await p.waitForTimeout(150);
   const t=await p.evaluate(()=>[...document.querySelectorAll('[data-tab]')].filter(e=>e.classList.contains('active')).map(e=>e.dataset.tab));
   await p.evaluate(r=>{const g=window.eggfarm;g.migrationRefundCents=r;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();},refund);await p.waitForSelector('.tracks-exp',{timeout:3000});await p.waitForTimeout(400);
   const pre=await p.evaluate(([i])=>{const b=document.querySelectorAll('#uRow button.btn[data-kind]')[i];const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;const e=document.elementFromPoint(x,y);const card=document.querySelector('.tracks-exp'),cr=card.getBoundingClientRect();const g=window.eggfarm.state;window.__ev.length=0;const gs=document.getElementById('goal')?.getBoundingClientRect();const popsWhileUp=window.__pops.length;window.__pops.length=0;
    return {x,y,kind:b.dataset.kind,efp:(e?.className||e?.tagName||'')+'',efpInCard:!!card.contains(e),efpIsBuy:e===b||b.contains(e),card:{top:cr.top,bottom:cr.bottom,place:card.dataset.place??null},overlap:r.top<cr.bottom&&cr.top<r.bottom&&r.left<cr.right&&cr.left<r.right,buyRect:{l:r.left,r:r.right,t:r.top,b:r.bottom},cardRect:{l:cr.left,r:cr.right,t:cr.top,b:cr.bottom},goal:gs&&gs.height>0?{l:gs.left,r:gs.right,t:gs.top,b:gs.bottom}:null,cardOverGoal:!!gs&&gs.height>0&&gs.top<cr.bottom&&cr.top<gs.bottom&&gs.left<cr.right&&cr.left<gs.right,popsWhileUp,
     overlays:[...document.elementsFromPoint(x,y)].slice(0,6).map(n=>(n.className||n.tagName)+''),state:{F:g.farmLevel,H:g.hensLevel,V:g.eggValueLevel,C:g.collectionLevel,coins:g.coinsCents}};},[bt.i]);
   const shotA=`shots/${ENG}/tap-${lab}-${input}-${tab}-${refund?'refund':'plain'}-${pre.kind}-pre-w${W}.png`;await p.screenshot({path:E+shotA});
   if(input==='mouse')await p.mouse.click(pre.x,pre.y);else await p.touchscreen.tap(pre.x,pre.y);await p.waitForTimeout(350);
   const post=await p.evaluate(()=>{const g=window.eggfarm.state;return {state:{F:g.farmLevel,H:g.hensLevel,V:g.eggValueLevel,C:g.collectionLevel,coins:g.coinsCents},cardShown:!!document.querySelector('.tracks-exp'),ev:window.__ev.slice(),pops:window.__pops.slice()};});
   const shotB=`shots/${ENG}/tap-${lab}-${input}-${tab}-${refund?'refund':'plain'}-${pre.kind}-post-w${W}.png`;await p.screenshot({path:E+shotB});
   const lv={farm:'F',hens:'H',eggValue:'V',collection:'C'}[pre.kind];const bought=post.state[lv]===pre.state[lv]+1&&post.state.coins<pre.state.coins;
   const blocked=post.ev.filter(e=>e.call);const outcome=bought&&!post.cardShown?'BUY+DISMISS':bought?'BUY(card stays)':!post.cardShown?'DISMISS-ONLY (tap swallowed)':'NOTHING';
   rec({lab,build_id:BID[lab],input,tab,activeTab:t,activeTabOk:t.length===1&&t[0]===tab,refund,kind:pre.kind,tap:{x:pre.x,y:pre.y},cardPlace:pre.card.place,cardRect:pre.cardRect,buyRect:pre.buyRect,goal:pre.goal,cardOverGoal:pre.cardOverGoal,overlapsBuy:pre.overlap,popsWhileUp:pre.popsWhileUp,popsAfterTap:post.pops,elementFromPoint:pre.efp,efpInCard:pre.efpInCard,efpIsBuy:pre.efpIsBuy,stack:pre.overlays,
    before:pre.state,after:post.state,bought,cardDismissed:!post.cardShown,outcome,preventOrStop:blocked,seen:post.ev.filter(e=>e.seen),shots:[shotA,shotB]});
   console.log(lab,input,tab,refund?'refund':'plain',pre.kind,'efp',pre.efp,pre.efpInCard?'(card)':'','->',outcome);
   await p.evaluate(()=>document.querySelectorAll('.tracks-exp').forEach(e=>e.remove()));}
 }
 await c.close();}catch(e){console.log('ERR',lab,input,e.message.slice(0,200));rec({lab,input,error:e.message.slice(0,300)});await c?.close().catch(()=>{});}}
rec({done:true,pageerrors:errs});await Promise.race([br.close(),new Promise(r=>setTimeout(r,15000))]);SRV.after.s.close();SRV.before.s.close();console.log(`done ${ENG} ${W}`);process.exit(0);
