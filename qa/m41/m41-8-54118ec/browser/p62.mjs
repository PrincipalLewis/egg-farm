// QA-owned probe for PR #62 @ 54118ec (M41-8 F4 strip label + UX-M4 ★ Best buy chip), updated for m4a-spec v1.25.
// Derived from qa/m41/m41-8-fcf9823/browser/p62.mjs. Changes for v1.25:
//  - no aria-label reads: accessible NAME and DESCRIPTION are computed by the browser (Chromium: CDP Accessibility.getPartialAXTree;
//    every engine: Playwright ariaSnapshot for the name). FF/WK description = Playwright's accname via locator._expect (info).
//  - CCR M1 / F4-11: % is hidden while income/s = 0, so cases that need the % record ONE real sale first (sellAll on a seeded order).
//  - level + suffix now sit in .ng-tail (inline children), so the no-cut check measures .ng-tail and the lv/sfx rects.
//  - F4-13a timing cases (star-chip-lag, flip-sale, flip-direct, reverse-drop) sample every MutationObserver batch and every rAF frame.
// usage: node p62.mjs <engine> <width>   BASE=http://127.0.0.1:<port>/
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const pw=(await import('/tmp/qa-m41-8-54118ec/node_modules/playwright-core/index.mjs')).default;
const [ENG,W]=[process.argv[2],+process.argv[3]];const H=800;const BASE=process.env.BASE;const SHA='54118ecea55af3ed2f00f987b2e8fadc98b16dbd';
const E='/workspace/egg-farm-studio/qa/m41/m41-8-54118ec/';mkdirSync(`${E}shots/${ENG}`,{recursive:true});
const CASES=JSON.parse(readFileSync(E+'harness/browser-cases.json','utf8'));
const ONLY=(process.env.ONLY??'').split(',').filter(Boolean);const want=n=>!ONLY.length||ONLY.includes(n);
const MAN=`${E}browser/entries-${ENG}-${W}.jsonl`;writeFileSync(MAN,'');
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('FAIL',m)}return c};const sp=s=>s?.replace(/\u00a0/g,' ');const ws=s=>(s??'').replace(/[\s\u00a0]+/g,' ').trim();
let BID=null;
async function open(){const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa62')){sessionStorage.setItem('qa62','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(BASE);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);
 if(!ok(typeof bid==='string'&&bid.endsWith('+54118ec')&&!/dirty/.test(bid),`runtime build-id ${bid}`))throw new Error('bid');BID=bid;
 await p.getByText('Tap to start').click({timeout:60000});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 for(let i=0;i<6;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});if(await p.locator('.tracks-exp button').first().isVisible().catch(()=>false))await p.locator('.tracks-exp button').first().click().catch(()=>{});await p.waitForTimeout(200);}
 let cdp=null;if(ENG==='chromium'){cdp=await c.newCDPSession(p);await cdp.send('DOM.enable');await cdp.send('Accessibility.enable');}
 return {c,p,errs,bid,cdp};}
const setState=(p,st)=>p.evaluate(st=>{const g=window.eggfarm;g.state={...g.state,...st,tracksV7:1,workers:{},seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0};window.eggfarmUi.render();},st);
// ONE real sale through the game (sellAll on a seeded order) so the strip's rolling income/s > 0 (F4-11 / CCR M1).
async function recordSale(p){const r=await p.evaluate(()=>{const g=window.eggfarm;const c0=g.state.coinsCents;g.state={...g.state,basket:5,coop:0,customers:[{id:9001,demand:5,filled:0,waitedS:0}],nextCustomerInS:1e9};
 let sold=0;const off=g.on?.(e=>{if(e.type==='sell')sold+=e.value;});g.dispatch({type:'sellAll'});if(typeof off==='function')off();return {sold,dc:g.state.coinsCents-c0};});
 ok(r.dc>0,`recordSale: no coins from sale ${JSON.stringify(r)}`);return r;}
// Browser-computed accessible name + description of #goal.
async function acc(p,cdp){const snap=await p.locator('#goal').ariaSnapshot();const pwName=snap.match(/^- '?button "((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g,'"')??null; // YAML may single-quote the line when the name has ': '
 let cdpName=null,cdpDesc=null,descSrc=null;
 if(cdp){const {root}=await cdp.send('DOM.getDocument',{depth:0});const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#goal'});
  const {nodes}=await cdp.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false});const n=nodes.find(x=>x.role?.value==='button')??nodes[0];
  cdpName=n?.name?.value??null;cdpDesc=n?.description?.value??null;descSrc=n?.description?.sources?.map?.(s=>s.type)??null;
  const props=n?.properties?.map(x=>x.name);if(!descSrc)descSrc=props;}
 return {snap,pwName,cdpName,cdpDesc,descSrc};}
async function pwDesc(p,expected){try{const r=await p.locator('#goal')._expect('to.have.accessible.description',{expectedText:[{string:expected,normalizeWhiteSpace:true}],isNot:false,timeout:500});return r.matches;}catch(e){return 'err:'+e.message.slice(0,80);}}
const strip=p=>p.evaluate(()=>{const b=document.querySelector('#goal'),pill=b.querySelector('.goal-pill').getBoundingClientRect(),l=b.querySelector('.goal-label');const R=e=>e.getBoundingClientRect();
 const sp=k=>{const e=l.querySelector(k);if(!e)return null;const r=R(e);return {text:e.textContent,sw:e.scrollWidth,cw:e.clientWidth,w:r.width,ellipsis:getComputedStyle(e).textOverflow,inPill:r.left>=pill.left-0.5&&r.right<=pill.right+0.5,inLabel:r.right<=R(l).right+0.5}};
 const vis=n=>[...n.childNodes].map(c=>c.nodeType===3?c.textContent:c.getAttribute?.('aria-hidden')==='true'?'':vis(c)).join('');
 const bb=R(b);return {hidden:b.hidden,text:l.textContent,visNoHidden:vis(l),ng:l.classList.contains('ng'),status:b.querySelector('.goal-status').textContent,
  hasAriaLabelAttr:b.hasAttribute('aria-label'),describedby:b.getAttribute('aria-describedby'),label:{sw:l.scrollWidth,cw:l.clientWidth},btnH:bb.height,btnW:bb.width,
  star:sp('.ng-star'),name:sp('.ng-name'),tail:sp('.ng-tail'),lv:sp('.ng-lv'),sfx:sp('.ng-sfx')}});
async function openTab(p,tab){if(!await p.locator(`[data-tab=${tab}]`).isVisible().catch(()=>false))await p.locator('[data-nav=upgrades]').click({timeout:8000});await p.locator(`[data-tab=${tab}]`).click({timeout:5000});await p.waitForTimeout(500);}
async function assertTab(p,tab){const t=await p.evaluate(()=>[...document.querySelectorAll('[role=tab],.tabs button')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-selected')==='true').map(e=>e.dataset.tab));ok(t.length>=1&&t.every(x=>x===tab),`active tab ${t} != ${tab}`);return t[0];}
const chipInfo=p=>p.evaluate(()=>{const cs=[...document.querySelectorAll('.best-chip')];const c=cs[0];const row=c?.closest('.up');const R=e=>e.getBoundingClientRect();
 const buys=[...document.querySelectorAll('.up button.buy')].filter(b=>R(b).height>0).map(b=>({h:R(b).height,w:R(b).width,kind:b.dataset.kind}));
 return {count:cs.length,key:c?.dataset.bestBuy??null,text:c?.textContent??null,sw:c?.scrollWidth,cw:c?.clientWidth,inRow:c?R(c).right<=R(row).right+0.5&&R(c).left>=R(row).left-0.5:null,visible:c?R(c).top>=0&&R(c).bottom<=innerHeight:null,
  starAriaHidden:c?.querySelector('span')?.getAttribute('aria-hidden')??null,rowKind:row?.dataset.track??row?.querySelector('h3')?.textContent??null,rowBest:row?.classList.contains('best')??null,rowLocked:!!row?.querySelector('.lock,.maxed'),
  bestRows:[...document.querySelectorAll('.up.best')].map(r=>r.dataset.track??r.querySelector('h3')?.textContent),buys,docOverflow:document.documentElement.scrollWidth>innerWidth}});
async function shot(p,name){const f=`shots/${ENG}/${name}-w${W}.png`;await p.screenshot({path:E+f});return f;}
// independent spoken-status sentence (spec F4-14 "existing status sentence"; B3 singular rule)
const UNIT={s:'second',min:'minute',h:'hour'};
const statusSentence=st=>st==='Ready!'?'Ready now.':st==='—'?'Sell eggs to earn coins.':`Ready in about ${st.replace('~','').replace(/(\d+)\s*(min|s|h)\b/g,(_,n,u)=>`${n} ${UNIT[u]}${n==='1'?'':'s'}`).trim()}.`;
const KEYROW={FARM:'Farm level',HENS:'hens',VALUE:'eggValue',COLL:'Collect per tap'};
const F4KEYS=new Set(['HENS','VALUE','COLL']);
async function checkA11y(name,p,cdp,s,cs){const a=await acc(p,cdp);const expDesc=`${cs.ariaFull}. ${statusSentence(s.status)}`;const visLbl=ws(s.visNoHidden);
 const res={...a,expDesc,visLbl};
 if(F4KEYS.has(cs.key)){
  ok(!s.hasAriaLabelAttr,`${name}: F4 target still has aria-label`);
  for(const [k,v] of [['pw',a.pwName],['cdp',a.cdpName]])if(v!==null||k==='pw'){ok(ws(v).includes(visLbl)&&visLbl.length>0,`${name}: ${k} name "${v}" doesn't contain visible "${visLbl}"`);ok(ws(v)===ws(visLbl+' '+s.status),`${name}: ${k} name "${v}" != visible label+status "${visLbl} ${s.status}"`);ok(!/[…★]/.test(v??''),`${name}: ${k} name has …/★`);}
  if(cdp){ok(a.cdpDesc===expDesc,`${name}: description "${a.cdpDesc}" != "${expDesc}"`);ok(!/[…★]/.test(a.cdpDesc??''),`${name}: desc has …/★`);}
  else res.pwDescMatch=await pwDesc(p,expDesc);
 } else { // FARM / workers / done keep the aria-label (unchanged path)
  const nm=a.cdpName??a.pwName;ok(ws(nm).startsWith(cs.ariaHead),`${name}: non-F4 name "${nm}" !^ "${cs.ariaHead}"`);ok(!s.describedby,`${name}: non-F4 has describedby`);
 }
 return res;}
for(const [name,cs] of Object.entries(CASES)){if(!want(name))continue;try{const {c,p,errs,cdp}=await open();if(cs.sale)await recordSale(p);await setState(p,cs.state);await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await p.waitForTimeout(200);
 const s=await strip(p);const a11y=await checkA11y(name,p,cdp,s,cs);const f1=await shot(p,`${name}-strip`);
 ok(sp(s.text)===cs.label,`${name}: strip "${sp(s.text)}" != "${cs.label}"`);
 ok(s.label.sw<=s.label.cw,`${name}: label clip ${s.label.sw}/${s.label.cw}`);
 if(s.tail)ok(s.tail.sw<=s.tail.cw&&s.tail.inPill&&s.tail.inLabel&&s.tail.ellipsis!=='ellipsis',`${name}: tail cut ${JSON.stringify(s.tail)}`);
 for(const k of ['lv','sfx','star'])if(s[k])ok(s[k].inPill&&s[k].inLabel,`${name}: ${k} outside ${JSON.stringify(s[k])}`);if(s.star)ok(s.star.sw<=s.star.cw,`${name}: star cut`);
 if(s.name)ok(s.name.sw<=s.name.cw,`${name}: name ellipsised ${JSON.stringify(s.name)}`);ok(s.btnH>=44,`${name}: #goal height ${s.btnH}`);ok([...(s.text||'')].length<=27,`${name}: >27`);ok(!/unlocks/.test(s.text+a11y.cdpDesc+a11y.pwName),`${name}: Farm-unlock variant`);
 if(cs.expectStatus)ok(s.status===cs.expectStatus,`${name}: status "${s.status}" != "${cs.expectStatus}"`);
 const tab=cs.tab==='collection'?'collection':'farm';await openTab(p,tab);await p.evaluate(()=>(document.querySelector('.best-chip')??document.querySelector('.up'))?.scrollIntoView({block:'center'}));await p.waitForTimeout(300);
 const t=await assertTab(p,tab);const ch=await chipInfo(p);const f2=await shot(p,`${name}-chip`);
 if(cs.chip){ok(ch.count===1&&ch.key===cs.chip,`${name}: chip ${ch.count} ${ch.key} != ${cs.chip}`);ok(ch.sw<=ch.cw&&ch.inRow&&ch.visible,`${name}: chip clip ${JSON.stringify(ch)}`);ok(ch.text==='★ Best buy'&&ch.starAriaHidden==='true',`${name}: chip text ${ch.text}`);ok(!ch.rowLocked,`${name}: chip on locked row`);
  if(cs.chip!=='COLL'&&cs.chip!=='FARM')ok(ch.rowKind===KEYROW[cs.chip],`${name}: chip row ${ch.rowKind}`);ok(ch.rowBest!==false||tab==='collection',`${name}: chip row not .best (${JSON.stringify(ch.bestRows)})`);}
 else ok(ch.count===0,`${name}: chip present when none expected (${ch.key})`);
 // ★ ⇔ chip agreement in this settled state (F4-13)
 ok(!!s.star===(ch.count===1&&ch.key===cs.key)||cs.label.length>=26||cs.key==='FARM',`${name}: ★ ${!!s.star} vs chip ${ch.key}`);
 for(const bt of ch.buys)ok(bt.h>=44,`${name}: buy ${bt.kind} h=${bt.h}`);ok(!ch.docOverflow,`${name}: page overflow-x`);
 appendFileSync(MAN,JSON.stringify({sha:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,case:name,expected:cs,strip:s,a11y,asserted_tab:t,chip:ch,shots:[f1,f2],pageerrors:errs})+'\n');ok(errs.length===0,`${name}: page errors ${errs}`);await c.close();}catch(e){ok(false,`${name} threw ${e.message.slice(0,200)}`);for(const x of br.contexts())await x.close().catch(()=>{});}}
// ---------- F4-13a timing: ★ (strip), "best buy," (description) and chip (row) sampled per MutationObserver batch and per rAF frame ----------
// Key-aware: the ★ key comes from the strip label, the "best buy," key from the never-truncated description, the chip keys from
// .best-chip[data-best-buy]. The Farm tab is open, so HENS / VALUE chips are in the DOM (COLL rows are not rendered on this tab).
// Collection is held at its F+3 cap (C3 at F0) so it can't take the pick while coins sit just under the target's cost.
const SAMPLER=`(()=>{const L=[];window.__qaL=L;let f=0;const cost=window.__qaCost;let pc=window.eggfarm.state.coinsCents,stale=false;
 const KEY={'Hens':'HENS','Egg value':'VALUE','Value':'VALUE','Collection':'COLL','Coll.':'COLL'};
 const snap=(src)=>{const g=window.eggfarm;if(g.state.coinsCents!==pc){pc=g.state.coinsCents;stale=true;}if(src==='mo')stale=false;
  const b=document.querySelector('#goal'),lbl=b.querySelector('.goal-label'),star=!!lbl.querySelector('.ng-star'),nm=lbl.querySelector('.ng-name')?.textContent??'';
  const d=b.getAttribute('aria-describedby')?document.getElementById(b.getAttribute('aria-describedby'))?.textContent??'':b.getAttribute('aria-label')??'';
  const dk=d.match(/best buy, (Hens|Egg value|Collection) level/)?.[1];const ch=[...document.querySelectorAll('.best-chip')].map(c=>c.dataset.bestBuy);
  L.push({src,f,stale,t:performance.now(),coins:g.state.coinsCents,aff:g.state.coinsCents>=cost,star,starKey:star?KEY[nm]??('?'+nm):null,descKey:dk?KEY[dk]:null,chips:ch.join(','),label:lbl.textContent,desc:d});};
 const mo=new MutationObserver(()=>snap('mo'));mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-describedby','aria-label']});
 const raf=()=>{f++;snap('raf');if(!window.__qaStop)requestAnimationFrame(raf);};requestAnimationFrame(raf);window.__qaMo=mo;snap('start');})()`;
async function timing(caseName,cs,trigger,expectFinal){const {c,p,errs}=await open();const K=cs.key;
 if(cs.sale)await recordSale(p);await setState(p,{...cs.state,coinsCents:cs.coins});await p.waitForTimeout(1400);await p.evaluate(()=>window.eggfarmUi.render());await openTab(p,'farm');await p.waitForTimeout(1300);
 const t=await assertTab(p,'farm');const pre={strip:await strip(p),chip:await chipInfo(p)};const f0=await shot(p,`${caseName}-before`);
 await p.evaluate(cost=>{window.__qaCost=cost;window.__qaStop=false;},cs.cost);await p.evaluate(SAMPLER);await p.waitForTimeout(150);
 const trig=await p.evaluate(trigger,cs.cost);
 await p.waitForTimeout(60);await assertTab(p,'farm');const s60=await strip(p),c60=await chipInfo(p);const f1=await shot(p,`${caseName}-t60`);
 await p.waitForTimeout(1300);await assertTab(p,'farm');const s1300=await strip(p),c1300=await chipInfo(p);const f2=await shot(p,`${caseName}-t1360`);
 const L=await p.evaluate(()=>{window.__qaStop=true;window.__qaMo.disconnect();return window.__qaL;});
 const onFarm=k=>k==='HENS'||k==='VALUE';const has=(x,k)=>x.chips.split(',').includes(k);
 const why=x=>{const r=[];if(x.star&&x.starKey!==x.descKey)r.push('star!=desc');for(const k of ['HENS','VALUE'])if((x.descKey===k)!==has(x,k))r.push(`desc/chip ${k}`);
  if(!x.aff&&!x.stale&&(x.descKey===K||x.starKey===K||has(x,K)))r.push('shown-unaffordable');if(x.aff&&!x.stale&&x.src==='mo'&&expectFinal==='on'&&x.descKey!==K&&L.indexOf(x)>0&&L.slice(0,L.indexOf(x)).some(y=>y.coins!==L[0].coins))r.push('affordable-not-shown');return r;};
 const bad=L.map(x=>({...x,why:why(x)})).filter(x=>x.why.length&&!(x.why.length===1&&x.why[0]==='affordable-not-shown'));
 const notShown=L.filter(x=>why(x).includes('affordable-not-shown')).length;
 const idx=fn=>L.findIndex(fn),fs=idx(x=>x.starKey===K),fc=idx(x=>has(x,K)),fd=idx(x=>x.descKey===K);
 const ls=L.map(x=>x.starKey===K).lastIndexOf(true),lc=L.map(x=>has(x,K)).lastIndexOf(true),ld=L.map(x=>x.descKey===K).lastIndexOf(true);
 const firstAffRender=idx(x=>x.aff&&!x.stale&&x.src==='mo'&&x.coins!==L[0].coins),firstUnaffRender=idx(x=>!x.aff&&!x.stale&&x.src==='mo'&&x.coins!==L[0].coins);
 const r={case:caseName,key:K,cost:cs.cost,state:cs.state,coins0:cs.coins,sale:cs.sale,trigger:trig,samples:L.length,mo:L.filter(x=>x.src==='mo').length,raf:L.filter(x=>x.src==='raf').length,
  badCount:bad.length,bad:bad.slice(0,6),staleSamples:L.filter(x=>x.stale).length,
  firstStar:fs,firstChip:fc,firstDesc:fd,lastStar:ls,lastChip:lc,lastDesc:ld,firstAffRender,firstUnaffRender,
  pre:{label:sp(pre.strip.text),chip:pre.chip.key},t60:{label:sp(s60.text),chip:c60.key,status:s60.status},t1360:{label:sp(s1300.text),chip:c1300.key},asserted_tab:t,shots:[f0,f1,f2],pageerrors:errs};
 ok(r.badCount===0,`${caseName}: ${r.badCount} samples where ★ / "best buy," / chip disagree or show while unaffordable ${JSON.stringify(bad.slice(0,2))}`);
 if(expectFinal==='on'){ok(fc>=0&&fd===fc&&(cs.truncNoStar?fs<0:fs===fc),`${caseName}: first sample ★ ${fs} desc ${fd} chip ${fc}`);ok(fc>=firstAffRender&&firstAffRender>=0,`${caseName}: shown before the affordable render (${fc} < ${firstAffRender})`);
  ok(c60.key===K&&(cs.truncNoStar||!!s60.star),`${caseName}: at +60ms strip "${sp(s60.text)}" chip ${c60.key}`);ok(pre.chip.key!==K&&!pre.strip.star,`${caseName}: shown before the flip`);}
 else {ok(!c60.key&&!s60.star&&!c1300.key&&!s1300.star,`${caseName}: after the drop strip "${sp(s60.text)}" chip ${c60.key}`);ok(ls===lc&&ld===lc&&lc>=0,`${caseName}: last sample ★ ${ls} desc ${ld} chip ${lc}`);ok(pre.chip.key===K&&!!pre.strip.star,`${caseName}: not shown before the drop`);}
 ok(errs.length===0,`${caseName}: page errors ${errs}`);
 appendFileSync(MAN,JSON.stringify({sha:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,...r})+'\n');writeFileSync(`${E}browser/timing-${caseName}-${ENG}-${W}.json`,JSON.stringify(L));
 console.log('timing',caseName,JSON.stringify({bad:r.badCount,fs,fd,fc,ls,ld,lc,firstAffRender,pre:r.pre,t60:r.t60,t1360:r.t1360}));await c.close();}
const HENS={key:'HENS',state:{farmLevel:0,hensLevel:1,eggValueLevel:3,collectionLevel:3},cost:2100};
const VAL={key:'VALUE',state:{farmLevel:0,hensLevel:3,eggValueLevel:2,collectionLevel:3},cost:3300,truncNoStar:true};
const SELL=cost=>{const g=window.eggfarm;const c0=g.state.coinsCents;g.state={...g.state,basket:5,customers:[{id:9002,demand:5,filled:0,waitedS:0}]};g.dispatch({type:'sellAll'});return {how:'real sale: sellAll on a seeded 5-egg order (no purchase)',c0,c1:g.state.coinsCents,cost};};
const T=[
 // 1) star-chip-lag (fcf9823 M-1 repro, same as before): broke Hens pick, coins set to exactly its cost, no purchase, no manual render.
 ['star-chip-lag',{...HENS,coins:0,sale:false},cost=>{const g=window.eggfarm;g.state={...g.state,coinsCents:cost};return {how:'state coins=cost',cost};},'on'],
 // 1b) same, income > 0 (status "Ready in about …" → "Ready!")
 ['star-chip-lag-income',{...HENS,coins:0,sale:true},cost=>{const g=window.eggfarm;g.state={...g.state,coinsCents:cost};return {how:'state coins=cost (income>0)',cost};},'on'],
 // 2) flip by a REAL sale: income>0, coins 1 cent short, sellAll lifts coins past the cost. No purchase.
 ['flip-sale',{...HENS,coins:2099,sale:true},SELL,'on'],
 // 3) the same on a 26-char % label (Egg value L3, ★ dropped by F4-2 truncation; "best buy," and chip must still move together)
 ['flip-sale-value',{...VAL,coins:3299,sale:true},SELL,'on'],
 // 4) reverse: affordable best buy, coins drop 1 cent below cost (no purchase) → ★, "best buy," and chip leave together.
 ['reverse-drop',{...HENS,coins:2100,sale:false},cost=>{const g=window.eggfarm;g.state={...g.state,coinsCents:cost-1};return {how:'state coins=cost-1',cost};},'off'],
 ['reverse-drop-income',{...HENS,coins:2100,sale:true},cost=>{const g=window.eggfarm;g.state={...g.state,coinsCents:cost-1};return {how:'state coins=cost-1 (income>0)',cost};},'off'],
];
for(const [n,cs,tr,ex] of T){if(!want(n)&&!want('timing'))continue;try{await timing(n,cs,tr,ex);}catch(e){ok(false,`${n} threw ${e.message.slice(0,200)}`);for(const x of br.contexts())await x.close().catch(()=>{});}}
await br.close();console.log(`done ${ENG} ${W} fails=${fails.length}`);appendFileSync(MAN,JSON.stringify({done:true,build_id:BID,fails})+'\n');
