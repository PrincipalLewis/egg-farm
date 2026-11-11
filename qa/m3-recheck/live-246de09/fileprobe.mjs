// node fileprobe.mjs <engine> <url>: can the asset boot and persist localStorage under this URL?
const pw=(await import('/tmp/qa-live-246de09/node_modules/playwright-core/index.mjs')).default;
const [E,U]=process.argv.slice(2);const br=E==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'}):await pw[E].launch();
const cx=await br.newContext();const p=await cx.newPage();const r={engine:E,url:U};
try{await p.goto(U);r.bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content);
r.lsWrite=await p.evaluate(()=>{try{localStorage.setItem('__qp','1');return localStorage.getItem('__qp')}catch(e){return 'ERR '+e.name}});
await p.getByText('Tap to start').click({timeout:20000}).catch(e=>r.tapErr=String(e).slice(0,80));await p.waitForTimeout(4000);
r.keysBefore=await p.evaluate(()=>Object.keys(localStorage));await p.reload();await p.waitForTimeout(1500);
r.keysAfterReload=await p.evaluate(()=>{try{return Object.keys(localStorage)}catch(e){return 'ERR '+e.name}});}catch(e){r.err=String(e).slice(0,200)}
console.log(JSON.stringify(r));await br.close();
