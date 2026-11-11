// QA-owned probe for RC1 PR #67 @ 5d9efa6 (copied from qa/m41/m41-9-c877f69; AFTER only, build-id from QA_BID) (M41-9 Art Minors UX-M1/M2/M3/M5 + Art rulings + CCR M1 dynamic re-placement).
// usage: node p65.mjs <chromium|firefox|webkit> <width> <after-full-sha>
// Serves AFTER ($QA_WT or /tmp/qa-rc1-<sha7>/dist-qa) on own OS-assigned port (never :4173). No BEFORE on the RC gate.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import http from 'node:http';
import {join,extname} from 'node:path';

const [ENG,WS,SHA]=process.argv.slice(2);
const W=+WS, S7=SHA.slice(0,7), H={360:640,375:667,390:844,412:915,430:932,1280:800}[W]??800;
const AFTER_WT=process.env.QA_WT??`/tmp/qa-rc1-${S7}`; // RC1 gate: AFTER only (no BEFORE baseline)
const pw=(await import(`${AFTER_WT}/node_modules/playwright-core/index.mjs`)).default;
const E=process.env.QA_EV??`/workspace/egg-farm-studio/qa/m41/rc1-${S7}-ui/`;
mkdirSync(`${E}shots/${ENG}`,{recursive:true}); mkdirSync(`${E}browser`,{recursive:true});
const OUT=`${E}browser/entries-${ENG}-${W}.jsonl`; writeFileSync(OUT,'');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
function serve(dir){return new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(dir,p);
 if(!f.startsWith(dir)||!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));});
 s.listen(0,'127.0.0.1',()=>r({url:`http://127.0.0.1:${s.address().port}/`,stop:()=>s.close()}));});}
const SRV={after:await serve(`${AFTER_WT}/dist-qa`)};
const QB=process.env.QA_BID; if(!QB||!QB.endsWith('+'+S7)||QB.includes('dirty')) throw new Error('QA_BID env must be <prefix>+'+S7+' (read from dist-qa meta), got '+QB);
const BID={after:QB};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[], obs=[];
const ok=(lab,c,m,d)=>{if(lab==='after'&&!c){fails.push(m);console.log('FAIL',m,JSON.stringify(d??'').slice(0,300));}if(lab==='before'&&!c)obs.push(m);return c;};
const rec=o=>appendFileSync(OUT,JSON.stringify({sha:SHA,engine:ENG,size:`${W}x${H}`,w:W,h:H,...o})+'\n');
async function shot(p,lab,name){const f=`shots/${ENG}/${lab}-${name}-w${W}.png`;await p.screenshot({path:E+f});return f;}
const settle = p => p.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 25)));

async function open(lab,extra={}){
  const c=await br.newContext({viewport:{width:W,height:H},...extra});
  const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{if(!sessionStorage.getItem('qa65')){sessionStorage.setItem('qa65','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));}});
  await p.goto(SRV[lab].url);
  const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);
  if(bid!==BID[lab]||bid.includes('+dirty')){fails.push(`${lab} runtime build-id ${bid} != ${BID[lab]}`);throw new Error('build-id');}
  await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});
  await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
  await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coinsCents:5e5};window.eggfarmUi.render();});
  await p.waitForTimeout(350);
  return {c,p,errs,bid};
}

const showCard=async(p,refund=0)=>{
  await p.evaluate(r=>{document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e=>e.remove());const g=window.eggfarm;g.migrationRefundCents=r;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();},refund);
  await p.waitForSelector('.tracks-exp',{state:'attached',timeout:3000});
  await settle(p);
};
const activeTab=p=>p.evaluate(()=>[...document.querySelectorAll('[data-tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').filter(e=>e.getClientRects().length).map(e=>e.dataset.tab));
const sheetOpen=p=>p.evaluate(()=>{const s=document.querySelector('#p-upgrades');return !!s&&s.getClientRects().length>0&&!s.hasAttribute('hidden');});
async function openUpgrades(p,tab='farm'){
  const isOpen = await sheetOpen(p);
  if(!isOpen && W < 1024) { await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); }
  await p.locator(`[data-tab=${tab}]`).click();
  await settle(p);
}
const ring=p=>p.evaluate(()=>{
  const a=document.activeElement, cs=a&&getComputedStyle(a);
  return a?{el:a.tagName+(a.dataset.nav?`[data-nav=${a.dataset.nav}]`:'')+(a.dataset.tab?`[data-tab=${a.dataset.tab}]`:'')+(a.id?'#'+a.id:''),style:cs.outlineStyle,width:cs.outlineWidth,offset:cs.outlineOffset,color:cs.outlineColor,kbd:a.classList.contains('kbd-focus')}:null;
});
const ringOk=r=>!!r&&r.style!=='none'&&parseFloat(r.width)>=3&&/43,\s*121,\s*168/.test(r.color);
const R=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};},s);
const hit=(a,b)=>!!a&&!!b&&a.l<b.r-0.5&&b.l<a.r-0.5&&a.t<b.b-0.5&&b.t<a.b-0.5;

const sweep=p=>p.evaluate(()=>{
  const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight;};
  const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.dataset.nav?`[nav=${e.dataset.nav}]`:'')+(e.dataset.tab?`[tab=${e.dataset.tab}]`:'')+(e.dataset.id?`[id=${e.dataset.id}]`:'')+'.'+[...e.classList].slice(0,3).join('.')+':'+(e.textContent||'').trim().slice(0,24);
  const taps=[...document.querySelectorAll('button,[role=button],a[href],[data-tab]')].filter(vis).filter(e=>!e.closest('[inert],[aria-hidden=true]')).map(e=>{const r=e.getBoundingClientRect();return {n:name(e),h:Math.round(r.height*10)/10,w:Math.round(r.width*10)/10};});
  const clip=[...document.querySelectorAll('button,button *,.order .l1,.order .l1 *,.save-warn,.tracks-exp h2,.tracks-exp p,.tabs button,.goal-label,.up h3,.up p')].filter(vis).filter(e=>e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&getComputedStyle(e).overflowX!=='visible').map(e=>({n:name(e),sw:e.scrollWidth,cw:e.clientWidth}));
  const rect=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(v=>Math.round(v));};
  return {taps,small:taps.filter(t=>t.h<44||t.w<44),clip,overflowX:document.documentElement.scrollWidth>innerWidth,
   rects:Object.fromEntries(['#collect','nav.actions','#goal','#meter','.hud','#p-upgrades','#p-upgrades .tabs','#p-upgrades .up','#p-market','.order','.save-warn','.tracks-exp'].map(s=>[s,rect(s)]))};
});

// Clipped visible Buy buttons and whether the visible explainer card overlaps any of them
const buys=p=>p.evaluate(()=>{
  const card=document.querySelector('.tracks-exp'), cs=card&&getComputedStyle(card), cr=card?.getBoundingClientRect();
  const painted=!!card && card.dataset.place!=='none' && cs?.visibility!=='hidden' && cs?.display!=='none';
  const body=document.querySelector('#p-upgrades .body'), br=body?.getBoundingClientRect();
  return [...document.querySelectorAll('#p-upgrades .up button.buy,#p-upgrades .up button')].map(b=>{
    const r0=b.getBoundingClientRect();
    const r=br?{left:Math.max(r0.left,br.left,0),right:Math.min(r0.right,br.right,innerWidth),top:Math.max(r0.top,br.top,0),bottom:Math.min(r0.bottom,br.bottom,innerHeight)}:r0;
    return {b,r,w:r.right-r.left,h:r.bottom-r.top};
  }).filter(x=>x.w>0&&x.h>0).map(({b,r,w,h})=>{
    const t=document.elementFromPoint(r.left+w/2,r.top+h/2);
    let cov=0;
    if (painted) {
      for(const fx of [.1,.5,.9])for(const fy of [.2,.5,.8]){
        const x=document.elementFromPoint(r.left+fx*w,r.top+fy*h);
        if(card&&card.contains(x))cov++;
      }
    }
    const rectOverlap = painted && cr ? (r.left < cr.right && cr.left < r.right && r.top < cr.bottom && cr.top < r.bottom) : false;
    return {row:b.closest('.up')?.querySelector('h3')?.textContent??'',t:Math.round(r.top),h:Math.round(h),centreHitsBuy:b===t||b.contains(t),coveredPts:cov,rectOverlap};
  });
});

for(const lab of ['after']){
  const L=lab;
  // Run BEFORE only at 360 and 430 to save time while still giving a full baseline comparison
  if (L === 'before' && !(ENG === 'chromium' && (W === 360 || W === 430))) continue;

  // --- UX-M1: Focus restoration (active tab -> bottom-nav Upgrades -> #collect), .kbd-focus on keyboard close (Esc/Enter/Space, -3px inset on bottom nav), NO forced ring on pointer Got it / card tap / timeout, clears on blur & pointerdown
  try{
    const {c,p}=await open(L); const m1=[];
    const shStates = W >= 1024 ? ['open'] : ['closed','open'];
    for(const sh of shStates) {
      for(const how of ['esc','enter','space','gotit']){
        if(sh==='open') await openUpgrades(p,'farm');
        await showCard(p);
        if(how==='esc') await p.keyboard.press('Escape');
        else if(how==='enter') await p.keyboard.press('Enter');
        else if(how==='space') await p.keyboard.press('Space');
        else await p.locator('.tracks-exp-ok').click();
        await p.waitForTimeout(150);
        const tab=sh==='open'?await activeTab(p):null;
        const r=await ring(p);
        const f=(how==='esc'||how==='gotit')?await shot(p,L,`M1-${sh}-${how}`):null;
        const want=sh==='open'?`BUTTON[data-tab=${tab?.[0]}]`:'BUTTON[data-nav=upgrades]';
        if (how === 'gotit') {
          // Designer M-1: pointer Got it restores focus to `want` and does NOT force .kbd-focus
          ok(L,(sh==='closed'||(tab?.length===1&&tab[0]==='farm'))&&r?.el===want&&!r?.kbd,`UX-M1 pointer gotit sheet-${sh}: focus ${want} with NO forced .kbd-focus`,r);
        } else {
          // Keyboard Esc / Enter / Space: restores focus to `want`, sets .kbd-focus with 3px #2B79A8 ring, and -3px inset on bottom nav (n1)
          const offOk = sh==='closed' ? r?.offset === '-3px' : r?.offset === '2px';
          ok(L,(sh==='closed'||(tab?.length===1&&tab[0]==='farm'))&&r?.el===want&&r?.kbd&&ringOk(r)&&offOk,`UX-M1 ${how} sheet-${sh}: focus ${want} with .kbd-focus 3px #2B79A8 ring and offset (${r?.offset})`,r);
          // Verify clearing on pointerdown (for esc) or blur (for enter)
          if (how === 'esc') {
            await p.mouse.click(5, H/2); await p.waitForTimeout(80);
            const rAfterPtr = await ring(p);
            ok(L, !rAfterPtr?.kbd, `UX-M1 ${sh}-esc: .kbd-focus clears on pointerdown`, rAfterPtr);
            m1.push({sh,how,tab,ring:r,afterPointer:rAfterPtr,shot:f});
            continue;
          } else if (how === 'enter') {
            await p.evaluate(() => (document.activeElement)?.blur?.()); await p.waitForTimeout(80);
            const rAfterBlur = await p.evaluate(() => !!document.querySelector('.kbd-focus'));
            ok(L, !rAfterBlur, `UX-M1 ${sh}-enter: .kbd-focus clears on blur`, {rAfterBlur});
          }
        }
        m1.push({sh,how,tab,ring:r,shot:f});
      }
    }
    // Fallback to #collect when both [data-tab].active and [data-nav=upgrades] are hidden
    await showCard(p);
    await p.evaluate(() => {
      const up = document.querySelector('#p-upgrades'); if (up) { up.setAttribute('hidden', ''); up.style.setProperty('display', 'none', 'important'); }
      const nav = document.querySelector('[data-nav=upgrades]');
      if (nav) { nav.setAttribute('hidden', ''); nav.style.display = 'none'; }
    });
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const rCol = await ring(p);
    ok(L, rCol?.el === 'BUTTON#collect' && rCol?.kbd && ringOk(rCol), 'UX-M1 fallback to #collect when sheet and nav are hidden', rCol);
    await p.evaluate(() => {
      const nav = document.querySelector('[data-nav=upgrades]');
      if (nav) { nav.removeAttribute('hidden'); nav.style.display = ''; }
      const up = document.querySelector('#p-upgrades'); if (up) { up.style.display = ''; if (window.innerWidth >= 1024) up.removeAttribute('hidden'); }
    });

    // No forced ring on card-body tap
    await showCard(p); await p.locator('.tracks-exp h2').click(); await p.waitForTimeout(150);
    const rb=await ring(p); ok(L,!rb?.kbd,'UX-M1 card-body tap does not force .kbd-focus',rb);
    rec({section:'UX-M1',lab:L,build_id:BID[L],m1,collectFallback:rCol,bodyTap:rb});
    await c.close();
  }catch(e){ok(L,false,`UX-M1 threw ${e.message.slice(0,150)}`);}

  // --- UX-M2: no-storage notice (.save-warn) above #collect at <=390 and above #goal + #collect at >390 (412/430/1280)
  try{
    const {c,p}=await open(L);
    await p.evaluate(()=>window.eggfarm.onStorageFail?.());
    await p.waitForSelector('.save-warn',{timeout:3000}).catch(()=>{});
    await p.waitForTimeout(250);
    const n=await R(p,'.save-warn'), col=await R(p,'#collect'), goal=await R(p,'#goal'), meter=await R(p,'#meter');
    const toastSafeVar=await p.evaluate(()=>document.documentElement.style.getPropertyValue('--toast-safe-b'));
    const pts=await p.evaluate(()=>{const c=document.querySelector('#collect').getBoundingClientRect();const out=[];for(const fx of [.05,.5,.95])for(const fy of [.08,.5,.92]){const t=document.elementFromPoint(c.left+fx*c.width,c.top+fy*c.height);out.push(t?.closest('#collect')?1:0);}return out;});
    await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,coop:20,basket:0};});
    await p.waitForTimeout(100);
    const b0=await p.evaluate(()=>window.eggfarm.state.basket);
    const f=await shot(p,L,'M2-no-storage');
    await p.locator('#collect').click({timeout:3000}).catch(()=>{});
    await p.waitForTimeout(200);
    const b1=await p.evaluate(()=>window.eggfarm.state.basket);
    const sw=await sweep(p);
    const overGoal = hit(n, goal);
    ok(L,!!n&&!hit(n,col)&&pts.every(x=>x)&&b1>b0,'UX-M2 notice clear of Collect; Collect fully hit-testable and tappable',{n,col,pts,b0,b1});
    if (W > 390 && goal && goal.h > 0) {
      ok(L,!overGoal,`UX-M2 at W=${W} (>390): notice also clears #goal strip`,{n,goal,toastSafeVar});
    }
    rec({section:'UX-M2',lab:L,toastSafeVar,notice:n,collect:col,goal,meter,overGoal,overMeter:hit(n,meter),collectPts:pts,basket:[b0,b1],sweep:sw,shot:f});
    await c.close();
  }catch(e){ok(L,false,`UX-M2 threw ${e.message.slice(0,150)}`);}

  // --- UX-M3 + R-b + dynamic re-placement: card never overlaps visible Buy or hittable Collect; dismiss & 8s timeout work
  for(const refund of [0,123450])for(const end of ['gotit','timeout']) {
    // Run 8s timeout check once (on refund=123450) to keep runtime fast while verifying 8s auto-dismiss
    if (end === 'timeout' && refund === 0) continue;
    try{
      const {c,p}=await open(L);
      await openUpgrades(p,'farm');
      const tab=await activeTab(p);
      await showCard(p,refund);
      const card=await R(p,'.tracks-exp');
      const place=await p.evaluate(()=>document.querySelector('.tracks-exp')?.dataset.place??null);
      const tabs=await p.evaluate(()=>[...document.querySelectorAll('[data-tab]')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect(),card=document.querySelector('.tracks-exp');let cov=0;
       for(const fx of [.15,.5,.85])for(const fy of [.2,.5,.8]){const t=document.elementFromPoint(r.left+fx*r.width,r.top+fy*r.height);if(card&&card.contains(t))cov++;}return {tab:e.dataset.tab,h:r.height,cov,inView:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};}));
      const bu=await buys(p);
      const hasDismiss=await p.evaluate(()=>{const b=document.querySelector('.tracks-exp-ok');if(!b)return null;const r=b.getBoundingClientRect();return {text:b.textContent,h:r.height,w:r.width};});
      const f1=await shot(p,L,`M3-sheet-card${refund?'-refund':''}-${end}`);
      const sw=await sweep(p);
      ok(L,tab.length===1&&tab[0]==='farm','active tab farm before measurement',tab);
      const coveredWhileUp=bu.filter(b=>b.coveredPts>0||b.rectOverlap).map(b=>b.row);
      // Art Ruling (1) + CCR M1: card NEVER overlaps a visible Buy hit area while up!
      ok(L,coveredWhileUp.length===0,`UX-M3 / Art (1): 0 visible Buys overlapped while card is up (refund=${!!refund}, place=${place})`,{place,card,bu});
      // When place is 'inside' or 'above' (or docked at 1280), tabs are also uncovered
      if (place === 'inside' || place === 'above' || W >= 1024) {
        ok(L,tabs.length>=3&&tabs.every(t=>t.cov===0&&t.inView),`UX-M3 every [data-tab] fully visible when place=${place}`,{place,card,tabs});
      }
      if(end==='gotit'){await p.locator('.tracks-exp-ok').click();await p.waitForTimeout(200);}else{await p.waitForTimeout(8300);}
      const gone=await p.evaluate(()=>!document.querySelector('.tracks-exp'));
      await p.waitForTimeout(150);
      const bu2=await buys(p);
      const f2=await shot(p,L,`Rb-after-${end}${refund?'-refund':''}`);
      ok(L,gone&&bu2.length>0&&bu2.every(b=>b.centreHitsBuy&&b.coveredPts===0),`R-b after ${end}: card gone and every visible Buy centre hits Buy (refund ${!!refund})`,{gone,bu2});
      ok(L,!!hasDismiss&&hasDismiss.h>=44,'R-b card has a >=44px dismiss control (Got it) and 8 s auto-dismiss',hasDismiss);
      rec({section:'UX-M3+R-b',lab:L,refund,end,tab,place,card,tabs,buysWhileUp:bu,coveredWhileUp,dismiss:hasDismiss,goneAfter:gone,buysAfter:bu2,sweep:sw,shots:[f1,f2]});
      await c.close();
    }catch(e){ok(L,false,`UX-M3 threw ${e.message.slice(0,150)}`);}
  }

  // --- UX-M3 dynamic re-placement across scroll, click, resize on AFTER
  if (L === 'after') {
    try {
      const {c,p} = await open(L);
      await openUpgrades(p, 'farm');
      await showCard(p, 123450);
      const s0 = await p.evaluate(() => ({ place: document.querySelector('.tracks-exp')?.dataset.place, vis: getComputedStyle(document.querySelector('.tracks-exp')).visibility }));
      await p.evaluate(() => { document.querySelector('#p-upgrades .body').scrollTop = 200; });
      await settle(p);
      const s200 = await p.evaluate(() => ({ place: document.querySelector('.tracks-exp')?.dataset.place, vis: getComputedStyle(document.querySelector('.tracks-exp')).visibility }));
      const bu200 = await buys(p);
      await p.evaluate(() => { const b = document.querySelector('#p-upgrades .body'); b.scrollTop = b.scrollHeight; });
      await settle(p);
      const sEnd = await p.evaluate(() => ({ place: document.querySelector('.tracks-exp')?.dataset.place, vis: getComputedStyle(document.querySelector('.tracks-exp')).visibility }));
      const buEnd = await buys(p);
      await p.evaluate(() => { document.querySelector('#p-upgrades .body').scrollTop = 0; });
      await settle(p);
      const sBack0 = await p.evaluate(() => ({ place: document.querySelector('.tracks-exp')?.dataset.place, vis: getComputedStyle(document.querySelector('.tracks-exp')).visibility }));
      if (W === 360 || W === 375) {
        ok(L, s200.place === 'none' && s200.vis === 'hidden', `UX-M3 dynamic @${W}: Farm scroll=200 refund sets data-place="none" (visibility:hidden)`, s200);
      }
      ok(L, sEnd.place !== 'none' && sEnd.vis === 'visible' && buEnd.every(b => !b.rectOverlap), `UX-M3 dynamic @${W}: Farm scroll=end re-places visibly with 0 overlaps`, {sEnd, buEnd});
      ok(L, sBack0.place === s0.place && sBack0.vis === 'visible', `UX-M3 dynamic @${W}: Farm scroll=0 restores initial placement (${s0.place})`, {s0, sBack0});
      rec({section:'UX-M3-dynamic',lab:L,s0,s200,sEnd,sBack0,bu200,buEnd});
      await c.close();
    } catch(e) { ok(L,false,`UX-M3-dynamic threw ${e.message.slice(0,150)}`); }
  }

  // --- UX-M5: pop + 3 coins on coin pill on dismiss only; 150ms fade copy (skipped when place=none or reduced-motion); reduced motion none
  try{
    const {c,p}=await open(L);
    await p.evaluate(()=>{window.__fx=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&/exp-pop|exp-coin|tracks-exp-out/.test(n.className)){const a=n.getAnimations?.()[0];window.__fx.push({cls:n.className,text:(n.textContent||'').trim(),t:performance.now(),ariaHidden:n.getAttribute('aria-hidden'),inert:n.hasAttribute('inert'),ids:n.querySelectorAll('[id]').length});}}).observe(document.body,{childList:true});});
    await showCard(p,123450);
    await p.waitForTimeout(200);
    const fUp=await shot(p,L,'M5-card-up-no-pop');
    const popUp=await p.evaluate(()=>!!document.querySelector('.exp-pop,.exp-coin'));
    const fxUp=await p.evaluate(()=>window.__fx.filter(f=>/exp-pop|exp-coin/.test(f.cls)).length);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(40);
    const fade=await p.evaluate(()=>{const e=document.querySelector('.tracks-exp-out');const a=e?.getAnimations()[0];return {card:!!document.querySelector('.tracks-exp'),out:!!e,name:a?.animationName,dur:a?.effect?.getTiming().duration,ariaHidden:e?.getAttribute('aria-hidden'),inert:e?.hasAttribute('inert'),ids:e?e.querySelectorAll('[id]').length:null,pe:e?getComputedStyle(e).pointerEvents:null};});
    const ffade=await shot(p,L,'M5-close-fade-live');
    await p.waitForTimeout(160);
    const pop=await p.evaluate(()=>{const e=document.querySelector('.exp-pop');if(!e)return null;const cs=getComputedStyle(e),a=e.getAnimations()[0];return {text:e.textContent.trim(),font:cs.fontSize,color:cs.color,dur:a?.effect?.getTiming().duration,ariaHidden:e.getAttribute('aria-hidden'),left:e.style.left,top:e.style.top};});
    const fpop=await shot(p,L,'M5-refund-pop-on-dismiss');
    await p.waitForTimeout(850);
    const popGone=await p.evaluate(()=>!document.querySelector('.exp-pop,.exp-coin'));
    const fadeGone=await p.evaluate(()=>!document.querySelector('.tracks-exp-out'));
    const fx=await p.evaluate(()=>window.__fx);
    const pops=fx.filter(f=>/exp-pop/.test(f.cls)).length;
    const coins=fx.filter(f=>/exp-coin/.test(f.cls)).length;
    ok(L,!popUp&&fxUp===0,'UX-M5 (ruling 3) no refund pop while the card is up',{popUp,fxUp});
    ok(L,!!pop&&pop.text==='+$1.2K'&&pops===1&&coins===3&&fx.some(f=>/exp-coin/.test(f.cls)&&f.ariaHidden==='true')&&fx.some(f=>/exp-pop/.test(f.cls)&&f.ariaHidden==='true')&&popGone,'UX-M5 (ruling 3) refund pop + 3 coins once on dismiss, aria-hidden, gone after 800 ms',{pop,pops,coins,fx,popGone});
    ok(L,!fade.card&&fade.out&&fade.name==='expout'&&fade.dur===150&&fade.ariaHidden==='true'&&fade.inert&&fade.ids===0&&fade.pe==='none'&&fadeGone,'UX-M5 close: card gone at once, inert aria-hidden 150 ms fade copy',{fade,fadeGone});
    // plain card (refund 0): no pop on dismiss
    await p.evaluate(()=>{window.__fx.length=0;});
    await showCard(p,0);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    const fxPlain=await p.evaluate(()=>window.__fx.filter(f=>/exp-pop|exp-coin/.test(f.cls)).length);
    ok(L,fxPlain===0,'UX-M5 plain card (refund 0): no pop on dismiss',{fxPlain});
    // data-place="none": no fade copy on dismiss, but refund pop still plays
    if (L === 'after') {
      await p.evaluate(()=>{window.__fx.length=0;});
      await showCard(p,123450);
      await p.evaluate(()=>{const c=document.querySelector('.tracks-exp'); if(c) c.dataset.place='none';});
      await p.keyboard.press('Escape');
      await p.waitForTimeout(50);
      const fxNone=await p.evaluate(()=>({outs:window.__fx.filter(f=>/tracks-exp-out/.test(f.cls)).length,pops:window.__fx.filter(f=>/exp-pop/.test(f.cls)).length,coins:window.__fx.filter(f=>/exp-coin/.test(f.cls)).length}));
      ok(L,fxNone.outs===0&&fxNone.pops===1&&fxNone.coins===3,'UX-M5 place=none: skips .tracks-exp-out fade copy, still plays refund pop + 3 coins',fxNone);
    }
    rec({section:'UX-M5',lab:L,popUp,fxUp,pop,pops,coins,popGone,fade,fadeGone,fx,fxPlain,shots:[fUp,ffade,fpop]});
    await c.close();
  }catch(e){ok(L,false,`UX-M5 threw ${e.message.slice(0,150)}`);}

  for(const mode of ['system','flag'])try{
    const {c,p}=await open(L,mode==='system'?{reducedMotion:'reduce'}:{});
    if(mode==='flag')await p.evaluate(()=>document.documentElement.classList.add('reduced-motion'));
    await p.evaluate(()=>{window.__fx=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&/exp-pop|exp-coin|tracks-exp-out/.test(n.className))window.__fx.push(n.className);}).observe(document.body,{childList:true});});
    await showCard(p,123450);
    const f=await shot(p,L,`M5-reduced-${mode}-card`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(40);
    const r=await p.evaluate(()=>({fx:window.__fx,card:!!document.querySelector('.tracks-exp')}));
    ok(L,r.fx.length===0&&!r.card,`UX-M5 reduced motion (${mode}): no pop / fade, instant close`,r);
    rec({section:'UX-M5-rm',lab:L,mode,...r,shot:f});
    await c.close();
  }catch(e){ok(L,false,`UX-M5 rm threw ${e.message.slice(0,150)}`);}

  // --- Regression sweep, steady states (no card/notice): Farm main, Upgrades farm/collection tabs
  try{
    const {c,p}=await open(L);
    const st={};
    st.main={sweep:await sweep(p),shot:await shot(p,L,'reg-main')};
    for(const tab of ['farm','collection']){
      await openUpgrades(p,tab);
      const t=await activeTab(p);
      ok(L,t.length===1&&t[0]===tab,`active tab ${tab}`,t);
      st[`up-${tab}`]={tab:t,sweep:await sweep(p),shot:await shot(p,L,`reg-up-${tab}`)};
    }
    rec({section:'regression',lab:L,states:st});
    await c.close();
  }catch(e){ok(L,false,`regression threw ${e.message.slice(0,150)}`);}
}

rec({done:true,fails,beforeDefects:obs});
await Promise.race([br.close(),new Promise(r=>setTimeout(r,15000))]);
SRV.after.stop();
console.log(`done p65 ${ENG} ${W} after-fails=${fails.length} before-defects=${obs.length}`);
process.exit(fails.length ? 1 : 0);
