import { chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const URL='http://127.0.0.1:4392/',OUT='/workspace/egg-farm-studio/qa/claude-qa/m3-rc1-pre-dd52bfd';
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,timeout:60000});const R={};
for(const [vp,w,h] of [['mobile',390,844],['desktop',1280,800]]){const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const log=[];
 p.on('console',m=>log.push(`${new Date().toISOString()} [${m.type()}] ${m.text()}`));p.on('pageerror',e=>log.push(`[pageerror] ${e.message}`));
 try{await p.goto(URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);await p.getByText('Skip',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(5500);
 const o=JSON.parse(await p.evaluate(()=>localStorage.getItem('eggfarm.save')));Object.assign(o.state,{coinsCents:100000000});delete o.saveSeq;const st=JSON.stringify(o.state);
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},`{"version":${o.version},"savedAt":${Date.now()},"sum":"${sum(st)}","state":${st}}`);
 await p.goto(URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2000);
 const S=()=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eggfarm.save')).state;return {c:s.coinsCents,cl:s.collectionLevel,fl:s.farmLevel}});
 const s0=await S();
 await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
 if(w<1000)await p.getByText('Upgrades',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(400);
 for(let i=0;i<3;i++){await p.locator('button.affordable').first().click({timeout:5000}).catch(e=>R.err=e.message.slice(0,80));await p.waitForTimeout(300);}
 const hud1=await p.evaluate(()=>document.body.innerText.slice(0,40));const s1=await S();await p.screenshot({path:`${OUT}/hidden-buy-1-bought-${vp}.png`});
 await p.waitForTimeout(63000);
 await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});
 await p.waitForTimeout(1500);const hud2=await p.evaluate(()=>document.body.innerText.slice(0,400));const s2=await S();await p.screenshot({path:`${OUT}/hidden-buy-2-shown-${vp}.png`});
 R[vp]={s0,afterBuyHidden:s1,hud1,afterShow:s2,hud2};}catch(e){R[vp]={err:e.message.slice(0,200)}}
 writeFileSync(`${OUT}/hidden-buy-${vp}.console.log`,log.join('\n')+'\n');await c.close();}
writeFileSync(`${OUT}/hidden-buy.json`,JSON.stringify(R,null,1));await b.close();console.log(JSON.stringify(R));
