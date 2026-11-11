// QA probe: the 5 unmigrated save fixtures through the real path (new Game boot + save(), shipped balance, gap 5 s),
// then the in-session commit main.ts:147 runs (startTracksMigration). Same file at 5d9efa61, 458f74c, a923206; outputs compared.
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
const H = (s: string | null) => s == null ? null : createHash('sha256').update(s).digest('hex');
const kvm = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const FX = ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json', 'm4-pre-v7-F30-C30.json'];
it('deferral probe', async () => {
  const rows: string[] = [];
  for (const f of FX) {
    const raw = readFileSync(`tests/fixtures/saves/${f}`, 'utf8'); const t = JSON.parse(raw).savedAt + 5_000;
    const kv = kvm(); kv.setItem(SAVE_KEY, raw);
    const g = new Game(b, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' } as any);
    const pending = g.tracksMigrationPending; g.save(); const saved = kv.getItem(SAVE_KEY)!;
    writeFileSync(`${process.env.QA_DUMP_DIR}/${f}.saved`, saved);
    const S = JSON.parse(saved), I = JSON.parse(raw);
    let commit: string | null = null; try { commit = await g.startTracksMigration(); } catch (e) { commit = 'throw:' + (e as Error).message; }
    const after = kv.getItem(SAVE_KEY)!; writeFileSync(`${process.env.QA_DUMP_DIR}/${f}.committed`, after); const C = JSON.parse(after);
    rows.push(JSON.stringify({ f, inputSha256: H(raw), pending, saved: { sha256: H(saved), version: S.version, saveSeq: S.saveSeq ?? null, stateSha256: H(JSON.stringify(S.state)), keys: Object.keys(S.state).length,
      hasTrackFields: ['hensLevel', 'eggValueLevel', 'celebratedMilestones', 'tracksV7'].filter(k => k in S.state), stateEqInputState: JSON.stringify(S.state) === JSON.stringify(I.state) },
      commit, afterCommit: { sha256: H(after), stateSha256: H(JSON.stringify(C.state)), tracksV7: C.state.tracksV7 ?? null, v6BackupId: C.state.v6BackupId ?? null, backupPresent: kv.getItem('eggfarm.save.v6_backup') !== null, backupRawEqInput: (() => { try { return JSON.parse(kv.getItem('eggfarm.save.v6_backup')!).raw === raw; } catch { return null; } })() } }));
  }
  writeFileSync(process.env.QA_PROBE_OUT!, rows.join('\n') + '\n');
});
