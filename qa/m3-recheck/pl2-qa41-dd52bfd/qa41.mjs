import { chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const URL=process.env.URL||'http://127.0.0.1:4417/',OUT='.',SHA7=process.env.SHA7||'dd52bfd';
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const SC={
 b999:{basket:999.9e9,coinsCents:12345678900,customers:[{id:902,demand:999.9e9,filled:0,waitedS:0},{id:903,demand:1.2e12,filled:5e11,waitedS:0}]},
 t1500:{basket:1.5e15,coinsCents:9.99e17,customers:[{id:904,demand:2e15,filled:0,waitedS:0},{id:905,demand:1e18,filled:0,waitedS:0}]},
 t5:{basket:5e12,coinsCents:5e16,customers:[{id:906,demand:9.9e12,filled:1e12,waitedS:0},{id:907,demand:123.4e12,filled:0,waitedS:0}]},
};
const b=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});const R={};
for(const w of [320,360]){const c=await b.newContext({viewport:{width:w,height:800}});const p=await c.newPage();const log=[];p.on('pageerror',e=>log.push(e.message));R[w]={};
 await p.goto(URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);await p.getByText('Skip',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(4000);
 R.bid=await p.evaluate(async()=>{for(const sc of document.querySelectorAll('script[src]')){const m=(await(await fetch(sc.src)).text()).match(/m3-rc1-pre\+[0-9a-f]{7,}/);if(m)return m[0];}return null});
 if(R.bid!==`m3-rc1-pre+${SHA7}`)throw new Error(R.bid);
 const base=await p.evaluate(()=>localStorage.getItem('eggfarm.save'));
 for(const [n,s] of Object.entries(SC)){const o=JSON.parse(base);Object.assign(o.state,s,{nextCustomerInS:999});const st=JSON.stringify(o.state);
  const raw=`{"version":${o.version},"savedAt":${Date.now()},"sum":"${sum(st)}","state":${st}}`;
  await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},raw);
  await p.goto(URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);
  await p.locator('[data-nav=market]').click();await p.waitForTimeout(700);
  // assert Market sheet is the active panel with order cards
  await p.waitForFunction(()=>{const m=document.querySelector('#p-market');return m&&!m.hidden&&document.querySelector('[data-nav=market]').classList.contains('on')&&document.querySelectorAll('#mRows .order').length>=2},null,{timeout:3000});
  R[w][n]=await p.evaluate(()=>{const out=[];for(const o of document.querySelectorAll('#mRows .order')){if(!o.getBoundingClientRect().width)continue;
   const els=[...o.querySelectorAll('.l1,.n,.egg,.v,.sk,.sy,button')];const info=e=>{const r=e.getBoundingClientRect(),g=document.createRange();g.selectNodeContents(e);const t=g.getBoundingClientRect(),cs=getComputedStyle(e);
    return {sel:e.tagName==='BUTTON'?'button':'.'+e.className.split(' ')[0],text:e.innerText.replace(/\s+/g,' '),w:+r.width.toFixed(1),textW:+t.width.toFixed(1),sw:e.scrollWidth,cw:e.clientWidth,overflowX:e.scrollWidth>e.clientWidth+1,inkPastBox:t.right>r.right+1,ellipsis:cs.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth,overflow:cs.overflow}};
   const I=els.map(info);const ov=[];const rs=els.map(e=>e.getBoundingClientRect());
   for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){if(els[i].contains(els[j])||els[j].contains(els[i]))continue;const a=rs[i],c=rs[j];if(a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom)ov.push([I[i].sel,I[j].sel])}
   out.push({card:o.innerText.replace(/\s+/g,' '),els:I,overlaps:ov});}return out;});
  await p.screenshot({path:`${OUT}/qa41-${n}-w${w}.png`});}
 R[w].pageerrors=log;await c.close();}
writeFileSync(`${OUT}/qa41-results.json`,JSON.stringify(R,null,1));await b.close();
for(const w of [320,360])for(const n in SC)for(const o of R[w][n])console.log(w,n,'|',o.card,'| clipped:',o.els.filter(e=>e.overflowX||e.inkPastBox).map(e=>`${e.sel} ${e.textW}/${e.w} sw${e.sw}>cw${e.cw} ell=${e.ellipsis}`).join('; ')||'none','| overlaps:',JSON.stringify(o.overlaps));
