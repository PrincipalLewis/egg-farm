// Architect review engineering/reviews/v5-zerogain-546de85-architect.md (sha256 1f8c0337) Minor 1: annotateLast tags the NEWEST
// matching event (mutant Y10, oldest-first scan, must fail here) and marks the buffer dirty.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import { Telemetry } from '../src/telemetry/telemetry';
import { mem } from './helpers';

describe('Minor 1: Telemetry.annotateLast tags the newest matching event only', () => {
  it('two upgrade events: only the second is annotated, and the buffer is marked dirty (flushed)', () => {
    const kv = mem() as any; let now = 0; const tel = new Telemetry(kv, balance.telemetry, () => now);
    tel.track('upgrade', { upgrade: 'collection', newLevel: 2 }); now = 5; tel.track('upgrade', { upgrade: 'collection', newLevel: 3 });
    now = 6; tel.track('tap_other', {}); tel.flush(true); const w = tel.writes;
    tel.annotateLast('upgrade', { zero_gain: true });
    const ups = tel.events().filter(e => e.type === 'upgrade');
    expect(ups[0]).not.toHaveProperty('zero_gain'); expect(ups[1]).toMatchObject({ newLevel: 3, zero_gain: true });
    tel.flush(); expect(tel.writes).toBe(w + 1); // dirty -> one write
    const stored = JSON.parse(kv.getItem('eggfarm.telemetry')).filter((e: any) => e.type === 'upgrade');
    expect(stored.map((e: any) => e.zero_gain)).toEqual([undefined, true]);
  });
  it('no match: nothing changes and nothing is written', () => {
    const tel = new Telemetry(mem() as any, balance.telemetry, () => 0); tel.track('tap_other', {}); tel.flush(true); const w = tel.writes;
    tel.annotateLast('upgrade', { zero_gain: true }); tel.flush(); expect(tel.writes).toBe(w); expect(tel.events().some(e => 'zero_gain' in e)).toBe(false);
  });
});

