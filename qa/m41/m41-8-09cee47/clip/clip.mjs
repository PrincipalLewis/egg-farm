// QA-owned layout clip + ★-row regression for PR #62 @ 09cee47. Chromium (or argv[2] engine). Widths 360/375/390/430/1280.
// Per scene: assert sheet/tab state first, then measure: every visible button + strip label parts: scrollWidth>clientWidth (clip),
// height>=44 (buttons); .best-chip never in a row that reads 'Max for this farm' / MAX / 'Needs Farm L…' / locked; then shot.
// 1280 (desktop side panel, no sheet): sheet assertion skipped, tab assertion kept; [hidden]/[inert] ancestor filter dropped: at desktop width section#p-upgrades keeps the hidden attribute but CSS shows it as the side panel (dbg1280.mjs), so runs b and c1280 measured 0 panel rows; rect>0 + computed visibility still apply.
// usage: BASE=... BID=09cee47 node clip.mjs [engine] [w,w,...]
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=(await import('/tmp/qa-m41-8-09cee47/node_modules/playwright-core/index.mjs')).default;
const E='/workspace/egg-farm-studio/qa/m41/m41-8-09cee47/';const BASE=process.env.BASE,BID=process.env.BID??'09cee47';const ENG=process.argv[2]??'chromium';
const WS=(process.argv[3]??'360,375,390,430,1280').split(',').map(Number);mkdirSync(`${E}shots/${ENG}`,{recursive:true});
const OUT=`${E}clip/clip-${BID}-${ENG}.jsonl`;writeFileSync(OUT,'');const CASES=JSON.parse(readFileSync(E+'harness/browser-cases.json','utf8'));
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('FAIL',m)}return c};
async function open(W){const c=await br.newContext({viewport:{width:W,height:W>=1000?800:800}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa62')){sessionStorage.setItem('qa62','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(BASE);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!ok(bid?.endsWith('+'+BID)&&!/dirty/.test(bid),`build-id ${bid}`))throw new Error('bid');
 await p.getByText('Tap to start').click({timeout:60000});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi);
 for(let i=0;i<6;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false))await p.locator('.tracks-exp button').first().click().catch(()=>{});await p.waitForTimeout(200);}
 return {c,p,bid,errs};}
const sale=p=>p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,basket:5,coop:0,customers:[{id:9001,demand:5,filled:0,waitedS:0}],nextCustomerInS:1e9};g.dispatch({type:'sellAll'});});
const setState=(p,cs)=>p.evaluate(([st,wk,gm])=>{const g=window.eggfarm;g.state={...g.state,tracksV7:1,workers:wk??{},seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0,...st,...(gm?{graderTier:g.b.workers.grader.tiers.length}:{})};window.eggfarmUi.render();},[cs.state,cs.workers??null,!!cs.graderMax]);
const settle=async p=>{await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await p.waitForTimeout(250);};
const state=p=>p.evaluate(()=>({openSheets:[...document.querySelectorAll('#panel-layer .sheet')].filter(x=>!x.hidden).map(x=>x.id),activeTab:[...document.querySelectorAll('.tabs button,[role=tab]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').map(e=>e.dataset.tab)}));
async function openTab(p,tab){if(!await p.locator(`[data-tab=${tab}]`).isVisible().catch(()=>false))await p.locator('[data-nav=upgrades]').first().click({timeout:8000});await p.waitForTimeout(300);await p.locator(`[data-tab=${tab}]`).click({timeout:5000});await p.waitForTimeout(500);}
const measure=(p,W)=>p.evaluate((DESK)=>{const R=e=>e.getBoundingClientRect();const vis=e=>{const r=R(e),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&(DESK||!e.closest('[hidden],[inert]'));};
 const id=e=>e.id?'#'+e.id:e.tagName.toLowerCase()+[...e.classList].slice(0,3).map(c=>'.'+c).join('')+(e.dataset.kind?`[data-kind=${e.dataset.kind}]`:'')+(e.dataset.tab?`[data-tab=${e.dataset.tab}]`:'')+(e.dataset.nav?`[data-nav=${e.dataset.nav}]`:'');
 const clip=e=>({sel:id(e),text:e.innerText?.slice(0,60),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,h:R(e).height,w:R(e).width});
 const btns=[...document.querySelectorAll('button,[role=button],[role=tab]')].filter(vis).map(clip);
 const g=document.querySelector('#goal .goal-label');const strip=g?[g,...g.querySelectorAll('*')].filter(vis).map(clip):[];
 const chips=[...document.querySelectorAll('.best-chip')].filter(vis).map(c=>{const row=c.closest('.up');return {...clip(c),rowText:row?.innerText.replace(/\s+/g,' ').slice(0,160),rowLockedEl:!!row?.querySelector('.lock,.maxed,[disabled]'),buyDisabled:row?.querySelector('button.buy')?.disabled??null};});
 const maxRows=[...document.querySelectorAll('.up')].filter(vis).filter(r=>/Max for this farm|\bMAX\b|Needs Farm L/.test(r.innerText)).map(r=>({text:r.innerText.replace(/\s+/g,' ').slice(0,120),chip:!!r.querySelector('.best-chip'),best:r.classList.contains('best'),star:/★/.test(r.innerText)}));
 return {btns,strip,chips,maxRows,goal:g?.textContent,inertAncestors:[...document.querySelectorAll('[inert]')].map(id),docOverflow:document.documentElement.scrollWidth>innerWidth};},W>=1000);
async function scene(name,W,p,exp,errs,bid){const st=await state(p);
 ok(W>=1000||(exp.sheet==='closed'?st.openSheets.length===0:st.openSheets.length>0),`${W} ${name}: sheet ${JSON.stringify(st.openSheets)} expected ${exp.sheet}`);if(exp.tab)ok(st.activeTab.length>=1&&st.activeTab.every(t=>t===exp.tab),`${W} ${name}: tab ${st.activeTab} != ${exp.tab}`);
 const m=await measure(p,W);const f=`shots/${ENG}/clip-${BID}-${name}-w${W}.png`;await p.screenshot({path:E+f});
 for(const b of m.btns){ok(b.sw<=b.cw+1,`${W} ${name}: button clip x ${b.sel} "${b.text}" ${b.sw}/${b.cw}`);ok(b.sh<=b.ch+1,`${W} ${name}: button clip y ${b.sel} "${b.text}" ${b.sh}/${b.ch}`);ok(b.h>=43.5,`${W} ${name}: button h ${b.h} ${b.sel} "${b.text}"`);}
 for(const s of m.strip)ok(s.sw<=s.cw+1,`${W} ${name}: strip clip ${s.sel} "${s.text}" ${s.sw}/${s.cw}`);
 for(const c of m.chips){ok(c.sw<=c.cw+1,`${W} ${name}: chip clip ${c.sw}/${c.cw}`);ok(!/Max for this farm|\bMAX\b|Needs Farm L/.test(c.rowText)&&!c.rowLockedEl,`${W} ${name}: chip on max/locked row "${c.rowText}"`);}
 for(const r of m.maxRows)ok(!r.chip&&!r.best&&!r.star,`${W} ${name}: ★/chip on max/locked row ${JSON.stringify(r)}`);
 ok(!m.docOverflow,`${W} ${name}: page overflow-x`);
 const rec={build_id:bid,engine:ENG,w:W,scene:name,expected:exp,state:st,...m,shot:f,pageerrors:errs};appendFileSync(OUT,JSON.stringify(rec)+'\n');
 console.log(W,name,`sheet=${st.openSheets.join('+')||'closed'} tab=${st.activeTab} btns=${m.btns.length} chips=${m.chips.length} maxRows=${m.maxRows.length} goal="${m.goal}"`);}
for(const W of WS){
 for(const k of ['hens-pct-star','value-pct-star-27','hens-milestone','collection-star','farm-best','worker-grader-tier','done']){const cs=CASES[k];try{const {c,p,bid,errs}=await open(W);if(cs.sale)await sale(p);await setState(p,cs);await settle(p);
  await scene('closed-'+k,W,p,{sheet:'closed'},errs,bid);
  if(['hens-pct-star','farm-best','value-pct-star-27'].includes(k)){await openTab(p,'farm');await p.evaluate(()=>(document.querySelector('.best-chip')??document.querySelector('.up'))?.scrollIntoView({block:'center'}));await p.waitForTimeout(300);await scene('farmtab-'+k,W,p,{sheet:'open',tab:'farm'},errs,bid);}
  if(k==='collection-star'){await openTab(p,'collection');await p.evaluate(()=>document.querySelector('.best-chip')?.scrollIntoView({block:'center'}));await p.waitForTimeout(300);await scene('colltab-'+k,W,p,{sheet:'open',tab:'collection'},errs,bid);}
  await c.close();}catch(e){ok(false,`${W} ${k} threw ${e.message.slice(0,160)}`);for(const x of br.contexts())await x.close().catch(()=>{});}}
 // ★/chip never on a 'Max for this farm' or locked row: rich coins, Hens+Value at their F+3 cap, Collection locked/capped.
 for(const [k,st] of [['max-rows-F0',{farmLevel:0,hensLevel:3,eggValueLevel:3,collectionLevel:0,coinsCents:1e13}],['max-rows-F5',{farmLevel:5,hensLevel:8,eggValueLevel:8,collectionLevel:8,coinsCents:1e13}],['max-rows-F29',{farmLevel:29,hensLevel:32,eggValueLevel:32,collectionLevel:32,coinsCents:1e13}]]){
  try{const {c,p,bid,errs}=await open(W);await sale(p);await setState(p,{state:st});await settle(p);
  await openTab(p,'farm');await scene('farmtab-'+k,W,p,{sheet:'open',tab:'farm'},errs,bid);await openTab(p,'collection');await scene('colltab-'+k,W,p,{sheet:'open',tab:'collection'},errs,bid);await c.close();}catch(e){ok(false,`${W} ${k} threw ${e.message.slice(0,160)}`);for(const x of br.contexts())await x.close().catch(()=>{});}}
}
await br.close();appendFileSync(OUT,JSON.stringify({done:true,fails})+'\n');console.log(`done clip ${ENG} fails=${fails.length}`);
