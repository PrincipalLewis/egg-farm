// One-time generator: M4.1 p1 (m4.1-p1-30b29d3, dd919d61…) save fixtures, played in Chromium through the UI only.
// usage (under the browser lock): node gen-fixtures.mjs <p1.html> <port> <outdir>
// Writes <outdir>/<id>.save.json (raw eggfarm.save), <id>.ls.json (all eggfarm.* LS keys), <id>.meta.json, gen.log lines on stdout.
import { serve, launch, watch, seedLS, ids, ui, start, skipOnb, play, rawSave, waitSave, lsDump, summary, writeJSON, readText, sha256 } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const [HTML, PORT = '5961', OUT] = process.argv.slice(2); if (!HTML || !OUT) { console.error('usage: gen-fixtures.mjs <p1.html> <port> <outdir>'); process.exit(2); }
const Q = '/workspace/egg-farm-studio/qa';
const SRC = { v5: `${Q}/m41/pub-30b29d3/mig/fixture-m2-rc1-v5-12min.json`, f30: `${Q}/wt-rc1-5d9efa6/tests/fixtures/saves/m4-pre-v7-F30-C30.json` };
const srv = await serve(`${OUT}/.serve`, { 'p1.html': HTML }, PORT); console.log('server pid', srv.pid);
const br = await launch('chromium'); let bad = 0;
async function gen(id, seedRaw, plan) {
  const errs = []; const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); watch(p, errs, id);
  if (seedRaw) await seedLS(p, { 'eggfarm.save': seedRaw });
  await p.goto(srv.url + 'p1.html'); const bid = await ids(p); const preTap = await rawSave(p); await start(p); await skipOnb(p);
  const postTap = await rawSave(p); const u0 = await ui(p);
  if (u0.welcome) { await p.locator('#wbCollect').click().catch(() => {}); await p.waitForTimeout(300); }
  const pl = await play(p, plan); const before = await rawSave(p); const raw = await waitSave(p, before, 8000); const dump = await lsDump(p); const u1 = await ui(p);
  await p.screenshot({ path: `${OUT}/${id}.png` }); await ctx.close();
  const meta = { id, source: 'm4.1-p1-30b29d3 release asset', html_sha256: sha256(readText(HTML)), build: bid, seededFrom: seedRaw ? sha256(seedRaw) : null,
    loadTimeWrite: { preTapPresent: preTap !== null, postTapDiffersFromSeed: !!postTap && postTap !== seedRaw }, ui0: u0, play: pl, ui1: u1, summary: summary(raw), errors: errs,
    save_sha256: sha256(raw), generatedAt: new Date().toISOString() };
  writeFileSync(`${OUT}/${id}.save.json`, raw); writeJSON(`${OUT}/${id}.ls.json`, dump); writeJSON(`${OUT}/${id}.meta.json`, meta);
  const ok = bid.meta === 'm4.1+30b29d3' && !bid.dirty && meta.summary.version === 6 && !u0.recovery && errs.length === 0; if (!ok) bad++;
  console.log(ok ? 'OK' : 'FAIL', id, JSON.stringify({ build: bid.meta, s: { v: meta.summary.version, c: meta.summary.coinsCents, e: meta.summary.eggsTotal, F: meta.summary.farmLevel, C: meta.summary.collectionLevel, H: meta.summary.hensLevel, EV: meta.summary.eggValueLevel, w: meta.summary.workers }, play: pl, errs }));
}
try {
  await gen('p1-A-fresh-F0', null, { taps: 30, buys: 2 });
  await gen('p1-B-workers-F10', readText(SRC.v5), { taps: 20, buys: 3 });
  await gen('p1-C-late-F30', readText(SRC.f30), { taps: 10, buys: 4 });
} finally { await br.close(); await srv.stop(); console.log('server stopped'); }
process.exit(bad ? 1 : 0);
