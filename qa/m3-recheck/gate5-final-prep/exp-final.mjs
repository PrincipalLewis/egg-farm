// EXP1 final-SHA probe (m4a-spec v1.15 non-modal, focus fix B-M1, refund 360, gating, WB queue, toasts, 8 s, once, new farm, E3 canonical).
// node exp-final.mjs <engine> <outdir>   env SHA, URL, SIZES
const pw=(await import(process.env.PW||'/tmp/qa-final-ffc3dfd/node_modules/playwright-core/index.mjs')).default;
import { mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import * as X from './exp-ext.mjs';
const [ENG,OUT]=process.argv.slice(2),SHA=process.env.SHA,URL=process.env.URL,LABEL=process.env.EXPECT_BUILD_ID||`m3-rc1-pre+${SHA.slice(0,7)}`;if(!LABEL.includes(SHA.slice(0,7)))throw new Error('EXPECT_BUILD_ID must contain sha7');
const D=new globalThis.URL('.',import.meta.url).pathname;const V6=readFileSync(D+'../gate5-pr44/fixtures/acdbedc-v6rich.json','utf8');
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
mkdirSync(`${OUT}/${ENG}`,{recursive:true});const ENT=`${OUT}/entries-${ENG}.jsonl`,PRB=`${OUT}/exp-final-${ENG}.jsonl`,LOG=`${OUT}/exp-final-${ENG}.log`;
const log=s=>{appendFileSync(LOG,s+'\n');console.log(s)};
const SZ={'360x800':[360,800],'375x800':[375,800],'390x844':[390,844],'1280x800':[1280,800]};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
let nShots=0,nFail=0;
for(const sz of (process.env.SIZES||Object.keys(SZ).join(',')).split(',')){const [w,h]=SZ[sz],docked=w>=960;
 let cx,P,cons=[];
 const open=async({ls=null,idb=null,tg={},rm='reduce'}={})=>{if(cx)await cx.close();cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:rm});await cx.addInitScript(X.INIT);P=await cx.newPage();cons=[];P.on('console',m=>{if(m.type()==='error')cons.push(m.text().slice(0,160))});P.on('pageerror',e=>cons.push('pageerror '+e.message));
  await X.seed(P,URL,{ls:ls||{},idb},UI,tg);await P.goto(URL);const bid=await P.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(bid!==LABEL)throw new Error(`build-id ${bid} != ${LABEL}`);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});};
 const card=()=>P.locator('.tracks-exp');const isCard=async(ms=0)=>ms?card().waitFor({state:'visible',timeout:ms}).then(()=>true,()=>false):card().isVisible().catch(()=>false);
 const gone=ms=>card().waitFor({state:'detached',timeout:ms}).then(()=>true,()=>false);
 const wb=async ms=>P.locator('#wbCollect').waitFor({state:'visible',timeout:ms}).then(()=>true,()=>false);
 const shot=async(tag,ok,extra={})=>{await P.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));const file=`${ENG}/exp-${tag}-${sz}.png`;await P.screenshot({path:`${OUT}/${file}`});nShots++;await P.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:extra.save||'gate5-pr44/fixtures/acdbedc-v6rich.json (in-session v6->v7 commit)',seed:null,group:'exp1-final',state:`EXP1 ${tag}${ok?'':' · ASSERT-FAIL'}`,asserted_tab:null,asserted_panel:'explainer',ext_assert_ok:ok,console_errors:cons.length,...extra})+'\n');};
 const rec=(kase,ok,data)=>{appendFileSync(PRB,JSON.stringify({engine:ENG,size:sz,case:kase,ok,...data})+'\n');if(!ok){nFail++;log(`FAIL ${ENG} ${sz} ${kase}: ${JSON.stringify(data.fails||data).slice(0,300)}`);}else log(`ok   ${ENG} ${sz} ${kase}`);};
 const migrated={ls:{'eggfarm.save':V6}};
 const toCard=async()=>{const w1=await wb(6000);const under=await isCard();if(w1)await P.locator('#wbCollect').click();const c=await isCard(6000);return {wb:w1,cardUnderWB:under,card:c,t0:Date.now()};};
 const actFocus=()=>P.evaluate(()=>{const a=document.activeElement;return {tag:a?.tagName,id:a?.id,dataTab:a?.dataset?.tab||null,dataNav:a?.dataset?.nav||null,active:a?.classList?.contains('active')||false,text:(a?.textContent||'').trim().slice(0,30)}});
 try{
 // C1: natural flow: WB first, card after, copy/a11y/focus/fit/flag, refund=0, motion, 8 s from visible
 await open(migrated);const q=await toCard();
 if(!q.card){rec('C1-natural',false,{fails:['card did not appear after Welcome back'],q,cons});}else{
  const m=await X.card(P);const fl=await X.flagState(P);const f=[];
  if(q.cardUnderWB)f.push('card under Welcome back');if(!q.wb)f.push('no Welcome back shown (queue untested)');if(!m.copyTitle||!m.copyBody)f.push('copy not verbatim');if(m.role!=='dialog'||m.ariaModal!=='false')f.push('a11y role');
  if(!m.gotIt||m.gotIt.h<48||m.gotIt.w<44)f.push(`Got it ${JSON.stringify(m.gotIt)}`);if(!m.focusOnGotIt)f.push('focus not on Got it at open');if(m.clip.length||m.offscreen)f.push(`clip ${JSON.stringify(m.clip)} off=${m.offscreen}`);if(m.refundLine)f.push('refund line at refund 0');
  if(!Object.values(fl).includes(true))f.push('seenTracksExplainer not persisted on show');
  const tf=m.anims.filter(a=>a.props.some(p=>/transform|scale|translate/.test(p)));if(tf.length)f.push('reduced-motion transform anim');if(m.anims.some(a=>typeof a.dur==='number'&&a.dur>160))f.push('reduced-motion anim >150ms');
  await shot('C1-card-refund0',!f.length);
  const ok8=await gone(12000);const dt=(Date.now()-q.t0)/1000;if(!ok8||dt<7||dt>9.6)f.push(`auto-dismiss ${dt.toFixed(2)}s closed=${ok8}`);
  await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});if(await wb(3000))await P.locator('#wbCollect').click();const again=await isCard(4000);const cnt=await X.count(P);if(again||cnt!==1)f.push(`shown again after reload (count ${cnt})`);
  rec('C1-natural',!f.length,{fails:f,wb:q.wb,card:{gotIt:m.gotIt,clip:m.clip,focusOnGotIt:m.focusOnGotIt,refundLine:m.refundLine,anims:m.anims,transition:m.transition,animation:m.animation},flag:fl,autoDismissS:dt,countAfterReload:cnt,console:cons});}
 // C1b: normal motion: pop-in present (record only)
 // C2: v1.15 non-modal: outside Collect registers, card stays; tap on card closes, no effect
 await open(migrated);const q2=await toCard();if(q2.card){const f=[];const tgt=await P.evaluate(()=>{const e=document.querySelector('#collect');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
  const cov=await P.evaluate(()=>{const c=document.querySelector('.tracks-exp').getBoundingClientRect();return ['#collect','button.buy'].map(s=>[...document.querySelectorAll(s)].filter(e=>{const r=e.getBoundingClientRect();return r.width&&c.left<r.right&&c.right>r.left&&c.top<r.bottom&&c.bottom>r.top}).length).reduce((a,b)=>a+b,0)});if(cov)f.push(`card covers ${cov} Buy/Collect control(s)`);
  const s0=await X.snap(P);if(tgt)await P.mouse.click(tgt.x,tgt.y);await P.waitForTimeout(500);const s1=await X.snap(P);const still=await isCard();
  const moved=s0.basket!==s1.basket||s0.coinsCents!==s1.coinsCents||s0.basketHud!==s1.basketHud||s0.hud!==s1.hud;
  if(!still&&!moved){f.push('MISMATCH WITH RULING D-07 v1.15: outside tap closed the card with no effect (swallow)');log(`!!! MISMATCH WITH RULING D-07 v1.15 ${ENG} ${sz}`);}else{if(!moved)f.push('outside Collect did not register');if(!still)f.push('outside tap closed the card');}
  await shot('C2-after-outside-collect',!f.length);
  if(still){const s2=await X.snap(P);const bb=await P.locator('.tracks-exp p').first().boundingBox();await P.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await P.waitForTimeout(400);const s3=await X.snap(P);if(await isCard())f.push('tap on card did not close');if(s2.coinsCents!==s3.coinsCents||JSON.stringify(s2.lv)!==JSON.stringify(s3.lv))f.push('closing tap had an effect');await shot('C2-after-card-tap',!f.length);}
  rec('C2-v115-taps',!f.length,{fails:f,target:tgt,before:s0,after:s1,cardStayed:still});}else rec('C2-v115-taps',false,{fails:['no card']});
 // C3: focus after close, sheet closed & open x Enter/Esc/click
 for(const sheet of ['closed','open'])for(const how of ['Enter','Escape','click']){await open(migrated);const q3=await toCard();if(!q3.card){rec(`C3-focus-${sheet}-${how}`,false,{fails:['no card']});continue;}const f=[];
  if(sheet==='open'&&!docked){await P.locator('[data-nav=upgrades]').click();await P.waitForTimeout(400);if(!(await isCard()))f.push('opening the sheet closed the card (v1.15 says outside taps never close it)');await P.locator('.tracks-exp-ok').focus().catch(()=>{});}
  const sheetOpen=await P.evaluate(()=>{const t=document.querySelector('[data-tab].active');return !!t&&t.getClientRects().length>0&&!t.closest('[hidden]')});
  if(await isCard()){if(how==='click')await P.locator('.tracks-exp-ok').click();else await P.keyboard.press(how);await P.waitForTimeout(400);}
  const closed=!(await isCard());const fo=await actFocus();
  const want=sheetOpen?'active tab':(docked?'active tab':'nav Upgrades');const okF=sheetOpen||docked?(!!fo.dataTab&&fo.active):fo.dataNav==='upgrades'||(fo.id==='collect'&&'fallback');
  if(!closed)f.push('did not close');if(!okF)f.push(`focus on ${JSON.stringify(fo)}, want ${want}`);if(sheet==='open'&&how==='Escape'&&!docked){const so=await P.evaluate(()=>{const t=document.querySelector('[data-tab].active');return !!t&&t.getClientRects().length>0});if(!so)f.push('Esc also closed the sheet');}
  await shot(`C3-focus-${sheet}-${how}`,!f.length);rec(`C3-focus-${sheet}-${how}`,!f.length,{fails:f,sheetOpenAtClose:sheetOpen,focus:fo,want});}
 // C4: refund line at this size: refund>0 via the build's own markup inserted into the live card (unreachable naturally: migrationRefundCents=0 for live data)
 await open(migrated);const q4=await toCard();if(q4.card){await P.waitForTimeout(300);const r=await P.evaluate(()=>{const el=document.querySelector('.tracks-exp');const q=document.createElement('p');q.className='tracks-exp-refund';q.innerHTML='<img src="assets/icon-coin.svg" alt="" width="16" height="16"> We refunded +$999.99B for your old upgrades.';el.querySelector('p').after(q);
   const all=[el,...el.querySelectorAll('*')];const rr=el.getBoundingClientRect();const ok=el.querySelector('.tracks-exp-ok').getBoundingClientRect();return {clipX:all.filter(e=>e.scrollWidth>e.clientWidth+0.5&&e.clientWidth>0).map(e=>e.tagName+'.'+e.className),card:{l:rr.left,r:rr.right,b:rr.bottom},vw:innerWidth,vh:innerHeight,gotIt:{w:ok.width,h:ok.height,bottom:ok.bottom}}});
  const f=[];if(r.clipX.length)f.push('clipped '+r.clipX);if(r.card.l<0||r.card.r>r.vw||r.gotIt.bottom>r.vh)f.push('off-screen');if(r.gotIt.h<48)f.push('Got it <48');await shot('C4-refund-gt0-injected',!f.length,{refund:'injected build markup $999.99B'});rec('C4-refund-gt0',!f.length,{fails:f,...r,method:'build markup inserted into the live card'});}
 // C5: gating hidden / read-only (no reload; build retries every 1 s)
 for(const g of ['hidden','readonly']){await open({...migrated,tg:g==='hidden'?{__hidden:'1'}:{__ro:'1'}});if(await wb(5000))await P.locator('#wbCollect').click();const b0=await isCard(4000);const fl0=await X.flagState(P);const f=[];if(b0)f.push(`card while ${g}`);if(Object.values(fl0).includes(true))f.push(`flag set while ${g}`);await shot(`C5-${g}-blocked`,!f.length);
  if(g==='hidden')await P.evaluate(()=>window.__qaShow());else await P.evaluate(()=>sessionStorage.setItem('__ro','0'));const s1=await isCard(6000);const cnt=await X.count(P);if(g==='readonly'){/* by design (HoQ 07:51): no card for the rest of the blocked session; it shows once on the next writable load (covered by C5b / exp-blkreload / exp-cardreload) */if(s1||cnt!==0)f.push(`card in blocked session after writable (count ${cnt})`);await shot(`C5-${g}-writable-no-card`,!f.length);}else{if(!s1)f.push('no card after visible');else await shot(`C5-${g}-unblocked`,true);if(s1&&cnt!==1)f.push(`count ${cnt}`);}rec(`C5-gate-${g}`,!f.length,{fails:f,count:cnt});}
 // C6: new farm never; C7: E3 canonical committed-unseen (reload fallback) shows once
 await open({});const nf=await isCard(5000);await shot('C6-new-farm',!nf,{save:'fresh'});rec('C6-new-farm',!nf,{fails:nf?['card on new farm']:[]});
 const fx=X.canonical(false);if(fx.err)rec('C7-E3-canonical',false,{fails:[fx.err]});else{await open({ls:fx.ls,idb:fx.idb});if(await wb(5000))await P.locator('#wbCollect').click();const v=await isCard(6000);const f=[];if(!v)f.push('not shown on reload-before-shown');else await shot('C7-E3-shows',true,{save:'gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json (sha256 de6b0297…6e7961)'});
  if(v)await P.locator('.tracks-exp-ok').click();await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});if(await wb(3000))await P.locator('#wbCollect').click();const v2=await isCard(4000);if(v2)f.push('shown again');rec('C7-E3-canonical',!f.length,{fails:f,fixture:{sha256:fx.sha256},count:await X.count(P)});}
 }catch(e){rec('ERROR',false,{fails:[String(e).slice(0,300)]});}
 if(cx)await cx.close();}
await br.close();log(`DONE exp-final ${ENG} shots=${nShots} fails=${nFail}`);
