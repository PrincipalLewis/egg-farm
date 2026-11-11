import pw from 'playwright-core'; import { spawn } from 'node:child_process';
const [SHA, PORT, OUT] = process.argv.slice(2); const base=`http://127.0.0.1:${PORT}/`;
const srv = spawn('npx',['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'],{stdio:'ignore',detached:true});
const kill=()=>{try{process.kill(-srv.pid,'SIGTERM')}catch{}}; setTimeout(()=>{kill();process.exit(2)},500000).unref();
for(let i=0;i<120;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,250))}}
const h=await (await fetch(base)).text(); const j=h.match(/assets\/index-[^"]+\.js/)[0]; const id=((await (await fetch(base+j)).text()).match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/)||[])[0]; console.log('build',id); if(!id?.endsWith(SHA)){kill();process.exit(4)}
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const UI={onboardingDone:true,seenSlots:10,workersIntroA:false,workersIntroB:false,sfx:false};
const cust=[1,2,3].map(i=>({id:i,demand:50,filled:0,waitedS:0}));
const S={coinsCents:4000,coop:1e6,basket:0,collectionLevel:3,farmLevel:3,customers:cust,nextCustomerInS:1e9,nextCustomerId:9,rng:5,pendingOfflineEggs:0,celebratedTier:0,workers:{},graderTier:0,manageCdS:0,coopFullS:0};
const R=s=>`(()=>{const e=typeof ${s}==='string'?document.querySelector(${s}):${s};if(!e||!e.getClientRects().length||e.hidden)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(v=>+v.toFixed(1))})()`;
const measure = (p, tipSel, targets) => p.evaluate(([tipSel,targets])=>{ const rect=e=>{if(!e||!e.getClientRects().length||e.closest('[hidden]'))return null;const r=e.getBoundingClientRect();return r.width&&r.height?[r.left,r.top,r.right,r.bottom].map(v=>+v.toFixed(1)):null};
 const tip=rect(document.querySelector(tipSel)); const out={tip,tipText:document.querySelector(tipSel)?.textContent.trim().slice(0,60),ov:{}};
 for(const [n,s] of Object.entries(targets)){ const e=document.querySelector(s); const t=rect(e); if(!t){out.ov[n]='absent';continue}
  const x=tip?Math.min(tip[2],t[2])-Math.max(tip[0],t[0]):0,y=tip?Math.min(tip[3],t[3])-Math.max(tip[1],t[1]):0;
  const cx=(t[0]+t[2])/2,cy=(t[1]+t[3])/2; const top=document.elementFromPoint(cx,cy); const covered=!!top&&!!top.closest(tipSel);
  out.ov[n]={rect:t,ix:+Math.max(0,x).toFixed(1),iy:+Math.max(0,y).toFixed(1),areaPct:x>0.5&&y>0.5?+(100*x*y/((t[2]-t[0])*(t[3]-t[1]))).toFixed(0):0,centerCovered:covered}; }
 return out; },[tipSel,targets]);
const W={name:'[data-w=market_hand] h3',desc:'[data-w=market_hand] .meta',hire:'[data-w=market_hand] [data-act=hire]',ebar:'[data-w=market_hand] .ebar',manage:'[data-w=market_hand] [data-act=manage]',tabCollection:'[data-tab=collection]',tabFarm:'[data-tab=farm]',tabWorkers:'[data-tab=workers]'};
for (const [w,hh] of (process.env.VP==="s"?[[375,700]]:[[360,800],[390,844],[1280,720]])) { const tag=`${SHA}-${w}x${hh}`;
 const ctx=await br.newContext({viewport:{width:w,height:hh},...(w<600?{hasTouch:true,deviceScaleFactor:2}:{})}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([u,s])=>{if(sessionStorage.getItem('x'))return;localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify({version:5,savedAt:Date.now(),state:s}));sessionStorage.setItem('x','1')},[UI,S]);
 await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm);
 await p.waitForSelector('.intro-a',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(600);
 // P2
 const p2=await measure(p,'.intro-a',{queue:'#queue',chip1:'#queue .chip:not(.empty)',full:'#full',hud:'#coins'});
 const qr=await p.evaluate(()=>{const c=[...document.querySelectorAll('#queue .chip')].filter(e=>e.getClientRects().length);return c.length});
 await p.screenshot({path:`${OUT}/P2-${tag}-newhelper.png`}); console.log('P2',tag,JSON.stringify(p2),'chips',qr);
 // P1a
 await p.locator('#iaOpen').click(); await p.waitForTimeout(700);
 const p1a=await measure(p,'.coach',W); await p.screenshot({path:`${OUT}/P1-${tag}-hiretip.png`}); console.log('P1a',tag,JSON.stringify(p1a));
 // tap Hire as a player would (center of button)
 const hb=await p.locator('[data-w=market_hand] [data-act=hire]').boundingBox(); await p.mouse.click(hb.x+hb.width/2,hb.y+hb.height/2); await p.waitForTimeout(300);
 let hired=await p.evaluate(()=>!!window.eggfarm.state.workers.market_hand); const firstTapHired=hired;
 if(!hired){ await p.mouse.click(hb.x+hb.width/2,hb.y+hb.height/2); await p.waitForTimeout(300); hired=await p.evaluate(()=>!!window.eggfarm.state.workers.market_hand); }
 await p.waitForTimeout(250);
 const p1b=await measure(p,'.coach',W); await p.screenshot({path:`${OUT}/P1-${tag}-tiredtip.png`}); console.log('P1b',tag,JSON.stringify({firstTapHired,hired,...p1b}));
 await p.waitForTimeout(3100); const p1c=await measure(p,'.coach',W); await p.screenshot({path:`${OUT}/P1-${tag}-managetip.png`}); console.log('P1c',tag,JSON.stringify(p1c));
 await p.waitForTimeout(6200); const gone=await p.evaluate(()=>document.querySelectorAll('.coach').length); console.log('after',tag,'coaches',gone,'errs',JSON.stringify(errs));
 await ctx.close(); }
await br.close(); kill(); process.exit(0);
