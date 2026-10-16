// L30-19b hire nudge (runtime, through Game): shows within 1 s at Farm >= hire_nudge_farm_level with 0 workers, not with
// a worker, clears for good on the first hire (also after reload), telemetry hire_nudge_shown/clicked with source.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { save, SAVE_KEY } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { SAVE_VERSION } from '../src/save/save';
import { mem } from './helpers';
import { HIRE_NUDGE_TEXT, HIRE_NUDGE_ARIA, NEW_DOT_ARIA, hireNudgeHtml, newDotHtml, pickHint, nextHire, hireNudgeLevel } from '../src/ui/hire-nudge';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { readFileSync } from 'node:fs';
const T0 = 1.8e12;
const L = hireNudgeLevel(b);
const boot = (st: any, kv = mem()) => { save(kv, st, T0); const c = { t: T0 + 1000 }; const g = new Game(b, kv, () => c.t); g.dispatch({ type: 'dismissOffline' }); return { g, c, kv }; };
const ev = (g: Game, type: string) => g.telemetry.events().filter(e => e.type === type);
describe('L30-19b hire nudge', () => {
  it('level comes from data (25), CSV column overrides the economy-config fallback', () => {
    expect(L).toBe(25); expect(readEconomyConfig().hireNudgeFarmLevel).toBe(25);
    const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
    const cfg = readEconomyConfig();
    expect(buildBalance(rows.map(r => ({ ...r, hire_nudge_farm_level: 22 }) as any), b, cfg).workers.tips.hire_nudge_farm_level).toBe(22);
    expect(buildBalance(rows, b, { ...cfg, hireNudgeFarmLevel: 24 }).workers.tips.hire_nudge_farm_level).toBe(24);
  });
  it(`shows within 1 s at Farm L${L} with 0 workers, with telemetry source l25`, () => {
    const { g, c } = boot({ ...initialState(b, 1), farmLevel: L - 1 });
    g.frame(); expect(g.hireNudgeActive).toBe(false); expect(ev(g, 'hire_nudge_shown')).toHaveLength(0);
    const seen: any[] = []; g.on(e => { if (e.type === 'hire_nudge') seen.push(e); });
    g.state = { ...g.state, farmLevel: L }; const t0 = c.t; c.t += 100; g.frame();
    expect(g.hireNudgeActive).toBe(true); expect(seen).toEqual([{ type: 'hire_nudge', phase: 'shown' }]);
    const sh = ev(g, 'hire_nudge_shown'); expect(sh).toHaveLength(1); expect(sh[0]).toMatchObject({ source: 'l25', farm_level: L });
    expect((sh[0].ts as number) - t0).toBeLessThanOrEqual(1000);
    c.t += 100; g.frame(); expect(ev(g, 'hire_nudge_shown')).toHaveLength(1); // once per session, stays visible
    expect(g.hireNudgeActive).toBe(true);
  });
  it('does not show with 1 or more workers', () => {
    const { g } = boot({ ...initialState(b, 1), farmLevel: 30, workers: { market_hand: { energy: 100, cdS: 0 } } });
    g.frame(); expect(g.hireNudgeActive).toBe(false); expect(ev(g, 'hire_nudge_shown')).toHaveLength(0);
    expect(g.state.hireNudgeDone).toBe(1);
  });
  it('clicked telemetry, cleared on hire, stays gone after reload (no SAVE_VERSION bump)', () => {
    const { g, c, kv } = boot({ ...initialState(b, 1), farmLevel: L, coinsCents: 1e12 });
    g.frame(); expect(g.hireNudgeActive).toBe(true);
    g.hireNudgeClicked('l25'); expect(ev(g, 'hire_nudge_clicked')[0]).toMatchObject({ source: 'l25', farm_level: L });
    const id = nextHire(g.state, b)!; expect(id).toBe('market_hand');
    const seen: any[] = []; g.on(e => { if (e.type === 'hire_nudge') seen.push(e); });
    g.dispatch({ type: 'hire', worker: id } as any);
    expect(g.hireNudgeActive).toBe(false); expect(g.state.hireNudgeDone).toBe(1); expect(seen).toEqual([{ type: 'hire_nudge', phase: 'cleared' }]);
    g.save(); const raw = JSON.parse(kv.getItem(SAVE_KEY)!); expect(raw.version).toBe(SAVE_VERSION); expect(raw.state.hireNudgeDone).toBe(1);
    // reload with the worker gone (any reason): the flag alone keeps the nudge off for good
    const st = { ...raw.state, workers: {} }; save(kv, st, c.t);
    const g2 = new Game(b, kv, () => c.t + 500); g2.frame();
    expect(g2.hireNudgeActive).toBe(false); expect(ev(g2, 'hire_nudge_shown').length).toBe(ev(g, 'hire_nudge_shown').length); // buffer persists; no new shown
  });
  it('dismissible: hidden for the session (not persisted), back next session while workers = 0', () => {
    const { g, c, kv } = boot({ ...initialState(b, 1), farmLevel: L });
    g.frame(); expect(g.hireNudgeActive).toBe(true);
    g.hireNudgeDismiss('l25'); expect(g.hireNudgeActive).toBe(false);
    expect(ev(g, 'hire_nudge_dismissed')[0]).toMatchObject({ source: 'l25', farm_level: L });
    c.t += 5000; g.frame(); expect(g.hireNudgeActive).toBe(false);
    g.save(); expect(JSON.stringify(JSON.parse(kv.getItem(SAVE_KEY)!).state)).not.toMatch(/dismiss/i); expect(g.state.hireNudgeDone).toBeUndefined();
    const n = ev(g, 'hire_nudge_shown').length;
    const g2 = new Game(b, kv, () => c.t + 1000); g2.frame();
    expect(g2.hireNudgeActive).toBe(true); expect(ev(g2, 'hire_nudge_shown').length).toBe(n + 1);
  });
  it('own trigger: shows at F25+ with 0 workers whether or not the coop is full', () => {
    const { g } = boot({ ...initialState(b, 1), farmLevel: L, coop: 0 }); g.frame(); expect(g.hireNudgeActive).toBe(true);
  });
  it('final copy, aria and New dot are constants in the markup', () => {
    expect(HIRE_NUDGE_TEXT).toBe('Busy farm!\u00a0·\u00a0Hire a worker');
    expect(HIRE_NUDGE_ARIA).toBe('Your farm is busy. Hire a worker. Opens Workers.');
    expect(NEW_DOT_ARIA).toBe('New: workers can be hired');
    const html = hireNudgeHtml('icon-hire.svg');
    expect(html).toContain(HIRE_NUDGE_TEXT); expect(html).toContain('›'); expect(html).toContain(`aria-label="${HIRE_NUDGE_ARIA}"`); expect(html).toContain('icon-hire.svg');
    expect(newDotHtml()).toContain('data-testid="new-dot"'); expect(newDotHtml()).toContain(NEW_DOT_ARIA);
  });
  it('hint precedence: coop-full > hire nudge > UC25 > M4, one at a time', () => {
    expect(pickHint({ coop_full: true, hire_nudge: true, uc25: true, m4: true })).toBe('coop_full');
    expect(pickHint({ hire_nudge: true, uc25: true, m4: true })).toBe('hire_nudge');
    expect(pickHint({ uc25: true, m4: true })).toBe('uc25'); expect(pickHint({ m4: true })).toBe('m4'); expect(pickHint({})).toBeNull();
  });
});
