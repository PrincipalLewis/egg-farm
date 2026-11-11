import { chromium, webkit } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
// Usage: [ENGINE=webkit] [WIDTHS=375,960,1280] [NS=0,5,10] node b6-probe.mjs <worktree with dist-qa>
import { spawn } from 'node:child_process';
const port=4191+Math.floor(Math.random()*40); const srv=spawn('npx',['vite','preview','--outDir','dist-qa','--port',''+port,'--strictPort','--host','127.0.0.1'],{stdio:'ignore',detached:true,cwd:process.argv[2]||'/tmp/efs2/game'});
await new Promise(r=>setTimeout(r,2000));
const b=process.env.ENGINE==='webkit'?await webkit.launch():await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const out=[];
const WS=(process.env.WIDTHS||'960,1024,1280').split(',').map(Number), NS=(process.env.NS||'0,5,10').split(',').map(Number);
for (const w of WS) for (const n of NS) {
  const ctx=await b.newContext({viewport:{width:w,height:w<600?812:700}}); const p=await ctx.newPage();
  await p.addInitScript(()=>localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true})));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(()=>window.eggfarm);
  await p.evaluate(n=>{const g=window.eggfarm; g.state={...g.state,farmLevel:25,collectionLevel:25,coop:9.99e15,basket:9.99e15,coinsCents:9.99e17,customers:Array.from({length:n},(_,i)=>({id:i+1,demand:99999,filled:0,waitedS:0}))};},n);
  await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>{const q=s=>document.querySelector(s)?.getBoundingClientRect();return {farmR:Math.round(q('.farm').right),bar:Math.round(q('.collectbar').right),cw:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,pl:Math.round(q('#panel-layer').left),qR:Math.round(q('#queue').right),wide:[...document.querySelectorAll('#app *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>document.documentElement.clientWidth+0.5&&getComputedStyle(e).visibility!=='hidden'}).length}});
  out.push([w,n,JSON.stringify(r), (r.cw>=960&&(r.bar>r.pl-12+0.5||r.farmR>r.pl+0.5||r.qR>r.pl+0.5))||r.sw>r.cw||r.wide>0?'FAIL':'ok']); await ctx.close(); }
console.log(out.map(x=>x.join(' ')).join('\n')); await b.close(); process.kill(-srv.pid); process.exit(0);
