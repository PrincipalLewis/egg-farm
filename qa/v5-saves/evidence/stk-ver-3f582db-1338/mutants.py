# Mutation run for stk-ver.probe.test.ts in the scratch tree only. Each mutant: patch one src file, run vitest (max 2 workers), restore.
import subprocess, shutil, sys, os
W = '/workspace/egg-farm-studio/qa/scratch/wt-stkver-3f582db'
M = [
 ('M1', 'serialize writes a streakBest key (streak run peak)', 'src/save/save.ts',
  'const st = JSON.stringify(m5Persist(state));',
  "const st = JSON.stringify({ ...m5Persist(state), ...((state as any).streakS !== undefined ? { streakBest: (state as any).streakRun?.peak ?? (state as any).streakS } : {}) });"),
 ('M2', 'SAVE_VERSION bumped to 7 with an M5 migration 6->7', 'src/save/save.ts',
  'export const SAVE_VERSION = 6;', 'export const SAVE_VERSION = 7;', ('  5: (d) => ({ ...d, version: 6, state: { ...d.state, wageFracCents: {} } }),', '  5: (d) => ({ ...d, version: 6, state: { ...d.state, wageFracCents: {} } }),\n  6: (d) => ({ ...d, version: 7 }),')),
 ('M3', 'Game boot emits save_migrated{m5_fields,6->6} after m5Load', 'src/game.ts',
  'if (f) { const ev: SimEvent[] = []; this.state = m5Load(this.state, b, now(), ev); this.emit(ev); }',
  "if (f) { const ev: SimEvent[] = []; this.state = m5Load(this.state, b, now(), ev); if (b.m4?.flags?.golden === 1) ev.push({ type: 'save_migrated', from: 6, to: 6, migration: 'm5_fields' } as any); this.emit(ev); }"),
 ('M4', 'm5Load reads a hand-added streakBest into streakS', 'src/save/m5-fields.ts',
  'const o: any = { ...m5Persist(s) }; // hand-edited session keys never load',
  "const o: any = { ...m5Persist(s) }; if (typeof o.streakBest === 'number' && m5Flag(b, 'streak')) o.streakS = Math.min(0.28, o.streakBest / 100);"),
 ('M5', 'no-op migration key 6 added (no bump)', 'src/save/save.ts',
  '  5: (d) => ({ ...d, version: 6, state: { ...d.state, wageFracCents: {} } }),',
  '  5: (d) => ({ ...d, version: 6, state: { ...d.state, wageFracCents: {} } }),\n  6: (d) => d,'),
]
log = open(sys.argv[1], 'a')
for mid, desc, f, old, new, *extra in M:
    p = os.path.join(W, f); orig = open(p).read()
    assert orig.count(old) == 1, (mid, 'anchor')
    s = orig.replace(old, new)
    for o2, n2 in extra: assert s.count(o2) == 1, (mid, 'anchor2'); s = s.replace(o2, n2)
    open(p, 'w').write(s)
    try:
        r = subprocess.run(['npx', 'vitest', 'run', '--config', 'vitest.probe.config.ts', '--maxWorkers=2', '--minWorkers=1', '--reporter=verbose'], cwd=W, capture_output=True, text=True, timeout=300)
        out = r.stdout + r.stderr
        fails = sorted({l.split('> [')[1].split(']')[0] for l in out.splitlines() if l.strip().startswith('×') and '> [' in l})
        tl = [l.strip() for l in out.splitlines() if l.strip().startswith('Tests ')]
        log.write(f"MUTANT {mid} {desc} ({f}): exit={r.returncode} {tl[-1] if tl else 'NO SUMMARY'} -> {'KILLED' if r.returncode != 0 and fails else 'SURVIVED'}; failing: {', '.join(fails)}\n"); log.flush()
    finally:
        open(p, 'w').write(orig)
    assert open(p).read() == orig
log.write('DONE (all sources restored)\n'); log.close()
