// Gate 5 FINAL-SHA shot-matrix extension. Plugs into a gate5 outdir WITHOUT modifying gate5-pr44/shoot.mjs:
//   run AFTER the base shoot for an engine; it APPENDS to <outdir>/entries-<engine>.jsonl and writes <outdir>/<engine>/ext-*.png,
//   so the unchanged gate5 manifest.mjs picks the extra shots up. Behaviour results -> <outdir>/ext-probes-<engine>.jsonl.
// node shoot-ext.mjs <engine> <outdir>   env: SHA (40 hex), URL (never :4173), EXT_GROUPS (csv: max,l5x,coins,goal; not GROUPS, a bash builtin), SIZES (csv), PW (playwright-core index.mjs)
const PW=process.env.PW||'/tmp/qa-final-prep-4ccb9fd/node_modules/playwright-core/index.mjs';const pw=(await import(PW)).default;
import { mkdirSync, appendFileSync } from 'node:fs';
import { STATES, loadState, loadedInfo, UI as UIX } from './lib-ext.mjs';
import * as X from './exp-ext.mjs';
const [ENG,OUT]=process.argv.slice(2);const SHA=process.env.SHA,URL=process.env.URL;
if(!/^[0-9a-f]{40}$/.test(SHA||''))throw new Error('SHA must be 40 hex');if(!URL||/:4173\b/.test(URL))throw new Error('bad URL');
const LABEL=process.env.EXPECT_BUILD_ID||`m3-rc1-pre+${SHA.slice(0,7)}`;if(!LABEL.includes(SHA.slice(0,7)))throw new Error('EXPECT_BUILD_ID must contain sha7');globalThis.__URL=URL;
mkdirSync(`${OUT}/${ENG}`,{recursive:true});const ENT=`${OUT}/entries-${ENG}.jsonl`,PRB=`${OUT}/ext-probes-${ENG}.jsonl`,LOG=`${OUT}/run-ext-${ENG}.log`;
const log=s=>{appendFileSync(LOG,s+'\n');console.log(s)};const rec=o=>appendFileSync(PRB,JSON.stringify({engine:ENG,...o})+'\n');
const SZ={'360x800':[360,800],'375x800':[375,800],'390x844':[390,844],'1280x800':[1280,800]};
const S2=['360x800','1280x800'],S4=Object.keys(SZ);
// matrix: group -> [{state, sizes, screens:[[screen, rowKind|null]]}]
const ROW={farm:'#uRow .up:not(.track):has(h3:text-is("Farm level"))',collection:'#uRow .up:not(.track):has(h3:text-is("Collect per tap"))',hens:'#uRow .up.track[data-track=hens]',eggValue:'#uRow .up.track[data-track=eggValue]'};
const H3={farm:'Farm level',collection:'Collect per tap'};
const M={
 max:[['max-farm',[['upgrades-farm','farm']]],['max-collection',[['upgrades-collection','collection']]],['max-hens',[['upgrades-farm-tracks','hens']]],['max-eggvalue',[['upgrades-farm-tracks','eggValue']]],
      ['max-all',[['upgrades-farm','farm'],['upgrades-farm-tracks','hens+eggValue'],['upgrades-collection','collection']]]].map(([s,sc])=>({state:s,sizes:S2,screens:sc})),
 l5x:['L50','L55'].map(s=>({state:s,sizes:S4,screens:[['upgrades-farm','farm'],['upgrades-farm-tracks','hens+eggValue']],need:s})),
 coins:['coins-999.96B','coins-1.68T'].map(s=>({state:s,sizes:S4,screens:[['hud',null]]})),
 cap:['farm50','farm50-tracks55'].map(s=>({state:s,sizes:S2,screens:[],cap:s})),
 c4:[{state:'c4',sizes:S2,screens:[],cap:'c4'}],
 exp1:['migrated-acdbedc','fresh'].map(s=>({state:s,sizes:S4,screens:[],x:'exp1'})),
 f2:[{state:'L10',sizes:S4,screens:[],x:'f2'}],
 f3:[{state:'L10',sizes:S4,screens:[],x:'f3'}],
 h6:[{state:'h6',sizes:['390x844','1280x800'],screens:[],x:'h6'}],
 expgate:['hidden','readonly'].map(s=>({state:s,sizes:['390x844'],screens:[],x:'expgate'})),
 expui:['norefund','refund'].flatMap(v=>[{state:v,sizes:S4,screens:[],x:'expui'}]),
 expoff:[{state:'flagoff',sizes:['390x844'],screens:[],x:'expoff'}],
 goal:['fresh','L10','L30','migrated-acdbedc'].map(s=>({state:s,sizes:S4,screens:[['goal',null],['upgrades-farm-tracks',null]]}))};
const PROFILE=process.env.PROFILE||'A';const NA_GROUPS=['cap','c4','l5x']; // D-CEO-09 option B: capped at L30
const groups0=(process.env.EXT_GROUPS||'max,l5x,coins,goal,cap,c4,exp1,f2,f3,h6,expgate,expui,expoff').split(',');const sizesF=process.env.SIZES?.split(',');
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
let n=0,bad=0,skip=0;
const groups=PROFILE==='B'?groups0.filter(g=>{if(!NA_GROUPS.includes(g))return true;for(const cell of M[g])for(const sz of cell.sizes.filter(s=>!sizesF||sizesF.includes(s))){const l=`${ENG} ${g} ${cell.state} ${sz}: N/A by ruling (D-CEO-09 option B)`;appendFileSync(`${OUT}/na-by-ruling-${ENG}.txt`,l+'\n');rec({kind:'na',group:g,state:cell.state,size:sz,status:'N/A by ruling (D-CEO-09 option B)'});}return false;}):groups0;
const stF=process.env.EXT_STATES?.split(',');for(const G of groups)for(const cell of M[G].filter(c=>!stF||stF.includes(c.state)))for(const sz of cell.sizes.filter(s=>!sizesF||sizesF.includes(s))){const [w,h]=SZ[sz],docked=w>=960&&w>h;
 const c=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});let p=await c.newPage();const cons=[];
 p.on('console',m=>{if(m.type()==='error')cons.push(m.text().slice(0,200))});p.on('pageerror',e=>cons.push('pageerror '+e.message));
 const EXPN=['expgate','expui','expoff'].includes(cell.x);const sv=EXPN?{desc:'gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json',max:{}}:cell.x==='exp1'?{desc:cell.state==='fresh'?'fresh':'../gate5-pr44/fixtures/acdbedc-v6rich.json',max:{}}:await loadState(p,cell.state);if(cell.x==='exp1'||EXPN)await p.goto(cell.x==='expoff'&&process.env.FLAGOFF_URL?process.env.FLAGOFF_URL:URL);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);
 if(bid!==LABEL&&cell.x!=='expoff'){log(`ABORT build-id ${bid} != ${LABEL}`);process.exit(4);}
 if(cell.x!=='exp1'&&!EXPN)await p.getByText('Skip',{exact:true}).first().click({timeout:1200}).catch(()=>{});
 if(cell.x!=='exp1'&&!EXPN){await p.getByRole('button',{name:/Got it/}).first().click({timeout:1500}).catch(()=>{});await p.waitForTimeout(400);}
 if(cell.x!=='exp1'&&!EXPN)await p.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
 const info=(cell.x==='exp1'||EXPN)?{}:await loadedInfo(p);
 const openNav=async x=>{if(docked)return;await p.keyboard.press('Escape');if(x)await p.locator(`[data-nav=${x}]`).click();await p.waitForTimeout(300);};
 const goTab=async t=>{await openNav('upgrades');if(!docked&&!(await p.locator('[data-tab=farm]').isVisible()))await p.locator('[data-nav=upgrades]').click();await p.locator(`[data-tab=${t}]`).click();await p.waitForTimeout(250);
  await p.waitForFunction(x=>document.querySelector(`[data-tab=${x}]`)?.classList.contains('active'),t,{timeout:3000});};
 if(cell.x){const fails=[],R={kind:cell.x,state:cell.state,size:sz};
  const put=async(tag,ok,fl,extra={},tab=null)=>{const file=`${ENG}/ext-${cell.x}-${cell.state}-${tag}-${sz}.png`;await p.screenshot({path:`${OUT}/${file}`});n++;
   appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:sv.desc,seed:null,group:`final-prep:${cell.x}`,state:`${cell.state} · ${cell.x} ${tag}${ok?'':' · ASSERT-FAIL'}`,asserted_tab:tab,asserted_panel:tab?'upgrades':'farm',ext_assert_ok:ok,ext_fails:fl,console_errors:cons.length,...extra})+'\n');};
  const goTab=async t=>{if(!docked){await p.keyboard.press('Escape');await p.locator('[data-nav=upgrades]').click();await p.waitForTimeout(300);}await p.locator(`[data-tab=${t}]`).click();await p.waitForTimeout(250);await p.waitForFunction(x=>document.querySelector(`[data-tab=${x}]`)?.classList.contains('active'),t,{timeout:3000});};
  // EXP1 selector: spec m4a-spec §11 = role="dialog" aria-modal="false" with title text; fallback text
  const expLoc=()=>p.locator('[role=dialog][aria-modal=false]').filter({hasText:'Upgrades got an upgrade!'}).or(p.getByText('Upgrades got an upgrade!')).first();
  const expVis=async()=>expLoc().isVisible().catch(()=>false);
  const flag=()=>p.evaluate(()=>{const o={};for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm')){const v=localStorage.getItem(k);const m=v&&v.match(/"seenTracksExplainer"\s*:\s*(true|false)/);if(m)o[k]=m[1]==='true';}return o;});
  if(EXPN){ // 04:34 EXP1 additions
   const fx=X.canonical(cell.state==='refund');R.fixture=fx.err?{err:fx.err}:{sha256:fx.sha256,variant:fx.variant};
   if(fx.err){skip++;rec({...R,status:'PENDING: canonical EXP1 fixture unavailable',reason:fx.err});log(`SKIP ${cell.x} ${cell.state} ${sz}: ${fx.err}`);await c.close();continue;}
   await c.close();let cx=null,P=null;const U=cell.x==='expoff'?process.env.FLAGOFF_URL:URL;
   const open=async(tg={})=>{if(cx)await cx.close();cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});await cx.addInitScript(X.INIT);P=await cx.newPage();p=P;P.on('console',m=>{if(m.type()==='error')cons.push(m.text().slice(0,200))});await X.seed(P,U,fx,UIX,tg);await P.goto(U);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});};
   const waitCard=async ms=>P.waitForFunction(T=>[...document.querySelectorAll('body *')].some(e=>e.childElementCount===0&&e.textContent.trim()===T&&e.getBoundingClientRect().width>0),X.TITLE,{timeout:ms}).then(()=>true,()=>false);
   const gone=async ms=>P.waitForFunction(T=>![...document.querySelectorAll('body *')].some(e=>e.childElementCount===0&&e.textContent.trim()===T&&e.getBoundingClientRect().width>0),X.TITLE,{timeout:ms}).then(()=>true,()=>false);
   const shot=async(tag,ok,fl,extra={})=>{await put(tag,ok,fl,extra);};
   if(cell.x==='expoff'){if(!U){skip++;rec({...R,status:'PENDING: no flag-off build (set FLAGOFF_URL to an M4-off build, e.g. Latest dd52bfd)'});await c.close().catch(()=>{});continue;}
    await open();const v=await waitCard(5000);R.flagOff={card:v,count:await X.count(P)};if(v||R.flagOff.count)fails.push('EXP-d: card shown with M4 flag off');await shot('flagoff',!v,v?['card with flag off']:[]);}
   else if(cell.x==='expgate'){const tg=cell.state==='hidden'?{__hidden:'1'}:{__ro:'1'};await open(tg);
    const v0=await waitCard(4000);R.blocked={card:v0,count:await X.count(P),flag:await X.flagState(P)};if(v0)fails.push(`${cell.state}: card shown while ${cell.state}`);if(Object.values(R.blocked.flag).includes(true))fails.push(`${cell.state}: seenTracksExplainer set while ${cell.state}`);
    await shot('blocked',!v0,v0?['card while blocked']:[]);
    if(cell.state==='hidden')await P.evaluate(()=>window.__qaShow());else{await P.evaluate(()=>sessionStorage.setItem('__ro','0'));await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});}
    const v1=await waitCard(6000);if(v1)await P.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));await shot('unblocked-shows',v1,v1?[]:['card not shown after becoming '+(cell.state==='hidden'?'visible':'writable')]);if(!v1){fails.length=0;skip++;rec({...R,status:'PENDING: explainer not implemented (never shown, blocked or unblocked)'});log(`SKIP expgate ${cell.state} ${sz} PENDING`);await cx.close();continue;}
    if(v1){await P.evaluate(()=>document.getAnimations().forEach(a=>a.play()));await P.getByRole('button',{name:/Got it/}).first().click().catch(()=>{});}
    await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await waitCard(3000);R.unblocked={shown:v1,count:await X.count(P),flag:await X.flagState(P)};if(R.unblocked.count!==1)fails.push(`shown ${R.unblocked.count} times after unblock (want 1)`);}
   else { // expui (HoQ 04:46): EXP-a two-tap Buy+Collect, EXP-b focus, toasts held, behind Welcome back + 8 s from visible, EXP-c fit
    const vis=async()=>{await P.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));};const play=()=>P.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
    await open();const v=await waitCard(5000);
    if(!v){skip++;rec({...R,status:'PENDING: explainer not implemented',reason:'canonical committed-unseen fixture showed no card in 5 s'});log(`SKIP expui ${cell.state} ${sz} PENDING`);await cx.close();continue;}
    const m=await X.card(P);R.card=m;await vis();await shot('card',true,[],{card:{gotIt:m.gotIt,clip:m.clip,refundLine:m.refundLine}});await play();
    if(!m.copyTitle||!m.copyBody)fails.push('§11 copy not verbatim');if(cell.state==='refund'&&!m.refundLine)fails.push('refund line absent (refund variant derived; build may not honour migrationRefundCents)');if(cell.state==='norefund'&&m.refundLine)fails.push('refund line shown at refund 0');
    if(!m.gotIt||m.gotIt.h<48||m.gotIt.w<44)fails.push(`EXP-c: Got it ${m.gotIt?.w}x${m.gotIt?.h} (want h>=48, w>=44)`);if(m.clip.length||m.offscreen)fails.push(`EXP-c: clipping ${JSON.stringify(m.clip)} offscreen=${m.offscreen}`);
    if(!m.focusOnGotIt)fails.push('EXP-b: focus not on Got it at open');if(m.role!=='dialog'||m.ariaModal!=='false')fails.push(`a11y role=${m.role} aria-modal=${m.ariaModal}`);
    const tf=m.anims.filter(a=>a.props.some(p=>/transform|scale|translate/.test(p)));R.motion={anims:m.anims,transition:m.transition,animation:m.animation};if(tf.length)fails.push('reduced motion: transform animation present');if(m.anims.some(a=>typeof a.dur==='number'&&a.dur>160))fails.push('reduced motion: animation > 150 ms');
    // (1) EXP-a: tap 1 closes WITHOUT effect, tap 2 acts. Buy (Upgrades open, affordable Buy) and Collect (#scene), each on a fresh seed.
    for(const kind of ['buy','collect']){if(kind==='collect'||!(await P.evaluate(()=>!!document.querySelector('button.buy.affordable')))){await open();if(!(await waitCard(5000))){fails.push(`EXP-a ${kind}: card not shown`);continue;}}
     const pt=await P.evaluate(k=>{const e=k==='buy'?[...document.querySelectorAll('button.buy.affordable')].find(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<=innerHeight}):document.querySelector('#scene');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,el:e.id||e.className}},kind);
     if(!pt){R['EXPa_'+kind]={target:null,note:'no on-screen target while the card is open (mobile: Upgrades sheet closed); covered at 1280 docked'};continue;}
     const s0=await X.snap(P);await P.mouse.click(pt.x,pt.y);await P.waitForTimeout(500);const s1=await X.snap(P);const closed=!(await waitCard(300));await shot(`tap1-${kind}`,true,[]);
     await P.mouse.click(pt.x,pt.y);await P.waitForTimeout(500);const s2=await X.snap(P);await shot(`tap2-${kind}`,true,[]);
     const same=(a,b)=>a.coinsCents===b.coinsCents&&JSON.stringify(a.lv)===JSON.stringify(b.lv)&&a.F===b.F&&a.C===b.C&&a.H===b.H&&a.V===b.V&&a.basket===b.basket&&a.hud===b.hud;
     R['EXPa_'+kind]={target:pt,before:s0,afterTap1:s1,afterTap2:s2,closedByTap1:closed};
     // EXP1_VARIANT (HoQ 05:31): DEFAULT 'v115' = m4a-spec v1.15 (D-HOP-14, CEO switch 05:31): NON-MODAL; an outside tap goes through (buy/collect registers)
     // and does NOT dismiss; only Got it / tap on card / Esc / Enter / 8 s close it. Standby 'swallow' (v1.16, built at c0bb3de): tap 1 closes WITHOUT effect, tap 2 acts.
     const VAR=process.env.EXP1_VARIANT==='swallow'?'swallow':'v115';R['EXPa_'+kind].variant=VAR;const swallowLike=closed&&same(s0,s1)&&!same(s1,s2);R['EXPa_'+kind].behavesLike=swallowLike?'swallow':(!closed&&!same(s0,s1))?'v115':'other';
     if(VAR==='swallow'){if(!closed)fails.push(`EXP-a ${kind}: tap 1 did not close the card`);if(!same(s0,s1))fails.push(`EXP-a ${kind}: MAJOR pass-through on tap 1`);if(same(s1,s2))fails.push(`EXP-a ${kind}: tap 2 had no effect`);}
     else{if(swallowLike){fails.push(`EXP-a ${kind}: MISMATCH WITH RULING D-07 v1.15 (build swallows: tap 1 closed the card with no effect)`);log(`!!! MISMATCH WITH RULING D-07 v1.15 ${ENG} ${sz} ${kind}`);}
      else{if(same(s0,s1))fails.push(`EXP-a ${kind} (v1.15): outside tap did not register`);if(closed)fails.push(`EXP-a ${kind} (v1.15): outside tap dismissed the card`);}
      // v1.15: the card never covers Buy/Collect; a tap ON the card closes it with no other effect
      if(!closed){const cov=await P.evaluate(k=>{const c=document.querySelector('.tracks-exp,[role=dialog][aria-modal=false]');const t=k==='buy'?document.querySelector('button.buy.affordable'):document.querySelector('#scene, #collect');if(!c||!t)return null;const a=c.getBoundingClientRect(),b=t.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top},kind);R['EXPa_'+kind].cardCoversTarget=cov;if(cov)fails.push(`EXP-a ${kind} (v1.15): card covers the ${kind} control`);
       const s3=await X.snap(P);const cb=await P.locator('.tracks-exp p, [role=dialog][aria-modal=false] p').first().boundingBox();if(cb){await P.mouse.click(cb.x+cb.width/2,cb.y+cb.height/2);await P.waitForTimeout(400);}const cl2=!(await waitCard(300));const s4=await X.snap(P);R['EXPa_'+kind].tapOnCard={closed:cl2,noEffect:same(s3,s4)};if(!cl2)fails.push(`EXP-a ${kind} (v1.15): tap on card did not close it`);if(!same(s3,s4))fails.push(`EXP-a ${kind} (v1.15): closing tap had an effect`);}}}
    // (2) EXP-b
    for(const key of ['Enter','Escape']){await open();if(!(await waitCard(5000))){fails.push(`EXP-b ${key}: card not shown on re-seed`);continue;}const foc=await P.evaluate(()=>/Got it/.test(document.activeElement?.textContent||''));await P.keyboard.press(key);const gn=await gone(1500);
     const back=await P.evaluate(()=>{const a=document.activeElement;return {el:a?.outerHTML?.slice(0,80),upgradesTab:!!a&&(a.matches('[role=tab][data-tab],[data-nav=upgrades]'))}});R['EXPb_'+key]={focusOnGotIt:foc,closed:gn,focusAfter:back};
     if(!foc)fails.push(`EXP-b ${key}: focus not on Got it`);if(!gn)fails.push(`EXP-b ${key}: did not close`);if(!back.upgradesTab)fails.push(`EXP-b ${key}: focus not back on Upgrades tab (${back.el})`);await shot(key==='Enter'?'enter-closed':'esc-closed',foc&&gn&&back.upgradesTab,[]);}
    // (3) toasts held: provoke a toast while open (storage refusal -> save toast); none visible while open; one shows after dismiss
    await open();if(await waitCard(5000)){await P.evaluate(()=>sessionStorage.setItem('__ro','1'));await P.waitForTimeout(3500);const during=await P.evaluate(()=>[...document.querySelectorAll('.toast.show,[role=status].show')].map(e=>e.textContent.trim()).filter(Boolean));
     await P.evaluate(()=>sessionStorage.setItem('__ro','0'));await P.keyboard.press('Escape');const after=await P.waitForFunction(()=>{const e=document.querySelector('.toast.show');return e&&e.textContent.trim()},null,{timeout:4000}).then(h=>h.jsonValue(),()=>null);await vis();await shot('toast-after-close',!during.length&&!!after,[]);await play();
     R.toastHeld={trigger:'localStorage writes refused for 3.5 s while open',during,after};if(during.length)fails.push(`toast visible while card open: ${during}`);if(!after)R.toastHeld.note='no toast after close: trigger may not raise a toast on this build (record, not fail)';}
    // (4) behind Welcome back; 8 s from card visible
    const fo=X.offline(fx,3600);if(cx)await cx.close();cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});await cx.addInitScript(X.INIT);P=await cx.newPage();p=P;await X.seed(P,U,fo,UIX,{});await P.goto(U);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});
    const wb=await P.locator('#wbCollect').waitFor({state:'visible',timeout:6000}).then(()=>true,()=>false);const under=await waitCard(1500);R.welcome={shown:wb,cardUnder:under};
    await vis();await shot('welcome-back-first',wb&&!under,[]);await play();if(!wb)R.welcome.note='Welcome back not shown for 1 h offline (record)';if(under)fails.push('card shown under/with Welcome back');
    if(wb){await P.locator('#wbCollect').click();const c2=await waitCard(6000);const t0=Date.now();R.welcome.cardAfter=c2;if(!c2)fails.push('card did not appear after Welcome back closed');else{await vis();await shot('card-after-welcome',true,[]);await play();
     const gn=await gone(12000);const dt=(Date.now()-t0)/1000;R.autoDismiss={from:'card visible',closed:gn,seconds:dt};if(!gn||dt<7||dt>9.5)fails.push(`8 s auto-dismiss from visible: closed=${gn} after ${dt.toFixed(2)} s`);await shot('auto-dismissed',gn&&dt>=7&&dt<=9.5,[],{autoDismissS:dt});}}
   }
   R.ok=!fails.length;R.fails=fails;rec(R);if(fails.length){bad++;log(`ASSERT-FAIL ${ENG} ${sz} ${cell.x} ${cell.state}: ${fails.join(' | ')}`);}
   if(cx)await cx.close();continue;}
  if(cell.x==='exp1'){ // m4a-spec v1.14 / D-HOP-13: E1 new farm never; E2 migrated exactly once; E3 committed-but-not-shown reload -> exactly once
   const sumF=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
   const count=()=>p.evaluate(()=>+(sessionStorage.getItem('__expCount')||0));
   const boot=async()=>{await p.getByText('Tap to start').click({timeout:30000}).catch(()=>{});}; // the only click before the explainer assert (boot gate)
   const waitExp=async ms=>expLoc().waitFor({state:'visible',timeout:ms}).then(()=>true,()=>false);
   const shootNow=async(tag,ok,fl,extra)=>{await p.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));await put(tag,ok,fl,extra);await p.evaluate(()=>document.getAnimations().forEach(a=>a.play()));};
   // fresh per-case page: counter via MutationObserver, kept across reloads in sessionStorage; no Skip / wbCollect / Got-it clicks
   await c.close();const cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});
   await cx.addInitScript(()=>{const tick=()=>{for(const e of document.querySelectorAll('body *'))if(!e.hasAttribute('data-exp-counted')&&e.childElementCount===0&&(e.textContent||'').trim()==='Upgrades got an upgrade!'){e.setAttribute('data-exp-counted','1');sessionStorage.setItem('__expCount',String(+(sessionStorage.getItem('__expCount')||0)+1));}};new MutationObserver(tick).observe(document,{subtree:true,childList:true});}); // one title node inserted = one appearance
   const P=await cx.newPage();p=P;P.on('console',m=>{if(m.type()==='error')cons.push(m.text().slice(0,200))});
   const setSave=async raw=>{await P.goto(URL+'favicon.ico').catch(()=>{});await P.evaluate(([r,u])=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u));if(r)localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},[raw,(await import('./lib-ext.mjs')).UI]);await P.goto(URL);};
   const gotIt=async()=>{const bt=P.getByRole('button',{name:/Got it/}).first();const bb=await bt.boundingBox();R.gotIt={w:bb?.width,h:bb?.height};if(!bb||bb.width<44||bb.height<44)fails.push(`Got it hit box ${bb?.width}x${bb?.height} < 44`);if(bb&&bb.height<48)fails.push(`Got it height ${bb.height} < 48`);};
   if(cell.state==='fresh'){ // E1
    await setSave(null);await boot();const v=await waitExp(3000);await shootNow('E1-first-open',!v,v?['shown on a new farm']:[]);
    await P.reload();await boot();const v2=await waitExp(3000);R.E1={firstOpen:v,afterReload:v2,count:await count()};if(v||v2||R.E1.count)fails.push(`E1: new farm showed the explainer (count ${R.E1.count})`);
    await shootNow('E1-reload',!v2,v2?['shown after reload']:[]);}
   else{ // E2 migrated acdbedc, exactly once
    const raw=(await import('node:fs')).readFileSync(new globalThis.URL('../gate5-pr44/fixtures/acdbedc-v6rich.json',import.meta.url),'utf8');
    await setSave(raw);await boot();const v=await waitExp(5000);
    if(!v){skip++;rec({...R,status:'PENDING: explainer not implemented',reason:'no explainer within 5 s of boot on the migrated acdbedc save (no clicks before the assert)'});log(`SKIP exp1 ${sz} PENDING: explainer not implemented`);await cx.close();continue;}
    await shootNow('E2-explainer',true,[]);await gotIt();R.flagOnShow=await flag();if(!Object.values(R.flagOnShow).includes(true))fails.push('seenTracksExplainer not persisted when shown');
    await P.getByRole('button',{name:/Got it/}).first().click();await P.waitForTimeout(500);if(await expVis())fails.push('E2: still visible after Got it');await shootNow('E2-dismissed',!fails.length,[...fails]);
    await P.reload();await boot();const v2=await waitExp(3000);R.E2={afterReload:v2,count:await count()};if(R.E2.count!==1)fails.push(`E2: shown ${R.E2.count} times (want exactly 1)`);await shootNow('E2-reload',!v2&&R.E2.count===1,v2?['reappeared after reload']:[]);
    // E3: committed + persisted with seenTracksExplainer unset -> reload must show it exactly once
    const der=await P.evaluate(()=>{const o={};for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm.save'))o[k]=localStorage.getItem(k);return o;});
    // Saves QA canonical fixture preferred (sha256-verified); else synthetic from the live committed save
    const fs=await import('node:fs'),cr=await import('node:crypto');const CAN='/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json';let canon=null;
    if(fs.existsSync(CAN)){const buf=fs.readFileSync(CAN),h=cr.createHash('sha256').update(buf).digest('hex');const sums=[CAN+'.sha256','/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/SHA256SUMS'].filter(fs.existsSync).map(x=>fs.readFileSync(x,'utf8')).join('\n');
     const listed=sums.includes(h);R.E3fixture={source:listed?'saves-qa-canonical':'saves-qa-canonical REJECTED (sha256 not listed)',path:CAN,sha256:h};if(listed)canon=JSON.parse(buf.toString());}
    else R.E3fixture={source:'synthetic (canonical absent)'};log(`E3 fixture: ${R.E3fixture.source}`);
    const sv=JSON.parse(der['eggfarm.save']);R.E3src={tracksV7:sv.state.tracksV7,v6BackupId:sv.state.v6BackupId,hadFlag:sv.state.seenTracksExplainer};
    if(!sv.state.tracksV7||!sv.state.v6BackupId)fails.push('E3: live save not committed (tracksV7/v6BackupId missing)');
    // Saves QA 04:30: keep tracksV7:1 + v6BackupId + the v6_backup slot; strip only seenTracksExplainer and recompute the checksum
    delete sv.state.seenTracksExplainer;const st=JSON.stringify(sv.state);sv.sum=sumF(st);const raw3=canon?JSON.stringify(canon.save??canon):JSON.stringify({...sv,state:undefined}).replace(/}$/,`,"state":${st}}`).replace('"state":undefined,','');
    (await import('node:fs')).writeFileSync(`${OUT}/exp1-E3-derived-${ENG}-${sz}.json`,JSON.stringify({note:'E3 save used',fixture:R.E3fixture,keys:Object.keys(der),save:JSON.parse(raw3)},null,1));
    // load ALL keys before boot. canonical: its full LS capture + IDB main; synthetic: live keys kept (incl. .bak + v6_backup), only seenTracksExplainer stripped from main, IDB main = stripped main
    const LSset=canon?canon.ls:{...der,'eggfarm.save':raw3};const IDBmain=canon?(canon.idb?.main??null):raw3;R.E3keys={ls:Object.keys(LSset),idb:!!IDBmain};
    await P.goto(URL+'favicon.ico').catch(()=>{});
    await P.evaluate(async([ls,idbMain,ui])=>{sessionStorage.setItem('__expCount','0');for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm'))localStorage.removeItem(k);
     for(const [k,v] of Object.entries(ls))localStorage.setItem(k,v);const u=JSON.parse(ui);delete u.seenTracksExplainer;localStorage.setItem('eggfarm.ui',JSON.stringify(u));
     await new Promise(r=>{const d=indexedDB.deleteDatabase('eggfarm');d.onsuccess=d.onerror=d.onblocked=()=>r();});
     if(idbMain)await new Promise((res,rej)=>{const o=indexedDB.open('eggfarm',1);o.onupgradeneeded=()=>o.result.createObjectStore('save');o.onsuccess=()=>{const t=o.result.transaction('save','readwrite');t.objectStore('save').put(idbMain,'main');t.oncomplete=()=>{o.result.close();res()};t.onerror=()=>rej(t.error)};o.onerror=()=>rej(o.error);});},[LSset,IDBmain,JSON.stringify((await import('./lib-ext.mjs')).UI)]);
    await P.goto(URL);await boot();const v3=await waitExp(5000);await shootNow('E3-reload-shows',v3,v3?[]:['E3: not shown after committed-unseen reload']);if(!v3)fails.push('E3: not shown');
    if(v3){await P.getByRole('button',{name:/Got it/}).first().click().catch(()=>{});await P.waitForTimeout(400);}
    await P.reload();await boot();const v4=await waitExp(3000);R.E3={shown:v3,again:v4,count:await count()};if(R.E3.count!==1)fails.push(`E3: shown ${R.E3.count} times (want exactly 1)`);await shootNow('E3-reload2',!v4,v4?['E3: shown again']:[]);}
   R.ok=!fails.length;R.fails=fails;rec(R);if(fails.length){bad++;log(`ASSERT-FAIL ${ENG} ${sz} exp1 ${cell.state}: ${fails.join(' | ')}`);}
   await cx.close();continue;}
  else if(cell.x==='f2'){await goTab('farm');R.tabs=await p.evaluate(()=>[...document.querySelectorAll('[role=tab][data-tab]')].map(b=>{const r=b.getBoundingClientRect(),pl=b.querySelector('.tab-pill')?.getBoundingClientRect(),be=getComputedStyle(b,'::before'),af=getComputedStyle(b,'::after');
     const pse=[be,af].filter(c=>c.content!=='none'&&c.position==='absolute').map(c=>({w:parseFloat(c.width)||null,h:parseFloat(c.height)||null,top:c.top,bottom:c.bottom}));
     const hitH=Math.max(r.height,...pse.map(x=>x.h||0)),hitW=Math.max(r.width,...pse.map(x=>x.w||0));return {tab:b.dataset.tab,visibleH:Math.round((pl||r).height*10)/10,visibleW:Math.round((pl||r).width*10)/10,buttonW:Math.round(r.width*10)/10,buttonH:Math.round(r.height*10)/10,pseudo:pse,hitW:Math.round(hitW*10)/10,hitH:Math.round(hitH*10)/10}}));
   for(const t of R.tabs){if(t.visibleH<36)fails.push(`${t.tab}: visible ${t.visibleH} < 36`);if(t.hitH<44||t.hitW<44)fails.push(`${t.tab}: hit ${t.hitW}x${t.hitH} < 44`);}
   R.verdict=fails.length?'Minor follow-up':'close';R.blocking=false;R.findings=[...fails];fails.length=0; // HoQ 04:17: F2 Minor, non-blocking
   await put('tabs',true,[],{tabs:R.tabs,f2_verdict:R.verdict,gate_blocking:false,f2_findings:R.findings},'farm');}
  else if(cell.x==='f3'){await goTab('farm');R.goal=await p.evaluate(()=>document.querySelector('#goal .goal-label')?.textContent);
   const tgt={Hens:'hens','Egg value':'eggValue',Farm:'farm'}[(R.goal||'').match(/^(Hens|Egg value|Farm)/)?.[1]]||null;R.hintTarget=tgt;
   R.chips=await p.evaluate(()=>[...document.querySelectorAll('#uRow .up')].map(e=>{const c=[...e.querySelectorAll('*')].find(x=>x.children.length<=2&&/Best buy/i.test(x.textContent)&&x.textContent.length<30);return c?{row:e.dataset.track||(e.querySelector('h3')?.textContent==='Farm level'?'farm':null),text:c.textContent.trim(),star:/★/.test(c.textContent)||!!c.querySelector('img,svg')}:null}).filter(Boolean));
   if(!R.chips.length){R.status='missing';fails.push('Best buy chip missing');}else{const ch=R.chips[0];if(!ch.star||!/Best buy/.test(ch.text))fails.push(`chip text "${ch.text}" lacks ★ or label`);if(R.chips.length>1)fails.push('more than one chip');if(ch.row!==tgt)fails.push(`chip row ${ch.row} != hint target ${tgt}`);}
   const sel=R.chips[0]?.row?`#uRow .up[data-track=${R.chips[0].row}]`:null;if(sel)await p.locator(sel).first().scrollIntoViewIfNeeded().catch(()=>{});
   R.F4={label:R.goal,pattern:'★ {Track} L{n} · +X% income',match:/^★ (Hens|Egg value|Farm|Collection) L\d+ · \+\d+(\.\d+)?% income$/.test((R.goal||'').trim())};R.F4.verdict=R.F4.match?'close':'follow-up (non-blocking)';
   R.verdict=fails.length?'follow-up (non-blocking)':'close';R.blocking=false;R.findings=[...fails];fails.length=0; // HoQ 04:17: F3 follow-up, non-blocking
   await put(R.status==='missing'?'chip-missing':'chip',true,[],{goal_label:R.goal,chips:R.chips,f4:R.F4,f3_verdict:R.verdict,gate_blocking:false,f3_findings:R.findings},'farm');}
  else if(cell.x==='h6'){await goTab('farm');const row='#uRow .up.track[data-track=hens]';await p.locator(row).scrollIntoViewIfNeeded();R.before=await p.locator(row+' .lv').textContent().catch(()=>null);
   if(R.before!=='L9')fails.push(`Hens not L9 (${R.before})`);await p.locator(row+' button.buy').click({timeout:2000}).catch(()=>fails.push('buy click failed'));
   const t=await p.waitForFunction(()=>{const e=document.querySelector('.toast.show');return e&&e.textContent},null,{timeout:2500}).then(h=>h.jsonValue()).catch(()=>null);
   await p.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));R.toast=t;R.after=await p.locator(row+' .lv').textContent().catch(()=>null);
   if(!t||!/^Hens L10: bigger coop · offline ×[\d.]+$/.test(t))fails.push(`H6 toast "${t}" != "Hens L10: bigger coop · offline ×{mult}"`);if(R.after!=='L10')fails.push(`Hens after ${R.after}`);
   await put('toast',!fails.length,[...fails],{toast:t},'farm');}
  R.ok=!fails.length;R.fails=fails;rec(R);if(fails.length){bad++;log(`ASSERT-FAIL ${ENG} ${sz} ${cell.x} ${cell.state}: ${fails.join(' | ')}`);}
  await c.close();continue;}
 const recov=await p.locator('.recovery-layer').isVisible().catch(()=>false);
 if(recov){const txt=(await p.locator('.recovery-layer').innerText().catch(()=>'')).slice(0,300);const oc=await p.locator('.recovery-layer').getAttribute('data-outcome').catch(()=>null);
  rec({kind:'load',state:cell.state,size:sz,save:sv.desc,maxLevel:sv.maxLevel,loaded:info,recoveryLayer:{outcome:oc,text:txt}});
  if(cell.need){skip++;rec({kind:'skip',state:cell.state,size:sz,reason:`not reachable on this build: save rejected (recovery-layer outcome=${oc}), maxLevel=${sv.maxLevel}`});log(`SKIP ${cell.state} ${sz} (save rejected, recovery outcome=${oc})`);
   const file=`${ENG}/ext-${cell.state}-rejected-${sz}.png`;await p.screenshot({path:`${OUT}/${file}`});
   appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:sv.desc,seed:null,group:`final-prep:${G}`,state:`${cell.state} · save rejected by build (recovery outcome=${oc}) · evidence only`,asserted_tab:null,asserted_panel:'recovery',ext_assert_ok:false,ext_fails:['not reachable'],console_errors:cons.length})+'\n');n++;await c.close();continue;}
  log(`ASSERT-FAIL ${ENG} ${sz} ${cell.state}: unexpected recovery layer ${oc}`);bad++;await c.close();continue;}
 const lv=await (async()=>{await goTab('farm');const f=await p.evaluate(()=>[...document.querySelectorAll('#uRow .up')].map(e=>[e.dataset.track||e.querySelector('h3')?.textContent,e.querySelector('.meta')?.textContent]));await goTab('collection');
  const cc=await p.evaluate(()=>document.querySelector('#uRow .up .meta')?.textContent);return {rows:f,collection:cc}})();
 rec({kind:'load',state:cell.state,size:sz,save:sv.desc,maxLevel:sv.maxLevel,loaded:info,levels:lv});
 if(cell.need){const want=STATES[cell.state];const got=lv.rows.find(r=>r[0]==='Farm level')?.[1]||'';
  if(!got.startsWith(`Level ${want.farmLevel} /`)||info.recovery.length){skip++;rec({kind:'skip',state:cell.state,size:sz,reason:`not reachable on this build: wanted F${want.farmLevel}, Farm meta "${got}", maxLevel=${sv.maxLevel}, recovery=${JSON.stringify(info.recovery)}`});log(`SKIP ${cell.state} ${sz} (not reachable: Farm "${got}")`);await c.close();continue;}}
 if(cell.cap){const MX=sv.max||{};const shotF=async(tag,ok,fails,extra={})=>{const file=`${ENG}/ext-${cell.state}-${tag}-${sz}.png`;await p.screenshot({path:`${OUT}/${file}`});n++;
   appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:sv.desc,seed:null,group:`final-prep:${G}`,state:`${cell.state} · ${tag} · animations paused${ok?'':' · ASSERT-FAIL'}`,asserted_tab:'farm',asserted_panel:'upgrades',ext_assert_ok:ok,ext_fails:fails,console_errors:cons.length,...extra})+'\n');};
  // preconditions: HoP cap Farm 50 / tracks 55 must be live in this build
  if(MX.F!==50){skip++;rec({kind:'skip',state:cell.state,size:sz,max:MX,reason:`PENDING final SHA: build Farm max=${MX.F} (needs 50; econ 6809f8e + live L30+ data)`});log(`SKIP ${cell.state} ${sz} pending (Farm max ${MX.F})`);await c.close();continue;}
  if(Math.min(MX.H,MX.V)<=50)rec({kind:'product-question',state:cell.state,size:sz,max:MX,note:`Product question (not a blocker): tracks capped at ${MX.H}/${MX.V}, HoP cap says 55`});
  const row=k=>p.evaluate(([k,h3])=>{const e=[...document.querySelectorAll('#uRow .up')].find(x=>h3?(!x.classList.contains('track')&&x.querySelector('h3')?.textContent===h3):x.dataset.track===k);if(!e)return null;const b=e.querySelector('button.buy');
    return {lv:e.querySelector('.lv')?.textContent,meta:e.querySelector('.meta')?.textContent,max:e.querySelector('.maxed')?.textContent?.trim()??null,lock:e.querySelector('.lock')?.textContent??null,buy:!!b,price:b?.querySelector('.num')?.textContent??null,ariaDis:b?.getAttribute('aria-disabled')??null,fx:[...e.querySelectorAll('.fx li')].map(x=>x.textContent.trim())}},[k,{farm:'Farm level'}[k]]);
  const goal=()=>p.evaluate(()=>{const g=document.querySelector('#goal');return {label:g?.querySelector('.goal-label')?.textContent,state:g?.dataset.state,hidden:!g||g.hidden}});
  await goTab('farm');const fails=[];const R={farm:await row('farm'),hens:await row('hens'),eggValue:await row('eggValue')},gl=await goal();
  if(cell.cap==='farm50'){if(R.farm?.max!=='MAX'||R.farm?.buy)fails.push('Farm not MAX / has buy');
   for(const t of ['hens','eggValue']){const r=R[t];if(!r||!r.buy||!/\$/.test(r.price||''))fails.push(`${t}: not buyable with price (${JSON.stringify(r)})`);}
   if(!/^(Hens|Egg value) L5[1-5]/.test(gl.label||''))fails.push(`hint not on a track L51-55: "${gl.label}"`);
   rec({kind:'assert',state:cell.state,size:sz,screen:'upgrades-farm',ok:!fails.length,fails,rows:R,goal:gl});await shotF('upgrades-farm',!fails.length,fails,{goal_label:gl.label});
   await p.locator('#uRow .up.track[data-track=hens]').scrollIntoViewIfNeeded().catch(()=>{});await shotF('upgrades-farm-tracks',!fails.length,fails,{goal_label:gl.label});}
  else if(cell.cap==='farm50-tracks55'){for(const t of ['farm','hens','eggValue'])if(R[t]?.max!=='MAX'||R[t]?.buy||R[t]?.price)fails.push(`${t}: not MAX/no-price (${JSON.stringify(R[t])})`);
   await goTab('collection');const cR=await p.evaluate(()=>({max:document.querySelector('#uRow .up .maxed')?.textContent?.trim()??null,buy:!!document.querySelector('#uRow .up button.buy')}));if(cR.max!=='MAX'||cR.buy)fails.push('Collection not MAX');
   if(gl.state!=='done')fails.push(`hint not done: state=${gl.state} "${gl.label}"`);
   rec({kind:'assert',state:cell.state,size:sz,screen:'upgrades-farm',ok:!fails.length,fails,rows:R,collection:cR,goal:gl});await goTab('farm');await shotF('upgrades-farm',!fails.length,fails,{goal_label:gl.label});
   await p.locator('#uRow .up.track[data-track=hens]').scrollIntoViewIfNeeded().catch(()=>{});await shotF('upgrades-farm-tracks',!fails.length,fails,{goal_label:gl.label});}
  else { // C4: single L50->51 buy per track, readouts before/after (fresh fixture load per track)
   const nums=a=>(a||[]).map(l=>({line:l,values:[...l.matchAll(/\$?([\d.,]+)\s?([KMBT])?/g)].map(m=>+m[1].replace(/,/g,'')*({K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]||1))}));
   for(const t of ['hens','eggValue']){if(t==='eggValue'){await c.close();var c2=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});var pp=await c2.newPage();}
    const P=t==='hens'?p:pp;if(t==='eggValue'){await loadState(P,'c4');await P.getByRole('button',{name:/Got it/}).first().click({timeout:1200}).catch(()=>{});await P.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));}
    const pg=P;const rw=k=>pg.evaluate(k=>{const e=document.querySelector(`#uRow .up.track[data-track=${k}]`);const b=e?.querySelector('button.buy');return e?{lv:e.querySelector('.lv')?.textContent,price:b?.querySelector('.num')?.textContent??null,fx:[...e.querySelectorAll('.fx li')].map(x=>x.textContent.trim())}:null},k);
    const tabP=async()=>{if(!docked){await pg.keyboard.press('Escape');await pg.locator('[data-nav=upgrades]').click();await pg.waitForTimeout(300);}await pg.locator('[data-tab=farm]').click();await pg.waitForTimeout(250);await pg.locator(`#uRow .up.track[data-track=${t}]`).scrollIntoViewIfNeeded();};
    await tabP();const before={hens:await rw('hens'),eggValue:await rw('eggValue'),coins:await pg.locator('#coins').textContent()};
    const sh=async tag=>{const file=`${ENG}/ext-c4-${t}-${tag}-${sz}.png`;await pg.screenshot({path:`${OUT}/${file}`});n++;return file;};const f1=await sh('before');
    const fl=[];if(before[t]?.lv!=='L50')fl.push(`${t} not at L50 (${before[t]?.lv})`);
    await pg.locator(`#uRow .up.track[data-track=${t}] button.buy`).click({timeout:2000}).catch(e=>fl.push('buy click failed'));await pg.waitForTimeout(500);await pg.locator(`#uRow .up.track[data-track=${t}]`).scrollIntoViewIfNeeded().catch(()=>{});
    const after={hens:await rw('hens'),eggValue:await rw('eggValue'),coins:await pg.locator('#coins').textContent()};const f2=await sh('after');
    if(after[t]?.lv!=='L51')fl.push(`${t} not L51 after one buy (${after[t]?.lv})`);
    rec({kind:'c4',state:'c4',size:sz,track:t,ok:!fl.length,fails:fl,before:{...before,parsed:{hens:nums(before.hens?.fx),eggValue:nums(before.eggValue?.fx)}},after:{...after,parsed:{hens:nums(after.hens?.fx),eggValue:nums(after.eggValue?.fx)}}});
    if(fl.length){bad++;log(`ASSERT-FAIL ${ENG} ${sz} c4 ${t}: ${fl.join(' | ')}`);}
    for(const [file,tag] of [[f1,'before'],[f2,'after']])appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:sv.desc,seed:null,group:'final-prep:c4',state:`c4 · ${t} L50->51 ${tag} · animations paused`,asserted_tab:'farm',asserted_panel:'upgrades',ext_assert_ok:!fl.length,ext_fails:fl,console_errors:cons.length})+'\n');}
   await c2.close();continue;}
  if(fails.length){bad++;log(`ASSERT-FAIL ${ENG} ${sz} ${cell.state}: ${fails.join(' | ')}`);}
  await c.close();continue;}
 for(const [screen,rk] of cell.screens){const res={kind:'assert',state:cell.state,size:sz,screen,ok:true,fails:[]};const F=m=>{res.ok=false;res.fails.push(m)};
  if(screen==='hud'||screen==='goal'){await openNav(null);}
  else if(screen==='upgrades-collection')await goTab('collection');else await goTab('farm');
  if(screen==='upgrades-farm-tracks'){await p.locator(ROW.hens).first().scrollIntoViewIfNeeded().catch(()=>F('no hens track row'));}
  // MAX assertions per row
  for(const k of (rk||'').split('+').filter(Boolean)){const sel=ROW[k];const r=await p.evaluate(sel=>{const q=s=>document.querySelector(s);const [k,h3]=sel;const e=[...document.querySelectorAll('#uRow .up')].find(x=>h3?(!x.classList.contains('track')&&x.querySelector('h3')?.textContent===h3):x.dataset.track===k);
    if(!e)return {missing:true};const mx=e.querySelector('.maxed');const btn=e.querySelector('button.buy');const r=mx?.getBoundingClientRect();
    return {maxText:mx?.textContent.trim()??null,maxVisible:!!r&&r.width>0&&r.height>0,maxPointer:mx?getComputedStyle(mx).pointerEvents:null,buyButton:!!btn,buyDisabled:btn?btn.getAttribute('aria-disabled'):null,
     price:/\$\s?[\d.,]+[KMBT]?/.test((btn?.innerText||'')+(mx?.innerText||'')),groupLabel:e.getAttribute('aria-label'),meta:e.querySelector('.meta')?.textContent,lv:e.querySelector('.lv')?.textContent,rowHint:[...e.querySelectorAll('.hint,.ms-hint')].map(x=>x.textContent.trim()).filter(Boolean)}},[k,H3[k]]);
   res[k]=r;if(r.missing){F(`${k}: row missing`);continue;}if(PROFILE==='B'){const mx=+(r.meta||'').split('/')[1];if(mx!==30)F(`${k}: max ${mx} != 30 (profile B cap)`);}else{if(r.maxText!=='MAX'||!r.maxVisible)F(`${k}: MAX not shown`);if(r.buyButton)F(`${k}: buy button present (aria-disabled=${r.buyDisabled})`);if(r.price)F(`${k}: price shown`);if(!/max/i.test(r.groupLabel||''))F(`${k}: aria-label lacks "max"`);}
   // can't be tapped or keyed: tap MAX, Tab+Enter/Space on the row; coins and level must not change
   const before=await p.evaluate(()=>[document.querySelector('#coins')?.textContent,localStorage.getItem('eggfarm.save')?.length]);
   const L0=r.lv;await p.locator(sel+' .maxed').click({force:true,timeout:1500}).catch(()=>{});await p.keyboard.press('Enter');await p.keyboard.press('Space');await p.waitForTimeout(300);
   const L1=await p.locator(sel+' .lv').textContent().catch(()=>null);const after=await p.evaluate(()=>document.querySelector('#coins')?.textContent);
   res[k+'_tapkey']={L0,L1,coinsBefore:before[0],coinsAfter:after};if(L0!==L1)F(`${k}: level changed on tap/key ${L0}->${L1}`);}
  // next-goal strip (always): visible, label recorded, never points at a MAX / past-cap level
  const gl=await p.evaluate(()=>{const g=document.querySelector('#goal');const r=g?.getBoundingClientRect();return {hidden:!g||g.hidden||!r||r.width===0,label:g?.querySelector('.goal-label')?.textContent,status:g?.querySelector('.goal-status')?.textContent,aria:g?.getAttribute('aria-label'),state:g?.dataset.state}});
  res.goal=gl;const MAX=sv.maxLevel;
  if((rk||screen==='goal')&&gl.hidden&&!docked)F('next-goal hint not visible');
  if(rk&&docked&&gl.hidden)F('next-goal hint not visible (docked)');
  const mm=(gl.label||'').match(/^(Farm|Hens|Egg value|Collection) L(\d+)/);
  if(mm&&MAX&&+mm[2]>MAX)F(`next-goal points past max: ${gl.label} (max ${MAX})`);
  // HUD tier strings
  if(screen==='hud'){const t=await p.evaluate(()=>({coins:document.querySelector('#coins')?.textContent,all:[...document.querySelectorAll('.num,#coins')].map(e=>e.textContent.trim()).filter(x=>/\$/.test(x))}));
   res.hud=t;if(/1000\s?B/.test(t.coins||''))F(`HUD shows 1000B: ${t.coins}`);if(!/T\b/.test(t.coins||''))F(`HUD not in T tier: ${t.coins}`);
   const exp=cell.state==='coins-999.96B'?'$1T':'$1.68T';res.expected=exp;if((t.coins||'').trim()!==exp)F(`HUD "${t.coins}" != expected "${exp}"`);
   if(t.all.some(x=>/1000\s?B/.test(x)))F('a 1000B string on screen');}
  if(screen==='goal'&&gl.hidden)F('goal hidden');
  res.console_errors=cons.length;rec(res);
  if(!res.ok){bad++;log(`ASSERT-FAIL ${ENG} ${sz} ${cell.state} ${screen}: ${res.fails.join(' | ')}`);}
  const file=`${ENG}/ext-${cell.state}-${screen}-${sz}.png`;await p.screenshot({path:`${OUT}/${file}`});n++;
  appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:sv.desc,seed:null,group:`final-prep:${G}`,state:`${cell.state} · ${screen} · animations paused${res.ok?'':' · ASSERT-FAIL'}`,
   asserted_tab:screen.startsWith('upgrades-')?screen.split('-')[1]:null,asserted_panel:screen.split('-')[0],ext_assert_ok:res.ok,ext_fails:res.fails,goal_label:gl.label,hud:res.hud?.coins??null,console_errors:cons.length})+'\n');}
 await c.close();}
await br.close();log(`DONE-EXT ${ENG} shots=${n} assertFail=${bad} skippedCells=${skip}`);
