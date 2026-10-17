import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { manageAllHtml, workersHtml } from '../src/ui/workers-ui';
import type { SimEvent } from '../src/sim/events';
const E = b.workers.energy;
const run = (s: GameState, secs: number, ev?: SimEvent[]) => { for (let i = 0; i < Math.round(secs * b.tickHz); i++) s = step(s, 1 / b.tickHz, b, ev); return s; };
const base = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 3), farmLevel: 10, collectionLevel: 3, nextCustomerInS: 1e9, ...o });
const wk = (energy: number) => ({ energy, cdS: 0 });
const yawns = (ev: SimEvent[]) => ev.filter(e => e.type === 'worker_yawn') as Extract<SimEvent, { type: 'worker_yawn' }>[];

describe('post-rc1 m-2: worker_yawn telemetry', () => {
  it('fires once with {worker_id, energy_pct, farm_level} when a worker crosses into Yawning', () => {
    const ev: SimEvent[] = [];
    let s = run(base({ workers: { hawker: wk(E.yawn_at_pct + 0.5) } }), 60, ev);
    const y = yawns(ev); expect(y).toHaveLength(1);
    expect(Object.keys(y[0]).sort()).toEqual(['energy_pct', 'farm_level', 'type', 'worker_id']);
    expect(y[0].worker_id).toBe('hawker'); expect(y[0].farm_level).toBe(10); expect(y[0].energy_pct).toBeLessThanOrEqual(E.yawn_at_pct);
    s = run(s, 60, ev); expect(yawns(ev)).toHaveLength(1); // staying in Yawning does not repeat
  });
  it('no event when already Yawning at start; fires again after Manage refills and it drops back', () => {
    const ev: SimEvent[] = [];
    let s = run(base({ workers: { hawker: wk(E.yawn_at_pct - 5) } }), 30, ev); expect(yawns(ev)).toHaveLength(0);
    s = apply(s, { type: 'manage', worker: 'hawker' }, b);
    s = run(s, (100 - E.yawn_at_pct + 1) * E.drain_s_per_pct, ev); expect(yawns(ev)).toHaveLength(1);
  });
  it('one event per worker', () => {
    const ev: SimEvent[] = [];
    run(base({ workers: { hawker: wk(E.yawn_at_pct + 0.5), grader: wk(E.yawn_at_pct + 0.3) }, graderTier: 1 }), 30, ev);
    expect(yawns(ev).map(e => e.worker_id).sort()).toEqual(['grader', 'hawker']);
  });
});

describe('post-rc1 m-1: Manage all greyed during shared cooldown', () => {
  const s = base({ workers: { hawker: wk(30), grader: wk(50), coop_hand: wk(60) }, graderTier: 1, manageCdS: 16 });
  it('Workers tab pill: aria-disabled + is-cooldown, keeps countdown text and ring, like single Manage', () => {
    const html = manageAllHtml(s, b);
    expect(html).toContain('aria-disabled="true"'); expect(html).toContain('is-cooldown'); expect(html).toContain('ring-cooldown');
    expect(html).toMatch(/0:16/);
    expect(workersHtml(s, b)).toMatch(/class="btn secondary manage is-cooldown"[^>]*aria-disabled="true"/);
    expect(manageAllHtml({ ...s, manageCdS: 0 }, b)).not.toContain('aria-disabled="true"');
  });
  it('CSS greys out all three Manage all copies with the same disabled style as Manage', () => {
    const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
    const rule = css.match(/([^}]*desk-manage-all\[aria-disabled=true\][^{]*)\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    for (const sel of ['.btn.manage-all[aria-disabled=true]', 'farm-manage-all[aria-disabled=true]', 'desk-manage-all[aria-disabled=true]']) expect(rule![1]).toContain(sel);
    expect(rule![2]).toContain('background:var(--c-disabled)'); expect(rule![2]).toContain('color:var(--c-muted)');
    expect(css).toContain('.manage.is-cooldown .ring-cooldown{display:block}');
  });
});
