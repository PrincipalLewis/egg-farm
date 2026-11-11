import { chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const URL='http://127.0.0.1:4391/',OUT='/workspace/egg-farm-studio/qa/claude-qa/rc1-qa-bugs-v4-7d52952';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,timeout:60000});const R={};
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const SC={
 k12960:{basket:12960,coinsCents:500,customers:[{id:901,demand:20000,filled:0,waitedS:0}]},
 b999:{basket:999.9e9,coinsCents:12345678900,customers:[{id:902,demand:999.9e9,filled:0,waitedS:0},{id:903,demand:1.2e12,filled:5e11,waitedS:0}]},
 t1500:{basket:1.5e15,coinsCents:9.99e17,customers:[{id:904,demand:2e15,filled:0,waitedS:0},{id:905,demand:1e18,filled:0,waitedS:0}]},
};
const audit=p=>p.evaluate(()=>{const out=[];for(const o of document.querySelectorAll('.order')){if(!o.getBoundingClientRect().width)continue;const q=s=>o.querySelector(s);const chk=e=>{if(!e)return null;const r=e.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(e);const t=g.getBoundingClientRect();return {w:Math.round(r.width),tw:Math.round(t.width),clipped:t.right>r.right+1||t.left<r.left-1||e.scrollWidth>e.clientWidth+1}};
 out.push({text:o.innerText.replace(/\s+/g,' '),btnAria:q('button')?.getAttribute('aria-label'),btn:chk(q('button')),sk:chk(q('.sk')),sy:chk(q('.sy')),l1:chk(q('.l1')),v:chk(q('.v')),n:chk(q('.n'))});}
 const sa=[...document.querySelectorAll('button')].filter(x=>/Sell all/.test(x.innerText)).map(x=>({t:x.innerText,...(()=>{const r=x.getBoundingClientRect();return {w:Math.round(r.width),sw:x.scrollWidth,cw:x.clientWidth}})()}));
 return {orders:out,sellAll:sa,hud:document.body.innerText.slice(0,40).replace(/\s+/g,' ')};});
for(const w of [320,360,390,1280]){const h=w>1000?800:740;const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const log=[];
 p.on('console',m=>log.push(`${new Date().toISOString()} [${m.type()}] ${m.text()}`));p.on('pageerror',e=>log.push(`[pageerror] ${e.message}`));R[w]={};
 try{await p.goto(URL,{waitUntil:'load',timeout:60000});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);
  await p.getByText('Skip',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(5500);
  const base=await p.evaluate(()=>localStorage.getItem('eggfarm.save'));
  for(const [n,s] of Object.entries(SC)){const o=JSON.parse(base);Object.assign(o.state,s,{nextCustomerInS:999});const st=JSON.stringify(o.state);
   const raw=`{"version":${o.version},"savedAt":${Date.now()},"sum":"${sum(st)}","state":${st}}`;
   await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},raw);
   await p.goto(URL,{waitUntil:'load'});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);
   if(w<1000)await p.getByText('Market',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(700);
   R[w][n]=await audit(p);await p.screenshot({path:`${OUT}/orders-${n}-w${w}.png`});}
 }catch(e){R[w].err=e.message.slice(0,200)}
 writeFileSync(`${OUT}/orders-w${w}.console.log`,log.join('\n')+'\n');await c.close();}
// marketSeed in release
const seeds=[];for(let i=0;i<2;i++){const c=await b.newContext();const p=await c.newPage();await p.goto(URL+'?marketSeed=7');await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2000);seeds.push(await p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state.rng));
 if(i==1)await p.screenshot({path:`${OUT}/marketseed-release.png`});await c.close();}
R.marketSeedRng=seeds;
writeFileSync(`${OUT}/orders.json`,JSON.stringify(R,null,1));await b.close();console.log(JSON.stringify(R).slice(0,12000));
