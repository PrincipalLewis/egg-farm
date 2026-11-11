import pw from 'playwright-core'; import { spawn } from 'node:child_process';
const [SHA, PORT, OUT] = process.argv.slice(2); const base=`http://127.0.0.1:${PORT}/`;
const srv = spawn('npx',['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'],{stdio:'ignore',detached:true});
const kill=()=>{try{process.kill(-srv.pid,'SIGTERM')}catch{}}; setTimeout(()=>{kill();process.exit(2)},300000).unref();
for(let i=0;i<120;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,250))}}
const h=await (await fetch(base)).text(); const j=h.match(/assets\/index-[^"]+\.js/)[0]; const id=((await (await fetch(base+j)).text()).match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/)||[])[0]; console.log('build',id); if(!id?.endsWith(SHA)){kill();process.exit(4)}
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
const cust=[1,2,3,4,5].map(i=>({id:i,demand:6,filled:0,waitedS:0}));
const S={coinsCents:995,coop:0,basket:30,collectionLevel:5,farmLevel:6,customers:cust,nextCustomerInS:1e9,nextCustomerId:9,rng:5,pendingOfflineEggs:0,celebratedTier:2,workers:{},graderTier:0,manageCdS:0,coopFullS:0};
for (const [w,hh] of [[360,640],[390,844]]) {
 const ctx=await br.newContext({viewport:{width:w,height:hh},hasTouch:true,deviceScaleFactor:2}); const p=await ctx.newPage();
 await p.addInitScript(([u,s])=>{if(sessionStorage.getItem('x'))return;localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify({version:5,savedAt:Date.now(),state:s}));sessionStorage.setItem('x','1')},[UI,S]);
 await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm); await p.waitForTimeout(400);
 await p.locator('[data-nav=market]').click({force:true}).catch(()=>{}); await p.waitForTimeout(500);
 const pre=await p.evaluate(()=>({label:document.querySelector('#sellAll')?.textContent, rows:[...document.querySelectorAll('#mRows .order')].filter(e=>e.getClientRects().length).map(e=>e.querySelector('.l1')?.textContent), more:document.querySelector('.queue-more')?.textContent?.trim(), coins:document.querySelector('#coins')?.textContent, basket:document.querySelector('#basket')?.textContent}));
 await p.screenshot({path:`${OUT}/P4-${SHA}-${w}x${hh}-before.png`});
 await p.locator('#sellAll').click(); await p.waitForTimeout(600);
 const post=await p.evaluate(()=>({coins:document.querySelector('#coins')?.textContent,basket:document.querySelector('#basket')?.textContent,label:document.querySelector('#sellAll')?.textContent, st:(()=>{try{const s=window.eggfarm.state??window.eggfarm.getState?.();return {basket:s.basket,coins:s.coinsCents,n:s.customers.length}}catch(e){return String(e)}})()}));
 await p.screenshot({path:`${OUT}/P4-${SHA}-${w}x${hh}-after.png`});
 console.log(JSON.stringify({w,hh,pre,post})); await ctx.close(); }
await br.close(); kill(); process.exit(0);
