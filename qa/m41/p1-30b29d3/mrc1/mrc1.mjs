// Finding m-RC1-1 repro: explainer card (refund line) vs Hens Buy, Farm sheet, 375x667, scroll 150..260 (1px) + tap at 200.
// usage: node mrc1.mjs <engine> <rc|c877> ; rc = /tmp/qa-p1-30b29d3 (m4.1+30b29d3), c877 = /tmp/qa-rc1-cmp-c877f69 (m3-rc1-pre+c877f69). Own port.
import {readFileSync,writeFileSync,existsSync,statSync,mkdirSync} from 'node:fs';import http from 'node:http';import {join,extname} from 'node:path';
const [ENG,T]=process.argv.slice(2);const W=375,H=667;
const C={rc:{wt:'/tmp/qa-p1-30b29d3',bid:'m4.1+30b29d3'},c877:{wt:'/tmp/qa-rc1-cmp-c877f69',bid:'m3-rc1-pre+c877f69'}}[T];
const pw=(await import('/tmp/qa-p1-30b29d3/node_modules/playwright-core/index.mjs')).default;
const E='/workspace/egg-farm-studio/qa/m41/p1-30b29d3/';mkdirSync(E+'shots/mrc1',{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const D=C.wt+'/dist-qa';const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(D,p);if(!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));}).listen(0,'127.0.0.1',()=>r(s));});
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const ctx=await br.newContext({viewport:{width:W,height:H},hasTouch:true});const p=await ctx.newPage();
await p.addInitScript(()=>{if(!sessionStorage.getItem('m')){sessionStorage.setItem('m','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));}});
await p.goto(`http://127.0.0.1:${srv.address().port}/`);const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);if(bid!==C.bid)throw new Error('bid '+bid);
await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi);
await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());const g=window.eggfarm;g.state={...g.state,farmLevel:3,hensLevel:2,eggValueLevel:2,collectionLevel:1,coinsCents:5e7,seenTracksExplainer:true,customers:[],nextCustomerInS:1e9};window.eggfarmUi.render();});
await p.locator('[data-nav=upgrades]').click();await p.waitForTimeout(400);await p.locator('[data-tab=farm]').click();await p.waitForTimeout(400);
const settle=()=>p.evaluate(()=>new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),40)));
const show=()=>p.evaluate(()=>{document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e=>e.remove());const g=window.eggfarm;g.migrationRefundCents=123450;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();});
const M=()=>p.evaluate(()=>{const c=document.querySelector('.tracks-exp'),cr=c.getBoundingClientRect(),body=document.querySelector('#p-upgrades .body'),brc=body.getBoundingClientRect();
 const tab=[...document.querySelectorAll('[data-tab]')].filter(e=>e.classList.contains('active')).map(e=>e.dataset.tab);
 const buys=[...document.querySelectorAll('#p-upgrades .btn.buy')].map(b=>{const r=b.getBoundingClientRect();const t=Math.max(r.top,brc.top,0),bo=Math.min(r.bottom,brc.bottom,innerHeight);return {row:b.closest('.up')?.querySelector('h3')?.textContent,t:r.top,b:r.bottom,l:r.left,r:r.right,ct:t,cb:bo};}).filter(x=>x.cb>x.ct);
 const vis=getComputedStyle(c).visibility;const painted=c.dataset.place!=='none'&&vis!=='hidden';
 const ov=buys.map(b=>({row:b.row,px:Math.min(cr.bottom,b.cb)-Math.max(cr.top,b.ct),buy:b})).filter(o=>painted&&o.px>0&&cr.left<o.buy.r&&o.buy.l<cr.right);
 return {scrollTop:body.scrollTop,tab,place:c.dataset.place,vis,styleTop:c.style.top,offsetHeight:c.offsetHeight,card:{t:cr.top,b:cr.bottom,l:cr.left,r:cr.right,h:cr.height},buys,ov};});
// frame sampler: card rect every rAF for 400ms after show at scroll 200 (entry animation expin .2s var(--ease-pop))
await p.evaluate(()=>{document.querySelector('#p-upgrades .body').scrollTop=200;});await settle();
const frames=await p.evaluate(()=>new Promise(res=>{document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e=>e.remove());const g=window.eggfarm;g.migrationRefundCents=123450;g.state={...g.state,seenTracksExplainer:false};g.onTracksCommitted();
 const t0=performance.now(),L=[];const body=document.querySelector('#p-upgrades .body').getBoundingClientRect();
 const hens=[...document.querySelectorAll('#p-upgrades .btn.buy')].map(b=>b.getBoundingClientRect()).filter(r=>r.bottom>body.top&&r.top<body.bottom)[0];
 const tick=()=>{const c=document.querySelector('.tracks-exp');if(c){const r=c.getBoundingClientRect();const y=hens?Math.max(r.top,hens.top)+0.05:0;const e=hens&&r.bottom>hens.top?document.elementFromPoint((hens.left+Math.min(r.right,hens.right))/2,(hens.top+Math.min(r.bottom,hens.bottom))/2):null;
  L.push({t:+(performance.now()-t0).toFixed(1),place:c.dataset.place,top:+r.top.toFixed(3),bottom:+r.bottom.toFixed(3),h:+r.height.toFixed(3),hensTop:hens?.top,overlapPx:hens?+(r.bottom-hens.top).toFixed(3):null,efpAtOverlap:e?(e.closest('.tracks-exp')?'card':e.closest('.btn.buy')?'buy':e.tagName):null,anim:c.getAnimations().map(a=>a.animationName+':'+a.playState).join()});}
  if(performance.now()-t0<400)requestAnimationFrame(tick);else res(L);};requestAnimationFrame(tick);}));
const ovFrames=frames.filter(f=>f.overlapPx>0);
console.log('FRAMES',ENG,T,'n',frames.length,'overlapFrames',ovFrames.length,'maxOverlapPx',Math.max(0,...frames.map(f=>f.overlapPx??0)),'window_ms',ovFrames.length?[ovFrames[0].t,ovFrames.at(-1).t]:null,'efp',[...new Set(ovFrames.map(f=>f.efpAtOverlap))],'settled',JSON.stringify(frames.at(-1)));
const sweep=[];
for(let s=150;s<=260;s++){await p.evaluate(s=>{document.querySelector('#p-upgrades .body').scrollTop=s;},s);await show();await settle();const m=await M();if(m.ov.length)sweep.push({s,place:m.place,styleTop:m.styleTop,offsetHeight:m.offsetHeight,card:m.card,ov:m.ov.map(o=>({row:o.row,px:+o.px.toFixed(3),buyTop:o.buy.t}))});}
await p.evaluate(()=>{document.querySelector('#p-upgrades .body').scrollTop=200;});await show();await settle();const m=await M();
let efp=null,tap=null;const o=m.ov[0];
if(o){const y=(Math.max(m.card.t,o.buy.ct)+Math.min(m.card.b,o.buy.cb))/2;
 efp=await p.evaluate(([y,l,r])=>[0.1,0.3,0.5,0.7,0.9].map(f=>{const x=l+(r-l)*f;const e=document.elementFromPoint(x,y);return {x:+x.toFixed(1),y:+y.toFixed(3),hit:e?.closest('.tracks-exp')?'card':e?.closest('.btn.buy')?'buy':(e?.tagName+'.'+e?.className)};}),[y,Math.max(m.card.l,o.buy.l),Math.min(m.card.r,o.buy.r)]);
 const f=`shots/mrc1/${T}-${ENG}-s200-pre.png`;await p.screenshot({path:E+f});
 const pre=await p.evaluate(()=>({h:window.eggfarm.state.hensLevel,c:window.eggfarm.state.coinsCents}));
 await p.touchscreen.tap(Math.round((Math.max(m.card.l,o.buy.l)+Math.min(m.card.r,o.buy.r))/2),Math.round(o.buy.ct+24));await p.waitForTimeout(300);
 const post=await p.evaluate(()=>({h:window.eggfarm.state.hensLevel,c:window.eggfarm.state.coinsCents,card:!!document.querySelector('.tracks-exp')}));tap={pre,post,bought:post.h===pre.h+1&&post.c<pre.c,cardStays:post.card,shot:f};}
else{await p.screenshot({path:E+`shots/mrc1/${T}-${ENG}-s200.png`});}
const out={frames,engine:ENG,target:T,build_id:bid,at200:m,efpInOverlap:efp,tapAtButtonCentre:tap,sweepOverlaps:sweep};writeFileSync(E+`mrc1/mrc1-${T}-${ENG}.json`,JSON.stringify(out,null,1));
console.log(ENG,T,bid,'s200',m.place,m.styleTop,'offH',m.offsetHeight,'card',JSON.stringify(m.card),'ov',JSON.stringify(m.ov.map(x=>[x.row,+x.px.toFixed(3)])),'efp',JSON.stringify(efp?.map(e=>e.hit)),'tap',JSON.stringify(tap&&{bought:tap.bought,cardStays:tap.cardStays}),'sweepOverlapPositions',sweep.length,JSON.stringify(sweep.map(x=>[x.s,x.place,x.ov[0].px])));
await br.close();srv.close();
