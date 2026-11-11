// QA-owned probe for PR #62 @ fcf9823 (M41-8 F4 strip label + UX-M4 ★ Best buy chip). Own cases (harness/browser-cases.json,
// computed from the game's pure functions on shipped data). usage: node p62.mjs <engine> <width>   BASE=http://127.0.0.1:<port>/
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=(await import('/tmp/qa-m41-8-fcf9823/node_modules/playwright-core/index.mjs')).default;
const [ENG,W]=[process.argv[2],+process.argv[3]];const H=800;const BASE=process.env.BASE;const BID='m3-rc1-pre+fcf9823';const SHA='fcf98235545359c56313235a31d73ff3bd3154a1';
const E='/workspace/egg-farm-studio/qa/m41/m41-8-fcf9823/';mkdirSync(`${E}shots/${ENG}`,{recursive:true});
const CASES=JSON.parse(readFileSync(E+'harness/browser-cases.json','utf8'));
const MAN=`${E}browser/entries-${ENG}-${W}.jsonl`;writeFileSync(MAN,'');
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('FAIL',m)}return c};const sp=s=>s?.replace(/\u00a0/g,' ');
async function open(){const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa62')){sessionStorage.setItem('qa62','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(BASE);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!ok(bid===BID,`runtime build-id ${bid}`))throw new Error('bid');
 await p.getByText('Tap to start').click({timeout:60000});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 for(let i=0;i<6;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false))await p.locator('.tracks-exp button').first().click().catch(()=>{});await p.waitForTimeout(200);}
 return {c,p,errs,bid};}
const setState=(p,st)=>p.evaluate(st=>{const g=window.eggfarm;g.state={...g.state,...st,tracksV7:1,workers:{},seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0};window.eggfarmUi.render();},st);
const strip=p=>p.evaluate(()=>{const b=document.querySelector('#goal'),pill=b.querySelector('.goal-pill').getBoundingClientRect(),l=b.querySelector('.goal-label');const R=e=>e.getBoundingClientRect();
 const sp=k=>{const e=l.querySelector(k);if(!e)return null;const r=R(e);return {text:e.textContent,sw:e.scrollWidth,cw:e.clientWidth,ellipsis:getComputedStyle(e).textOverflow,inPill:r.left>=pill.left-0.5&&r.right<=pill.right+0.5,inLabel:r.right<=R(l).right+0.5}};
 const bb=R(b);return {hidden:b.hidden,visible:bb.height>0&&bb.top>=0&&bb.bottom<=innerHeight,text:l.textContent,ng:l.classList.contains('ng'),aria:b.getAttribute('aria-label'),label:{sw:l.scrollWidth,cw:l.clientWidth},btnH:bb.height,btnW:bb.width,
  star:sp('.ng-star'),name:sp('.ng-name'),lv:sp('.ng-lv'),sfx:sp('.ng-sfx'),sheetOpen:!!document.querySelector('.sheet.open,[data-open=upgrades]')}});
async function openTab(p,tab){if(!await p.locator(`[data-tab=${tab}]`).isVisible().catch(()=>false))await p.locator('[data-nav=upgrades]').click({timeout:8000});await p.locator(`[data-tab=${tab}]`).click({timeout:5000});await p.waitForTimeout(500);}
async function assertTab(p,tab){const t=await p.evaluate(()=>[...document.querySelectorAll('[role=tab],.tabs button')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').map(e=>e.dataset.tab));ok(t.length>=1&&t.every(x=>x===tab),`active tab ${t} != ${tab}`);return t[0];}
const chipInfo=p=>p.evaluate(()=>{const cs=[...document.querySelectorAll('.best-chip')];const c=cs[0];const row=c?.closest('.up');const R=e=>e.getBoundingClientRect();
 const buys=[...document.querySelectorAll('.up button.buy')].filter(b=>R(b).height>0).map(b=>({h:R(b).height,w:R(b).width,kind:b.dataset.kind}));
 const tabs=[...document.querySelectorAll('.tabs button')].map(b=>R(b).height);
 return {count:cs.length,key:c?.dataset.bestBuy??null,text:c?.textContent??null,sw:c?.scrollWidth,cw:c?.clientWidth,h:c?R(c).height:null,inRow:c?R(c).right<=R(row).right+0.5&&R(c).left>=R(row).left-0.5:null,visible:c?R(c).top>=0&&R(c).bottom<=innerHeight:null,
  starAriaHidden:c?.querySelector('span')?.getAttribute('aria-hidden')??null,bg:c?getComputedStyle(c).backgroundColor:null,color:c?getComputedStyle(c).color:null,
  rowKind:row?.dataset.track??row?.querySelector('h3')?.textContent??null,rowBest:row?.classList.contains('best')??null,rowLocked:!!row?.querySelector('.lock,.maxed'),
  bestRows:[...document.querySelectorAll('.up.best')].map(r=>r.dataset.track??r.querySelector('h3')?.textContent),buys,tabs,docOverflow:document.documentElement.scrollWidth>innerWidth}});
async function shot(p,name){const f=`shots/${ENG}/${name}-w${W}.png`;await p.screenshot({path:E+f});return f;}
const KEYROW={FARM:'Farm level',HENS:'hens',VALUE:'eggValue',COLL:'Collect per tap'};
for(const [name,cs] of Object.entries(CASES)){try{const {c,p,errs}=await open();await setState(p,cs.state);await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await p.waitForTimeout(200);
 const s=await strip(p);const f1=await shot(p,`${name}-strip`);
 ok(sp(s.text)===cs.label,`${name}: strip "${sp(s.text)}" != "${cs.label}"`);ok(s.aria.startsWith(cs.ariaHead),`${name}: aria "${s.aria}" !^ "${cs.ariaHead}"`);
 ok(s.label.sw<=s.label.cw,`${name}: label clip ${s.label.sw}/${s.label.cw}`);for(const k of ['lv','sfx','star'])if(s[k])ok(s[k].sw<=s[k].cw&&s[k].inPill&&s[k].inLabel&&s[k].ellipsis!=='ellipsis',`${name}: ${k} cut ${JSON.stringify(s[k])}`);
 if(s.name)ok(s.name.sw<=s.name.cw,`${name}: name ellipsised ${JSON.stringify(s.name)}`);ok(s.btnH>=44,`${name}: #goal height ${s.btnH}`);ok([...(s.text||'')].length<=27,`${name}: >27`);ok(!/unlocks/.test(s.text+s.aria),`${name}: Farm-unlock variant`);
 const tab=cs.tab==='collection'?'collection':'farm';await openTab(p,tab);await p.evaluate(()=>(document.querySelector('.best-chip')??document.querySelector('.up'))?.scrollIntoView({block:'center'}));await p.waitForTimeout(300);
 const t=await assertTab(p,tab);const ch=await chipInfo(p);const f2=await shot(p,`${name}-chip`);
 if(cs.chip){ok(ch.count===1&&ch.key===cs.chip,`${name}: chip ${ch.count} ${ch.key} != ${cs.chip}`);ok(ch.sw<=ch.cw&&ch.inRow&&ch.visible,`${name}: chip clip ${JSON.stringify(ch)}`);ok(ch.text==='★ Best buy'&&ch.starAriaHidden==='true',`${name}: chip text ${ch.text}`);ok(!ch.rowLocked,`${name}: chip on locked row`);
  if(cs.chip!=='COLL'&&cs.chip!=='FARM')ok(ch.rowKind===KEYROW[cs.chip],`${name}: chip row ${ch.rowKind}`);ok(ch.rowBest!==false||tab==='collection',`${name}: chip row not the highlighted .best row (${JSON.stringify(ch.bestRows)})`);}
 else ok(ch.count===0,`${name}: chip present when none expected (${ch.key})`);
 for(const bt of ch.buys)ok(bt.h>=44,`${name}: buy ${bt.kind} h=${bt.h}`);ok(!ch.docOverflow,`${name}: page overflow-x`);
 appendFileSync(MAN,JSON.stringify({sha:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:name,expected:cs,strip:s,asserted_tab:t,chip:ch,shots:[f1,f2],pageerrors:errs})+'\n');await c.close();}catch(e){ok(false,`${name} threw ${e.message.slice(0,200)}`);for(const x of br.contexts())await x.close().catch(()=>{});}}
// F4-17 worst cases injected into the LIVE strip with the PR's markup (goalLabelHtml shape); unreachable on shipped data.
try{const {c,p}=await open();await setState(p,CASES['value-pct-star-27'].state);await p.waitForTimeout(1400);const NB='\u00a0';
 const WORST=[['★ ','Egg value',55,`${NB}·${NB}+999% income`],['★ ','Egg value',30,`${NB}·${NB}+<1% income`],['★ ','Hens',30,': bigger coop'],['★ ','Egg value',20,': Jumbo'],['★ ','Collection',30,': +5/tap']];
 for(const [i,[st,nm,n,sf]] of WORST.entries()){await p.evaluate(([st,nm,n,sf])=>{const l=document.querySelector('#goal .goal-label');l.className='goal-label ng';l.dataset.html='qa';l.innerHTML=`<span class="ng-star" aria-hidden="true">${st}</span><span class="ng-name">${nm}</span><span class="ng-lv">\u00a0L${n}</span><span class="ng-sfx">${sf.replace('<','&lt;')}</span>`;},[st,nm,n,sf]);
  const s=await strip(p);const f=await shot(p,`worst${i+1}-strip`);const lbl=sp(st+nm+' L'+n+sf);
  ok(s.sfx.sw<=s.sfx.cw&&s.sfx.inPill&&s.sfx.inLabel&&s.lv.sw<=s.lv.cw&&s.lv.inPill&&s.lv.inLabel,`F4-17 "${lbl}" suffix/level cut ${JSON.stringify([s.lv,s.sfx])}`);
  appendFileSync(MAN,JSON.stringify({sha:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:`F4-17-worst-${i+1}`,label:lbl,strip:s,shots:[f],note:'injected into live #goal .goal-label (render paused by stopping state changes; the strip re-renders only on 1 Hz tick when key changes)'})+'\n');}
 await c.close();}catch(e){ok(false,`worst threw ${e.message.slice(0,200)}`);}
// ★ vs chip lag repro: broke Hens pick, then coins become exactly its cost WITHOUT a purchase (e.g. sales / wages / offline credit).
try{const {c,p}=await open();const cs=CASES['broke-hens-short'];await setState(p,cs.state);await p.waitForTimeout(1400);await openTab(p,'farm');
 await p.evaluate(cost=>{const g=window.eggfarm;g.state={...g.state,coinsCents:cost};window.eggfarmUi.render();},cs.hint.costCents);await p.waitForTimeout(60);
 const a=await strip(p),ac=await chipInfo(p);const fa=await shot(p,'lag-t0');await p.waitForTimeout(1300);await p.evaluate(()=>window.eggfarmUi.render());const b2=await strip(p),bc=await chipInfo(p);const fb=await shot(p,'lag-t1300');
 appendFileSync(MAN,JSON.stringify({sha:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:'star-chip-lag',t60:{strip:a.text&&sp(a.text),aria:a.aria,chip:ac.key},t1300:{strip:sp(b2.text),aria:b2.aria,chip:bc.key},shots:[fa,fb]})+'\n');
 console.log('lag',JSON.stringify({t60:[sp(a.text),ac.key],t1300:[sp(b2.text),bc.key]}));await c.close();}catch(e){console.log('lag threw',e.message.slice(0,200));}
await br.close();console.log(`done ${ENG} ${W} fails=${fails.length}`);appendFileSync(MAN,JSON.stringify({done:true,fails})+'\n');
