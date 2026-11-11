import { chromium } from '/tmp/efs/game/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
const port=4191; const srv=spawn('npx',['vite','preview','--port',String(port),'--strictPort','--host','127.0.0.1'],{cwd:'/tmp/efs/game',stdio:'ignore'});
await new Promise(r=>setTimeout(r,2000));
const R=[]; const ok=(id,c,i='')=>R.push(`${c?'PASS':'FAIL'} ${id} ${i}`);
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await br.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const U=`http://127.0.0.1:${port}/?debug=1`;
const start=async()=>{ await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm); await p.waitForTimeout(300); await p.evaluate(()=>document.querySelectorAll('details.dbg').forEach(d=>d.open=false)); };
const st=()=>p.evaluate(()=>{const s=window.eggfarm.state;return {coins:s.coinsCents,coop:s.coop,basket:s.basket,c:s.collectionLevel,f:s.farmLevel,pend:s.pendingOfflineEggs}});
const backdate=(ms)=>p.evaluate(ms=>{const k='eggfarm.save';const d=JSON.parse(localStorage.getItem(k));d.savedAt-=ms;window.eggfarm.resetting=true;localStorage.setItem(k,JSON.stringify(d));},ms);
const reload=async()=>{ await p.reload(); await start(); };
const modal=async()=>p.locator('#wbT').count();
await p.goto(U); await start();
const lbl=await p.locator('#collect').textContent(); ok('Fix: no "Collect +0" at start',!/\+0/.test(lbl),`label "${lbl.trim()}"`);
// AC10
const els=['#coins','#basket','#meterText','#queue','#collect']; ok('AC10 HUD elements present',(await Promise.all(els.map(e=>p.locator(e).count()))).every(n=>n>0));
const mt=await p.locator('#meterText').textContent(); ok('AC10 coop fill x/cap',/\/\s*50/.test(mt),mt);
await p.locator('.onb-skip').click().catch(()=>{});
// AC8 save/load
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,coinsCents:12345,coop:20,basket:33,collectionLevel:2,farmLevel:3};g.save();});
await p.reload(); await start(); let s=await st(); ok('AC8 reload restores state',s.coins===12345&&s.basket===33&&s.c===2&&s.f===3&&Math.floor(s.coop)>=20,JSON.stringify(s));
ok('O12 reload <60s: no modal',await modal()===0);
// AC8 autosave <=5s
await p.evaluate(()=>{window.eggfarm.state={...window.eggfarm.state,basket:777};}); await p.waitForTimeout(5600);
const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state.basket); ok('AC8 autosave within 5 s',saved===777,`saved basket ${saved}`);
// AC11: O13/O3 5 min at F3 -> floor(300*.25*4)=300 ; set F0 first
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,farmLevel:0,coop:50,basket:0};g.save();});
await backdate(300000); await reload(); s=await st(); ok('O13 5 min F0: modal + pending 75',await modal()===1&&s.pend===75,JSON.stringify(s));
const coopBefore=s.coop; await p.locator('#wbCollect').click(); await p.waitForTimeout(200); s=await st(); ok('O7 Collect adds 75 to basket, coop unchanged (cap ignored)',s.basket===75&&Math.floor(s.coop)>=Math.floor(coopBefore),JSON.stringify(s));
await p.waitForTimeout(5500); await reload(); ok('O13 immediate reload: no second grant',await modal()===0&&(await st()).basket===75);
// O11 close without collect: 10 min -> 150
await backdate(600000); await reload(); ok('O11 modal shown',await modal()===1); await p.locator('#modal-layer .close').click(); await p.waitForTimeout(200);
s=await st(); ok('O11 close grants +150',s.basket===225&&s.pend===0,JSON.stringify(s));
// O9: reload while modal open
await backdate(600000); await reload(); ok('O9 modal open',await modal()===1); await p.waitForTimeout(300); await reload();
s=await st(); ok('O9 reload with modal open: no second modal, granted once',await modal()===0&&s.basket===375,JSON.stringify(s));
// O4/O5 cap: 7 days
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,basket:0};g.save();}); await backdate(7*864e5); await reload();
const away=await p.locator('#modal-layer').textContent(); s=await st(); ok('O5 7 days -> 1,800 and away shows 2h cap',s.pend===1800&&/2\s*h/.test(away),away.replace(/\s+/g,' ').trim().slice(0,80));
await p.locator('#wbCollect').click();
// O8 clock backwards: savedAt in future
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,basket:0};g.save();}); await backdate(-3600000); await reload(); s=await st();
ok('O8 clock backwards: 0, no modal',await modal()===0&&s.pend===0&&s.basket===0);
// O10 farm level saved: F10 1h -> 9900
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,farmLevel:10,basket:0};g.save();}); await backdate(3600000); await reload(); s=await st(); ok('O10/O3 1h at saved F10 -> 9,900',s.pend===9900,`${s.pend}`);
await p.locator('#wbCollect').click();
// two tabs O9
const p2=await ctx.newPage(); await p2.goto(U); await p2.getByText('Tap to start').click(); await p2.waitForFunction(()=>window.eggfarm); ok('O9 second tab: no modal',await p2.locator('#wbT').count()===0); await p2.close();
// debug replay keeps save
const before=await st(); await p.evaluate(()=>document.querySelectorAll('details.dbg').forEach(d=>d.open=true)); const dbg=await p.locator('button',{hasText:/Replay onboarding/i}); if(await dbg.count()){ await dbg.first().click(); await p.waitForTimeout(800); try{await p.getByText('Tap to start').click({timeout:2000}); await p.waitForFunction(()=>window.eggfarm);}catch{} await p.waitForTimeout(300); const after=await st(); ok('Fix: debug Replay onboarding keeps save',after.f===before.f&&after.basket===before.basket,`${JSON.stringify(before)} -> ${JSON.stringify(after)}`);} else ok('Fix: debug Replay onboarding keeps save',false,'button not found');
// corrupt save
await p.evaluate(()=>{window.eggfarm.resetting=true;localStorage.setItem('eggfarm.save','{garbage');}); await reload(); s=await st(); ok('Corrupt save -> fresh start, no crash',s.coins===0&&s.f===0);
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,coinsCents:500};}); // AC5 UI disabled ($5 < $10, $100)
await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400); const html=await p.locator('#p-upgrades').innerHTML(); const dis=await p.evaluate(()=>[...document.querySelectorAll('#p-upgrades button.buy, #p-upgrades .buy')].map(b=>b.disabled||b.getAttribute('aria-disabled')==='true'||b.classList.contains('disabled'))); if(!dis.length) console.log('UPG HTML',html.slice(0,600)); ok('AC5 buy buttons disabled at 0 coins',dis.length>0&&dis.every(Boolean),JSON.stringify(dis));
ok('No page errors',errs.length===0,errs.join('|'));
console.log(R.join('\n')); console.log('TOTAL',R.length,'FAIL',R.filter(x=>x.startsWith('FAIL')).length);
await br.close(); srv.kill();
