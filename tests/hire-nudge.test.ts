// L30-19b hire nudge (runtime, through Game): shows within 1 s at Farm >= hire_nudge_farm_level with 0 workers, not with
// a worker, clears for good on the first hire (also after reload), telemetry hire_nudge_shown/clicked with source.
import { describe, it, expect } from 'vitest';
import { balance as live, type Balance } from '../src/config/balance';
// Flag on (the nudge is M4-only); fixtures carry tracksV7 so no track migration runs.
const b: Balance = { ...live, m4: { ...live.m4!, enabled: 1 } };
import { Game } from '../src/game';
import { save, SAVE_KEY, BAK_KEY, loadSafe, validate, serialize } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { initialState } from '../src/sim/state';
import { SAVE_VERSION } from '../src/save/save';
import { mem } from './helpers';
import { HIRE_NUDGE_DISMISS_ARIA, FARM_BUY_SELECTOR, focusAfterDismiss, DISMISS_RESERVE_PX, HINT_FULL_MIN_PX, dropLead, HIRE_NUDGE_TEXT, HIRE_NUDGE_ARIA, NEW_DOT_ARIA, hireNudgeHtml, newDotHtml, pickHint, nextHire, hireNudgeLevel } from '../src/ui/hire-nudge';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { readFileSync } from 'node:fs';
const T0 = 1.8e12;
const L = hireNudgeLevel(b);
const boot = (st: any, kv = mem()) => { save(kv, { tracksV7: 1, ...st }, T0); const c = { t: T0 + 1000 }; const g = new Game(b, kv, () => c.t); g.dispatch({ type: 'dismissOffline' }); return { g, c, kv }; };
const ev = (g: Game, type: string) => g.telemetry.events().filter(e => e.type === type);
describe('L30-19b hire nudge', () => {
  it('level comes from data (25), CSV column overrides the economy-config fallback', () => {
    expect(L).toBe(25); expect(readEconomyConfig().hireNudgeFarmLevel).toBe(25);
    const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
    const cfg = readEconomyConfig();
    expect(buildBalance(rows.map(r => ({ ...r, hire_nudge_farm_level: 22 }) as any), live, cfg).workers.tips.hire_nudge_farm_level).toBe(22);
    expect(buildBalance(rows, live, { ...cfg, hireNudgeFarmLevel: 24 }).workers.tips.hire_nudge_farm_level).toBe(24);
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
  it('final copy, aria and New dot are constants (§5 v1.1)', () => {
    expect(HIRE_NUDGE_TEXT).toBe('Busy farm!\u00a0·\u00a0Hire a worker\u00a0\u203a');
    expect(HIRE_NUDGE_ARIA).toBe('Your farm is busy. Hire a worker. Opens Workers.');
    expect(NEW_DOT_ARIA).toBe('New: workers can be hired');
    expect(newDotHtml()).toContain('data-testid="new-dot"'); expect(newDotHtml()).toContain(`aria-label="${NEW_DOT_ARIA}"`);
  });
  it('DOM structure + attributes (§5): one button = icon 14px, then text with droppable lead and U+203A; dismiss outside it', () => {
    const html = hireNudgeHtml('icon-hire.svg');
    const btn = html.match(/<button type="button" class="hire-nudge" data-testid="hire-nudge" aria-label="([^"]+)">(.*?)<\/button>/)!;
    expect(btn).not.toBeNull(); expect(btn[1]).toBe(HIRE_NUDGE_ARIA);
    expect(btn[2]).toMatch(/^<img class="hn-ic" src="icon-hire.svg" width="14" height="14" alt="" aria-hidden="true"><span class="hn-txt">/);
    expect(btn[2]).toContain(`<span class="hn-lead">Busy farm!\u00a0·\u00a0</span>Hire a worker\u00a0\u203a</span>`);
    expect(btn[2]).not.toMatch(/⚠|…|<button/);
    expect(html.startsWith('<div class="hire-nudge-line" data-testid="hire-nudge-line">')).toBe(true);
    expect(html).toMatch(/<\/button><button type="button" class="hire-nudge-x" data-testid="hire-nudge-dismiss" aria-label="[^"]+">×<\/button><\/div>$/);
  });
  it('CSS (§5): Nunito 700 12px/16px, --c-wood-text token, 44px hit via ::before -14px, 4px icon gap, lead dropped on overflow, no ellipsis', () => {
    const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
    const rule = (sel: string) => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); expect(m, sel).not.toBeNull(); return m![1]; };
    const r = rule('.hire-nudge');
    expect(r).toContain('font:700 12px/16px var(--f-body)'); expect(r).toContain('color:var(--c-wood-text)'); expect(r).toContain('gap:4px');
    expect(r).toContain('text-overflow:clip'); expect(r).not.toMatch(/ellipsis|#[0-9a-f]{3,6}/i);
    expect(rule('.hire-nudge::before')).toContain('inset:-14px 0'); // 16px line + 2 x 14px = 44px
    expect(rule('.hire-nudge .hn-ic')).toContain('width:14px');
    expect(css).toMatch(/@container \(max-width:221px\)\{\.hire-nudge \.hn-lead\{display:none\}\}/); // 170 + 52 reserve
    const x = rule('.hire-nudge-x');
    for (const d of ['flex:none', 'margin-left:auto', 'width:44px', 'height:44px', 'font:700 12px/1 var(--f-body)', 'color:var(--c-wood-text)']) expect(x).toContain(d);
    expect(rule('.hire-nudge-line')).toContain('gap:8px');
    expect(css).toMatch(/--f-body:"Nunito"/); expect(css).toMatch(/--c-wood-text:#8A5528/);
    const block = css.slice(css.indexOf('/* L30-19b hire nudge')); expect(block.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); // tokens only
  });
  it('§5a dismiss: aria "Dismiss hire hint", sibling of the hint button; focus moves to the Farm Buy button', () => {
    expect(HIRE_NUDGE_DISMISS_ARIA).toBe('Dismiss hire hint');
    expect(hireNudgeHtml('i.svg')).toContain('class="hire-nudge-x" data-testid="hire-nudge-dismiss" aria-label="Dismiss hire hint">×</button></div>');
    const calls: string[] = []; const root = { querySelector: (sel: string) => (calls.push(sel), { focus: () => calls.push('focus') }) };
    focusAfterDismiss(root); expect(calls).toEqual([FARM_BUY_SELECTOR, 'focus']); expect(FARM_BUY_SELECTOR).toBe('button.btn.buy[data-kind="farm"]');
    expect(() => focusAfterDismiss({ querySelector: () => null })).not.toThrow();
  });
  it('§5a drop rule: reserve 52px for the × first, drop the lead when the hint gets < 170px', () => {
    expect(DISMISS_RESERVE_PX).toBe(52); expect(HINT_FULL_MIN_PX).toBe(170);
    expect(dropLead(240)).toBe(false); expect(dropLead(222)).toBe(false); expect(dropLead(221)).toBe(true); expect(dropLead(150)).toBe(true);
  });
  it('hint precedence: coop-full > hire nudge > UC25 > M4, one at a time', () => {
    expect(pickHint({ coop_full: true, hire_nudge: true, uc25: true, m4: true })).toBe('coop_full');
    expect(pickHint({ hire_nudge: true, uc25: true, m4: true })).toBe('hire_nudge');
    expect(pickHint({ uc25: true, m4: true })).toBe('uc25'); expect(pickHint({ m4: true })).toBe('m4'); expect(pickHint({})).toBeNull();
  });
  it('flag off = main: no nudge, no telemetry, no hireNudgeDone write (saved bytes equal a no-nudge build)', () => {
    const off: Balance = { ...live, m4: { ...live.m4!, enabled: 0 } };
    for (const st of [{ ...initialState(off, 1), farmLevel: L }, { ...initialState(off, 1), farmLevel: L, workers: { market_hand: { energy: 100, cdS: 0 } } }]) {
      const kv = mem(); save(kv, st as any, T0); const c = { t: T0 + 1000 }; const g = new Game(off, kv, () => c.t);
      g.dispatch({ type: 'dismissOffline' }); for (let i = 0; i < 5; i++) { c.t += 200; g.frame(); }
      expect(g.hireNudgeActive).toBe(false); expect('hireNudgeDone' in g.state).toBe(false);
      expect(g.telemetry.events().filter(e => e.type.startsWith('hire_nudge'))).toHaveLength(0);
      g.save(); const saved = JSON.parse(kv.getItem(SAVE_KEY)!); expect('hireNudgeDone' in saved.state).toBe(false);
      expect(serialize(g.state, 1)).toBe(serialize({ ...g.state }, 1)); // no extra key materialised
    }
  });
  describe('hireNudgeDone round-trip (PR #12)', () => {
    const base = { ...initialState(b, 1), farmLevel: L, tracksV7: 1 as const };
    it('loadSafe keeps 1 and leaves absent absent; junk is treated as absent (validate type-check)', () => {
      for (const [v, want] of [[1, 1], [undefined, undefined], ['yes', undefined], [true, undefined], [2, undefined]] as const) {
        const kv = mem(); const st: any = { ...base }; if (v !== undefined) st.hireNudgeDone = v; else delete st.hireNudgeDone;
        save(kv, st, T0); const r = loadSafe(kv, b, T0 + 1000); expect(r.file!.state.hireNudgeDone).toBe(want);
        const vr = validate(kv.getItem(SAVE_KEY)!, b); expect(vr.ok).toBe(true);
      }
    });
    it('junk value does not suppress the nudge after load', () => {
      const { g } = boot({ ...base, hireNudgeDone: 'x' as any }); g.frame(); expect(g.hireNudgeActive).toBe(true);
    });
    it('v7 migration (pre-M4 save, flag on) preserves the field', () => {
      const v6: any = { ...initialState(live, 1), farmLevel: L, hireNudgeDone: 1 }; delete v6.tracksV7;
      expect(migrateTracksV7(v6, b).state.hireNudgeDone).toBe(1);
      const kv = mem(); save(kv, v6, T0); const r = loadSafe(kv, b, T0 + 1000);
      expect(r.file!.tracksMigrated).toBe(true); expect(r.file!.state.hireNudgeDone).toBe(1);
    });
    it('.bak: restored from backup when main is corrupt', () => {
      const kv = mem(); save(kv, { ...base, hireNudgeDone: 1 } as any, T0, b, true); save(kv, { ...base, hireNudgeDone: 1, coinsCents: 5 } as any, T0 + 10, b, true);
      expect(JSON.parse(kv.getItem(BAK_KEY)!).state.hireNudgeDone).toBe(1);
      kv.setItem(SAVE_KEY, '{"broken'); const r = loadSafe(kv, b, T0 + 1000);
      expect(r.recovery?.restored_from_backup).toBe(true); expect(r.file!.state.hireNudgeDone).toBe(1);
    });
    it('IndexedDB mirror copy: the mirrored raw restores the field', () => {
      const writes: string[] = []; const { g, kv } = boot({ ...base, coinsCents: 1e12 });
      g.mirror = { write: (raw: string) => { writes.push(raw); }, clear: async () => {} };
      g.frame(); g.dispatch({ type: 'hire', worker: 'market_hand' } as any); g.save();
      const raw = writes[writes.length - 1]; expect(JSON.parse(raw).state.hireNudgeDone).toBe(1);
      const k2 = mem(); expect(reconcile(k2, raw, b, T0 + 5000)).toBe('idb'); const r = loadSafe(k2, b, T0 + 5000, raw); expect(r.file!.state.hireNudgeDone).toBe(1); void kv;
    });
  });
});
