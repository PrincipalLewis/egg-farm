// Does the v1.15 explainer card cover .sheet .close? (Saves: Firefox rc0 bug9 timed out on '.sheet .close'.)  node exp-sheet.mjs <engine> <outdir>
const pw=(await import(process.env.PW||'/tmp/qa-final-ffc3dfd/node_modules/playwright-core/index.mjs')).default;
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';import * as X from './exp-ext.mjs';
const [ENG,OUT]=process.argv.slice(2),URL=process.env.URL;const D=new globalThis.URL('.',import.meta.url).pathname;const V6=readFileSync(D+'../gate5-pr44/fixtures/acdbedc-v6rich.json','utf8');
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};mkdirSync(`${OUT}/${ENG}`,{recursive:true});
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
for(const [w,h] of [[360,800],[390,844],[1280,800],[360,640],[375,812],[375,600]])for(const sheet of ['upgrades','market'])for(const how of ['click','Escape']){
 const cx=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});await cx.addInitScript(X.INIT);const P=await cx.newPage();
 await X.seed(P,URL,{ls:{'eggfarm.save':V6}},UI,{});await P.goto(URL);await P.getByText('Tap to start').click({timeout:30000}).catch(()=>{});await P.locator('#wbCollect').click({timeout:6000}).catch(()=>{});
 const card=await P.locator('.tracks-exp').waitFor({state:'visible',timeout:6000}).then(()=>true,()=>false);const r={engine:ENG,size:`${w}x${h}`,sheet,how,card};
 await P.locator(`[data-nav=${sheet}]`).click({timeout:3000}).catch(e=>r.navErr=String(e).slice(0,100));await P.waitForTimeout(400);
 r.cardStillOpen=await P.locator('.tracks-exp').isVisible().catch(()=>false);
 const g=await P.evaluate(s=>{const cl=document.querySelector(`#p-${s}:not([hidden]) .close`);const c=document.querySelector('.tracks-exp');if(!cl)return {close:null};const a=cl.getBoundingClientRect();const vis=a.width>0&&getComputedStyle(cl).display!=='none';
  const b=c?.getBoundingClientRect();const ov=b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):0;
  const hit=vis?document.elementFromPoint(a.left+a.width/2,a.top+a.height/2):null;return {close:{l:a.left,t:a.top,r:a.right,b:a.bottom,visible:vis},card:b?{l:b.left,t:b.top,r:b.right,b:b.bottom}:null,overlapPx2:Math.round(ov),hitIsClose:!!hit&&cl.contains(hit),hitEl:hit?(hit.className||hit.tagName)+'':null}},sheet);
 Object.assign(r,g);await P.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));const file=`${ENG}/sheetclose-${sheet}-${how}-${w}x${h}.png`;await P.screenshot({path:`${OUT}/${file}`});r.shot=file;await P.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
 const sheetOpen=()=>P.evaluate(s=>{const e=document.querySelector('#p-'+s);return !!e&&!e.hidden&&e.getBoundingClientRect().width>0},sheet);r.sheetOpenBefore=await sheetOpen();
 if(how==='click'){if(g.close?.visible)r.clickErr=await P.locator(`#p-${sheet}:not([hidden]) .close`).click({timeout:3000}).then(()=>null,e=>String(e).split('\n')[0].slice(0,160));}
 else{const cardBefore=await P.locator('.tracks-exp').isVisible().catch(()=>false);await P.keyboard.press('Escape');await P.waitForTimeout(250);r.esc1={cardClosed:cardBefore&&!(await P.locator('.tracks-exp').isVisible().catch(()=>false)),sheetStillOpen:await sheetOpen()};if(r.esc1.sheetStillOpen){await P.keyboard.press('Escape');}}
 await P.waitForTimeout(350);r.sheetOpenAfter=await sheetOpen();
 r.applicable=w<960;r.gStrict=r.overlapPx2===0;r.functional=!!r.hitIsClose&&!r.sheetOpenAfter&&!r.clickErr;r.ok=!r.applicable||(r.gStrict&&r.functional);appendFileSync(`${OUT}/exp-sheetclose-${ENG}.jsonl`,JSON.stringify(r)+'\n');console.log(JSON.stringify(r).slice(0,420));await cx.close();}
await br.close();
