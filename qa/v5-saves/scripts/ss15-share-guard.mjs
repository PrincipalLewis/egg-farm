// SS-15 Rule 2 share guard, unit case (V5-S; HoQA ruling Q10, qa/v5-ui-rulings-draft.md; sales-stopped-spec 2c2c323b §4.8 L148 + SS-15 L289).
// Spec: share = fatigueLoss / (incomePerSec + fatigueLoss); if the denominator is <= 0, share = 1 when fatigueLoss > 0, else 0. Never NaN/Infinity/negative.
// TODO(RC): bind --module/--export/--sig to the exported Rule 2 share function HoE names in the #5b PR body (Q10 HoE request). Until then: stub only.
// usage: node ss15-share-guard.mjs --module <file> --export <name> [--sig loss,income | income,loss | obj] [--out <json>] [--expect-fail]
//   TS source on the RC: <worktree>/node_modules/.bin/vite-node ss15-share-guard.mjs -- --module <worktree>/src/....ts --export <name> --sig ...
//   --expect-fail = negative control: exit 0 only if at least one HARD case FAILS (proves the case catches a broken guard).
import { parseArgs } from 'node:util'; import path from 'node:path'; import { writeFileSync, mkdirSync } from 'node:fs'; import { pathToFileURL } from 'node:url';
const { values: A } = parseArgs({ args: process.argv.slice(2).filter(a => a !== '--'), options: { module: { type: 'string' }, export: { type: 'string' }, sig: { type: 'string', default: 'loss,income' }, out: { type: 'string' }, 'expect-fail': { type: 'boolean', default: false } } });
if (!A.module || !A.export) { console.error('need --module and --export (TODO: bind on the RC)'); process.exit(2); }
const mod = await import(pathToFileURL(path.resolve(A.module)).href); const fn = mod[A.export]; if (typeof fn !== 'function') { console.error(`export ${A.export} is not a function in ${A.module}`); process.exit(2); }
const call = (loss, income) => A.sig === 'obj' ? fn({ fatigueLoss: loss, incomePerSec: income }) : A.sig === 'income,loss' ? fn(income, loss) : fn(loss, income);
const cases = []; const L = [0, 5, 0.001];  // fatigueLoss = 0 and > 0 (incl. tiny)
// denominator values d = income + loss: <0, -0, 0, NaN, -Infinity, the boundary (smallest positive), > 0
const D = [-10, -Number.MIN_VALUE, -0, 0, NaN, -Infinity, Number.MIN_VALUE, 1e-12, 1, 100];
for (const loss of L) for (const d of D) { const income = (Number.isNaN(d) || !Number.isFinite(d)) ? d : d - loss; cases.push({ loss, income, d }); }
// income itself <= 0 with loss 0 (wages >= gross at a low level) and negative fatigueLoss (defensive)
for (const income of [0, -0, -1, -1e9, NaN, -Infinity]) cases.push({ loss: 0, income, d: income });
cases.push({ loss: -1, income: 0, d: -1, defensive: true }, { loss: NaN, income: 1, d: NaN, defensive: true });
let hard = 0, info = 0; const rows = [];
for (const c of cases) {
  let r, err = null; try { r = call(c.loss, c.income); } catch (e) { err = String(e); }
  const denom = c.income + c.loss; const le0 = !(denom > 0); // NaN and -Infinity are treated as "<= 0" (no valid ratio)
  const want = le0 ? (c.loss > 0 ? 1 : 0) : c.loss / denom;
  const finite = typeof r === 'number' && Number.isFinite(r); const nonneg = finite && r >= 0; const negZero = Object.is(r, -0);
  const exact = finite && (le0 ? r === want : Math.abs(r - want) <= 1e-12 * Math.max(1, Math.abs(want)));
  const ok = !err && finite && nonneg && (c.defensive || exact);   // defensive inputs: only "no NaN / no negative / no throw"
  if (!ok) hard++; if (negZero) info++;
  rows.push({ ...c, income: String(c.income), d: String(c.d), result: String(r), want: String(want), err, pass: ok, negZero });
  console.log(`${ok ? 'PASS' : 'FAIL'} loss=${c.loss} income=${c.income} denom=${denom} -> ${Object.is(r, -0) ? '-0' : r} (want ${want})${err ? ' THROW ' + err : ''}${negZero ? ' INFO -0' : ''}`);
}
const res = { module: A.module, export: A.export, sig: A.sig, cases: rows.length, hardFail: hard, negZeroInfo: info, expectFail: A['expect-fail'] };
if (A.out) { mkdirSync(path.dirname(path.resolve(A.out)), { recursive: true }); writeFileSync(A.out, JSON.stringify({ ...res, rows }, null, 1)); }
console.log(`SS15-SHARE-GUARD: ${rows.length} cases, ${hard} HARD FAIL, ${info} INFO(-0)${A['expect-fail'] ? ' [negative control: expecting FAIL]' : ''}`);
process.exit(A['expect-fail'] ? (hard > 0 ? 0 : 1) : (hard > 0 ? 1 : 0));
