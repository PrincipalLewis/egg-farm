// QA probe for PR #64 @ 3110e88 (M41-9 big numbers). Own tooling; never reads /workspace/wt-ui-shots.
// usage: node p64.mjs <engine> <width> <head|base> [sections=ra,huge,aria,axe]
// head = /tmp/qa-m41-9-3110e88/dist-qa on :4963 ; base = /tmp/qa-m41-9-base-dd223f5/dist-qa on :4964 (never :4173). Run under the browser flock.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';import http from 'node:http';import {join,extname} from 'node:path';import {createHash} from 'node:crypto';
const [ENG,WS,WHICH='head',SECS='ra,huge,aria,axe']=process.argv.slice(2);const W=+WS;const H={320:568,360:640,375:667,390:844,430:932,1280:800}[W]??800;
const T={head:{dir:(process.env.QA_WT??'/tmp/qa-rc1-5d9efa6')+'/dist-qa',port:+(process.env.QA_PORT??4983),bid:process.env.QA_BID}}[WHICH];if(!T||!T.bid||!T.bid.endsWith('+5d9efa6')||/dirty/.test(T.bid))throw new Error('QA_BID must be <prefix>+5d9efa6 and target head');
const pw=(await import((process.env.QA_WT??'/tmp/qa-rc1-5d9efa6')+'/node_modules/playwright-core/index.mjs')).default;
const E='/workspace/egg-farm-studio/qa/m41/rc1-5d9efa6-ui/';const OD=`${E}p64/`;const SD=`shots/p64/${ENG}/`;mkdirSync(E+SD,{recursive:true});
const TAG=process.env.QA_TAG??SECS.replace(/,/g,'_');const OUT=`${OD}p64-${WHICH}-${ENG}-${W}-${TAG}.jsonl`;writeFileSync(OUT,'');
const AXE='/tmp/axe/node_modules/axe-core/axe.min.js';const axeSrc=readFileSync(AXE,'utf8');const axeSha=createHash('sha256').update(axeSrc).digest('hex');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=await new Promise((r,j)=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(T.dir,p);if(!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));});s.on('error',j);s.listen(T.port,'127.0.0.1',()=>r(s));});
const URL=`http://127.0.0.1:${T.port}/`;
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const ok=(c,m,d)=>{if(!c){fails.push(m);console.log('FAIL',m,JSON.stringify(d??'').slice(0,400));}return c;};
const rec=o=>appendFileSync(OUT,JSON.stringify({target:WHICH,build_id:T.bid,engine:ENG,size:`${W}x${H}`,t:new Date().toISOString(),...o})+'\n');
let shotN=0;const shot=async(p,nm)=>{const f=`${SD}${WHICH}-${TAG}-${nm}-w${W}.png`;await p.screenshot({path:E+f});shotN++;return f;};
async function open(){const c=await br.newContext({viewport:{width:W,height:H},hasTouch:W<900,isMobile:false});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa64')){sessionStorage.setItem('qa64','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(URL);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!ok(bid===T.bid,`runtime build-id ${bid} != ${T.bid}`))throw new Error('bid');
 await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 for(let i=0;i<4;i++){if(await p.locator('#wbCollect').isVisible().catch(()=>false))await p.locator('#wbCollect').click().catch(()=>{});await p.waitForTimeout(150);}
 await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,seenTracksExplainer:true,customers:[],nextCustomerInS:1e9};window.eggfarmUi.render();});
 await p.waitForTimeout(300);return {c,p,bid,errs};}
const CAP={farmLevel:30,hensLevel:30,eggValueLevel:30,collectionLevel:30};
async function goMarket(p){const vis=()=>p.evaluate(()=>{const m=document.querySelector('#p-market');return !!m&&m.getClientRects().length>0&&m.getBoundingClientRect().height>0&&getComputedStyle(m).visibility!=='hidden';});
 if(!(await vis())){await p.locator('[data-nav=market]').click();await p.waitForTimeout(600);}
 const st=await p.evaluate(()=>{const m=document.querySelector('#p-market');const r=m?.getBoundingClientRect();return {marketVisible:!!m&&m.getClientRects().length>0&&r.height>0,marketRect:r&&[r.left,r.top,r.width,r.height].map(Math.round),activeNav:[...document.querySelectorAll('[data-nav]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-current')||e.getAttribute('aria-pressed')==='true'||e.getAttribute('aria-expanded')==='true').map(e=>e.dataset.nav),docked:matchMedia('(min-width:960px) and (orientation:landscape)').matches,modalOpen:!!document.querySelector('#modal-layer.open')};});
 return st;}
// real game data at the level cap: let the game spawn its own customers (real demand + real price at F30/H30/V30/C30)
async function seedCap(p){await p.evaluate(cap=>{const g=window.eggfarm;g.state={...g.state,...cap,customers:[],basket:0,coop:0,nextCustomerInS:0};window.eggfarmUi.render();},CAP);
 for(let i=0;i<14;i++){await p.waitForTimeout(250);await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,nextCustomerInS:0};});}
 return p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,nextCustomerInS:1e9};return g.state.customers.map(c=>({id:c.id,demand:c.demand,filled:c.filled}));});}
const measure=p=>p.evaluate(()=>{const out=[];for(const o of document.querySelectorAll('#p-market .order[data-row]')){if(!o.getClientRects().length)continue;const card=o.getBoundingClientRect(),l1=o.querySelector('.l1'),btn=o.querySelector('button');
 const ins=r=>r.left>=card.left-0.5&&r.right<=card.right+0.5&&r.top>=card.top-0.5&&r.bottom<=card.bottom+0.5;
 const parts=[l1,...l1.children,o.querySelector('.bar'),btn,...btn.querySelectorAll('*')].filter(Boolean).map(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {cls:String(e.className||e.tagName),tag:e.tagName,text:e.textContent,fs:parseFloat(cs.fontSize),ls:cs.letterSpacing,sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,ws:cs.whiteSpace,to:cs.textOverflow,ov:cs.overflowX,w:+r.width.toFixed(1),h:+r.height.toFixed(1),inCard:ins(r)};});
 const egg=o.querySelector('.l1 .egg');let eggs=null;if(egg){const rg=document.createRange();rg.selectNodeContents(egg);const tr=rg.getBoundingClientRect(),er=egg.getBoundingClientRect();eggs={text:egg.textContent,w:+er.width.toFixed(1),textW:+tr.width.toFixed(1),clipped:egg.scrollWidth>egg.clientWidth+0.5,to:getComputedStyle(egg).textOverflow};}
 const kids=[...l1.children].map(e=>e.getBoundingClientRect());const rows=new Set(kids.map(r=>Math.round(r.top))).size;
 out.push({id:o.dataset.row,line:l1.textContent,lineAria:o.querySelector('.txt')?.getAttribute('aria-label'),fit:[...l1.classList].filter(c=>/^fit/.test(c)).join(' ')||'none',l1:{sw:l1.scrollWidth,cw:l1.clientWidth,fs:parseFloat(getComputedStyle(l1).fontSize),rows},
  btn:{text:btn.textContent,sk:btn.querySelector('.sk')?.textContent??null,sy:btn.querySelector('.sy')?.textContent??null,aria:btn.getAttribute('aria-label'),h:+btn.getBoundingClientRect().height.toFixed(1),w:+btn.getBoundingClientRect().width.toFixed(1),sw:btn.scrollWidth,cw:btn.clientWidth,disabled:btn.disabled,inCard:ins(btn.getBoundingClientRect())},eggs,cardH:+card.height.toFixed(1),parts});}return out;});
const hasEll=s=>/\u2026|\.\.\./.test(s??'');
function judge(nm,cards,{needState}={}){for(const o of cards){
 ok(!hasEll(o.line)&&!hasEll(o.btn.text),`${nm}#${o.id}: no ellipsis character in line/button text`,{line:o.line,btn:o.btn.text});
 ok(o.l1.sw<=o.l1.cw+0.5,`${nm}#${o.id}: .l1 scrollWidth<=clientWidth`,o.l1);
 ok(o.eggs&&o.eggs.text==='eggs'&&!o.eggs.clipped&&o.eggs.w+0.5>=o.eggs.textW,`${nm}#${o.id}: 'eggs' present+whole`,o.eggs);
 const bad=o.parts.filter(x=>x.fs<12||(x.sw>x.cw+0.5&&x.cw>0)||!x.inCard||(x.to==='ellipsis'&&x.ov!=='visible'));ok(bad.length===0,`${nm}#${o.id}: every part >=12px, scrollWidth<=clientWidth, inside card, no ellipsis`,bad);
 ok(o.btn.sw<=o.btn.cw+0.5&&o.btn.inCard,`${nm}#${o.id}: button label not clipped, inside card`,o.btn);
 ok(o.btn.h>=44,`${nm}#${o.id}: button >=44px high (${/^Need/.test(o.btn.text)?'Need':'Sell'} state)`,o.btn);
 if(needState)ok(/^Need/.test(o.btn.text),`${nm}#${o.id}: is in Need state`,o.btn.text);
 if(o.fit==='fit3')ok(o.l1.rows>=2||o.l1.sw<=o.l1.cw+0.5,`${nm}#${o.id}: fit3 wraps`,o.l1);}}
const SUF={K:'thousand',M:'million',B:'billion',T:'trillion',Qa:'quadrillion',Qi:'quintillion',Sx:'sextillion',Sp:'septillion',Oc:'octillion',No:'nonillion',Dc:'decillion'};
const spell=s=>{const sci=/^(\$?)(\d+(?:\.\d+)?)e(\d+)$/.exec(s);if(sci)return `${sci[1]}${sci[2]} times 10 to the ${sci[3]}`;const m=/^(\$?[\d.,]+)([A-Za-z]+)$/.exec(s);return m&&['Qa','Qi','Sx','Sp','Oc','No','Dc'].includes(m[2])?`${m[1]} ${SUF[m[2]]}`:s;};
const m3of=cards=>cards.filter(o=>/^Sell /.test(o.btn.sk??o.btn.text)).map(o=>{const vc=/^Sell (\S+)$/.exec(o.btn.sk??'')?.[1],vm=/^\+(\S+)$/.exec(o.btn.sy??'')?.[1],a=/^Sell (.+?)\u00a0· \+(.+)$/.exec(o.btn.aria??'');
 return {sk:o.btn.sk,sy:o.btn.sy,aria:o.btn.aria,visCount:vc,ariaCount:a?.[1],visMoney:vm,ariaMoney:a?.[2],countOk:!!vc&&!!a&&a[1]===spell(vc),ok:!!vc&&!!a&&a[1]===spell(vc)};});
async function runAxe(p,label){await p.evaluate(s=>{if(!window.axe){const e=document.createElement('script');e.textContent=s;document.head.appendChild(e);}},axeSrc);
 const r=await p.evaluate(async()=>{const o={rules:{'label-content-name-mismatch':{enabled:true}},resultTypes:['violations','passes','incomplete']};const x=await axe.run(document,o);
  const pick=k=>x[k].filter(v=>v.id==='label-content-name-mismatch').flatMap(v=>v.nodes.map(n=>({target:n.target.join(' '),html:n.html.slice(0,240),summary:(n.failureSummary||'').slice(0,240)})));
  return {version:axe.version,lin:{violations:pick('violations'),passes:pick('passes'),incomplete:pick('incomplete')},allViolations:x.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target.join(' '))}))};});
 rec({section:'axe',label,axeSha,...r});return r;}
const SECTIONS=SECS.split(',');
const realStates=[['cap-natural',null],['cap-need1',cs=>cs.map(c=>({...c,filled:c.demand-1})),0],['cap-need-all',cs=>cs.map(c=>({...c,filled:0})),0],['cap-sell',cs=>cs.map((c,i)=>({...c,filled:i%2?c.demand-1:0})),1e6],['cap-max75-need1',cs=>cs.map(c=>({...c,demand:75,filled:74})),0],['cap-max75-sell',cs=>cs.map((c,i)=>({...c,demand:75,filled:i%2?74:0})),1e6]];
const HUGE=[['999.9K',[[999_949,123_456],[999_999,999_000]],2e6],['Qa',[[1.2e15,6e14],[9.99e15,1e15]],2e16],['Dc-999.9',[[999.9e33,999e33],[4.5e34,1e34]],1e35],
 ['sci-1.00e36',[[1e36,9.9e35],[1.234e36,5e35]],2e36],['huge-max',[[Number.MAX_SAFE_INTEGER,1e15],[9e37,1e37]],1e38]];
try{
if(SECTIONS.includes('ra')||SECTIONS.includes('aria')){const {c,p,errs}=await open();const cust=await seedCap(p);ok(cust.length>0,'game spawned customers at cap',cust);
 for(const [nm,mut,basket] of realStates){if(mut){await p.evaluate(([cs,bk])=>{const g=window.eggfarm;g.state={...g.state,customers:g.state.customers.map((c,i)=>({...c,...cs[i]})),basket:bk,nextCustomerInS:1e9};window.eggfarmUi.render();},[mut(cust),basket]);}
  const nav=await goMarket(p);await p.waitForTimeout(450);ok(nav.marketVisible&&!nav.modalOpen,`${nm}: Market sheet visible (active ${nav.activeNav}) before measuring`,nav);
  const cards=await measure(p);const f=await shot(p,`Ra-${nm}`);judge(`R-a ${nm}`,cards,{needState:/need/.test(nm)});ok(cards.length>0,`${nm}: cards measured`);
  // m3: Sell aria count == visible floored count
  const m3=m3of(cards);
  m3.forEach(x=>ok(x.ok,`m3 ${nm}: Sell aria count == visible count`,x));
  const sa=await p.evaluate(()=>{const b=document.querySelector('#sellAll');return {text:b?.textContent,aria:b?.getAttribute('aria-label'),sw:b?.scrollWidth,cw:b?.clientWidth,h:b?.getBoundingClientRect().height};});
  ok(!sa.text||sa.sw<=sa.cw+0.5,`${nm}: #sellAll label not clipped`,sa);
  let ax=null;if(SECTIONS.includes('axe')){ax=await runAxe(p,`market-${nm}`);ax.lin.violations.filter(v=>/\.order|sell|#sellAll/i.test(v.target+v.html)).forEach(v=>ok(false,`axe label-in-name ${nm}: ${v.target}`,v));}
  rec({section:'R-a',state:nm,nav,cards,m3,sellAll:sa,shot:f,axeLin:ax&&ax.lin});}
 // Buy targets at the cap (Upgrades, every tab) with coins to afford
 try{if(SECTIONS.includes('axe')){await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,coinsCents:1e12};window.eggfarmUi.render();});
  const navU=await p.evaluate(()=>{const u=document.querySelector('#p-upgrades');return !!u&&u.getClientRects().length>0&&u.getBoundingClientRect().height>0;});if(!navU){await p.keyboard.press('Escape');await p.waitForTimeout(400);await p.locator('[data-nav=upgrades]').click({timeout:8000}).catch(async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(400);await p.locator('[data-nav=upgrades]').click({timeout:8000});});await p.waitForTimeout(500);}
  for(const tab of ['collection','farm','workers']){await p.locator(`[data-tab=${tab}]`).first().click();await p.waitForTimeout(400);
   const act=await p.evaluate(()=>({tabs:[...document.querySelectorAll('[data-tab].active')].map(e=>e.dataset.tab),upVisible:(()=>{const u=document.querySelector('#p-upgrades');return !!u&&u.getBoundingClientRect().height>0;})(),
    buys:[...document.querySelectorAll('#p-upgrades .up button, #p-upgrades button.buy')].filter(b=>b.getClientRects().length).map(b=>({text:b.textContent.trim(),aria:b.getAttribute('aria-label'),sw:b.scrollWidth,cw:b.clientWidth,h:+b.getBoundingClientRect().height.toFixed(1)}))}));
   ok(act.tabs.includes(tab)&&act.upVisible,`Upgrades tab ${tab} active before measuring`,act);const f=await shot(p,`buy-${tab}`);const ax=await runAxe(p,`upgrades-${tab}`);
   ax.lin.violations.filter(v=>!/chip\.arrive|queue-more/.test(v.target)).forEach(v=>ok(false,`axe label-in-name upgrades-${tab}: ${v.target}`,v));rec({section:'buy',tab,act,shot:f,axeLin:ax.lin});}}}catch(e){ok(false,`buy threw ${e.message.slice(0,200)}`);}
 rec({section:'errs',errs});ok(errs.length===0,'no page errors (cap)',errs);await c.close();}
}catch(e){ok(false,`cap threw ${e.message.slice(0,200)}`);}
try{
if(SECTIONS.includes('huge')){for(const [nm,cs,basket] of HUGE){const {c,p,errs}=await open();
 await p.evaluate(([cs,bk])=>{const g=window.eggfarm;g.state={...g.state,customers:cs.map(([d,f],i)=>({id:900+i,demand:d,filled:f,waitedS:0})),basket:bk,nextCustomerInS:1e9,nextCustomerId:999};window.eggfarmUi.render();},[cs,basket]);
 const nav=await goMarket(p);await p.waitForTimeout(450);ok(nav.marketVisible&&!nav.modalOpen,`${nm}: Market sheet visible before measuring`,nav);
 const cards=await measure(p);const f=await shot(p,`huge-${nm}`);judge(`QA4-1 ${nm}`,cards);ok(!cards.some(o=>/e\+|NaN|Infinity|undefined/.test(o.line+o.btn.text+o.lineAria+o.btn.aria)),`${nm}: no e+/NaN/Infinity`);
 const m3=m3of(cards);
 if(WHICH==='head')m3.forEach(x=>ok(x.ok,`m3 ${nm}: Sell aria count == spell(visible count)`,x));
 let ax=null;if(SECTIONS.includes('axe')){ax=await runAxe(p,`market-${nm}`);}
 rec({section:'QA4-1',state:nm,nav,cards,m3,shot:f,axeLin:ax&&ax.lin});ok(errs.length===0,`${nm}: no page errors`,errs);await c.close();}}
}catch(e){ok(false,`huge threw ${e.message.slice(0,200)}`);}
try{if(SECTIONS.includes('buy')){const {c,p,errs}=await open();
 for(const [lvNm,lv,coins] of [['mid-L15',{farmLevel:15,hensLevel:15,eggValueLevel:15,collectionLevel:15},1e12],['mid-L15-broke',{farmLevel:15,hensLevel:15,eggValueLevel:15,collectionLevel:15},0],['L29',{farmLevel:29,hensLevel:29,eggValueLevel:29,collectionLevel:29},1e12]]){
  await p.evaluate(([lv,co])=>{const g=window.eggfarm;g.state={...g.state,...lv,coinsCents:co,customers:[],nextCustomerInS:1e9};window.eggfarmUi.render();},[lv,coins]);
  const upV=()=>p.evaluate(()=>{const u=document.querySelector('#p-upgrades');return !!u&&u.getBoundingClientRect().height>0;});if(!(await upV())){await p.locator('[data-nav=upgrades]').click({timeout:8000});await p.waitForTimeout(500);}
  for(const tab of ['collection','farm','workers']){await p.locator(`[data-tab=${tab}]`).first().click();await p.waitForTimeout(400);
   const act=await p.evaluate(()=>({tabs:[...document.querySelectorAll('[data-tab].active')].map(e=>e.dataset.tab),upVisible:(()=>{const u=document.querySelector('#p-upgrades');return !!u&&u.getBoundingClientRect().height>0;})(),
    buys:[...document.querySelectorAll('#p-upgrades button')].filter(b=>b.getClientRects().length&&!b.matches('[data-tab]')).map(b=>({cls:b.className,text:b.textContent.trim(),aria:b.getAttribute('aria-label'),sw:b.scrollWidth,cw:b.clientWidth,h:+b.getBoundingClientRect().height.toFixed(1)}))}));
   ok(act.tabs.includes(tab)&&act.upVisible,`buy ${lvNm}: Upgrades tab ${tab} active before measuring`,act);const f=await shot(p,`buy-${lvNm}-${tab}`);
   act.buys.forEach(b=>ok(b.sw<=b.cw+0.5,`buy ${lvNm}/${tab}: button label not clipped "${b.text}"`,b));
   const ax=await runAxe(p,`buy-${lvNm}-${tab}`);ax.lin.violations.filter(v=>v.target.includes('#p-upgrades')||/class="[^"]*\b(buy|up)\b/.test(v.html)).forEach(v=>ok(false,`axe label-in-name buy ${lvNm}/${tab}: ${v.target}`,v));
   rec({section:'buy-mid',lv:lvNm,tab,act,shot:f,axeLin:ax.lin});}}
 ok(errs.length===0,'buy: no page errors',errs);await c.close();}}catch(e){ok(false,`buy-mid threw ${e.message.slice(0,200)}`);}
try{
if(SECTIONS.includes('pop')){const {c,p,errs}=await open();
 // author claim '+$1.2Qa' coin pop: one Sell worth ~$1.2345Qa at the cap price
 await p.evaluate(cap=>{const g=window.eggfarm;g.state={...g.state,...cap};window.eggfarmUi.render();},CAP);const nav=await goMarket(p);
 const price=await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,customers:[{id:950,demand:1000,filled:0,waitedS:0}],basket:1000,nextCustomerInS:1e9};window.eggfarmUi.render();return document.querySelector('#p-market .order[data-row="950"] button')?.getAttribute('aria-label');});
 await p.waitForTimeout(500);const price2=await p.evaluate(()=>document.querySelector('#p-market .order[data-row="950"] button')?.getAttribute('aria-label'));const per=+(/\+\$([\d,]+\.\d\d)$/.exec(price2??price??'')?.[1]?.replace(/,/g,''))/1000;ok(per>0,'pop: per-egg price read',{price,price2});const n=Math.round(1.2345e15/per);
 await p.evaluate(n=>{const g=window.eggfarm;g.state={...g.state,customers:[{id:951,demand:n,filled:0,waitedS:0}],basket:n,nextCustomerInS:1e9};window.eggfarmUi.render();},n);await p.waitForTimeout(400);
 const pre=await p.evaluate(()=>{const b=document.querySelector('#p-market .order[data-row="951"] button');return {text:b?.textContent,aria:b?.getAttribute('aria-label')};});
 const seen=[];await p.exposeFunction('qaSeen',t=>seen.push(t));await p.evaluate(()=>{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&/\+\$/.test(n.textContent))window.qaSeen(n.className+' | '+n.textContent);}).observe(document.body,{childList:true,subtree:true});});
 await p.locator('#p-market .order[data-row="951"] button').click();await p.waitForTimeout(120);const f=await shot(p,'pop-1.2Qa');await p.waitForTimeout(500);
 ok(seen.some(s=>/\+\$1\.2Qa/.test(s)),'coin pop shows +$1.2Qa',seen);ok(!seen.some(s=>/\d{4,}|illion/.test(s.split('|')[1])),'pop never a digit string or spelled word',seen);
 rec({section:'pop',nav,perEggDollars:per,eggs:n,pre,seen,shot:f});ok(errs.length===0,'pop: no page errors',errs);await c.close();}
}catch(e){ok(false,`threw ${e.message.slice(0,200)}`);}
await br.close();srv.close();rec({done:true,shots:shotN,fails});console.log(`done ${WHICH} ${ENG} ${W} fails=${fails.length} shots=${shotN}`);process.exit(0);
