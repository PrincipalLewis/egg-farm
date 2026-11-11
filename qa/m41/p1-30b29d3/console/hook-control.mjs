const pw = (await import('/tmp/qa-p1-30b29d3/node_modules/playwright-core/index.mjs')).default;
const b = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const c = await b.newContext(); const p = await c.newPage();
await p.setContent('<script>console.error("QA-CONTROL-ERR"); setTimeout(()=>{throw new Error("QA-CONTROL-PAGEERR")},0)</script>');
await p.waitForTimeout(300); await b.close(); console.log('control done');
