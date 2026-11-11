// node econ-compare.mjs base.json rc.json -> metrics per side, delta, per-seed worse list
import { readFileSync } from 'node:fs';
const [B, C] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
const inf = x => x == null ? Infinity : x, med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.ceil(p * s.length) - 1]; };
const rng = (a, z) => Array.from({ length: z - a + 1 }, (_, i) => a + i);
const M = d => { const r = {};
  for (const [a, z] of [[1, 200], [201, 299]]) { const t10 = rng(a, z).map(s => inf(d.acw1[s].t10)), t18 = rng(a, z).map(s => inf(d.acw1[s].t18));
    r[`acw1 ${a}-${z} pctF10<=960s`] = +(100 * t10.filter(t => t <= 960).length / t10.length).toFixed(2); r[`acw1 ${a}-${z} medF18 min`] = +(med(t18) / 60).toFixed(2); r[`acw1 ${a}-${z} medF10 min`] = +(med(t10) / 60).toFixed(2); }
  for (const [a, z] of [[1, 200], [201, 300]]) for (const k of ['nw', 'w']) { const x = rng(a, z).map(s => inf(d.l10[s][k]) / 60);
    r[`L10 ${a}-${z} ${k} P95 min`] = +q(x, .95).toFixed(2); r[`L10 ${a}-${z} ${k} fastest min`] = +Math.min(...x).toFixed(2); }
  const at = rng(1, 100).map(s => d.ac7[s].at30), st = rng(1, 100).map(s => inf(d.ac7[s].step18_25));
  r['AC7 w L@30 P5'] = q(at, .05) ; r['AC7 w L@30 median'] = med(at); r['AC7 w L@30 P95'] = q(at, .95); r['AC7 w L18-25 step P95 s'] = q(st, .95); r['AC7 w L18-25 step worst s'] = Math.max(...st); return r; };
const mb = M(B), mc = M(C); let diff = 0;
console.log('metric | dd223f5 | 5d9efa6 | delta');
for (const k of Object.keys(mb)) { const dl = +(mc[k] - mb[k]).toFixed(2); if (dl) diff++; console.log(`${k} | ${mb[k]} | ${mc[k]} | ${dl}`); }
let worse = [];
for (const s of Object.keys(B.acw1)) for (const k of ['t10', 't18']) if (inf(C.acw1[s][k]) > inf(B.acw1[s][k])) worse.push(`acw1 seed ${s} ${k} ${B.acw1[s][k]} -> ${C.acw1[s][k]}`);
for (const s of Object.keys(B.l10)) for (const k of ['nw', 'w']) if (inf(C.l10[s][k]) > inf(B.l10[s][k])) worse.push(`L10 seed ${s} ${k} ${B.l10[s][k]} -> ${C.l10[s][k]}`);
for (const s of Object.keys(B.ac7)) { if (C.ac7[s].at30 < B.ac7[s].at30) worse.push(`AC7 seed ${s} at30 ${B.ac7[s].at30} -> ${C.ac7[s].at30}`); if (inf(C.ac7[s].step18_25) > inf(B.ac7[s].step18_25)) worse.push(`AC7 seed ${s} step ${B.ac7[s].step18_25} -> ${C.ac7[s].step18_25}`); }
const ident = JSON.stringify(B) === JSON.stringify(C);
console.log(`ECON_COMPARE metrics_changed=${diff} seeds_worse=${worse.length} per_seed_identical=${ident}`); worse.forEach(w => console.log('WORSE', w));
