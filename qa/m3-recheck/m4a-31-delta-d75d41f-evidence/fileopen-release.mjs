// file:// open of the release single-file HTML (dist-html/egg-farm.html): node fileopen-release.mjs <worktree> <engine> <shotsdir>
const [w, engine, shots] = process.argv.slice(2);
const pw = await import(w + '/node_modules/playwright-core/index.mjs');
const b = await (engine==='chromium' ? pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[engine].launch());
const p = await (await b.newContext()).newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('file://' + w + '/dist-html/egg-farm.html'); await p.waitForTimeout(2500);
const meta = await p.evaluate(() => [document.querySelector('meta[name=build-id]')?.content, document.querySelector('[data-build-id]')?.getAttribute('data-build-id')]);
try { await p.getByText('Tap to start').click({ timeout: 4000 }); } catch {}
await p.waitForTimeout(2000); const txt = (await p.evaluate(() => document.body.innerText)).length;
const g = await p.evaluate(() => Object.keys(window).filter(k => /^eggfarm/i.test(k)));
await p.screenshot({ path: `${shots}/fileopen-release-${engine}.png` });
const ok = txt > 50 && errs.length === 0 && meta.every(x => x === 'm3-rc1-pre+d75d41f');
console.log(`${ok?'OK':'FAIL'} release-file ${engine} textLen=${txt} buildid=${JSON.stringify(meta)} globals=${JSON.stringify(g)} errors=${JSON.stringify(errs.slice(0,3))}`);
await b.close(); process.exit(ok?0:1);
