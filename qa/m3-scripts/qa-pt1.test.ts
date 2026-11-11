// QA pt1 entry checks (Head of QA). Not part of the engineering suite.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { migrate } from '../src/save/save';
const kv = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const OUT = '/workspace/egg-farm-studio/qa/m3-pt1/';
describe('EN-2 4 h accelerated run keeps session 1', () => {
  it('two sessions (0 h and +22 h), 4 h of play total, real balance ring_size', () => {
    const store = kv(); let clock = Date.UTC(2026, 9, 19, 8, 0, 0); const now = () => clock;
    const play = (g: Game, mins: number, onb = false) => {
      if (onb) { g.telemetry.onboardingStep(1, 'collect'); }
      for (let s = 0; s < mins * 60; s++) {
        clock += 1000; g.debugAdvance(1000); g.dispatch({ type: 'collect' });
        if (s % 15 === 0) g.dispatch({ type: 'sellAll' });
        g.dispatch({ type: 'buyFarm' }); g.dispatch({ type: 'buyCollection' });
        for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) g.dispatch({ type: 'hire', worker: w });
        if (s % 120 === 0) g.dispatch({ type: 'manageAll' });
        if (s % 5 === 0) g.save();
        if (onb && s === 5) { g.telemetry.onboardingStep(2, 'sell'); g.telemetry.onboardingStep(3, 'upgrade'); g.telemetry.onboardingStep(4, 'complete'); g.telemetry.onboardingStep(5, 'next_goal_intro'); }
      }
      g.endSession();
    };
    const g1 = new Game(b, store, now, 1, 'm3-pt1'); play(g1, 30, true);
    const s1End = clock; clock += 22 * 3600_000;
    const g2 = new Game(b, store, now, 1, 'm3-pt1'); play(g2, 210);
    const ex = JSON.parse(g2.telemetry.exportJSON()); const ev: any[] = ex.events;
    fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(OUT + 'en2-4h-export.json', JSON.stringify(ex));
    const s1 = ev.filter(e => e.ts <= s1End);
    const count = (t: string, a = s1) => a.filter(e => e.type === t).length;
    const r = { total: ev.length, bytes: JSON.stringify(ex).length, ring: b.telemetry.ring_size, s1_session_start: count('session_start'), s1_session_end: count('session_end'),
      s1_upgrades: count('upgrade'), s1_onb: count('onboarding_step'), s1_hire: count('worker_hire'), s1_manage: s1.filter(e => String(e.type).startsWith('worker_manage')).length,
      s1_trimmable: s1.filter(e => ['tap', 'sell', 'customer_arrive', 'customer_served', 'customer_lost', 'customer_partial', 'worker_summary'].includes(e.type)).length,
      sessions: count('session_start', ev), first_ts_iso: new Date(ev[0].ts).toISOString() };
    fs.writeFileSync(OUT + 'en2-summary.json', JSON.stringify(r, null, 1)); console.log('EN-2', r);
    expect(r.s1_session_start).toBe(1); expect(r.s1_session_end).toBe(1); expect(r.s1_onb).toBe(5);
    expect(r.s1_upgrades).toBeGreaterThan(10); expect(r.s1_hire).toBeGreaterThanOrEqual(3); expect(r.sessions).toBe(2);
    expect(r.bytes).toBeLessThan(2_000_000); // well inside a 5 MB localStorage quota
  });
});
describe('EN-5 privacy', () => {
  it('export keys are a fixed whitelist, no free text / UA / IP', () => {
    const ex = JSON.parse(fs.readFileSync(OUT + 'en2-4h-export.json', 'utf8'));
    const keys = new Set<string>(); for (const e of ex.events) for (const k of Object.keys(e)) keys.add(k);
    const s = JSON.stringify(ex);
    console.log('EN-5 keys', [...keys].sort().join(','));
    expect(s).not.toMatch(/Mozilla|AppleWebKit|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|@|userAgent|platform/);
  });
});
describe('fixtures migrate (AC14a baseline)', () => {
  const D = '/workspace/egg-farm-studio/qa/m3-fixtures/saves/';
  it.each(['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json'])('%s', f => {
    const raw = JSON.parse(fs.readFileSync(D + f, 'utf8')); const m = migrate(JSON.parse(JSON.stringify(raw)), b);
    expect(m.version).toBe(5);
    for (const k of ['coinsCents', 'farmLevel', 'collectionLevel', 'coop', 'basket']) expect(m.state[k as 'coop']).toEqual(raw.state[k]);
    if (raw.version === 4) { expect(m.state.workers).toEqual({}); expect(m.state.graderTier).toBe(0); expect(m.state.manageCdS).toBe(0); }
    else { expect(m.state.workers).toEqual(raw.state.workers); expect(m.state.graderTier).toBe(raw.state.graderTier); expect(m.state.manageCdS).toBe(raw.state.manageCdS); }
  });
});
