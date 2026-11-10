// Smoke: QA M3 real-save fixtures (AC14a) from m1-rc2 (v4) and m2-rc1 (v5) migrate to the current version without errors.
// Field-by-field checks and the corrupt-file / AC14b cases land with rc0 save hardening.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { migrate, load, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { mem } from './helpers';
const dir = new URL('./fixtures/saves/', import.meta.url);
const files = ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json'];
describe('QA M3 save fixtures (smoke)', () => {
  for (const f of files) it(`${f} migrates and loads`, () => {
    const raw = readFileSync(new URL(f, dir), 'utf8'), d = JSON.parse(raw);
    expect(() => migrate(JSON.parse(raw), b)).not.toThrow();
    const kv = mem(); kv.setItem(SAVE_KEY, raw); const s = load(kv, b);
    expect(s).not.toBeNull(); expect(s!.version).toBe(SAVE_VERSION);
    expect(s!.state.farmLevel).toBe(d.state.farmLevel); expect(s!.state.coinsCents).toBe(d.state.coinsCents);
  });
});
