// C2 rate-window instrumentation on a LOCAL build:qa of 246de09 (git archive 246de09 -> /tmp/uiqa-triage/246de09, npm run build:qa;
// build-id reads m3-rc1-pre+unknown because the export has no .git). Uses the QA-only hooks window.eggfarm (Game, for sell events)
// and window.eggfarmUi.rates().incomeCentsPerSec (= the same IncomeRate.centsPerSec(now) the ETA uses, app.ts:700-701).
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=await import('/tmp/qa-live-246de09/node_modules/playwright-core/index.mjs');
const ENG=process.argv[2]||'chromium',W=360,H=800,URL=process.env.URL;const OUT='/workspace/egg-farm-studio/qa/m3-recheck/critic-m4b-triage/';
mkdirSync(`${OUT}shots/${ENG}`,{recursive:true});const MAN=`${OUT}manifest-${ENG}-qa-${W}.jsonl`,RES=`${OUT}results-${ENG}-qa-${W}.jsonl`;
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:false,sessions:5};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
const log=o=>{appendFileSync(RES,JSON.stringify({engine:ENG,build:'local build:qa 246de09',t:new Date().toISOString(),...o})+'\n');console.log(JSON.stringify(o).slice(0,600));};
async function assertTab(p,want){const a=await p.evaluate(()=>({up:!document.querySelector('#p-upgrades').hidden,mk:!document.querySelector('#p-market').hidden,tab:[...document.querySelectorAll('.tabs [data-tab].active')].map(e=>e.dataset.tab)}));
 const ok=want==='market'?a.mk&&!a.up:a.up&&a.tab.length===1&&a.tab[0]===want;if(!ok)throw new Error('tab '+want+' '+JSON.stringify(a));}
async function shot(p,step,tab,extra){await assertTab(p,tab);const file=`shots/${ENG}/C2qa-${step}-w${W}.png`;await p.screenshot({path:OUT+file});appendFileSync(MAN,JSON.stringify({file,build:'local build:qa 246de09 (m3-rc1-pre+unknown)',engine:ENG,size:`${W}x${H}`,case:'C2-qa',step,asserted_tab:tab,...extra})+'\n');}
const snap=p=>p.evaluate(()=>{const g=window.eggfarm,s=g.state,now=performance.now(),win=window.__sales.filter(x=>now-x.t<=60000);
 const row=k=>{const e=document.querySelector(`#uRow .up[data-track=${k}]`);return e?{cls:e.className,eta:e.querySelector('.hint.eta')?.textContent??null,price:e.querySelector('button.buy .num')?.textContent??null}:null};
 const r=window.eggfarmUi.rates();return {coinsCents:Math.round(s.coinsCents),hud:document.querySelector('#coins').textContent,rateCentsPerSec:Math.round(r.incomeCentsPerSec),netCentsPerSec:Math.round(r.netCentsPerSec),
  window60s:{n:win.length,sumCents:win.reduce((a,x)=>a+x.cents,0),largest:win.reduce((a,x)=>Math.max(a,x.cents),0),byPlayer:win.filter(x=>x.by==='player').reduce((a,x)=>a+x.cents,0)},
  eggValue:row('eggValue'),farm:row('farm'),eggValueCostCents:null,goal:document.querySelector('#goal .goal-label').textContent+' | '+document.querySelector('#goal .goal-status').textContent}});
async function boot(fx){const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();await p.goto(URL+'favicon.ico').catch(()=>{});
 const raw=JSON.parse(readFileSync(`${OUT}fixtures/${fx}.json`,'utf8'));await p.evaluate(([u,r])=>{localStorage.clear();r.savedAt=Date.now();localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify(r));},[UI,raw]);
 await p.goto(URL+'index.html');await p.getByText('Tap to start').click({timeout:90000});await p.waitForFunction(()=>!!window.eggfarm&&!!window.eggfarmUi,null,{timeout:30000});
 await p.evaluate(()=>{window.__sales=[];window.eggfarm.on(e=>{if(e.type==='sell')window.__sales.push({t:performance.now(),cents:e.value,k:e.k,by:e.by});});});return {c,p};}
// (1) natural: F25 $14K short on Egg value, 45 s, every 'a moment' sample captured with the window
{const {c,p}=await boot('C2-F25-14k-short');await p.locator('[data-nav=upgrades]').click();await p.locator('[data-tab=farm]').click();await p.waitForTimeout(300);
 const S=[],hits=[];const t0=Date.now();while(Date.now()-t0<45000){const x=await snap(p);x.t=(Date.now()-t0)/1000;S.push(x);
  if(x.eggValue?.eta==='Affordable in a moment'){hits.push(x);if(hits.length===1)await shot(p,'natural-moment','farm',x);}await p.waitForTimeout(500);}
 await shot(p,'natural-end','farm',S.at(-1));writeFileSync(`${OUT}c2qa-natural-${ENG}.json`,JSON.stringify(S));log({case:'C2qa-natural',samples:S.length,momentHits:hits.length,first:S[0],last:S.at(-1),hit0:hits[0]??null});await c.close();}
// (2) burst: same economy + 2,500-egg stockpile and 10 orders; Sell all, then Farm tab
{const {c,p}=await boot('C2-F25-burst');await p.locator('[data-nav=upgrades]').click();await p.locator('[data-tab=farm]').click();await p.waitForTimeout(4000);
 const pre=await snap(p);await shot(p,'burst-before','farm',pre);
 await p.locator('[data-nav=market]').click();await p.waitForTimeout(300);await assertTab(p,'market');await p.locator('#sellAll').click();await p.waitForTimeout(300);
 await p.locator('[data-nav=upgrades]').click();await p.locator('[data-tab=farm]').click();await p.waitForTimeout(400);
 const post=await snap(p);post.sales=await p.evaluate(()=>window.__sales.slice(-15));await shot(p,'burst-after-sellall','farm',post);
 const S=[];const t0=Date.now();while(Date.now()-t0<66000){const x=await snap(p);x.t=(Date.now()-t0)/1000;S.push(x);await p.waitForTimeout(1000);}
 await shot(p,'burst-after-66s','farm',S.at(-1));writeFileSync(`${OUT}c2qa-burst-${ENG}.json`,JSON.stringify({pre,post,after:S}));
 log({case:'C2qa-burst',pre,post:{...post,sales:post.sales.length},at30s:S.find(x=>x.t>=30),at62s:S.find(x=>x.t>=62),moments:S.filter(x=>x.eggValue?.eta==='Affordable in a moment').length});await c.close();}
await br.close();
