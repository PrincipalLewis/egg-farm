// EXP1 storage-blocked probe (Saves m1 / canPersist vs lease.storageBlocked, game.ts:129, tab-lease.ts:56, tracks-explainer.ts:23).
// node exp-blocked.mjs <engine> <outdir>   env URL, SIZES (e.g. 390x844,360x800), PW
// Variants: real = localStorage filled to the real quota before boot (genuine QuotaExceededError from the browser);
//           mock = Storage.prototype.setItem throws new DOMException('quota','QuotaExceededError') for localStorage only, installed by addInitScript; reads untouched.
// Expected (spec): blocked -> no card, flag unset; writes restored (no reload) -> card exactly once (retry EXP_RETRY_MS) and flag persisted; reload -> no card, total 1.
const pw=(await import(process.env.PW||'/tmp/qa-final-c11e3a0/node_modules/playwright-core/index.mjs')).default;
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';import * as X from './exp-ext.mjs';
const [ENG,OUT]=process.argv.slice(2),URL=process.env.URL;const D=new globalThis.URL('.',import.meta.url).pathname;
const V6=readFileSync(D+'../gate5-pr44/fixtures/acdbedc-v6rich.json','utf8');const UI=JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false});
const can=X.canonical(false);if(can.err)throw new Error(can.err);
const FX={'canonical-committed-unseen':can.ls,'acdbedc-v6':{'eggfarm.save':V6}};
mkdirSync(`${OUT}/${ENG}`,{recursive:true});const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
const MOCK=()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===window.localStorage&&window.sessionStorage.getItem('__qblock')==='1')throw new DOMException('quota','QuotaExceededError');return o.call(this,k,v)}};
const put=o=>appendFileSync(`${OUT}/entries-${ENG}.jsonl`,JSON.stringify(o)+'\n');
const rec=o=>{appendFileSync(`${OUT}/exp-blkreload-${ENG}.jsonl`,JSON.stringify({engine:ENG,...o})+'\n');console.log(JSON.stringify(o).slice(0,400))};
const has=P=>P.evaluate(T=>[...document.querySelectorAll('body *')].some(e=>e.childElementCount===0&&e.textContent.trim()===T),X.TITLE);
const tab=P=>P.evaluate(()=>{const a=document.querySelector('[data-tab].active,[data-tab][aria-selected=true]');const n=document.querySelector('[data-nav].active,[data-nav][aria-current]');return {tab:a?.dataset.tab??null,nav:n?.dataset.nav??null}});
for(const sz of (process.env.SIZES||'390x844').split(',')){const [w,h]=sz.split('x').map(Number);
for(const v of ['real','mock'])for(const [fname,ls] of Object.entries(FX).filter(([k])=>k.startsWith('canonical'))){
 const cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});await cx.addInitScript(X.INIT);if(v==='mock')await cx.addInitScript(MOCK);const P=await cx.newPage();
 await P.goto(URL+'favicon.ico').catch(()=>{});
 const fill=await P.evaluate(([ls,ui,v])=>{localStorage.clear();sessionStorage.clear();for(const[k,x]of Object.entries(ls))localStorage.setItem(k,x);localStorage.setItem('eggfarm.ui',ui);
  if(v==='mock'){sessionStorage.setItem('__qblock','1');return {mode:'mock'}}
  let n=0,sz=1<<20,err=null;const s='x'.repeat(sz);while(sz>=16){try{localStorage.setItem('__qfill'+n,s.slice(0,sz));n++}catch(e){err=e.name;sz>>=1}}
  let probe=null;try{localStorage.setItem('__qprobe','y'.repeat(64))}catch(e){probe=e.name+(e instanceof DOMException?'(DOMException)':'')}return {mode:'real',chunks:n,firstErr:err,probe}},[ls,UI,v]);
 const step=async(name,extra)=>{const t=await tab(P),c=await has(P),fl=await X.flagState(P),n=await X.count(P);const file=`${ENG}/expblkrl-${v}-${fname}-${name}-${w}x${h}.png`;await P.screenshot({path:`${OUT}/${file}`});
  const r={size:sz,variant:v,fixture:fname,step:name,card:c,flag:fl,count:n,...t,...extra};put({file,engine:ENG,size:sz,docked:w>=960,save:fname,seed:null,group:'exp1-storage-blocked',state:`EXP1 storage ${v} · ${name} · card ${c?'shown':'absent'} · count ${n}`,asserted_tab:t.tab,asserted_nav:t.nav,flag:fl});return r};
 await P.goto(URL);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.locator('#wbCollect').click({timeout:4000}).catch(()=>{});
 const st=await P.evaluate(()=>{const g=window.eggfarm?.game??window.eggfarm?.g;return g?{canPersist:g.canPersist,storageFailed:g.storageFailed,inactive:g.inactive}:null}).catch(()=>null);
 await P.waitForFunction(T=>[...document.querySelectorAll('body *')].some(e=>e.childElementCount===0&&e.textContent.trim()===T),X.TITLE,{timeout:6000}).catch(()=>{});const a=await step('1-blocked',{fill,gameState:st});
 await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.waitForTimeout(7000);const a2=await step('1b-reload-still-blocked');
 await P.evaluate(v=>{if(v==='mock')sessionStorage.setItem('__qblock','0');else for(const k of Object.keys(localStorage))if(k.startsWith('__q'))localStorage.removeItem(k)},v);
 await P.waitForFunction(T=>[...document.querySelectorAll('body *')].some(e=>e.childElementCount===0&&e.textContent.trim()===T),X.TITLE,{timeout:9000}).catch(()=>{});const b=await step('2-writable');await P.waitForTimeout(3000);
 await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.waitForTimeout(5000);const c=await step('3-reload');
 const F=o=>Object.values(o).includes(true),fl2=await X.flagState(P);
 // canonical (already committed): spec = no card while blocked, card once after writes return (retry, no reload), gone after reload with flag persisted.
 // acdbedc v6: a refused write aborts the migration for the session (game.ts:206/176), so no card until the reload commits it; then once.
 const ok=fname.startsWith('canonical')?{blockedNoCard:!a.card&&a.count===0&&!F(a.flag),reloadBlockedNoCard:!a2.card&&a2.count===0&&!F(a2.flag),writableOnce:b.card&&b.count===1,reloadGone:!c.card&&c.count===1&&F(c.flag)}
  :{blockedNoCard:!a.card&&a.count===0&&!F(a.flag),writableNoCardNoReload:b.count===0,reloadOnce:c.count===1};
 rec({size:sz,variant:v,fixture:fname,fill,gameState:st,blocked:a,blockedReload:a2,writable:b,reload:c,ok,pass:Object.values(ok).every(Boolean)});await cx.close();}}
await br.close();
