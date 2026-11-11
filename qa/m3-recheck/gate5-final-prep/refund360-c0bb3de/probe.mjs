// Is the EXP1 refund line clipped at 360 in a normal page? c0bb3de, migrated acdbedc loaded naturally (in-session commit -> card), then the
// build's own refund markup is inserted (refund is unreachable with live data: migrationRefundCents comes from the in-session migration, 0 for current data).
import pw from '/tmp/qa-final-prep-4ccb9fd/node_modules/playwright-core/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const URL='http://127.0.0.1:4796/',OUT=new globalThis.URL('.',import.meta.url).pathname;const raw=readFileSync(OUT+'../../gate5-pr44/fixtures/acdbedc-v6rich.json','utf8');
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const res=[];
for(const [w,h] of [[360,800],[375,800],[390,844],[1280,800]])for(const rm of ['no-preference','reduce'])for(const amt of (rm==='reduce'?['$999.99B']:['$12.35','$1.23M','$999.99B'])){
 const c=await br.newContext({viewport:{width:w,height:h},reducedMotion:rm});const p=await c.newPage();
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));localStorage.setItem('eggfarm.save',r)},raw);
 await p.goto(URL);await p.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await p.locator('#wbCollect').click({timeout:4000}).catch(()=>{});
 const shown=await p.locator('.tracks-exp').waitFor({timeout:8000}).then(()=>true,()=>false);if(!shown){res.push({w,rm,amt,shown});await c.close();continue;}
 await p.waitForTimeout(400); // past the 200 ms pop-in
 const m=await p.evaluate(amt=>{const el=document.querySelector('.tracks-exp');const q=document.createElement('p');q.className='tracks-exp-refund';q.innerHTML=`<img src="assets/icon-coin.svg" alt="" width="16" height="16"> We refunded +${amt} for your old upgrades.`;el.querySelector('p').after(q);
  const r=el.getBoundingClientRect();const all=[el,...el.querySelectorAll('*')].map(e=>({tag:e.tagName+(e.className?'.'+e.className:''),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,ov:getComputedStyle(e).overflow,lines:Math.round(e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).lineHeight||20)||0)}));
  const tr=document.querySelector('#uRow .up.track')?.getBoundingClientRect();
  return {card:{l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width},vw:innerWidth,clipX:all.filter(x=>x.sw>x.cw+0.5&&x.cw>0),clipY:all.filter(x=>x.sh>x.ch+0.5&&x.ch>0&&x.ov!=='visible'),refundH:q.getBoundingClientRect().height,transform:getComputedStyle(el).transform,anim:getComputedStyle(el).animationName};},amt);
 const f=`shot-${w}-${rm}-${amt.replace(/[$.]/g,'')}.png`;await p.screenshot({path:OUT+f});res.push({w,rm,amt,shown,...m,shot:f});await c.close();}
await br.close();writeFileSync(OUT+'results.json',JSON.stringify(res,null,1));
for(const r of res)console.log(r.w,r.rm,r.amt,r.shown?`card ${r.card.l.toFixed(1)}..${r.card.r.toFixed(1)} of ${r.vw} clipX=${r.clipX.length} clipY=${r.clipY.length} refundH=${r.refundH} anim=${r.anim}`:'NO CARD');
