import pw from 'playwright-core'; import { spawn } from 'node:child_process';
const [SHA, PORT, OUT] = process.argv.slice(2); const base=`http://127.0.0.1:${PORT}/`;
const srv = spawn('npx',['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'],{stdio:'ignore',detached:true});
const kill=()=>{try{process.kill(-srv.pid,'SIGTERM')}catch{}}; setTimeout(()=>{kill();process.exit(2)},500000).unref();
for(let i=0;i<120;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,250))}}
const h=await (await fetch(base)).text(); const j=h.match(/assets\/index-[^"]+\.js/)[0]; const id=((await (await fetch(base+j)).text()).match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/)||[])[0]; console.log('build',id); if(!id?.endsWith(SHA)){kill();process.exit(4)}
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
const st=(F,C)=>({coinsCents:100,coop:0,basket:0,collectionLevel:C,farmLevel:F,customers:[],nextCustomerInS:1e9,nextCustomerId:9,rng:5,pendingOfflineEggs:0,celebratedTier:2,workers:{},graderTier:0,manageCdS:0,coopFullS:0});
for (const [w,hh] of [[360,800],[375,800],[390,844]]) for (const [F,C] of [[3,19],[1,9],[5,29],[1,20],[3,40]]) {
 const ctx=await br.newContext({viewport:{width:w,height:hh},hasTouch:true,deviceScaleFactor:2}); const p=await ctx.newPage();
 await p.addInitScript(([u,s])=>{if(sessionStorage.getItem('x'))return;localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify({version:5,savedAt:Date.now(),state:s}));sessionStorage.setItem('x','1')},[UI,st(F,C)]);
 await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm); await p.waitForTimeout(400);
 await p.locator('[data-nav=upgrades]').click({force:true}).catch(()=>{}); await p.locator('[data-tab=collection]').first().click().catch(()=>{});
 await p.waitForSelector('#uRow .up',{timeout:5000}).catch(()=>{}); await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{ const card=[...document.querySelectorAll('#uRow .up')].find(e=>e.getClientRects().length&&/Collect per tap/.test(e.textContent)); if(!card) return null; card.scrollIntoView({block:'center'});
  const vis=el=>{const r=el.getBoundingClientRect(); if(!(r.width>0&&r.height>0))return false; for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e); if(+cs.opacity===0||cs.visibility==='hidden')return false} return true};
  const parts=[...card.querySelectorAll('.btn, .vchip, .hint, .link, h3, .name, .title, .eff, .cost, .lvl, [class*=chip], li')].filter(vis).filter((e,i,a)=>!a.some(o=>o!==e&&o.contains(e)&&!(o.classList.contains('hint')&&e.classList.contains('link'))));
  // treat hint text box tightly: use Range rects for .hint text
  const R=e=>{const a=e.getBoundingClientRect();return [a.left,a.top,a.right,a.bottom]}; const ov=[];
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){ if(parts[i].contains(parts[j])||parts[j].contains(parts[i]))continue; const a=R(parts[i]),b=R(parts[j]); const x=Math.min(a[2],b[2])-Math.max(a[0],b[0]),y=Math.min(a[3],b[3])-Math.max(a[1],b[1]); if(x>0.5&&y>0.5) ov.push([parts[i].className+':'+parts[i].textContent.trim().slice(0,25),parts[j].className+':'+parts[j].textContent.trim().slice(0,25),+x.toFixed(1),+y.toFixed(1)]); }
  // text-level: glyph rect overlap among hint texts
  const tr=e=>{const g=document.createRange(); g.selectNodeContents(e); return [...g.getClientRects()].filter(q=>q.width>1).map(q=>[q.left,q.top,q.right,q.bottom])};
  const hints=[...card.querySelectorAll('.hint')].filter(vis); const tov=[];
  for(let i=0;i<hints.length;i++)for(let j=i+1;j<hints.length;j++) for(const a of tr(hints[i])) for(const b of tr(hints[j])){const x=Math.min(a[2],b[2])-Math.max(a[0],b[0]),y=Math.min(a[3],b[3])-Math.max(a[1],b[1]); if(x>0.5&&y>0.5) tov.push([hints[i].textContent.trim().slice(0,20),hints[j].textContent.trim().slice(0,25),+x.toFixed(1),+y.toFixed(1)])}
  const cr=R(card); const out=parts.filter(p=>{const r=R(p);return r[0]<cr[0]-0.5||r[2]>cr[2]+0.5||r[1]<cr[1]-0.5||r[3]>cr[3]+0.5}).map(p=>p.className);
  return {need:/Need \$/.test(card.textContent), coop:!!card.querySelector('.hint.coop'), hints:hints.map(e=>[e.className,e.textContent.trim().slice(0,40),R(e).map(Math.round)]), ov, tov, out, card:cr.map(Math.round)}; });
 if (r?.need && (r.coop || F===3&&C===19)) { const [x,y,x2,y2]=r.card; await p.screenshot({path:`${OUT}/P3-${SHA}-${w}x${hh}-F${F}C${C}.png`,clip:{x:Math.max(0,x-6),y:Math.max(0,y-6),width:Math.min(w-Math.max(0,x-6),x2-x+12),height:Math.min(hh,y2-y+12)}}).catch(()=>{}); }
 console.log(JSON.stringify({w,F,C,...r}));
 await ctx.close(); }
await br.close(); kill(); process.exit(0);
