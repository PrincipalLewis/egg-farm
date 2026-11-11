// vite-node mk20.ts <clone>: MK-20 presentation-only dwell. Sim never reads served_dwell_ms, and mk20-sim-hash.ts is deterministic run-to-run.
import { execFileSync, execSync } from 'node:child_process';
const R = process.argv[2]; const run = () => execFileSync(R + '/node_modules/.bin/vite-node', ['/workspace/egg-farm-studio/qa/m3-scripts/mk20-sim-hash.ts'], { cwd: R, encoding: 'utf8' }).trim().split('\n').pop();
let n = 0, f = 0; const ok = (t: string, p: boolean, i?: any) => { n++; if (!p) f++; console.log(`${p ? 'PASS' : 'FAIL'} ${t} — ${JSON.stringify(i)}`); };
let simRefs = ''; try { simRefs = execSync('grep -rlE "served_dwell|servedDwell" src/sim', { cwd: R, encoding: 'utf8' }).trim(); } catch {}
ok('src/sim does not reference served_dwell_ms', simRefs === '', simRefs);
const a = run(), b = run(); ok('same seed + inputs -> identical trajectory hash (2 runs, MH + no workers, 3 seeds)', a === b, JSON.parse(a));
console.log(`SUMMARY ${n - f}/${n}`); process.exit(f ? 1 : 0);
