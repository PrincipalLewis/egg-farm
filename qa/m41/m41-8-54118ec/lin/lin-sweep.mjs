// QA-owned label-in-name sweep (WCAG 2.5.3) for PR #62 @ 54118ec, scope added by HoQA after Art's 21:55 FAIL.
// EVERY visible strip / card / row target: #goal (F4, FARM, worker), Buy buttons, chips, Hire/Manage, Sell, Collect, nav, tabs.
// Per scene: (1) axe-core 4.14.0 rule label-content-name-mismatch, enabled explicitly TWO ways (runOnly rule + rules:{enabled:true}
// on a full run); (2) per-target browser-computed name (CDP Accessibility.getPartialAXTree) vs innerText, strict and
// punctuation-insensitive containment. Chromium. usage: BASE=... BID=54118ec node lin-sweep.mjs 360,390,430
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const pw=(await import('/tmp/qa-m41-8-54118ec/node_modules/playwright-core/index.mjs')).default;
const E='/workspace/egg-farm-studio/qa/m41/m41-8-54118ec/';const AXE='/tmp/axe/node_modules/axe-core/axe.min.js';const axeSrc=readFileSync(AXE,'utf8');
const BASE=process.env.BASE,BID=process.env.BID??'54118ec';const WS=(process.argv[2]??'360,390,430').split(',').map(Number);
const OUT=`${E}lin/lin-${BID}.jsonl`;writeFileSync(OUT,'');const CASES=JSON.parse(readFileSync(E+'harness/browser-cases.json','utf8'));
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
async function open(W){const c=await br.newContext({viewport:{width:W,height:800}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa62')){sessionStorage.setItem('qa62','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(BASE);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!bid?.endsWith('+'+BID))throw new Error('bid '+bid);
 await p.getByText('Tap to start').click({timeout:60000});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi);
 for(let i=0;i<6;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false))await p.locator('.tracks-exp button').first().click().catch(()=>{});await p.waitForTimeout(200);}
 const cdp=await c.newCDPSession(p);await cdp.send('DOM.enable');await cdp.send('Accessibility.enable');return {c,p,cdp,bid,errs};}
const sale=p=>p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,basket:5,coop:0,customers:[{id:9001,demand:5,filled:0,waitedS:0}],nextCustomerInS:1e9};g.dispatch({type:'sellAll'});});
const setState=(p,st,extra={})=>p.evaluate(([st,extra])=>{const g=window.eggfarm;g.state={...g.state,tracksV7:1,workers:{},seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0,...st,...extra};window.eggfarmUi.render();},[st,extra]);
const settle=async p=>{await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await p.waitForTimeout(250);};
async function openSheet(p,nav,tab){await p.locator(`[data-nav=${nav}]`).first().click({timeout:8000});await p.waitForTimeout(400);if(tab){await p.locator(`[data-tab=${tab}]`).click({timeout:5000});await p.waitForTimeout(500);}}
const activeTab=p=>p.evaluate(()=>[...document.querySelectorAll('.tabs button,[role=tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').map(e=>e.dataset.tab));
const sheetState=p=>p.evaluate(()=>({panelLayerOpen:document.querySelector('#panel-layer')?.classList.contains('open')??null,openSheets:[...document.querySelectorAll('#panel-layer .sheet')].filter(x=>!x.hidden).map(x=>x.id),
  navOn:[...document.querySelectorAll('nav.actions button.on')].map(b=>b.dataset.nav),goal:document.querySelector('#goal .goal-label')?.textContent}));
const norm=s=>(s??'').normalize('NFKC').replace(/[\u00a0\s]+/g,' ').trim().toLowerCase();const loose=s=>norm(s).replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
async function scan(scene,W,p,cdp,meta){
 await p.evaluate(axeSrc);const ver=await p.evaluate(()=>window.axe.version);
 const t=await p.evaluate(()=>{const sel='button,a[href],[role=button],[role=tab],[role=link],input[type=button],input[type=submit],summary';let i=0;const out=[];
  for(const e of document.querySelectorAll(sel)){const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(!r.width||!r.height||cs.visibility==='hidden'||cs.display==='none'||e.closest('[hidden],[aria-hidden=true],[inert]'))continue;
   e.setAttribute('data-qa-t',String(i));const path=[];let n=e;while(n&&n!==document.body&&path.length<4){path.unshift(n.id?'#'+n.id:n.tagName.toLowerCase()+([...n.classList].slice(0,2).map(c=>'.'+c).join('')));if(n.id)break;n=n.parentElement;}
   const vis=n=>[...n.childNodes].map(c=>c.nodeType===3?c.textContent:c.nodeType!==1||c.getAttribute('aria-hidden')==='true'||getComputedStyle(c).display==='none'?'':(c.tagName==='IMG'?'':vis(c)+(getComputedStyle(c).display==='inline'?'':' '))).join('');
   out.push({i,sel:path.join(' > '),dataset:{...e.dataset},innerText:e.innerText,visNoHidden:vis(e),ariaLabel:e.getAttribute('aria-label'),labelledby:e.getAttribute('aria-labelledby'),describedby:e.getAttribute('aria-describedby'),disabled:e.disabled??null,inViewport:r.bottom>0&&r.top<innerHeight});i++;}
  return out;});
 for(const x of t){const {root}=await cdp.send('DOM.getDocument',{depth:0});const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:`[data-qa-t="${x.i}"]`});
  const {nodes}=await cdp.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false});const n=nodes[0];x.name=n?.name?.value??'';x.desc=n?.description?.value??null;x.role=n?.role?.value;x.ignored=n?.ignored;
  const vis=norm(x.visNoHidden);x.strictContained=!vis||norm(x.name).includes(vis);x.looseContained=!loose(x.innerText)||loose(x.name).includes(loose(x.innerText));
  x.labelledBy=x.ariaLabel!==null?'aria-label':x.labelledby?'aria-labelledby':'content';}
 await p.evaluate(()=>document.querySelectorAll('[data-qa-t]').forEach(e=>e.removeAttribute('data-qa-t')));
 const run=o=>p.evaluate(async o=>{const r=await window.axe.run(document,o);const m=v=>({id:v.id,impact:v.impact,tags:v.tags,nodes:v.nodes.map(n=>({target:n.target.join(' '),html:n.html.slice(0,220),summary:n.failureSummary}))});
  return {violations:r.violations.map(m),incomplete:r.incomplete.map(m),passes:r.passes.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target.join(' '))})),inapplicable:r.inapplicable.map(v=>v.id),rulesRun:[...r.violations,...r.passes,...r.incomplete,...r.inapplicable].map(v=>v.id)};},o);
 const a1=await run({runOnly:{type:'rule',values:['label-content-name-mismatch']}});
 const a2=await run({runOnly:{type:'tag',values:['wcag2a','wcag21a','wcag253','experimental','best-practice']},rules:{'label-content-name-mismatch':{enabled:true}}});
 const shotF=`shots/chromium/lin-${BID}-${scene}-w${W}.png`;await p.screenshot({path:E+shotF});
 const lin1=a1.violations.flatMap(v=>v.nodes.map(n=>({rule:v.id,impact:v.impact,target:n.target,html:n.html})));
 const lin2=a2.violations.filter(v=>v.id==='label-content-name-mismatch').flatMap(v=>v.nodes.map(n=>({rule:v.id,impact:v.impact,target:n.target})));
 const flagged=t.filter(x=>!x.looseContained||!x.strictContained);
 const rec={build_id:meta.bid,scene,w:W,axe:{version:ver,sha256:createHash('sha256').update(axeSrc).digest('hex')},sheet:await sheetState(p),activeTab:await activeTab(p),
  axeRunOnly:{config:"runOnly:{type:'rule',values:['label-content-name-mismatch']}",ruleRan:a1.rulesRun.includes('label-content-name-mismatch'),violations:lin1,passes:a1.passes,incomplete:a1.incomplete},
  axeTags:{config:"runOnly tags [wcag2a,wcag21a,wcag253,experimental,best-practice] + rules:{'label-content-name-mismatch':{enabled:true}}",ruleRan:a2.rulesRun.includes('label-content-name-mismatch'),linViolations:lin2,otherViolations:a2.violations.filter(v=>v.id!=='label-content-name-mismatch').map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))},
  targets:t,flagged:flagged.map(x=>({sel:x.sel,innerText:x.innerText,name:x.name,via:x.labelledBy,strict:x.strictContained,loose:x.looseContained})),shot:shotF,pageerrors:meta.errs};
 appendFileSync(OUT,JSON.stringify(rec)+'\n');
 console.log(`${W} ${scene} sheet=${rec.sheet.openSheets.join('+')||'closed'} goal="${rec.sheet.goal}" tab=${rec.activeTab} targets=${t.length} axeLIN(runOnly)=${lin1.length} axeLIN(tags+enabled)=${lin2.length} nameFlags=${flagged.length}`);
 for(const v of lin1)console.log('   AXE',v.impact,v.target,'|',v.html.slice(0,140));for(const f of rec.flagged)console.log('   NAME',f.via,f.sel,'| visible:',JSON.stringify(norm(f.innerText)),'| name:',JSON.stringify(f.name),f.loose?'(loose ok)':'');}
// discover a worker strip target on shipped data: tracks at their cap, workers unhired, Farm not affordable
async function findWorker(p){for(const F of [1,2,3,4,5,6,8,10])for(const coins of [0,500,5000]){const st={farmLevel:F,hensLevel:F+3,eggValueLevel:F+3,collectionLevel:F+3,coinsCents:coins};await setState(p,st);await p.waitForTimeout(1200);await p.evaluate(()=>window.eggfarmUi.render());
  const l=await p.evaluate(()=>document.querySelector('#goal .goal-label').textContent);if(!/^(★ )?(Farm|Hens|Egg|Value|Coll)/.test(l))return {st,label:l};}return null;}
const RICH=1e13;
for(const W of WS){
 // A-C: sheet closed, strip target F4 / FARM / worker
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);await setState(p,CASES['hens-pct-star'].state);await settle(p);await scan('closed-strip-F4-hens',W,p,cdp,{bid,errs});await c.close();}
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);await setState(p,CASES['farm-best'].state);await settle(p);await scan('closed-strip-FARM-ready',W,p,cdp,{bid,errs});
  await setState(p,{...CASES['farm-best'].state,coinsCents:0});await settle(p);await scan('closed-strip-FARM-or-other-waiting',W,p,cdp,{bid,errs});await c.close();}
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);const wk=await findWorker(p);if(wk){await setState(p,wk.st);await settle(p);await scan('closed-strip-WORKER',W,p,cdp,{bid,errs});}else console.log(W,'no worker strip target found');await c.close();}
 // D: Upgrades sheet open, Farm tab (Farm row Buy + track rows + chip)
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);await setState(p,CASES['farm-best'].state);await settle(p);await openSheet(p,'upgrades','farm');await scan('open-upgrades-farm-tab',W,p,cdp,{bid,errs});
  await setState(p,CASES['hens-pct-star'].state);await settle(p);await scan('open-upgrades-farm-tab-hens-chip',W,p,cdp,{bid,errs});
  await setState(p,{...CASES['broke-hens-short'].state});await settle(p);await scan('open-upgrades-farm-tab-broke',W,p,cdp,{bid,errs});await c.close();}
 // E: Workers tab (Hire cards; then hired workers → Manage)
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);await setState(p,{farmLevel:10,hensLevel:10,eggValueLevel:10,collectionLevel:5,coinsCents:RICH});await settle(p);await openSheet(p,'upgrades','workers');await scan('open-upgrades-workers-tab-hire',W,p,cdp,{bid,errs});
  await p.evaluate(()=>{const g=window.eggfarm;for(const w of ['market_hand','coop_hand','hawker'])g.dispatch({type:'hire',worker:w});window.eggfarmUi.render();});await settle(p);
  await scan('open-upgrades-workers-tab-hired',W,p,cdp,{bid,errs});
  await p.locator('#p-upgrades .close').click().catch(()=>{});await p.waitForTimeout(400);
  await p.evaluate(()=>{const g=window.eggfarm;const ws={...g.state.workers};for(const k of Object.keys(ws))if(ws[k]&&typeof ws[k]==='object')ws[k]={...ws[k],energy:10};g.state={...g.state,workers:ws};window.eggfarmUi.render();});await settle(p);
  await scan('closed-farm-view-tired-workers-manage-all',W,p,cdp,{bid,errs});
  await openSheet(p,'upgrades','workers');await scan('open-upgrades-workers-tab-tired',W,p,cdp,{bid,errs});await c.close();}
 // F: Collection tab
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);await setState(p,CASES['collection-star'].state);await settle(p);await openSheet(p,'upgrades','collection');await scan('open-upgrades-collection-tab',W,p,cdp,{bid,errs});await c.close();}
 // G: Market sheet open with an order and eggs (Sell / Sell all), and main screen with eggs (Collect)
 {const {c,p,cdp,bid,errs}=await open(W);await sale(p);await setState(p,{farmLevel:2,hensLevel:3,eggValueLevel:3,collectionLevel:1,coinsCents:500},{basket:8,coop:6,customers:[{id:9101,demand:3,filled:0,waitedS:0},{id:9102,demand:4,filled:0,waitedS:0}]});await settle(p);
  await scan('closed-main-with-eggs-orders',W,p,cdp,{bid,errs});await openSheet(p,'market');await scan('open-market',W,p,cdp,{bid,errs});await c.close();}
}
await br.close();console.log('done');
