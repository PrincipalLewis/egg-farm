// Gate 4: mid-game v6 save (L18, M4 OFF) written by dd52bfd's own Game/save code. cwd-independent; run with vite-node:
//   npx vite-node --root /tmp/qa-dg/dd52bfd /workspace/egg-farm-studio/qa/m3-scripts/gate4-midgame-fixture.mjs -- <outDir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { balance as b } from '/tmp/qa-dg/dd52bfd/src/config/balance';
import { Game } from '/tmp/qa-dg/dd52bfd/src/game';
import { SAVE_KEY } from '/tmp/qa-dg/dd52bfd/src/save/save';
if (b.m4.enabled) throw new Error('expected dd52bfd M4 off');
const out = process.argv[process.argv.length - 1]; mkdirSync(out, { recursive: true });
const m = new Map(); const kv = { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) };
const T0 = Date.UTC(2026, 9, 18, 20, 0, 0); let t = T0 - 3_600_000;
const g = new Game(b, kv, () => t, 11, 'qa-dd52bfd');
g.state = { ...g.state, coinsCents: 4_567_890, basket: 412, coop: 133, farmLevel: 18, collectionLevel: 11, celebratedTier: 2,
  workers: { market_hand: 1, coop_hand: 1 }, graderTier: 3, wageFracCents: { market_hand: 0.4 }, pendingOfflineEggs: 0,
  customers: [{ id: 41, demand: 30, filled: 7, waitedS: 12 }], nextCustomerId: 42 };
t = T0; g.save();
const raw = kv.getItem(SAVE_KEY), j = JSON.parse(raw);
writeFileSync(`${out}/M1-midgame-L18-dd52bfd.json`, JSON.stringify({ id: 'M1-midgame-L18', build: 'dd52bfd (M4 off, shipped)', ls: Object.fromEntries(m), idb: raw, savedAt: j.savedAt, saveSeq: j.saveSeq ?? 0, state: j.state }, null, 1));
console.log('ok', Object.keys(j.state).join(','));
