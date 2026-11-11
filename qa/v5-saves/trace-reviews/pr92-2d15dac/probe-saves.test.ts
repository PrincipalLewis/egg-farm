// QA probe (not part of the PR; copied into scratch worktrees only). For every committed save fixture, under the shipped balance
// and a pause-on balance: validate -> m5Load -> serialize, plus loadSafe (main / .bak fallback / exp1 LS+IDB reconcile).
// Prints one JSON line per case (hashes of the bytes). Run at base and head; the outputs must be identical for flags-off.
import { it, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { serialize, validate, loadSafe, SAVE_KEY, BAK_KEY, type KV } from '../src/save/save';
import { m5Load } from '../src/save/m5-fields';
const NOW = Date.UTC(2026, 9, 30, 9);
const H = (s: string | null | undefined) => s == null ? null : createHash('sha256').update(s).digest('hex').slice(0, 16);
const PZ = { ...b, m4: { ...b.m4!, flags: { ...(b.m4 as any).flags, pause: 1 }, tc: { ...b.m4!.tc!, pause_unlock_farm: 10, pause_call_lockout_s: 45 } } } as typeof b;
const kv = (m: Record<string, string>): KV => { const d = { ...m }; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; }, removeItem: k => { delete d[k]; } }; };
const pipe = (raw: string, bal: typeof b) => {
  const v = validate(raw, bal, NOW); if (!v.ok) return { ok: false, reason: v.reason };
  const s = v.file.state, ev: any[] = []; const o = m5Load(s, bal, NOW, ev);
  return { ok: true, same: o === s, ev: ev.length, out: H(serialize(o, NOW)), workers: H(JSON.stringify((o as any).workers)) };
};
const ls = (r: ReturnType<typeof loadSafe>) => ({ outcome: r.outcome, recovery: r.recovery ? (r.recovery as any).reason ?? 'y' : null, state: r.file ? H(serialize(r.file.state, NOW)) : null });
it('QA probe: save fixtures through m5Load / serialize / loadSafe', () => {
  const dir = new URL('./fixtures/saves/', import.meta.url), rows: any[] = [];
  const files = [...readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f, readFileSync(new URL(f, dir), 'utf8')]), ['v5-f2/m5-save.json', readFileSync(new URL('./fixtures/v5-f2/m5-save.json', import.meta.url), 'utf8')]];
  for (const [f, txt] of files) {
    let raw = txt; try { const j = JSON.parse(txt); if (j && j.ls) { // exp1 capture: LS + IDB
      for (const [bn, bal] of [['ship', b], ['pause', PZ]] as const) {
        rows.push({ f, case: 'exp1-reconcile', bal: bn, ...ls(loadSafe(kv(j.ls), bal, NOW, j.idb?.main ?? null)) });
        rows.push({ f, case: 'exp1-main', bal: bn, ...pipe(j.ls['eggfarm.save'], bal) });
        rows.push({ f, case: 'exp1-bak', bal: bn, ...pipe(j.ls['eggfarm.save.bak'], bal) });
      } continue; } } catch { /* corrupt fixture: raw text */ }
    for (const [bn, bal] of [['ship', b], ['pause', PZ]] as const) {
      rows.push({ f, case: 'pipe', bal: bn, in: H(raw), ...pipe(raw, bal) });
      rows.push({ f, case: 'loadSafe-main', bal: bn, ...ls(loadSafe(kv({ [SAVE_KEY]: raw }), bal, NOW)) });
      rows.push({ f, case: 'loadSafe-bak', bal: bn, ...ls(loadSafe(kv({ [SAVE_KEY]: '{corrupt', [BAK_KEY]: raw }), bal, NOW)) });
    }
  }
  writeFileSync(process.env.QA_PROBE_OUT!, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  expect(rows.length).toBeGreaterThan(10);
});
