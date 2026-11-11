import { chromium, firefox, webkit } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const [eng='chromium', URL='file:///tmp/relchk/egg-farm.html', only=''] = process.argv.slice(2);
const OUT='/workspace/egg-farm-studio/qa/reviews/m4b/claude-qa';
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const E={chromium,firefox,webkit}[eng];const b=await E.launch(eng==='chromium'?{executablePath:'/usr/bin/google-chrome',headless:true,timeout:60000}:{headless:true,timeout:60000});
const R={eng,url:URL};
async function ctx(w,h){const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();p.__log=[];p.on('console',m=>p.__log.push(`${new Date().toISOString()} [${m.type()}] ${m.text()}`));p.on('pageerror',e=>p.__log.push(`[pageerror] ${e.message}`));return [c,p];}
const start=async p=>{await p.goto(URL,{waitUntil:'load',timeout:60000});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);};
const st=p=>p.evaluate(()=>{try{const d=JSON.parse(localStorage.getItem('eggfarm.save'));const s=d.state;return {c:s.coinsCents,F:s.farmLevel,C:s.collectionLevel,H:s.hensLevel,V:s.eggValueLevel,t7:s.tracksV7,seen:s.seenTracksExplainer,bk:s.basket}}catch(e){return 'ERR '+e.message}});
const exp=p=>p.evaluate(()=>{const e=document.querySelector('.tracks-exp');return e?e.innerText.replace(/\s+/g,' '):null});
async function inject(p,mut){const o=JSON.parse(await p.evaluate(()=>localStorage.getItem('eggfarm.save')));mut(o.state);delete o.saveSeq;const s=JSON.stringify(o.state);
 const raw=`{"version":${o.version},"savedAt":${Date.now()},"sum":"${sum(s)}","state":${s}}`;
 await p.goto('about:blank');const [c2,p2]=[null,null];
 // write via a non-booting page on same origin: load page but don't tap start
 await p.goto(URL,{waitUntil:'load'});await p.evaluate(async r=>{localStorage.setItem('eggfarm.save',r);for(const k of Object.keys(localStorage))if(/bak|v6_backup|backup|corrupt/.test(k))localStorage.removeItem(k);await new Promise(res=>{const q=indexedDB.deleteDatabase('eggfarm');q.onsuccess=q.onerror=q.onblocked=()=>res()});},raw);}
async function fin(name,p,c,data){await p.screenshot({path:`${OUT}/${eng}-${name}.png`}).catch(()=>{});writeFileSync(`${OUT}/${eng}-${name}.console.log`,p.__log.join('\n')+'\n');R[name]=data;console.log(name,JSON.stringify(data).slice(0,700));await c.close();}
const T={
 async fresh(w,h){const [c,p]=await ctx(w,h);await start(p);await p.getByText('Skip',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(9000);const e1=await exp(p);const s1=await st(p);await start(p);await p.waitForTimeout(4000);const e2=await exp(p);
  await fin(`fresh-noexp-w${w}`,p,c,{exp1:e1,exp2:e2,state:s1,state2:await st(p)});},
 async migrate(w,h){const [c,p]=await ctx(w,h);await start(p);await p.waitForTimeout(5500);
  await inject(p,s=>{delete s.tracksV7;delete s.seenTracksExplainer;delete s.v6BackupId;s.hensLevel=0;s.eggValueLevel=0;s.farmLevel=8;s.collectionLevel=6;s.coinsCents=5000000;});
  await p.getByText('Tap to start').click({timeout:60000});let e1=null;for(let i=0;i<20&&!e1;i++){await p.waitForTimeout(500);e1=await exp(p);}
  await p.screenshot({path:`${OUT}/${eng}-migrate-exp-shown-w${w}.png`});const s1=await st(p);await p.waitForTimeout(9000);const eAfter8s=await exp(p);
  await start(p);await p.waitForTimeout(5000);const e2=await exp(p);await start(p);await p.waitForTimeout(4000);const e3=await exp(p);
  await fin(`migrate-reload-w${w}`,p,c,{exp1:e1,state1:s1,eAfter8s,exp2:e2,exp3:e3,state3:await st(p)});},
 async cap(w,h){const [c,p]=await ctx(w,h);await start(p);await p.waitForTimeout(5500);
  await inject(p,s=>{s.farmLevel=29;s.hensLevel=30;s.eggValueLevel=30;s.collectionLevel=30;s.coinsCents=1e17;});
  await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2000);
  if(w<1000)await p.locator('[data-nav=upgrades]').first().click({timeout:5000}).catch(()=>p.getByText('Upgrades',{exact:true}).first().click());await p.waitForTimeout(400);
  await p.locator('[data-tab=farm]').first().click({timeout:5000});await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${eng}-cap-F29-w${w}.png`});
  const fb=p.locator('[data-track=farm] button.buy');const lab=await fb.first().innerText().catch(()=>null);await fb.first().click({timeout:5000}).catch(e=>null);await p.waitForTimeout(800);
  const s1=await st(p);const rows1=await p.evaluate(()=>[...document.querySelectorAll('.tracks .up')].map(r=>({k:r.dataset.track,cls:r.className,t:r.innerText.replace(/\s+/g,' ').slice(0,90),btn:!!r.querySelector('button.buy')})));
  await fb.first().click({timeout:2000}).catch(()=>{});await p.waitForTimeout(500);const s2=await st(p);
  const ov=await p.evaluate(()=>[...document.querySelectorAll('button,.up,.lock,.maxed')].filter(e=>e.getBoundingClientRect().width&&e.scrollWidth>e.clientWidth+1).map(e=>e.className+':'+e.innerText.slice(0,30)));
  await start(p);await p.waitForTimeout(2000);const s3=await st(p);
  await fin(`cap-F30-w${w}`,p,c,{btnLabelAtF29:lab,afterBuy:s1,rows:rows1,afterSecondClick:s2,afterReload:s3,overflow:ov});},
 async best(w,h){const [c,p]=await ctx(w,h);await start(p);await p.waitForTimeout(5500);
  await inject(p,s=>{s.farmLevel=5;s.hensLevel=5;s.eggValueLevel=3;s.collectionLevel=5;s.coinsCents=300000;});
  await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2000);
  if(w<1000)await p.locator('[data-nav=upgrades]').first().click({timeout:5000}).catch(()=>{});await p.waitForTimeout(400);await p.locator('[data-tab=farm]').first().click({timeout:5000});await p.waitForTimeout(500);
  const rows=()=>p.evaluate(()=>[...document.querySelectorAll('.tracks .up')].map(r=>({k:r.dataset.track,best:r.classList.contains('best'),pending:r.classList.contains('pending'),aff:!!r.querySelector('button.affordable'),cost:r.querySelector('.num')?.textContent,t:r.innerText.replace(/\s+/g,' ').slice(0,100)})));
  const r0=await rows();await p.screenshot({path:`${OUT}/${eng}-best-0-w${w}.png`});const seq=[r0];
  for(let i=0;i<4;i++){const bb=p.locator('.tracks .up.best button.buy.affordable');if(!await bb.count())break;await bb.first().click();await p.waitForTimeout(700);seq.push(await rows());}
  const nextGoal=await p.evaluate(()=>document.querySelector('[class*=next-goal],[class*=goal]')?.innerText?.replace(/\s+/g,' ')||null);
  await fin(`best-payback-w${w}`,p,c,{seq,final:await st(p),nextGoal});},
 async lock(w,h){const [c,p]=await ctx(w,h);await start(p);await p.waitForTimeout(5500);const out={};
  for(const [n,F,C] of [['F5C15',5,15],['F0C30',0,30]]){await inject(p,s=>{delete s.tracksV7;delete s.seenTracksExplainer;delete s.v6BackupId;s.hensLevel=0;s.eggValueLevel=0;s.farmLevel=F;s.collectionLevel=C;s.coinsCents=1e12;});
   await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2500);await p.locator('.tracks-exp button').first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(500);
   if(w<1000)await p.locator('[data-nav=upgrades]').first().click({timeout:5000}).catch(()=>{});await p.waitForTimeout(400);await p.locator('[data-tab=farm]').first().click({timeout:5000});await p.waitForTimeout(500);
   const rows=()=>p.evaluate(()=>[...document.querySelectorAll('.tracks .up')].map(r=>({k:r.dataset.track,t:r.innerText.replace(/\s+/g,' ').slice(0,140),lockAria:r.querySelector('.lock')?.getAttribute('aria-label')})));
   const seq=[{st:await st(p),rows:await rows()}];await p.screenshot({path:`${OUT}/${eng}-lock-${n}-0-w${w}.png`});
   for(let i=0;i<2;i++){await p.locator('[data-track=farm] button.buy').first().click({timeout:5000}).catch(()=>{});await p.waitForTimeout(700);seq.push({st:await st(p),rows:await rows()});}
   await p.screenshot({path:`${OUT}/${eng}-lock-${n}-2-w${w}.png`});out[n]=seq;}
  await inject(p,s=>{s.farmLevel=27;s.hensLevel=27;s.eggValueLevel=27;s.coinsCents=1e17;});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2000);
  if(w<1000)await p.locator('[data-nav=upgrades]').first().click({timeout:5000}).catch(()=>{});await p.waitForTimeout(400);await p.locator('[data-tab=farm]').first().click({timeout:5000});await p.waitForTimeout(500);
  out.F27=await p.evaluate(()=>document.querySelector('[data-track=farm]')?.innerText.replace(/\s+/g,' '));await p.screenshot({path:`${OUT}/${eng}-lock-F27-farmrow-w${w}.png`});
  await fin(`lock-text-w${w}`,p,c,out);},
 async big(w,h){const [c,p]=await ctx(w,h);await start(p);await p.waitForTimeout(5500);const out={};
  for(const [n,m] of [['k12960',s=>{s.basket=12960;s.coinsCents=500;s.customers=[{id:901,demand:20000,filled:0,waitedS:0}]}],['b999',s=>{s.basket=999.9e9;s.coinsCents=1e8;s.customers=[{id:902,demand:999.9e9,filled:0,waitedS:0},{id:903,demand:1.2e12,filled:5e11,waitedS:0}]}],['t1500',s=>{s.basket=1.5e15;s.coinsCents=9.99e17;s.customers=[{id:904,demand:2e15,filled:0,waitedS:0},{id:905,demand:1e18,filled:0,waitedS:0}]}]]){
   await inject(p,s=>{m(s);s.nextCustomerInS=999;});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1200);
   const hud=await p.evaluate(()=>({pill:document.querySelector('.hud, header')?.innerText?.replace(/\s+/g,' ').slice(0,40),live:document.querySelector('#live')?.textContent}));
   if(w<1000)await p.getByText('Market',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(600);
   out[n]={hud,orders:await p.evaluate(()=>[...document.querySelectorAll('.order')].filter(o=>o.getBoundingClientRect().width).map(o=>{const l=o.querySelector('.l1');const g=document.createRange();g.selectNodeContents(l);const r=l.getBoundingClientRect(),t=g.getBoundingClientRect();return {t:o.innerText.replace(/\s+/g,' '),l1w:Math.round(r.width),tw:Math.round(t.width),clip:t.right>r.right+1}})),sellAll:await p.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>/Sell all/.test(x.innerText)).map(x=>x.innerText))};
   await p.screenshot({path:`${OUT}/${eng}-big-${n}-w${w}.png`});}
  await p.goto(URL+'?marketSeed=7');await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);out.seed1=(await p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state.rng));
  await fin(`big-numbers-w${w}`,p,c,out);},
};
const sizes=eng==='chromium'?[[360,740],[1280,800]]:[[360,740]];
for(const k of Object.keys(T)) if(!only||only.split(',').includes(k)) for(const [w,h] of (k==='big'&&eng==='chromium'?[[320,740],[360,740],[1280,800]]:sizes)){try{await T[k](w,h)}catch(e){console.log('ERR',k,w,e.message.slice(0,250));R[`${k}-${w}`]={err:e.message.slice(0,250)}}}
writeFileSync(`${OUT}/${eng}-results${only?'-'+only.replace(/,/g,'_'):''}.json`,JSON.stringify(R,null,1));await b.close();
