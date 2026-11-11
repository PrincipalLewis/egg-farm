import { chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const URL='http://127.0.0.1:4391/',OUT='/workspace/egg-farm-studio/qa/claude-qa/rc1-qa-bugs-v4-7d52952';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,timeout:60000});const R={};
const audit=p=>p.evaluate(()=>{const bad=[];const vw=innerWidth;for(const e of document.querySelectorAll('button,.btn,[class*=order],[class*=card],[class*=sell]')){const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==='hidden')continue;
 const ov=e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+2;const off=r.left<-1||r.right>vw+1;
 let clip=false;const rg=document.createRange();rg.selectNodeContents(e);const tr=rg.getBoundingClientRect();if(tr.width&&(tr.left<r.left-1||tr.right>r.right+1))clip=true;
 if(ov||off||clip)bad.push({cls:e.className,txt:(e.innerText||'').replace(/\s+/g,' ').slice(0,50),w:Math.round(r.width),l:Math.round(r.left),r:Math.round(r.right),sw:e.scrollWidth,cw:e.clientWidth,tw:Math.round(tr.width),ov,off,clip});}
 return {bad,docOverflow:document.documentElement.scrollWidth>vw,globals:Object.keys(window).filter(k=>/eggfarm|debug|qa|perf/i.test(k)),perfOv:!!document.querySelector('.perf-ov,.debug,[class*=debug]')};});
for(const w of [320,360,390,1280]){const h=w>1000?800:740;const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const log=[];
 p.on('console',m=>log.push(`${new Date().toISOString()} [${m.type()}] ${m.text()}`));p.on('pageerror',e=>log.push(`[pageerror] ${e.message}`));
 const r={steps:[]};try{
 await p.goto(URL+'?debug=1&perf=1&ios=1&qa=1',{waitUntil:'load',timeout:60000});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2000);
 r.globalsDebugUrl=await p.evaluate(()=>Object.keys(window).filter(k=>/eggfarm/i.test(k)));
 r.abuse=await p.evaluate(()=>{try{const s=JSON.parse(window.eggfarmExportTelemetry());return {type:typeof s,keys:Object.keys(s).slice(0,12),hasInstall:JSON.stringify(s).includes('install')}}catch(e){return 'err '+e.message}});
 const cap=async n=>{await p.waitForTimeout(300);const t=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,300));r.steps.push({n,t});await p.screenshot({path:`${OUT}/w${w}-${n}.png`});};
 await cap('0-start');
 for(let i=0;i<12;i++){await p.mouse.click(w/2,h*0.45);await p.waitForTimeout(100);} const coll=p.getByText(/^Collect/).first();for(let i=0;i<4;i++){await coll.click({timeout:5000}).catch(()=>{});await p.waitForTimeout(150);}
 await cap('1-collected');await p.waitForTimeout(12000);await cap('2-customer-wait');
 const cust=p.locator('[class*=customer]').first();await cust.click({timeout:5000}).catch(e=>r.custErr=e.message.slice(0,80));await cap('3-tapped-customer');
 const mk=p.getByText('Market',{exact:true}).first();if(w<1000)await mk.click({timeout:3000}).catch(()=>{});await cap('4-market');
 r.auditMarket=await audit(p);
 const sell=p.getByRole('button',{name:/^Sell/}).first();r.sellLabel=await sell.innerText().catch(()=>null);r.sellAria=await sell.getAttribute('aria-label').catch(()=>null);
 await sell.click({timeout:5000}).catch(e=>r.sellErr=e.message.slice(0,80));await cap('5-after-sell');r.auditAfter=await audit(p);
 }catch(e){r.err=e.message.slice(0,200)}
 await p.screenshot({path:`${OUT}/w${w}-final.png`}).catch(()=>{});writeFileSync(`${OUT}/w${w}.console.log`,log.join('\n')+'\n');R[w]=r;await c.close();}
writeFileSync(`${OUT}/explore.json`,JSON.stringify(R,null,1));await b.close();console.log(JSON.stringify(R).slice(0,9000));
