// C5b read-only follow-up: (a) migrated v6 under RO -> writable (no reload) -> reload; (b) canonical committed fixture under RO -> writable (no reload, build retries 1 s)
const pw=(await import(process.env.PW||'/tmp/qa-final-ffc3dfd/node_modules/playwright-core/index.mjs')).default;
import { appendFileSync, readFileSync } from 'node:fs';import * as X from './exp-ext.mjs';
const [ENG,OUT]=process.argv.slice(2),URL=process.env.URL;const D=new globalThis.URL('.',import.meta.url).pathname;const V6=readFileSync(D+'../gate5-pr44/fixtures/acdbedc-v6rich.json','utf8');
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
for(const [name,fx] of [['v6-in-session',{ls:{'eggfarm.save':V6}}],['canonical-committed',X.canonical(false)]]){const cx=await br.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await cx.addInitScript(X.INIT);const P=await cx.newPage();
 await X.seed(P,URL,fx,UI,{__ro:'1'});await P.goto(URL);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.locator('#wbCollect').click({timeout:5000}).catch(()=>{});
 const vis=ms=>P.locator('.tracks-exp').waitFor({state:'visible',timeout:ms}).then(()=>true,()=>false);
 const blocked=await vis(4000);const flag0=await X.flagState(P);const committed0=await P.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {tracksV7:s.tracksV7,v6BackupId:s.v6BackupId}}catch{return null}});
 await P.evaluate(()=>sessionStorage.setItem('__ro','0'));const noReload=await vis(6000);let afterReload=null;
 if(!noReload){await P.reload();await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.locator('#wbCollect').click({timeout:5000}).catch(()=>{});afterReload=await vis(6000);}
 const r={engine:ENG,size:'390x844',case:'C5b-readonly-'+name,blocked,flagWhileBlocked:flag0,savedStateWhileBlocked:committed0,shownAfterWritableNoReload:noReload,shownAfterReload:afterReload,count:await X.count(P)};
 r.ok=!blocked&&!Object.values(flag0).includes(true)&&(noReload||afterReload)&&r.count===1;appendFileSync(`${OUT}/exp-final-${ENG}.jsonl`,JSON.stringify(r)+'\n');console.log(JSON.stringify(r));await cx.close();}
await br.close();
