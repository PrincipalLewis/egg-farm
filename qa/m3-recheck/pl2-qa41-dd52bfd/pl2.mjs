import { chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const URL=process.env.URL||'http://127.0.0.1:4417/',OUT=process.env.OUT||'.',SHA7=process.env.SHA7||'dd52bfd';
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const parse=t=>{const m=t.replace(/[$,]/g,'').match(/([\d.]+)([KMBT]?)/);if(!m)return NaN;return +m[1]*({'':1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]])};
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome'});const R={sizes:{}};let tries=0,fails=[];
for(const [w,h] of [[1280,800],[390,844]]){
 const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const log=[];
 p.on('console',m=>log.push(`[${m.type()}] ${m.text()}`));p.on('pageerror',e=>log.push(`[pageerror] ${e.message}`));
 await p.goto(URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);
 await p.getByText('Skip',{exact:true}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(4000);
 const bid=await p.evaluate(async()=>{for(const sc of document.querySelectorAll('script[src]')){const m=(await(await fetch(sc.src)).text()).match(/m3-rc1-pre\+[0-9a-f]{7,}/);if(m)return m[0];}return null});
 if(bid!==`m3-rc1-pre+${SHA7}`)throw new Error('build-id '+bid);
 const base=JSON.parse(await p.evaluate(()=>localStorage.getItem('eggfarm.save')));
 Object.assign(base.state,{coinsCents:1370000,farmLevel:18,collectionLevel:12,basket:3000,coop:200,
  workers:{market_hand:{energy:60,cdS:2},coop_hand:{energy:60,cdS:2},hawker:{energy:60,cdS:0},grader:{energy:60,cdS:0}},graderTier:1,manageCdS:0,nextCustomerInS:2});
 const st=JSON.stringify(base.state);const raw=`{"version":${base.version},"savedAt":${Date.now()},"sum":"${sum(st)}","state":${st}}`;
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},raw);
 await p.goto(URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1500);
 await p.locator('#wbCollect').click({timeout:1500}).catch(()=>{});
 // recorder: every HUD coin text change + sync read around each tab click
 await p.evaluate(()=>{window.__h=[];const el=document.querySelector('#coins');new MutationObserver(()=>__h.push([performance.now(),el.textContent])).observe(el,{childList:true,characterData:true,subtree:true});
  document.querySelector('.tabs').addEventListener('click',()=>{__h.push([performance.now(),'TAB-pre '+el.textContent]);requestAnimationFrame(()=>__h.push([performance.now(),'TAB-raf '+el.textContent]))},true);});
 const openUp=async()=>{if(w<1000){if(!(await p.locator('#p-upgrades').isVisible()))await p.locator('[data-nav=upgrades]').click();}};
 const tab=async t=>{await openUp();await p.locator(`[data-tab=${t}]`).click();};
 const assertFarm=async()=>{await p.waitForFunction(()=>document.querySelector('[data-tab=farm]').classList.contains('active')&&!!document.querySelector('#uRow [data-kind=farm]'),null,{timeout:3000});};
 const coins=()=>p.evaluate(()=>document.querySelector('#coins').textContent);
 const variants={
  single:async()=>{await tab('farm')},
  rapid5:async()=>{for(let i=0;i<5;i++)await tab('farm')},
  rapid5_noDelay:async()=>{await openUp();await p.evaluate(()=>{for(let i=0;i<5;i++)document.querySelector('[data-tab=farm]').click()})},
  tickOffset:async()=>{await p.waitForTimeout(Math.random()*1000);await tab('farm')},
  afterSell:async()=>{if(w<1000){await p.keyboard.press('Escape');await p.locator('[data-nav=market]').click().catch(()=>{});}await p.locator('#sellAll').click({timeout:2000}).catch(()=>{});await p.keyboard.press('Escape').catch(()=>{});await tab('farm')},
  afterBuyColl:async()=>{await tab('collection');await p.locator('#uRow button.btn.buy').first().click({timeout:2000}).catch(()=>{});await tab('farm');await tab('farm')},
  afterBuyFarm:async()=>{await tab('farm');await p.locator('#uRow [data-kind=farm]').click({timeout:2000}).catch(()=>{});await tab('farm')},
  afterSwitch:async()=>{await tab('workers');await tab('farm');await tab('farm')},
  afterEscape:async()=>{await tab('farm');await p.keyboard.press('Escape');await tab('farm')},
  afterManageAll:async()=>{await tab('workers');await p.locator('#uRow [data-act=manageAll]').click({timeout:1500}).catch(()=>{});await tab('farm');await tab('farm')},
 };
 await tab('farm');await assertFarm();const res=[];const c0=parse(await coins());if(!(c0>10000))throw new Error('injection failed, HUD '+c0);
 const ROUNDS=+(process.env.ROUNDS||2),NOBUY=!!process.env.NOBUY;
 for(let round=0;round<ROUNDS;round++)for(const [n,fn] of Object.entries(variants)){if(NOBUY&&/afterBuy|ManageAll/.test(n))continue;
  await p.evaluate(()=>__h.length=0);const before=parse(await coins());await fn();await assertFarm();
  const hudNow=await coins();await p.waitForTimeout(600);const hudLater=await coins();
  const hist=await p.evaluate(()=>__h);const vals=hist.map(x=>parse(x[1].replace(/^TAB-\w+ /,''))).filter(Number.isFinite);
  // a drop >5% between consecutive samples w/o a buy variant is a repro candidate
  let worst=0;for(let i=1;i<vals.length;i++)worst=Math.max(worst,(vals[i-1]-vals[i])/vals[i-1]);
  const bought=/afterBuy|ManageAll/.test(n);const bad=!bought&&worst>0.05;tries++;
  const r={try:tries,w,variant:n,before,hudNow,hudLater,samples:vals.length,maxDropPct:+(worst*100).toFixed(2),bad};res.push(r);
  if(bad){fails.push(r);await p.screenshot({path:`${OUT}/pl2-FAIL-${tries}-w${w}.png`});}
 }
 await assertFarm();R.sizes[w]={bid,res,stateCoins:await p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state.coinsCents),hud:await coins()};
 await p.screenshot({path:`${OUT}/pl2-farmtab-final-w${w}.png`});
 writeFileSync(`${OUT}/pl2-w${w}.console.log`,log.join('\n')+'\n');await c.close();}
R.tries=tries;R.fails=fails;writeFileSync(`${OUT}/pl2-results${process.env.TAG||''}.json`,JSON.stringify(R,null,1));await b.close();
console.log('tries',tries,'fails',fails.length);for(const w in R.sizes)for(const r of R.sizes[w].res)console.log(JSON.stringify(r));
