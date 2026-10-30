#!/usr/bin/env node
// K10 trigger (engineering/decisions.md 2026-10-25 03:52 item (6)): decides whether CI job `k10-breeds-offset` must run the slow
// `npm run test:k10`. It fires when the diff BASE...HEAD
//   (a) changes any tc_* or bc_* column, or any farm_cost cell, of data/economy.csv (header add/remove/rename or any cell, compared
//       column by column; farm_cost added per D-HOP-23: #92's farm_cost-only L27-29 retune flipped B4), or
//   (b) touches the streak / tap-coins / Broody / golden / breeds sim code (src/ paths below), or the K10 harness itself.
// Otherwise it prints a no-op line and exits 0, so the status check always reports. Exit 2 = usage/git error (never a silent pass).
// Usage: node scripts/k10-trigger.mjs [--base <ref>] [--head <ref>] [--exec]
//   default base: $K10_BASE or origin/rc/v5 (CI passes the PR base sha); head: HEAD. --exec runs `npm run test:k10` when triggered and
//   exits with its status. In GitHub Actions it also writes `run=true|false` and `reasons=...` to $GITHUB_OUTPUT.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const CSV_PATH = 'data/economy.csv';
/** Sim code that can move the F20-29 active premium (D-HOP-47: anything adding active coins at F20-29). Over-triggering is safe. */
export const CODE_PATTERNS = [
  /^src\/.*(streak|tap-?coins?|broody|golden|breeds?)[^/]*$/i, // streak.ts, future tap-coins/broody/golden/breeds modules
  /^src\/sim\/(timers|effects|payout|rng|m5-state)\.ts$/,     // M5 timer systems, timed effects, payouts, event/breeds RNG, M5 state
  /^src\/config\/(flags|m5-rules)\.ts$/,                       // flag gating and M5 balance rules
  /^tests\/k10-breeds-offset[^/]*$/, /^vitest\.k10\.config\.ts$/, /^scripts\/k10-trigger\.mjs$/, // the K10 harness itself
];
const isMechCol = (c) => /^(tc|bc)_/.test(c) || c === 'farm_cost';

/** Column-wise tc_*, bc_* and farm_cost changes between two CSV texts (LF or CRLF). Returns a list of human-readable reasons. */
export function csvMechChanges(before, after) {
  const parse = (t) => { if (t == null) return null; const rows = t.replace(/\r?\n$/, '').split(/\r?\n/).map((l) => l.split(',')); return { h: rows[0], rows: rows.slice(1) }; };
  const A = parse(before), B = parse(after), out = [];
  if (!A && !B) return out;
  const colsA = new Set(A ? A.h.filter(isMechCol) : []), colsB = new Set(B ? B.h.filter(isMechCol) : []);
  for (const c of colsB) if (!colsA.has(c)) out.push(`economy.csv: column ${c} added`);
  for (const c of colsA) if (!colsB.has(c)) out.push(`economy.csv: column ${c} removed`);
  for (const c of colsA) if (colsB.has(c)) {
    const ia = A.h.indexOf(c), ib = B.h.indexOf(c), n = Math.max(A.rows.length, B.rows.length);
    for (let r = 0; r < n; r++) if ((A.rows[r]?.[ia]) !== (B.rows[r]?.[ib])) { out.push(`economy.csv: ${c} changed (row L${r}: ${A.rows[r]?.[ia]} -> ${B.rows[r]?.[ib]})`); break; }
  }
  return out;
}
/** Reasons for a diff: `files` = changed paths, `csv` = [before, after] texts of data/economy.csv (null = absent). */
export function k10Reasons(files, csv) {
  const out = [];
  for (const f of files) if (CODE_PATTERNS.some((p) => p.test(f))) out.push(`code: ${f}`);
  if (files.includes(CSV_PATH)) out.push(...csvMechChanges(csv[0], csv[1]));
  return out;
}

function git(args) { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 }); }
function show(ref, path) { try { return git(['show', `${ref}:${path}`]); } catch { return null; } }
function main(argv) {
  let base = process.env.K10_BASE || 'origin/rc/v5', head = 'HEAD', exec = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') base = argv[++i]; else if (argv[i] === '--head') head = argv[++i]; else if (argv[i] === '--exec') exec = true;
    else { console.error(`k10-trigger: unknown argument ${argv[i]}`); return 2; }
  }
  if (!base || !head) { console.error('k10-trigger: --base/--head need a ref'); return 2; }
  let files, mb;
  try { mb = git(['merge-base', base, head]).trim(); files = git(['diff', '--name-only', mb, head]).split('\n').filter(Boolean); }
  catch (e) { console.error(`k10-trigger: git failed (${String(e.message).split('\n')[0]})`); return 2; }
  const reasons = k10Reasons(files, files.includes(CSV_PATH) ? [show(mb, CSV_PATH), show(head, CSV_PATH)] : [null, null]);
  const run = reasons.length > 0;
  console.log(run ? `K10: TRIGGERED (${reasons.length} reason${reasons.length > 1 ? 's' : ''}) base ${mb.slice(0, 7)} head ${head}` : `K10: no-op PASS: diff ${mb.slice(0, 7)}..${head} touches no tc_*/bc_*/farm_cost column and no streak/tap-coins/Broody/golden/breeds code`);
  for (const r of reasons) console.log(`  - ${r}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\nreasons=${reasons.join('; ').replace(/[\r\n]/g, ' ')}\n`);
  if (run && exec) { const r = spawnSync('npm', ['run', 'test:k10'], { stdio: 'inherit' }); return r.status ?? 1; }
  return 0;
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
