// PR #66 (fix/rc0-free-port @ 8c568b0) black-box QA checks for items 3 (port handling), 4 (build-id/staleness/dirty refusals + --help + ALLOW_DIRTY flag-off recipe), and 5 (SIGTERM/SIGINT cleanup at startup and mid-browser run).
// Saves QA, 2026-10-23. Runs inside qa/wt-pr66-8c568b0 under flock .browser-test.lock. Kills only exact PIDs it spawns.
import { spawn, spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import http from 'node:http';
const [W0, OUT] = process.argv.slice(2); const W = path.resolve(W0); fs.mkdirSync(OUT, { recursive: true });
const res = { sha: execSync('git rev-parse HEAD', { cwd: W, encoding: 'utf8' }).trim(), checks: [] }; let fails = 0;
const ok = (id, pass, detail) => { res.checks.push({ id, pass: !!pass, detail }); if (!pass) fails++; console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(detail).slice(0, 260)}`); };
const connectOk = port => new Promise(r => { const s = net.connect(port, '127.0.0.1', () => { s.destroy(); r(true); }); s.on('error', () => r(false)); });
const waitPort = async (port, want, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await connectOk(port)) === want) return true; await new Promise(r => setTimeout(r, 40)); } return (await connectOk(port)) === want; };
const wtProcs = () => { try { return execSync('ps -ef', { encoding: 'utf8' }).split('\n').filter(l => l.includes(W) && !l.includes('pr66-8c568b0-checks.mjs') && !l.includes('pr66-8c568b0-gate.sh')); } catch { return []; } };
const runSync = (script, args = ['chromium'], env = {}) => {
  const e = { ...process.env }; delete e.PORT; delete e.ALLOW_DIRTY; delete e.ALLOW_NO_GIT; Object.assign(e, env);
  return spawnSync(process.execPath, [`scripts/${script}`, ...args], { cwd: W, encoding: 'utf8', env: e, timeout: 90000 });
};

// ---------- Item 4 (--help and unknown engine) ----------
{
  for (const flag of ['--help', '-h']) {
    const r = runSync('rc0-browser.mjs', [flag]);
    const out = r.stdout.trim();
    ok(`4-help-${flag}`, r.status === 0 && out.includes('PORT=<n>') && out.includes('ALLOW_DIRTY=1') && out.includes('ALLOW_NO_GIT=1') && out.includes('Flag-off rc0:') && out.split('\n').length === 9, { status: r.status, lines: out.split('\n').length, first: out.split('\n')[0] });
  }
  const badEng = runSync('rc0-browser.mjs', ['safari']);
  ok('4-unknown-engine-exit2', badEng.status === 2 && /unknown engine safari/.test(badEng.stderr), { status: badEng.status, stderr: badEng.stderr.trim() });
}

// ---------- Item 3: Bad PORT values -> exit 2, one line, no stack, no leftover server ----------
for (const script of ['rc0-browser.mjs', 'release-globals-browser.mjs']) {
  for (const bad of ['0', '99999', '65536', 'abc', '-1', '4.5', ' 5961', '5961a']) {
    const r = runSync(script, ['chromium'], { PORT: bad });
    const lines = r.stderr.trim().split('\n').filter(Boolean);
    const noStack = !/\n\s+at /.test(r.stderr);
    const procs = wtProcs();
    ok(`3-bad-port-${script}-PORT=${JSON.stringify(bad)}`, r.status === 2 && lines.length === 1 && /not a port number/.test(lines[0]) && noStack && procs.length === 0, { status: r.status, stderr: lines[0], noStack, procs: procs.length });
  }
}

// ---------- Item 3 & 4a: Occupied / foreign server on explicit PORT=5962 -> exit 2, and unset PORT avoids it ----------
{
  const dummy = http.createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><script type="module" src="/assets/index-FOREIGN999.js"></script>'); });
  await new Promise(r => dummy.listen(5962, '127.0.0.1', r));
  try {
    for (const script of ['rc0-browser.mjs', 'release-globals-browser.mjs']) {
      const r = runSync(script, ['chromium'], { PORT: '5962' });
      const lines = r.stderr.trim().split('\n').filter(Boolean);
      const procs = wtProcs();
      ok(`3-4a-foreign-occupied-PORT=5962-${script}`, r.status === 2 && lines.length === 1 && /port 5962 is not serving/.test(lines[0]) && !/\n\s+at /.test(r.stderr) && procs.length === 0, { status: r.status, stderr: lines[0], procs: procs.length });
    }
    // Unset PORT with 5962 occupied: check-globals picks a free ephemeral port != 5962 and != 4173, passes 3/3
    const cg = runSync('release-globals-browser.mjs', ['chromium'], {});
    const m = /check-globals: dist (m3-rc1-pre\+8c568b0) on port (\d+)/.exec(cg.stderr);
    const chosenPort = m ? +m[2] : 0;
    const passCount = (cg.stdout.match(/^PASS /gm) ?? []).length;
    ok('3-unset-PORT-ephemeral-check-globals', cg.status === 0 && passCount === 3 && chosenPort > 1024 && chosenPort !== 4173 && chosenPort !== 4181 && chosenPort !== 5100 && chosenPort !== 5962 && !(await connectOk(chosenPort)) && wtProcs().length === 0,
      { status: cg.status, passCount, buildId: m?.[1], chosenPort, portFreeAfter: !(await connectOk(chosenPort)) });
  } finally { await new Promise(r => dummy.close(r)); }
}

// ---------- Item 3: Explicit valid PORT=5961 honoured ----------
{
  const cg = runSync('release-globals-browser.mjs', ['chromium'], { PORT: '5961' });
  const m = /check-globals: dist (m3-rc1-pre\+8c568b0) on port 5961/.exec(cg.stderr);
  const passCount = (cg.stdout.match(/^PASS /gm) ?? []).length;
  ok('3-explicit-PORT=5961-check-globals', cg.status === 0 && !!m && passCount === 3 && !(await connectOk(5961)) && wtProcs().length === 0, { status: cg.status, stderr: cg.stderr.trim(), passCount, port5961FreeAfter: !(await connectOk(5961)) });
}

// ---------- Item 4b: Stale SHA in dist / dist-qa (entry chunk matches, but meta build-id is dd223f5 != HEAD 8c568b0) -> exit 2 ----------
for (const [script, dir] of [['rc0-browser.mjs', 'dist-qa'], ['release-globals-browser.mjs', 'dist']]) {
  const idx = path.join(W, dir, 'index.html'); const orig = fs.readFileSync(idx, 'utf8');
  try {
    fs.writeFileSync(idx, orig.replace(/m3-rc1-pre\+8c568b0/g, 'm3-rc1-pre+dd223f5'));
    const r = runSync(script, ['chromium'], { PORT: '5961' });
    const lines = r.stderr.trim().split('\n').filter(Boolean);
    const free = await waitPort(5961, false, 3000);
    ok(`4b-stale-sha-in-${dir}-${script}`, r.status === 2 && /served build-id "m3-rc1-pre\+dd223f5" .* is not HEAD 8c568b0/.test(r.stderr) && !/\n\s+at /.test(r.stderr) && free && wtProcs().length === 0,
      { status: r.status, stderr: lines.at(-1), port5961Free: free, procs: wtProcs().length });
  } finally { fs.writeFileSync(idx, orig); }
}

// ---------- Item 4d: Clean build in dist / dist-qa on a dirty working tree (tracked edit AND untracked file, with and without ALLOW_DIRTY=1) -> exit 2 ----------
{
  const bal = path.join(W, 'src/config/balance.json'); const origBal = fs.readFileSync(bal, 'utf8');
  try {
    const j = JSON.parse(origBal); j.m4.enabled = 0; fs.writeFileSync(bal, JSON.stringify(j, null, 2) + '\n');
    for (const [script, allow] of [['rc0-browser.mjs', ''], ['rc0-browser.mjs', '1'], ['release-globals-browser.mjs', ''], ['release-globals-browser.mjs', '1']]) {
      const r = runSync(script, ['chromium'], { PORT: '5961', ...(allow ? { ALLOW_DIRTY: '1' } : {}) });
      const free = await waitPort(5961, false, 3000);
      ok(`4d-clean-build-dirty-tracked-${script}-ALLOW_DIRTY=${allow || '0'}`, r.status === 2 && /is clean but the tree at HEAD 8c568b0 is dirty/.test(r.stderr) && free && wtProcs().length === 0,
        { status: r.status, stderr: r.stderr.trim().split('\n').at(-1), port5961Free: free });
    }
  } finally { fs.writeFileSync(bal, origBal); }
  const untrk = path.join(W, 'qa-untracked-test.tmp');
  try {
    fs.writeFileSync(untrk, 'dirty');
    for (const [script, allow] of [['rc0-browser.mjs', ''], ['rc0-browser.mjs', '1'], ['release-globals-browser.mjs', ''], ['release-globals-browser.mjs', '1']]) {
      const r = runSync(script, ['chromium'], { PORT: '5961', ...(allow ? { ALLOW_DIRTY: '1' } : {}) });
      const free = await waitPort(5961, false, 3000);
      ok(`4d-clean-build-dirty-untracked-${script}-ALLOW_DIRTY=${allow || '0'}`, r.status === 2 && /is clean but the tree at HEAD 8c568b0 is dirty/.test(r.stderr) && free && wtProcs().length === 0,
        { status: r.status, stderr: r.stderr.trim().split('\n').at(-1), port5961Free: free });
    }
  } finally { fs.rmSync(untrk, { force: true }); }
}

// ---------- Item 4c: +dirty build in dist & dist-qa + ALLOW_DIRTY=1 flag-off recipe + stale +dirty build after reverting tree ----------
{
  const bal = path.join(W, 'src/config/balance.json'); const origBal = fs.readFileSync(bal, 'utf8');
  try {
    // Step 1 of --help recipe: set m4.enabled=0 in src/config/balance.json and rebuild
    const j = JSON.parse(origBal); j.m4.enabled = 0; fs.writeFileSync(bal, JSON.stringify(j, null, 2) + '\n');
    execSync('npm run build:qa && npx vite build', { cwd: W, stdio: 'ignore' });
    const idQa = /<meta name="build-id" content="([^"]*)"/.exec(fs.readFileSync(path.join(W, 'dist-qa/index.html'), 'utf8'))?.[1];
    const idDist = /<meta name="build-id" content="([^"]*)"/.exec(fs.readFileSync(path.join(W, 'dist/index.html'), 'utf8'))?.[1];
    ok('4c-pre-dirty-build-ids', idQa === 'm3-rc1-pre+8c568b0+dirty' && idDist === 'm3-rc1-pre+8c568b0+dirty', { idQa, idDist });
    // Without ALLOW_DIRTY on dirty tree -> exit 2
    for (const script of ['rc0-browser.mjs', 'release-globals-browser.mjs']) {
      const r = runSync(script, ['chromium'], { PORT: '5961' });
      const free = await waitPort(5961, false, 3000);
      ok(`4c-dirty-build-refused-without-ALLOW_DIRTY-${script}`, r.status === 2 && /is a \+dirty build .* set ALLOW_DIRTY=1/.test(r.stderr) && free && wtProcs().length === 0,
        { status: r.status, stderr: r.stderr.trim().split('\n').at(-1), port5961Free: free });
    }
    // With ALLOW_DIRTY=1 on dirty tree (the documented flag-off recipe): check-globals passes 3/3 and logs WARNING ALLOW_DIRTY=1 (m4.enabled=0)
    const cg = runSync('release-globals-browser.mjs', ['chromium'], { PORT: '5961', ALLOW_DIRTY: '1' });
    ok('4c-ALLOW_DIRTY=1-flag-off-check-globals-passes', cg.status === 0 && /WARNING ALLOW_DIRTY=1: testing a \+dirty build \(working-tree balance\.json m4\.enabled=0\)/.test(cg.stderr) && /check-globals: dist m3-rc1-pre\+8c568b0\+dirty on port 5961/.test(cg.stderr) && (cg.stdout.match(/^PASS /gm) ?? []).length === 3,
      { status: cg.status, stderr: cg.stderr.trim().split('\n') });
    // Also verify rc0-browser.mjs with ALLOW_DIRTY=1 passes the guard and starts on port 5961 (then SIGTERM it cleanly)
    {
      const env = { ...process.env, PORT: '5961', ALLOW_DIRTY: '1' };
      const p = spawn(process.execPath, ['scripts/rc0-browser.mjs', 'chromium'], { cwd: W, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = ''; p.stderr.on('data', d => { stderr += d.toString(); });
      const t0 = Date.now(); while (Date.now() - t0 < 20000 && !stderr.includes('rc0-browser: dist-qa m3-rc1-pre+8c568b0+dirty on port 5961')) await new Promise(r => setTimeout(r, 50));
      p.kill('SIGTERM'); const code = await new Promise(r => p.on('exit', (c, s) => r(c ?? (s ? 143 : null))));
      const free = await waitPort(5961, false, 5000);
      ok('4c-ALLOW_DIRTY=1-flag-off-rc0-browser-admitted', /WARNING ALLOW_DIRTY=1.*m4\.enabled=0/.test(stderr) && /rc0-browser: dist-qa m3-rc1-pre\+8c568b0\+dirty on port 5961/.test(stderr) && code === 143 && free,
        { stderr: stderr.trim().split('\n'), code, port5961Free: free });
    }
    // Step 2 of --help recipe: revert balance.json -> tree is now clean while dist/dist-qa still has +dirty -> refused even with ALLOW_DIRTY=1!
    fs.writeFileSync(bal, origBal);
    for (const [script, allow] of [['rc0-browser.mjs', ''], ['rc0-browser.mjs', '1'], ['release-globals-browser.mjs', ''], ['release-globals-browser.mjs', '1']]) {
      const r = runSync(script, ['chromium'], { PORT: '5961', ...(allow ? { ALLOW_DIRTY: '1' } : {}) });
      const free = await waitPort(5961, false, 3000);
      ok(`4c-stale-dirty-build-on-clean-tree-${script}-ALLOW_DIRTY=${allow || '0'}`, r.status === 2 && /is a \+dirty build but the tree at HEAD 8c568b0 is clean/.test(r.stderr) && free && wtProcs().length === 0,
        { status: r.status, stderr: r.stderr.trim().split('\n').at(-1), port5961Free: free });
    }
  } finally {
    fs.writeFileSync(bal, origBal);
    execSync('npm run build:qa && npx vite build', { cwd: W, stdio: 'ignore' });
  }
  const idQaClean = /<meta name="build-id" content="([^"]*)"/.exec(fs.readFileSync(path.join(W, 'dist-qa/index.html'), 'utf8'))?.[1];
  const idDistClean = /<meta name="build-id" content="([^"]*)"/.exec(fs.readFileSync(path.join(W, 'dist/index.html'), 'utf8'))?.[1];
  ok('4c-rebuilt-clean-after-recipe', idQaClean === 'm3-rc1-pre+8c568b0' && idDistClean === 'm3-rc1-pre+8c568b0' && execSync('git status --porcelain', { cwd: W, encoding: 'utf8' }).trim() === '',
    { idQaClean, idDistClean });
}

// ---------- Item 5: Signal cleanup (SIGTERM & SIGINT) at startup and mid-browser run ----------
for (const script of ['rc0-browser.mjs', 'release-globals-browser.mjs']) {
  for (const [sig, wantExit] of [['SIGTERM', 143], ['SIGINT', 130]]) {
    for (const phase of ['startup', 'mid-browser']) {
      const port = 5963;
      await waitPort(port, false, 3000);
      const env = { ...process.env, PORT: String(port) }; delete env.ALLOW_DIRTY; delete env.ALLOW_NO_GIT;
      const p = spawn(process.execPath, [`scripts/${script}`, 'chromium'], { cwd: W, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = ''; p.stdout.on('data', d => { out += d.toString(); }); p.stderr.on('data', d => { err += d.toString(); });
      const exited = new Promise(r => p.on('exit', (c, s) => r({ code: c, sig: s })));
      if (phase === 'startup') {
        // As soon as vite binds port 5963 (before serveOwn's 300ms post-fetch sleep + expectHeadBuild finishes)
        await waitPort(port, true, 15000);
      } else {
        // Wait until serveForRun printed `<tag>: ... on port 5963` AND browser has started (1.5s into browser run)
        const t0 = Date.now(); while (Date.now() - t0 < 20000 && !/on port 5963/.test(err)) await new Promise(r => setTimeout(r, 40));
        await new Promise(r => setTimeout(r, 1500));
      }
      p.kill(sig);
      const ex = await exited;
      const portFree = await waitPort(port, false, 5000);
      await new Promise(r => setTimeout(r, 300));
      const procs = wtProcs();
      ok(`5-signal-${script}-${sig}-${phase}`, ex.code === wantExit && portFree && procs.length === 0,
        { exitCode: ex.code, wantExit, portFree, leftoverProcs: procs.length, stderr: err.trim().split('\n').at(-1) ?? '' });
    }
  }
}

res.fails = fails;
fs.writeFileSync(path.join(OUT, 'checks-result.json'), JSON.stringify(res, null, 2));
console.log(`PR66_CHECKS ${fails === 0 ? 'PASS' : 'FAIL'} checks=${res.checks.length} fails=${fails}`);
process.exit(fails ? 1 : 0);
