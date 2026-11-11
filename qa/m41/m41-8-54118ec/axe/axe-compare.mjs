// QA-owned: label-content-name-mismatch on #goal for F4 vs non-F4 strip targets, same cases on 54118ec, fcf9823 and base dd223f5
// (pre-existence check for the non-F4 aria-label path). Chromium 360. usage: BASE=... BID=<suffix> node axe-compare.mjs
import {readFileSync,appendFileSync} from 'node:fs';
const pw=(await import('/tmp/qa-m41-8-54118ec/node_modules/playwright-core/index.mjs')).default;
const E='/workspace/egg-farm-studio/qa/m41/m41-8-54118ec/';const axeSrc=readFileSync('/tmp/axe/node_modules/axe-core/axe.min.js','utf8');const BASE=process.env.BASE,BID=process.env.BID;
const CASES=JSON.parse(readFileSync(E+'harness/browser-cases.json','utf8'));
const LIST=[['fresh-save',null],['farm-best',CASES['farm-best']],['farm-waiting',{...CASES['farm-best'],state:{...CASES['farm-best'].state,coinsCents:5000}}],['hens-pct-star',CASES['hens-pct-star']],['broke-hens-short',CASES['broke-hens-short']]];
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const [name,cs] of LIST){const c=await br.newContext({viewport:{width:360,height:800}});const p=await c.newPage();
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa62')){sessionStorage.setItem('qa62','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(BASE);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!bid.endsWith('+'+BID))throw new Error(bid);
 await p.getByText('Tap to start').click({timeout:60000});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi);
 for(let i=0;i<6;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false))await p.locator('.tracks-exp button').first().click().catch(()=>{});await p.waitForTimeout(200);}
 if(cs){if(cs.sale)await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,basket:5,coop:0,customers:[{id:9001,demand:5,filled:0,waitedS:0}],nextCustomerInS:1e9};g.dispatch({type:'sellAll'});});
  await p.evaluate(st=>{const g=window.eggfarm;g.state={...g.state,...st,tracksV7:1,workers:{},seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0};window.eggfarmUi.render();},cs.state);}
 await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await p.waitForTimeout(200);await p.evaluate(axeSrc);
 const st=await p.evaluate(()=>{const b=document.querySelector('#goal');return {label:b.querySelector('.goal-label').textContent,status:b.querySelector('.goal-status').textContent,ariaLabel:b.getAttribute('aria-label'),describedby:b.getAttribute('aria-describedby')};});
 const r=await p.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'rule',values:['label-content-name-mismatch']}});return {v:r.violations.flatMap(x=>x.nodes.map(n=>n.target.join(' '))),pass:r.passes.flatMap(x=>x.nodes.map(n=>n.target.join(' '))),inapp:r.inapplicable.length>0};});
 const shotF=`shots/chromium/axecmp-${BID}-${name}-w360.png`;await p.screenshot({path:E+shotF});
 const rec={build_id:bid,case:name,...st,goalViolation:r.v.includes('#goal'),violations:r.v,passes:r.pass,inapplicable:r.inapp,shot:shotF};appendFileSync(E+'axe/axe-compare.jsonl',JSON.stringify(rec)+'\n');console.log(JSON.stringify(rec));await c.close();}
await br.close();
