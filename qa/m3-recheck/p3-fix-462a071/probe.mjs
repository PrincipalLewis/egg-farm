// G-strict probe for PR #40 / PM4-P3. node probe.mjs <dir> <sha> <port> <engine> <outdir>
import pw from 'playwright-core'; import { spawn } from 'node:child_process';
const [DIR,SHA,PORT,ENG,OUT]=process.argv.slice(2); const base=`http://127.0.0.1:${PORT}/`;
const srv=spawn('npx',['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'],{cwd:DIR,stdio:'ignore',detached:true});
const kill=()=>{try{process.kill(-srv.pid,'SIGTERM')}catch{}}; setTimeout(()=>{kill();process.exit(2)},540000).unref();
for(let i=0;i<120;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,250))}}
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
const st=(F,C,c)=>({coinsCents:c,coop:0,basket:0,collectionLevel:C,farmLevel:F,customers:[],nextCustomerInS:1e9,nextCustomerId:9,rng:5,pendingOfflineEggs:0,celebratedTier:2,workers:{},graderTier:0,manageCdS:0,coopFullS:0});
let bad=0;
const SIZES=process.env.SIZES?JSON.parse(process.env.SIZES):[[360,800],[375,800],[375,700],[390,844]];
for(const [w,h] of SIZES) for(const [tag,F,C,c] of [['capped',3,19,2000],['normal',3,2,100]]){
 const ctx=await br.newContext({viewport:{width:w,height:h},hasTouch:true}); const p=await ctx.newPage();
 await p.addInitScript(([u,s])=>{if(sessionStorage.getItem('x'))return;localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify({version:5,savedAt:Date.now(),state:s}));sessionStorage.setItem('x','1')},[UI,st(F,C,c)]);
 await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm);
 const bid=await p.evaluate(()=>document.documentElement.outerHTML.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/)?.[0]||null);
 await p.waitForTimeout(600);
 if(tag==='capped'){ await p.evaluate(()=>document.querySelectorAll('*').forEach(e=>e.getAnimations?.().forEach(a=>{a.pause();a.currentTime=0}))); await p.locator('#coop').screenshot({path:`${OUT}/sprite-${ENG}-${SHA}-${w}x${h}.png`,animations:'disabled'}).catch(e=>console.log('spriteErr',e.message.slice(0,80))); console.log('SPRITE',JSON.stringify(await p.evaluate(()=>{const c=document.querySelector('#coop');const r=c.getBoundingClientRect();return {pos:getComputedStyle(c).position,w:Math.round(r.width),h:Math.round(r.height),loaded:c.complete&&c.naturalWidth>0}})));}
 await p.locator('[data-nav=upgrades]').click({force:true}).catch(()=>{}); await p.locator('[data-tab=collection]').first().click().catch(()=>{});
 await p.waitForSelector('#uRow .up',{timeout:5000}).catch(()=>{});
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#uRow .up')].find(e=>/Collect per tap/.test(e.textContent));c?.scrollIntoView({block:'center'})});
 await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(700);
 const r=await p.evaluate(()=>{const card=[...document.querySelectorAll('#uRow .up')].find(e=>e.getClientRects().length&&/Collect per tap/.test(e.textContent)); if(!card)return {err:'nocard'};
  const R=e=>{const a=e.getBoundingClientRect();return [a.left,a.top,a.right,a.bottom]};
  const hs=[...card.querySelectorAll('.hint')]; const need=hs.find(e=>/Need \$/.test(e.textContent)); const lim=hs.find(e=>/Limited by coop/.test(e.textContent)); const link=lim?.querySelector('.link'); const btn=card.querySelector('.btn');
  const els={need,lim,link,btn}; const ov=[]; const k=Object.keys(els);
  for(let i=0;i<k.length;i++)for(let j=i+1;j<k.length;j++){const a=els[k[i]],b=els[k[j]]; if(!a||!b||a.contains(b)||b.contains(a))continue; const A=R(a),B=R(b); const x=Math.min(A[2],B[2])-Math.max(A[0],B[0]),y=Math.min(A[3],B[3])-Math.max(A[1],B[1]); if(x>0&&y>0)ov.push([k[i],k[j],+x.toFixed(1),+y.toFixed(1)])}
  const cr=R(card); const outCard=Object.entries(els).filter(([,e])=>e).filter(([,e])=>{const q=R(e);return q[0]<cr[0]-0.5||q[2]>cr[2]+0.5||q[1]<cr[1]-0.5||q[3]>cr[3]+0.5}).map(([n])=>n);
  const d=document.documentElement; const taps=[btn,link].filter(Boolean).map(e=>{const q=e.getBoundingClientRect();return [e.className,Math.round(q.width),Math.round(q.height)]});
  return {need:!!need,lim:!!lim,limPos:lim?getComputedStyle(lim).position:null,ov,outCard,sw:d.scrollWidth,cw:d.clientWidth,taps,rects:Object.fromEntries(Object.entries(els).filter(([,e])=>e).map(([n,e])=>[n,R(e).map(Math.round)]))}});
 await p.locator('[data-tab=farm]').first().click().catch(()=>{}); await p.waitForTimeout(500);
 r.farm=await p.evaluate(()=>{const card=[...document.querySelectorAll('#uRow .up')].find(e=>e.getClientRects().length&&/Farm level/.test(e.textContent)); if(!card)return 'nofarmcard'; const R=e=>{const a=e.getBoundingClientRect();return [a.left,a.top,a.right,a.bottom]}; const ps=[...card.querySelectorAll('.hint,.vchip,[class*=chip],.btn,.link')].filter(e=>e.getBoundingClientRect().width>0); const ov=[]; for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){if(ps[i].contains(ps[j])||ps[j].contains(ps[i]))continue;const A=R(ps[i]),B=R(ps[j]);const x=Math.min(A[2],B[2])-Math.max(A[0],B[0]),y=Math.min(A[3],B[3])-Math.max(A[1],B[1]);if(x>0&&y>0)ov.push([ps[i].className,ps[j].className,+x.toFixed(1),+y.toFixed(1)])} return {limCollecting:/Limited by collecting/.test(card.textContent),n:ps.length,ov}});
 const pass = !r.err && (typeof r.farm!=='object'||r.farm.ov.length===0) && r.ov.length===0 && r.outCard.length===0 && r.sw<=r.cw && (tag!=='capped'||(r.need&&r.lim));
 if(!pass)bad++;
 console.log(JSON.stringify({ENG,SHA,bid,w,h,tag,pass,...r}));
 await p.locator('#uRow .up',{hasText:'Collect per tap'}).first().screenshot({path:`${OUT}/${ENG}-${SHA}-${w}x${h}-${tag}-card.png`}).catch(()=>{});
 await p.screenshot({path:`${OUT}/${ENG}-${SHA}-${w}x${h}-${tag}.png`});
 await ctx.close();}
await br.close(); kill(); console.log('BAD',bad); process.exit(0);
