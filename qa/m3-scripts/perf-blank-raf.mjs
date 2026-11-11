import { webkit, chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
for (const [n,t] of [['webkit',webkit],['chromium',chromium]]) for (const headless of [true,false]) {
const b = await t.launch(n==='chromium'?{headless,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}:{headless}); const p = await (await b.newContext({viewport:{width:360,height:640}})).newPage();
await p.setContent('<div id=x style="width:50px;height:50px;background:red"></div>');
const r = await p.evaluate(() => new Promise(res => { const t=[]; let l=0; const x=document.getElementById('x'); function f(now){ if(l) t.push(now-l); l=now; x.style.transform=`translateX(${now%300}px)`; if (t.length<600) requestAnimationFrame(f); else { t.sort((a,b)=>a-b); res({frames:t.length,p50:+t[300].toFixed(1),p95:+t[570].toFixed(1)}); } } requestAnimationFrame(f); }));
console.log(JSON.stringify({eng:n,mode:headless?'headless':'headed',scene:'blank rAF (setContent)',...r})); await b.close(); }
