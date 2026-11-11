// M4-state save fixtures from acdbedc's REAL save code (Game + save.ts), run as "QA M4-on build of acdbedc"
// (acdbedc ships m4.enabled=0; we clone its balance with enabled=1). Usage (cwd = acdbedc worktree):
//   npx vite-node /workspace/egg-farm-studio/qa/m3-scripts/m4-downgrade-fixtures.mjs -- <outDir>
// Each fixture: <id>.json = { id, desc, ls: {key: raw}, idb: raw (mirror payload = main raw), savedAt, now0, meta }
import { writeFileSync, mkdirSync } from 'node:fs';
import { balance as shipped } from '/tmp/qa-dg/acdbedc/src/config/balance';
import { Game } from '/tmp/qa-dg/acdbedc/src/game';
import { SAVE_KEY, serialize } from '/tmp/qa-dg/acdbedc/src/save/save';
import { reachedMilestones } from '/tmp/qa-dg/acdbedc/src/sim/tracks';
const out = process.argv[process.argv.length - 1];
mkdirSync(out, { recursive: true });
const ON = structuredClone(shipped); ON.m4.enabled = 1;
const mem = () => { const m = new Map(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) }; };
const T0 = Date.UTC(2026, 9, 17, 9, 0, 0);
const ui = JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false });
function mk(id, desc, patch, { hideAt = null, b = ON, at = T0 } = {}) {
  const kv = mem(); let t = at - 600_000; const g = new Game(b, kv, () => t, 7, 'qa-acdbedc-m4on');
  g.state = { ...g.state, ...patch }; if (b === ON) g.state = { ...g.state, celebratedMilestones: reachedMilestones(g.state, b) }; t = at;
  if (hideAt !== null) { g.onHidden?.(t); }
  g.save();
  const raw = kv.getItem(SAVE_KEY); const j = JSON.parse(raw);
  const fx = { id, desc, build: 'acdbedc QA M4-on (balance clone m4.enabled=1)', ls: { ...Object.fromEntries(kv.m), 'eggfarm.ui': ui }, idb: raw, savedAt: j.savedAt, saveSeq: j.saveSeq ?? 0, state: j.state };
  writeFileSync(`${out}/${id}.json`, JSON.stringify(fx, null, 1)); return fx;
}
const base = { coinsCents: 1_234_567, basket: 321, coop: 88, collectionLevel: 9, workers: { market_hand: 1, coop_hand: 1 }, graderTier: 2 };
mk('F1-tracks', 'tracks owned + selected (H12 V8 F15), milestones celebrated', { ...base, farmLevel: 15, hensLevel: 12, eggValueLevel: 8, celebratedMilestones: ['hens10', 'grade5'] });
mk('F2-highlight', 'highlight-active state: coins enough for HENS/VALUE buys (highlight is UI-derived, not persisted; picker recomputes)', { ...base, coinsCents: 50_000_000, farmLevel: 12, hensLevel: 10, eggValueLevel: 10 });
mk('F3-offline-pending', 'offline in progress: closed mid-grant (pendingOfflineEggs 777 parked) and savedAt = close time; load later accrues M4 grant', { ...base, farmLevel: 15, hensLevel: 15, eggValueLevel: 10, pendingOfflineEggs: 777 });
mk('F4-L30max', 'L30 max all tracks with M4', { ...base, coinsCents: 999_999_999, farmLevel: 30, collectionLevel: 30, hensLevel: 30, eggValueLevel: 30, celebratedMilestones: ['hens10', 'hens20', 'hens30'] });
// F5: pre-M4 control = written by acdbedc as shipped (flag off), no tracksV7
mk('F5-preM4', 'pre-M4 control: acdbedc shipped flag-off save, no tracksV7', { ...base, farmLevel: 14 }, { b: shipped });
console.log('ok', out);
