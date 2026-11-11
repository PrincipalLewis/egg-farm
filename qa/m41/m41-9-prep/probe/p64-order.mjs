// PR #64 PREP probe: order card 'eggs' present + unclipped at 360 with huge counts; Art R-a (12px floor, wraps, never clips)
// and R-b (card over top Buy only while transient/dismissible). usage: node p64-order.mjs <engine> <width> <full-sha>
// Serves /tmp/qa-m41-9p-<sha7>/dist-qa on an OS-assigned port (never 4173). Output -> qa/m41/m41-9-prep/run-<sha7>/. Run under the flock.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';import http from 'node:http';import {join,extname} from 'node:path';
const [ENG,WS,SHA]=process.argv.slice(2);const W=+WS,S7=SHA.slice(0,7),H={360:640,375:667,390:844}[W]??800;const WT=`/tmp/qa-m41-9p-${S7}`;
const pw=(await import(`${WT}/node_modules/playwright-core/index.mjs`)).default;const O=`/workspace/egg-farm-studio/qa/m41/m41-9-prep/run-${S7}/`;mkdirSync(`${O}shots/${ENG}`,{recursive:true});
const OUT=`${O}probe-${ENG}-${W}.jsonl`;writeFileSync(OUT,'');const BID=`m3-rc1-pre+${S7}`;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(`${WT}/dist-qa`,p);if(!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));}).listen(0,'127.0.0.1',()=>r({url:`http://127.0.0.1:${s.address().port}/`,s}));});
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const fails=[];const ok=(c,m,d)=>{if(!c){fails.push(m);console.log('FAIL',m,JSON.stringify(d??'').slice(0,300));}return c;};const rec=o=>appendFileSync(OUT,JSON.stringify({sha:SHA,build_id:BID,engine:ENG,size:`${W}x${H}`,label:'PRELIMINARY',...o})+'\n');
async function open(){const c=await br.newContext({viewport:{width:W,height:H}});const p=await c.newPage();
 await p.addInitScript(()=>{if(!sessionStorage.getItem('qa64')){sessionStorage.setItem('qa64','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));}});
 await p.goto(srv.url);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(!ok(bid===BID,`runtime build-id ${bid}`))throw new Error('bid');
 await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
 await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,seenTracksExplainer:true,customers:[],nextCustomerInS:1e9};window.eggfarmUi.render();});await p.waitForTimeout(600);return {c,p};}
const STATES=[['normal',[[6,2],[24,0],[120,119]],50,5e5],['999.9K',[[999_949,123_456],[999_999,999_000]],2e6,1e9],['Qa',[[1.2e15,6e14],[9.99e15,1e15]],2e16,1e18],
 ['Dc',[[4.5e34,1e34],[9.99e34,9e34]],1e35,1e37],['sci-1.23e36',[[1.234e36,5e35],[1e36,9.9e35]],2e36,1e40],['huge-max',[[Number.MAX_SAFE_INTEGER,1e15],[9e37,1e37]],1e38,1e42]];
for(const [nm,cs,basket,coins] of STATES)try{const {c,p}=await open();
 await p.evaluate(([cs,bk,co])=>{const g=window.eggfarm;g.state={...g.state,customers:cs.map(([d,f],i)=>({id:900+i,demand:d,filled:f,waitedS:0})),basket:bk,coinsCents:co,nextCustomerInS:1e9,nextCustomerId:999};window.eggfarmUi.render();},[cs,basket,coins]);
 await p.locator('[data-nav=market]').click();await p.waitForTimeout(700);
 const navA=await p.evaluate(()=>{const m=document.querySelector('#p-market');return {marketVisible:!!m&&m.getClientRects().length>0,active:[...document.querySelectorAll('[data-nav]')].filter(e=>e.classList.contains('active')||e.getAttribute('aria-current')||e.getAttribute('aria-pressed')==='true').map(e=>e.dataset.nav)};});
 ok(navA.marketVisible,`${nm}: Market sheet visible before measurement`,navA);
 const cards=await p.evaluate(()=>[...document.querySelectorAll('.order')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().bottom<=innerHeight).map(o=>{const l1=o.querySelector('.l1'),card=o.getBoundingClientRect();
  const parts=[l1,...l1.querySelectorAll('*'),...o.querySelectorAll('.sell,.sell *')].map(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {cls:String(e.className||e.tagName),text:e.textContent,fs:parseFloat(cs.fontSize),ls:cs.letterSpacing,sw:e.scrollWidth,cw:e.clientWidth,ws:cs.whiteSpace,to:cs.textOverflow,ov:cs.overflowX,
   inCard:r.left>=card.left-0.5&&r.right<=card.right+0.5&&r.top>=card.top-0.5&&r.bottom<=card.bottom+0.5};});
  const egg=o.querySelector('.l1 .egg'),er=egg?.getBoundingClientRect();const rg=document.createRange();if(egg){rg.selectNodeContents(egg);}const tr=egg?rg.getBoundingClientRect():null;
  return {id:o.dataset.row,text:l1.textContent,aria:o.querySelector('.txt')?.getAttribute('aria-label'),fit:o.dataset.fit??l1.dataset.fit??null,parts,
   eggs:{text:egg?.textContent,w:er?.width,textW:tr?.width,clipped:egg?egg.scrollWidth>egg.clientWidth+0.5:null,ellipsis:egg?getComputedStyle(egg).textOverflow:null},l1Lines:Math.round(l1.getBoundingClientRect().height/parseFloat(getComputedStyle(l1).fontSize)/1.2),cardH:card.height};}));
 const f=`shots/${ENG}/order-${nm}-w${W}.png`;await p.screenshot({path:O+f});
 for(const o of cards){ok(o.eggs.text==='eggs'&&o.eggs.w>0&&!o.eggs.clipped&&o.eggs.w+0.5>=o.eggs.textW,`${nm}#${o.id}: 'eggs' present+unclipped`,o.eggs);
  const bad=o.parts.filter(x=>x.fs<12||(x.sw>x.cw+0.5&&x.cw>0&&x.ov!=='visible')||!x.inCard);ok(bad.length===0,`R-a ${nm}#${o.id}: font>=12, no clip, inside card`,bad);
  ok(!/e\+|NaN|Infinity/.test(o.text+o.aria),`${nm}#${o.id}: no e+/NaN/Infinity`,o.text);}
 ok(cards.length>0,`${nm}: cards measured`);rec({section:'order-card',state:nm,nav:navA,cards,shot:f,
  rA_wrapNote:'R-a asks text at the floor to WRAP: .l1 white-space is recorded per part (nowrap = shrink-to-fit, not wrap)'});await c.close();}catch(e){ok(false,`${nm} threw ${e.message.slice(0,160)}`);}
// R-b: explainer card at 360 over the top Buy (tracks-explainer not changed by #64 -> base behaviour), Got it and 8 s expiry
for(const end of ['gotit','timeout'])try{const {c,p}=await open();await p.locator('[data-nav=upgrades]').click();await p.waitForTimeout(300);await p.locator('[data-tab=farm]').click();await p.waitForTimeout(300);
 const tab=await p.evaluate(()=>[...document.querySelectorAll('[data-tab].active')].map(e=>e.dataset.tab));ok(tab[0]==='farm','active tab farm',tab);
 await p.evaluate(()=>{const g=window.eggfarm;g.migrationRefundCents=0;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();});await p.waitForSelector('.tracks-exp',{timeout:3000});await p.waitForTimeout(350);
 const buys=()=>p.evaluate(()=>{const card=document.querySelector('.tracks-exp');return [...document.querySelectorAll('#p-upgrades .up button')].filter(b=>{const r=b.getBoundingClientRect();return r.height>0&&r.top>=0&&r.bottom<=innerHeight;}).map(b=>{const r=b.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);let cov=0;for(const fx of [.1,.5,.9])for(const fy of [.2,.5,.8]){const x=document.elementFromPoint(r.left+fx*r.width,r.top+fy*r.height);if(card&&card.contains(x))cov++;}return {row:b.closest('.up')?.querySelector('h3')?.textContent,centreHitsBuy:b===t||b.contains(t),cov};});});
 const up=await buys();const dismiss=await p.evaluate(()=>{const b=document.querySelector('.tracks-exp-ok');const r=b?.getBoundingClientRect();return b?{text:b.textContent,h:r.height}:null;});const f1=`shots/${ENG}/Rb-card-up-${end}-w${W}.png`;await p.screenshot({path:O+f1});
 if(end==='gotit'){await p.locator('.tracks-exp-ok').click();await p.waitForTimeout(250);}else await p.waitForTimeout(8400);
 const gone=await p.evaluate(()=>!document.querySelector('.tracks-exp'));await p.waitForTimeout(200);const after=await buys();const f2=`shots/${ENG}/Rb-after-${end}-w${W}.png`;await p.screenshot({path:O+f2});
 ok(!!dismiss&&dismiss.h>=44,'R-b dismiss control >=44',dismiss);ok(gone&&after.length>0&&after.every(b=>b.centreHitsBuy&&b.cov===0),`R-b after ${end}: every Buy centre hits Buy`,after);
 rec({section:'R-b',end,tab,coveredWhileUp:up.filter(b=>b.cov>0),dismiss,gone,after,shots:[f1,f2]});await c.close();}catch(e){ok(false,`R-b ${end} threw ${e.message.slice(0,160)}`);}
await br.close();srv.s.close();rec({done:true,fails});console.log(`PRELIMINARY done ${ENG} ${W} fails=${fails.length}`);
