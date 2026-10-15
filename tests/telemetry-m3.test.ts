import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Telemetry, INSTALL_ID_KEY, TELEMETRY_KEY, isPinned } from '../src/telemetry/telemetry';
import { Game } from '../src/game';
import { resetProgress, SAVE_KEY } from '../src/save/save';
const kv = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
describe('M3-AC7 telemetry retention', () => {
  it('first-session / onboarding events are never evicted by the capped ring', () => {
    const t = new Telemetry(kv(), { ...b.telemetry, ring_size: 100 }, () => 0);
    t.track('session_start', { install_id: 'x' }); t.onboardingStep(1, 'collect'); t.onboardingSkip(1); t.track('upgrade'); t.track('worker_hire'); t.track('worker_manage'); t.track('worker_manage_all');
    for (let i = 0; i < 10_000; i++) t.track(i % 2 ? 'sell' : 'customer_arrive', { i });
    const ev = t.events();
    expect(ev.slice(0, 7).map(e => e.type)).toEqual(['session_start', 'onboarding_step', 'onboarding_skip', 'upgrade', 'worker_hire', 'worker_manage', 'worker_manage_all']);
    expect(ev.filter(e => !isPinned(e.type))).toHaveLength(100); expect(ev[ev.length - 1].i).toBe(9999);
  });
  it('pinned events survive a reload and a 4 h-like flood; export contains them', () => {
    const store = kv(); const t = new Telemetry(store, { ...b.telemetry, ring_size: 50 }, () => 0);
    t.onboardingStep(1, 'collect'); for (let i = 0; i < 500; i++) t.track('sell'); t.flush(true);
    const t2 = new Telemetry(store, { ...b.telemetry, ring_size: 50 }, () => 0); for (let i = 0; i < 500; i++) t2.track('tap');
    const ex = JSON.parse(t2.exportJSON()); expect(ex.events.some((e: any) => e.type === 'onboarding_step' && e.name === 'collect')).toBe(true);
  });
  it('high-rate events stay ring-trimmed', () => { expect(['tap', 'sell', 'customer_arrive', 'customer_lost', 'worker_summary'].some(isPinned)).toBe(false); });
});
describe('M3-AC7 install_id + build', () => {
  it('session_start carries install_id and build; id stored under its own key, not in the save', () => {
    const s = kv(); const g = new Game(b, s, () => 0, 1, 'm3-pt1+abcdef0');
    const ss = g.telemetry.events().find(e => e.type === 'session_start')!;
    expect(ss.build).toBe('m3-pt1+abcdef0'); expect(ss.install_id).toBe(s.getItem(INSTALL_ID_KEY)); expect(String(ss.install_id).length).toBeGreaterThan(8);
    g.save(); expect(s.getItem(SAVE_KEY)).not.toContain(String(ss.install_id));
  });
  it('BUILD_ID is m3-pt1+<short git hash> matching HEAD (Vite define)', async () => {
    const { BUILD_ID, BUILD_ID_RE } = await import('../src/build-id');
    const { execSync } = await import('node:child_process');
    const short = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    expect(BUILD_ID).toMatch(BUILD_ID_RE);
    expect(BUILD_ID).toBe(`m3-pt1+${short}`);
  });
  it('save reset keeps the install id unchanged', () => {
    const s = kv(); const id = new Game(b, s, () => 0).installId; new Game(b, s, () => 0).save();
    resetProgress(s); expect(s.getItem(SAVE_KEY)).toBeNull(); expect(s.getItem(TELEMETRY_KEY)).toBeNull();
    const g = new Game(b, s, () => 0); expect(g.isNewGame).toBe(true); expect(g.installId).toBe(id);
  });
  it('corrupt-save fallback keeps the install id unchanged', () => {
    const s = kv(); const id = new Game(b, s, () => 0).installId; s.setItem(SAVE_KEY, '{"version":4,"sta');
    const g = new Game(b, s, () => 0); expect(g.isNewGame).toBe(true); expect(g.installId).toBe(id);
  });
});
