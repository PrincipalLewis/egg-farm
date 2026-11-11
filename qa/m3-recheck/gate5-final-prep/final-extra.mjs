// flag-off absence (Latest dd52bfd, M4 off, balance m4.enabled=0) + Settings build label on the final SHA. node final-extra.mjs <engine> <outdir>
const pw=(await import('/tmp/qa-final-c11e3a0/node_modules/playwright-core/index.mjs')).default;
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';import * as X from './exp-ext.mjs';
const [ENG,OUT]=process.argv.slice(2);const D=new globalThis.URL('.',import.meta.url).pathname;const V6=readFileSync(D+'../gate5-pr44/fixtures/acdbedc-v6rich.json','utf8');
const OFF='http://127.0.0.1:4803/',FIN='http://127.0.0.1:4799/',LABEL='m3-rc1-pre+c11e3a0';const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
mkdirSync(`${OUT}/${ENG}`,{recursive:true});const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
const put=(o)=>appendFileSync(`${OUT}/entries-${ENG}.jsonl`,JSON.stringify(o)+'\n'),rec=o=>{appendFileSync(`${OUT}/final-extra-${ENG}.jsonl`,JSON.stringify({engine:ENG,...o})+'\n');console.log(JSON.stringify(o).slice(0,300))};
for(const [w,h] of [[390,844],[1280,800]])for(const [name,fx] of [['acdbedc-v6',{ls:{'eggfarm.save':V6}}],['canonical-committed-unseen',X.canonical(false)]]){
 const cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});await cx.addInitScript(X.INIT);const P=await cx.newPage();await X.seed(P,OFF,fx,UI,{});await P.goto(OFF);
 const bid=await P.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.locator('#wbCollect').click({timeout:5000}).catch(()=>{});
 const card=await P.waitForFunction(T=>[...document.querySelectorAll('body *')].some(e=>e.childElementCount===0&&e.textContent.trim()===T),X.TITLE,{timeout:6000}).then(()=>true,()=>false);
 const file=`${ENG}/flagoff-dd52bfd-${name}-${w}x${h}.png`;await P.screenshot({path:`${OUT}/${file}`});
 put({file,engine:ENG,size:`${w}x${h}`,docked:w>=960,save:name,seed:null,group:'exp1-flagoff',state:`EXP-d flag off (build ${bid}, M4 off) · explainer ${card?'PRESENT · ASSERT-FAIL':'absent'}`,asserted_tab:null,asserted_panel:'farm',build:bid,ext_assert_ok:!card});
 rec({case:'flagoff',size:`${w}x${h}`,save:name,build:bid,card,count:await X.count(P),ok:!card&&bid==='m3-rc1-pre+dd52bfd'});await cx.close();}
{const cx=await br.newContext({viewport:{width:390,height:844}});const P=await cx.newPage();await P.goto(FIN+'favicon.ico').catch(()=>{});await P.evaluate(u=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u))},UI);await P.goto(FIN);
 const bid=await P.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.waitForTimeout(800);await P.locator('#settings').click();
 const lab=await P.waitForFunction(l=>[...document.querySelectorAll('.version')].map(e=>e.textContent).find(t=>t.includes(l))||false,LABEL,{timeout:4000}).then(h=>h.jsonValue(),()=>null);
 const file=`${ENG}/settings-label-390x844.png`;await P.screenshot({path:`${OUT}/${file}`});put({file,engine:ENG,size:'390x844',docked:false,save:'fresh',seed:null,group:'settings',state:`settings · build label ${LABEL}${lab?'':' · ASSERT-FAIL'}`,asserted_tab:null,asserted_panel:'settings',runtime_build_id:bid,label_text:lab});
 rec({case:'settings-label',runtimeBuildId:bid,label:lab,ok:!!lab&&bid===LABEL});await cx.close();}
await br.close();
