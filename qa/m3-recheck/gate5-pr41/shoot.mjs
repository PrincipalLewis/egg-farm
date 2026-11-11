// Gate 5 M4-on shot set. node shoot.mjs <engine> <outdir>
// env: SHA (full 40), URL (served build, never :4173), PUSHED (1/0), SIZES/STATES (csv filters, optional)
import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { mkdirSync, appendFileSync, readFileSync } from 'node:fs';
const [ENG,OUT]=process.argv.slice(2);const SHA=process.env.SHA,URL=process.env.URL;
if(!/^[0-9a-f]{40}$/.test(SHA||''))throw new Error('SHA must be 40 hex');if(!URL||/:4173\b/.test(URL))throw new Error('bad URL');
const SHA7=SHA.slice(0,7),LABEL=`m3-rc1-pre+${SHA7}`,D=new globalThis.URL('.',import.meta.url).pathname;
mkdirSync(`${OUT}/${ENG}`,{recursive:true});const ENT=`${OUT}/entries-${ENG}.jsonl`,LOG=`${OUT}/run-${ENG}.log`;
const log=s=>{appendFileSync(LOG,s+'\n');console.log(s)};
import { STATES, loadState } from './lib.mjs';
globalThis.__URL=URL;
const SIZES={'360x800':[360,800],'375x800':[375,800],'390x844':[390,844],'1280x800':[1280,800]};
const pick=(o,e)=>e?Object.fromEntries(Object.entries(o).filter(([k])=>e.split(',').includes(k))):o;
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[ENG].launch();
let n=0,bad=0;const skipped=[];
for(const [sz,[w,h]] of Object.entries(pick(SIZES,process.env.SIZES))){
 const docked=w>=960&&w>h;
 for(const [stName,st] of Object.entries(pick(STATES,process.env.STATES)).filter(([k])=>k!=='pl1')){
  const c=await br.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});const p=await c.newPage();const cons=[];
  p.on('console',m=>{if(m.type()==='error'){cons.push(m.text());appendFileSync(LOG,'CONSOLE '+sz+' '+stName+' '+m.text().slice(0,200)+'\n')}});p.on('pageerror',e=>cons.push('pageerror '+e.message));
  const saveDesc=await loadState(p,stName);
  const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);
  if(bid!==LABEL){log(`ABORT build-id ${bid} != ${LABEL}`);process.exit(4);}
  await p.getByText('Skip',{exact:true}).first().click({timeout:1500}).catch(()=>{});
  await p.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
  const measure=root=>p.evaluate(sel=>{const R=document.querySelector(sel)||document.body;const de=document.documentElement;
   const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
   const btns=[...R.querySelectorAll('button,[role=tab]')].filter(vis);
   const small=btns.map(b=>{const r=b.getBoundingClientRect();return {t:(b.getAttribute('aria-label')||b.innerText).trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w<44||x.h<44);
   const clip=[...R.querySelectorAll('*')].filter(e=>vis(e)&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX!=='visible'&&!e.matches('.egg,.fx li,.fx li *,.sr')).map(e=>(e.className||e.tagName)+'').slice(0,10);
   const txt=R.innerText;return {docOverflow:de.scrollWidth>de.clientWidth,small,clip,badText:/NaN|undefined|1000[KMB]\b/.test(txt),hud:document.querySelector('#coins')?.textContent}},root);
  const shoot=async(screen,assertFn,root,extra='')=>{
   const ok=await assertFn().then(()=>true,e=>{log(`ASSERT-FAIL ${ENG} ${sz} ${stName} ${screen}: ${e.message.split('\n')[0]}`);return false});
   if(!ok){bad++;return;}
   const m=await measure(root);const file=`${ENG}/${stName}-${screen}-${sz}.png`;await p.screenshot({path:`${OUT}/${file}`});n++;
   const tab=screen.startsWith('upgrades-')?screen.split('-')[1]:null;
   appendFileSync(ENT,JSON.stringify({file,engine:ENG,size:sz,docked,save:saveDesc,seed:null,state:`${stName} · ${screen}${extra} · animations paused`,asserted_tab:tab,asserted_panel:screen.split('-')[0],checks:m,console_errors:cons.length})+'\n');
   if(m.docOverflow||m.badText)log(`BAD ${file} ${JSON.stringify(m)}`);};
  const openNav=async x=>{if(docked)return;await p.keyboard.press('Escape');if(x)await p.locator(`[data-nav=${x}]`).click();await p.waitForTimeout(300);};
  const vis=sel=>p.waitForFunction(s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'},sel,{timeout:4000});
  // migrated: explainer frames (absent on pre-#41 builds -> skipped gracefully)
  if(stName==='migrated-acdbedc'){const ex=p.getByText(/got an upgrade/i).first();
   if(await ex.isVisible({timeout:1500}).catch(()=>false)){await shoot('explainer',async()=>{await ex.waitFor()},'body',' · explainer showing');
    await p.getByRole('button',{name:/Got it/}).click().catch(()=>{});await p.waitForTimeout(400);await shoot('explainer-dismissed',async()=>{if(await ex.isVisible())throw new Error('still visible')},'body',' · after Got it');}
   else skipped.push(`${ENG} ${sz} migrated explainer frames: explainer not present on this build`);}
  await openNav(null);await shoot('farm',async()=>{await vis('#coins');await vis('#scene');if(!docked&&await p.locator('.panel-layer.open, #p-upgrades:not([hidden])').count())throw new Error('a sheet is open')},'body');
  await openNav('market');await shoot('market',async()=>{await vis('#p-market');await vis('#sellAll');if(!docked)await p.waitForFunction(()=>document.querySelector('[data-nav=market]').classList.contains('on'))},'#p-market');
  const CARD={collection:'Collect per tap',farm:'Farm level',workers:null};
  for(const t of ['collection','farm','workers']){await openNav('upgrades');if(!docked&&!(await p.locator('[data-tab=farm]').isVisible()))await p.locator('[data-nav=upgrades]').click();
   await p.locator(`[data-tab=${t}]`).click();await p.waitForTimeout(250);
   const assertTab=async()=>{await p.waitForFunction(x=>document.querySelector(`[data-tab=${x}]`).classList.contains('active'),t,{timeout:3000});await p.waitForFunction(h=>{const u=document.querySelector('#uRow');if(!u||!u.getBoundingClientRect().width)return false;const hs=[...u.querySelectorAll('h3')].map(x=>x.textContent);return h?hs.includes(h):(!hs.includes('Farm level')&&!hs.includes('Collect per tap')&&!!u.querySelector('[data-w],[data-act],.worker,h3'))},CARD[t],{timeout:3000})};
   await shoot(`upgrades-${t}`,assertTab,'#p-upgrades');
   if(t==='farm'){if(await p.locator('#uRow [data-kind=hens]').count()){await p.locator('#uRow [data-kind=hens]').first().scrollIntoViewIfNeeded();
     await shoot('upgrades-farm-tracks',async()=>{await assertTab();await vis('#uRow [data-kind=hens]');await vis('#uRow [data-kind=eggValue]')},'#p-upgrades',' · M4 tracks block');}
    else skipped.push(`${ENG} ${sz} ${stName} upgrades-farm-tracks: M4 track rows absent (m4.enabled=0)`);}}
  await openNav(null);await p.locator('#settings').click();await shoot('settings',async()=>{await p.waitForFunction(l=>[...document.querySelectorAll('.modal.open .version, #modal-layer .version, .version')].some(e=>e.textContent.includes(l)),LABEL,{timeout:3000})},'body',` · build label ${LABEL}`);
  await c.close();}}
await br.close();appendFileSync(`${OUT}/skipped-${ENG}.txt`,skipped.join('\n')+(skipped.length?'\n':''));log(`DONE ${ENG} shots=${n} assertFail=${bad} skipped=${skipped.length}`);
