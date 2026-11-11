// RC dd52bfd UI probe: P3 Collection + Farm card G-strict, sprite, layout, console, Art&UX shots.
// node rcprobe.mjs <dir> <sha7> <port> <engine> <outdir> <part: p3|layout|shots>
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import { mkdirSync, appendFileSync } from 'node:fs';
const [DIR,SHA,PORT,ENG,OUT,PART]=process.argv.slice(2); const base=`http://127.0.0.1:${PORT}/`; mkdirSync(OUT,{recursive:true});
if(PORT==='4173')process.exit(3);
const srv=spawn('npx',['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'],{cwd:DIR,stdio:'ignore',detached:true});
const kill=()=>{try{process.kill(-srv.pid,'SIGTERM')}catch{}}; setTimeout(()=>{kill();process.exit(2)},560000).unref();
for(let i=0;i<120;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,250))}}
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false};
const st=(F,C,c,o={})=>({coinsCents:c,coop:0,basket:0,collectionLevel:C,farmLevel:F,customers:[],nextCustomerInS:(PART==="shots"?120:1e9),nextCustomerId:9,rng:5,pendingOfflineEggs:0,celebratedTier:2,workers:{},graderTier:0,manageCdS:0,coopFullS:0,...o});
const STATES={capped:st(3,19,2000),normal:st(3,2,100),market:st(3,4,500,{basket:5,coop:6,customers:[{id:1,demand:6,filled:0,waitedS:1},{id:2,demand:8,filled:0,waitedS:2},{id:3,demand:4,filled:0,waitedS:3}]}),rich:st(4,6,500000,{basket:5})};
let bad=0; const errs=[]; const log=o=>{console.log(JSON.stringify({ENG,SHA,...o}))};
async function open(w,h,state){const ctx=await br.newContext({viewport:{width:w,height:h},hasTouch:w<900});const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push(`${w}x${h} ${state} pageerror ${e.message}`)); p.on('console',m=>{if(m.type()==='error')errs.push(`${w}x${h} ${state} console.error ${m.text()}`)});
 await p.addInitScript(([u,s])=>{if(sessionStorage.getItem('x'))return;localStorage.setItem('eggfarm.ui',JSON.stringify(u));localStorage.setItem('eggfarm.save',JSON.stringify({version:5,savedAt:Date.now(),state:s}));sessionStorage.setItem('x','1')},[UI,STATES[state]]);
 await p.goto(base); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm);
 const bid=await p.evaluate(()=>document.documentElement.outerHTML.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/)?.[0]||null);
 if(bid!==`m3-rc1-pre+${SHA}`){bad++;log({BIDFAIL:bid})}
 await p.waitForTimeout(500); return {ctx,p,bid};}
const docked=w=>w>=960;
async function go(p,w,view){ // view: farm|market|upgrades:<tab>
 const [nav,tab]=view.split(':');
 if(nav==='settings'){ await p.locator('#settings').click({force:true}); await p.waitForTimeout(900); return p.evaluate(()=>{const v=[...document.querySelectorAll('.version')].map(e=>e.textContent).find(t=>/Egg Farm /.test(t))||null; const e=[...document.querySelectorAll('.version')].find(e=>/Egg Farm /.test(e.textContent)); const vis=!!(e&&e.getClientRects().length); return {label:v,labelVisible:vis,ok:vis&&/m3-rc1-pre\+dd52bfd/.test(v||'')}}); }
 if(!docked(w)){ await p.evaluate(()=>document.querySelectorAll('.sheet:not([hidden]) .close').forEach(b=>b.click())); await p.waitForTimeout(400); if(nav!=='farm') await p.locator(`[data-nav=${nav}]`).click({force:true}); }
 if(tab){ await p.locator(`[data-tab=${tab}]`).first().click(); await p.waitForSelector('#uRow .up',{timeout:5000}).catch(()=>{}); }
 await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(700);
 return p.evaluate(([nav,tab])=>{const vis=s=>{const e=document.querySelector(s);return !!(e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0)};
  const t=document.querySelector('.tabs button.active')?.dataset.tab||null; const c=[...(document.querySelector('#uRow')?.children||[])].find(e=>e.getClientRects().length&&e.getBoundingClientRect().height>0);
  const r={navOpen:{market:vis('#p-market'),upgrades:vis('#p-upgrades')},activeTab:t,card:(c?.querySelector('h3,h4,strong,b')?.textContent||c?.textContent||'').trim().slice(0,40)||null,collect:vis('#collect')};
  r.ok= nav==='farm'? r.collect : nav==='market'? r.navOpen.market && vis('#sellAll') : (r.navOpen.upgrades && t===tab && !!document.querySelector(`[data-tab=${tab}].active`) && !!r.card);
  return r},[nav,tab]);}
const strict=(p,which)=>p.evaluate(which=>{const card=[...document.querySelectorAll('#uRow .up')].find(e=>e.getClientRects().length&&(which==='collection'?/Collect per tap/.test(e.textContent):true)); if(!card)return {err:'nocard'};
 const R=e=>{const a=e.getBoundingClientRect();return [a.left,a.top,a.right,a.bottom]};
 const els=[...card.querySelectorAll('h3,.hint,.btn,.link,.chip,.pill,.payback,.lvl,.stat,.meta,p,small')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().width>0);
 const nm=e=>(e.className||e.tagName)+':'+e.textContent.trim().slice(0,24); const ov=[];
 for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j]; if(a.contains(b)||b.contains(a))continue; const A=R(a),B=R(b); const x=Math.min(A[2],B[2])-Math.max(A[0],B[0]),y=Math.min(A[3],B[3])-Math.max(A[1],B[1]); if(x>0.5&&y>0.5)ov.push([nm(a),nm(b),+x.toFixed(1),+y.toFixed(1)])}
 const cr=R(card); const outCard=els.filter(e=>{const q=R(e);return q[0]<cr[0]-0.5||q[2]>cr[2]+0.5||q[1]<cr[1]-0.5||q[3]>cr[3]+0.5}).map(nm);
 const txt=card.textContent; const d=document.documentElement; const lim=[...card.querySelectorAll('.hint')].find(e=>/Limited by/.test(e.textContent));
 return {h3:card.querySelector('h3')?.textContent,need:/Need \$/.test(txt),lim:!!lim,limTxt:lim?.textContent.trim().slice(0,40)||null,limPos:lim?getComputedStyle(lim).position:null,n:els.length,ov,outCard,sw:d.scrollWidth,cw:d.clientWidth}},which);
const P3S=[[360,800],[375,800],[375,700],[390,844]];
if(PART==='p3'){
 for(const [w,h] of P3S) for(const tag of ['capped','normal']){ const {ctx,p,bid}=await open(w,h,tag);
  // sprite first (farm view, fresh boot, animations paused) with its own assertion
  if(tag==='normal'){ const v=await go(p,w,'farm'); await p.evaluate(()=>document.querySelectorAll('*').forEach(e=>e.getAnimations?.().forEach(a=>{a.pause();a.currentTime=0})));
   const s=await p.evaluate(()=>{const c=document.querySelector('#coop');const r=c.getBoundingClientRect();return {pos:getComputedStyle(c).position,w:Math.round(r.width),h:Math.round(r.height),loaded:c.complete&&c.naturalWidth>0}});
   await p.locator('#coop').screenshot({path:`${OUT}/sprite-${ENG}-${SHA}-${w}x${h}.png`,animations:'disabled'}); log({SPRITE:1,w,h,view:v,...s}); if(!v.ok||!s.loaded)bad++; }
  for(const tab of ['collection','farm']){ const v=await go(p,w,'upgrades:'+tab);
   if(tab==='collection') await p.evaluate(()=>[...document.querySelectorAll('#uRow .up')].find(e=>/Collect per tap/.test(e.textContent))?.scrollIntoView({block:'center'}));
   await p.waitForTimeout(300); const r=await strict(p,tab);
   const pass=v.ok&&!r.err&&r.ov.length===0&&r.outCard.length===0&&r.sw<=r.cw&&(tab!=='collection'||tag!=='capped'||(r.need&&r.lim&&r.limPos==='static'));
   if(!pass)bad++; log({w,h,tag,tab,bid,pass,view:v,...r});
   const loc=tab==='collection'?p.locator('#uRow .up',{hasText:'Collect per tap'}).first():p.locator('#uRow .up').first();
   await loc.screenshot({path:`${OUT}/${ENG}-${SHA}-${w}x${h}-${tag}-${tab}tab-card.png`}); await p.screenshot({path:`${OUT}/${ENG}-${SHA}-${w}x${h}-${tag}-${tab}tab-full.png`}); }
  await ctx.close(); }
}
if(PART==='layout'){
 const L=[[360,800],[375,800],[390,844],[430,932],[1280,800],[1024,474],[1280,720],[1366,768]];
 for(const [w,h] of L){ const {ctx,p}=await open(w,h,'market');
  for(const view of ['farm','market','upgrades:collection','upgrades:farm','upgrades:workers']){ const v=await go(p,w,view);
   const r=await p.evaluate(()=>{const d=document.documentElement; const shown=e=>e.getClientRects().length&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden';
    const wide=[...document.querySelectorAll('.l1, button, .btn')].filter(shown).filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>(e.id||e.className)+':'+e.textContent.trim().slice(0,20)+`(${e.scrollWidth}>${e.clientWidth})`);
    const small=[...document.querySelectorAll('button, .btn, a[href], [role=button], [role=tab]')].filter(shown).map(e=>{const q=e.getBoundingClientRect();return [(e.id||e.className)+':'+e.textContent.trim().slice(0,18),Math.round(q.width),Math.round(q.height)]}).filter(x=>x[1]>0&&(x[1]<44||x[2]<44));
    const need=[...document.querySelectorAll('button, .btn')].filter(shown).filter(e=>/^\s*Need /.test(e.textContent)).map(e=>Math.round(e.getBoundingClientRect().height*100)/100);
    return {sw:d.scrollWidth,cw:d.clientWidth,wide,small,need}});
   const pass=v.ok&&r.sw<=r.cw&&r.wide.length===0&&r.small.length===0&&r.need.every(x=>x===44); if(!pass)bad++; log({LAYOUT:1,w,h,view,pass,view_ok:v.ok,...r}); }
  await ctx.close(); }
}
if(PART==='shots'){ // Art & UX set: 360x800,375x800,390x844 + 1280x800 docked; each shot right after its own assertion
 const S=[[360,800],[375,800],[390,844],[1280,800]]; const V=[['farm','market','farm main view, 3 customers in queue'],['market','market','Market sheet, 3 orders (6,8 Need-state; 4 sellable), Sell all'],['upgrades:collection','capped','Upgrades > Collection, coop-capped F3/C19 $20 (PM4-P3 state)'],['upgrades:farm','capped','Upgrades > Farm, F3/C19 $20'],['upgrades:workers','rich','Upgrades > Workers, F4 $5000'],['settings','normal','Settings open, build label Egg Farm m3-rc1-pre+dd52bfd visible (HUD label check)']];
 for(const [w,h] of S) for(const [view,state,desc] of V){ const {ctx,p,bid}=await open(w,h,state); const v=await go(p,w,view);
  const name=`${ENG==='chromium'?'':ENG+'/'}${view.replace(':','-')}-${state}-${w}x${h}.png`; mkdirSync(`${OUT}/${ENG==='chromium'?'':ENG}`,{recursive:true});
  await p.screenshot({path:`${OUT}/${name}`}); if(!v.ok)bad++;
  appendFileSync(`${OUT}/entries-${ENG}.jsonl`,JSON.stringify({file:name,engine:ENG,size:`${w}x${h}`,docked:w>=960,save:`inline ${state} (see rcprobe.mjs STATES)`,seed:null,state:desc,asserted:v,bid})+'\n'); log({SHOT:name,ok:v.ok,...v}); await ctx.close(); }
}
await br.close(); kill(); for(const e of errs)console.log('ERR',e); console.log('CONSOLE_ERRORS',errs.length); console.log('BAD',bad); process.exit(0);
