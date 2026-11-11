// QA-owned axe-core run for PR #62 @ 09cee47, m4a-spec v1.25 F4-14a. Chromium, widths from argv (default 360,390,430).
// axe-core 4.14.0 from /tmp/axe/node_modules/axe-core (sha256 recorded in the output). usage: BASE=... node axe62.mjs [w,w,w]
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const pw=(await import((process.env.QA_WT??'/tmp/qa-rc1-5d9efa6')+'/node_modules/playwright-core/index.mjs')).default;
const E='/workspace/egg-farm-studio/qa/m41/rc1-5d9efa6-ui/';import {mkdirSync} from 'node:fs';mkdirSync(E+'shots/axe',{recursive:true});const AXE='/tmp/axe/node_modules/axe-core/axe.min.js';const axeSrc=readFileSync(AXE,'utf8');
const axeSha=createHash('sha256').update(axeSrc).digest('hex');const BASE=process.env.BASE;
const WS=(process.argv[2]??'360,390,430').split(',').map(Number);const CASES=JSON.parse(readFileSync(E+'harness/browser-cases.json','utf8'));
const PICK=['hens-pct-star','hens-nosale-pct-hidden','value-milestone','value-pct-star-27','value-truncated-nostar','collection-star','broke','broke-hens-short','broke-collection','hens-milestone','farm-best','farm-waiting','worker-hire-market-hand','worker-hire-coop-hand','noinc-broke-value','noinc-farm','worker-hire-hawker-waiting','worker-grader-tier','done','collection-star','broke-collection'];
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const out={axe:{path:AXE,version:null,sha256:axeSha},runs:[],negativeControl:[]};let fails=[];
async function open(W){const c=await br.newContext({viewport:{width:W,height:800}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa62')){sessionStorage.setItem('qa62','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(BASE);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!bid?.endsWith('+5d9efa6')||bid!==process.env.QA_BID||/dirty/.test(bid))throw new Error('bid '+bid);
 await p.getByText('Tap to start').click({timeout:60000});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 for(let i=0;i<6;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false))await p.locator('.tracks-exp button').first().click().catch(()=>{});await p.waitForTimeout(200);}
 return {c,p,bid,errs};}
async function prep(p,cs){if(cs.sale)await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,basket:5,coop:0,customers:[{id:9001,demand:5,filled:0,waitedS:0}],nextCustomerInS:1e9};g.dispatch({type:'sellAll'});});
 await p.evaluate(([st,wk,gm])=>{const g=window.eggfarm;g.state={...g.state,...st,tracksV7:1,workers:wk??{},...(gm?{graderTier:g.b.workers.grader.tiers.length}:{}),seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0};window.eggfarmUi.render();},[cs.state,cs.workers??null,!!cs.graderMax]);await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await p.waitForTimeout(200);}
const runAxe=(p,opts)=>p.evaluate(async o=>{const r=await window.axe.run(document,o);const m=x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>({target:n.target.join(' '),summary:n.failureSummary}))});
 return {violations:r.violations.map(m),passes:r.passes.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target.join(' '))})),incomplete:r.incomplete.map(m),inapplicable:r.inapplicable.map(x=>x.id)};},opts);
for(const W of WS)for(const name of PICK){const cs=CASES[name];const {c,p,bid,errs}=await open(W);await prep(p,cs);
 await p.evaluate(axeSrc);out.axe.version=await p.evaluate(()=>window.axe.version);
 const st=await p.evaluate(()=>{const b=document.querySelector('#goal');return {label:b.querySelector('.goal-label').textContent,status:b.querySelector('.goal-status').textContent,ariaLabel:b.getAttribute('aria-label'),describedby:b.getAttribute('aria-describedby'),sheetOpen:!!document.querySelector('.sheet.open')};});
 const lin=await runAxe(p,{runOnly:{type:'rule',values:['label-content-name-mismatch']}});
 const linGoal={violations:lin.violations.filter(v=>v.nodes.some(n=>n.target.includes('#goal'))),pass:lin.passes.some(x=>x.targets.includes('#goal')),inapplicable:lin.inapplicable.includes('label-content-name-mismatch'),allViolations:lin.violations};
 const full=await runAxe(p,{});const fullExp=await runAxe(p,{rules:{'label-content-name-mismatch':{enabled:true}}});
 const shotF=`shots/axe/axe-${name}-w${W}.png`;await p.screenshot({path:E+shotF});
 const rec={w:W,case:name,build_id:bid,strip:st,labelInName:linGoal,fullDefault:{violations:full.violations,incomplete:full.incomplete.map(x=>x.id)},fullWithExperimental:{violations:fullExp.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))},shot:shotF,pageerrors:errs};
 out.runs.push(rec);if(lin.violations.length)fails.push(`${W} ${name}: label-in-name ${JSON.stringify(lin.violations)}`);
 console.log(W,name,JSON.stringify(st.label),'LIN viol',lin.violations.length,'goalPass',linGoal.pass,'inapplicable',linGoal.inapplicable,'| full viol',full.violations.map(v=>v.id+':'+v.nodes.length).join(','),'| +exp',fullExp.violations.map(v=>v.id).join(','));await c.close();}
// Negative control: re-apply fcf9823's pattern (aria-label = the F4-14 sentence) on a live F4 strip; the rule must flag it.
for(const W of WS){const {c,p}=await open(W);await prep(p,CASES['hens-pct-star']);await p.evaluate(axeSrc);
 await p.evaluate(()=>{const b=document.querySelector('#goal');window.eggfarmUi.render=()=>{};b.setAttribute('aria-label','Next goal: best buy, Hens level 1, plus 20 percent income. Ready now.');b.removeAttribute('aria-describedby');});
 const r=await runAxe(p,{runOnly:{type:'rule',values:['label-content-name-mismatch']}});const hit=r.violations.some(v=>v.nodes.some(n=>n.target.includes('#goal')));
 out.negativeControl.push({w:W,flagged:hit,violations:r.violations});if(!hit)fails.push(`${W}: negative control NOT flagged (rule not live)`);console.log(W,'negative control flagged:',hit);await c.close();}
await br.close();out.fails=fails;writeFileSync(E+'axe/axe-results.json',JSON.stringify(out,null,1));console.log('axe',out.axe.version,axeSha,'fails',fails.length,JSON.stringify(fails));
