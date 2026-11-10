// @vitest-environment jsdom
// Shift sheet UI (Features, HoE/v5-ui-shift-sheet). Art m5-refill-flows.md v1.0.1 sha1 43828d0b (RF-UI-*), abilities §16 sha1 fc1ca17d;
// sim contract G0-API.md rev 6 sha256 5225aab8 §12 via a test double (tests/fixtures/shift/fake-sim.ts).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { clearSheets, openSheets, registerSheet } from '../src/ui/overlay';
import { mountShiftSheet, openShiftSheet, setShiftSheet, refillButtonState, refillLabelHtml, fmtChargeCountdown, pillKind, openerView,
  ResortGate, SHIFT_SPEC, type ShiftSheetHandle } from '../src/ui/shift-sheet';
import { FakeShiftSim } from './fixtures/shift/fake-sim';

const withFlags = (f: Record<string, number>): Balance => { const b = structuredClone(balance) as Balance & { m4: { enabled: number; flags: Record<string, number> } };
  b.m4.enabled = 1; b.m4.flags = { ...b.m4.flags, ...f }; return b; };
const ON = withFlags({ rc2Refill: 1 });
let t = 0, timers: (() => void)[] = [], audio: string[] = [], toasts: string[] = [], rm = false, docked = false;
function mount(b = ON, sim = new FakeShiftSim(), extra: Partial<Parameters<typeof mountShiftSheet>[0]> = {}) {
  const h = mountShiftSheet({ doc: document, host: document.body, b, sim, now: () => t, docked: () => docked, rm: () => rm, asset: f => `assets/${f}`,
    audio: { play: n => { audio.push(n); return true; } }, toast: x => toasts.push(x), setTimeout: f => timers.push(f), ...extra });
  return { h, sim };
}
const opener = () => { const o = document.createElement('button'); o.textContent = 'Manage'; document.body.append(o); o.focus(); return o; };
const row = (id: string) => document.querySelector<HTMLElement>(`.shift-row[data-worker="${id}"]`)!;
const refillBtn = (id: string) => row(id).querySelector<HTMLButtonElement>('.shift-refill')!;
const flush = () => { const f = timers; timers = []; f.forEach(x => x()); };
beforeEach(() => { document.body.innerHTML = ''; document.head.innerHTML = ''; clearSheets(); setShiftSheet(null); t = 0; timers = []; audio = []; toasts = []; rm = false; docked = false; });

describe('flag 0 (RF-UI-1 / RF-AC1): no sheet DOM, openShiftSheet is a no-op', () => {
  it('openShiftSheet without a mounted sheet does nothing', () => { openShiftSheet('market_hand', opener(), 'card'); expect(document.querySelector('.shift-sheet')).toBeNull(); });
  it('a sheet mounted under rc2Refill=0 never opens, calls no sim, injects no CSS on open', () => {
    const before = document.body.innerHTML; const { h, sim } = mount(balance); setShiftSheet(h);
    const o = opener(); const mid = document.body.innerHTML; openShiftSheet('market_hand', o, 'nav');
    expect(document.querySelector('.shift-sheet')).toBeNull(); expect(sim.calls).toEqual([]); expect(document.body.innerHTML).toBe(mid); expect(before).toBe('');
    expect(openSheets()).toEqual([]);
  });
});

describe('open / close lifecycle (RF-UI-3, RF-AC9, SS-36, G0 §12 Q2/Q3/Q8)', () => {
  it('opens a labelled dialog, focuses the worker row heading, registers the sheet as open', () => {
    const { h } = mount(); setShiftSheet(h); const o = opener();
    openShiftSheet('coop_hand', o, 'card');
    const el = document.querySelector('.shift-sheet')!; expect(el.getAttribute('role')).toBe('dialog'); expect(el.getAttribute('aria-labelledby')).toBe('shift-title');
    expect(document.getElementById('shift-title')!.textContent).toBe('Shift');
    expect(document.activeElement).toBe(row('coop_hand').querySelector('h3')); expect(openSheets()).toEqual(['shift']);
    expect(row('coop_hand').getAttribute('aria-labelledby')).toBe('shift-h-coop_hand');
  });
  it('stall_chip entry passes StallView.stallId; other entries never do; noteStallChipTap is never called by the sheet', () => {
    for (const entry of ['stall_chip', 'card', 'nav', 'fatigue_chip'] as const) {
      document.body.innerHTML = ''; clearSheets(); const { h, sim } = mount(); h.open('market_hand', opener(), entry);
      expect(sim.calls[0]).toEqual(['open', entry, entry === 'stall_chip' ? 7 : undefined]);
      expect(h.ctx).toEqual(entry === 'stall_chip' ? { sheetId: 1, entryPoint: entry, stallId: 7 } : { sheetId: 1, entryPoint: entry });
      expect(sim.calls.some(c => String(c[0]).includes('Stall'))).toBe(false); h.destroy();
    }
  });
  it('one RefillCtx from open until closeComplete: every refill / Rest carries the same object', () => {
    const { h, sim } = mount(); h.open('market_hand', opener(), 'stall_chip'); const ctx = h.ctx;
    refillBtn('market_hand').click(); t += 2000; row('coop_hand').querySelector<HTMLButtonElement>('.shift-rest')!.click();
    const used = sim.calls.filter(c => c[0] === 'refill' || c[0] === 'setRest').map(c => c[c.length - 1]);
    expect(used).toHaveLength(2); for (const u of used) expect(u).toBe(ctx);
  });
  it('closeComplete fires only after the close animation, then drains ONE toast and returns focus to the opener', () => {
    const { h, sim } = mount(); const o = opener(); h.open('market_hand', o, 'card'); sim.toastQ = { n: 2, worker: null };
    h.close(); expect(openSheets()).toEqual(['shift']); expect(toasts).toEqual([]); expect(document.querySelector('.shift-sheet.closing')).not.toBeNull();
    flush(); expect(openSheets()).toEqual([]); expect(document.querySelector('.shift-sheet')).toBeNull();
    expect(toasts).toEqual(['Auto-refilled 2 workers']); expect(document.activeElement).toBe(o);
    expect(sim.calls.filter(c => c[0] === 'takeAutoRefillToast')).toHaveLength(1);
  });
  it('reduced motion: closes at once; single-worker toast copy', () => {
    rm = true; const { h, sim } = mount(); const o = opener(); h.open('market_hand', o, 'nav'); sim.toastQ = { n: 1, worker: 'market_hand' };
    h.close(); expect(timers).toHaveLength(0); expect(openSheets()).toEqual([]); expect(toasts).toEqual(['Auto-refilled Market Hand']); expect(document.activeElement).toBe(o);
  });
  it('✕ and Escape close; nav entry with no worker focuses the title', () => {
    rm = true; const { h } = mount(); h.open(null, opener(), 'nav'); expect(document.activeElement?.id).toBe('shift-title');
    document.querySelector<HTMLButtonElement>('.shift-close')!.click(); expect(h.isOpen).toBe(false);
    h.open(null, opener(), 'nav'); document.querySelector('.shift-sheet')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(h.isOpen).toBe(false);
  });
  it('docked: right column class, not aria-modal; portrait is aria-modal', () => {
    const { h } = mount(); h.open('market_hand', opener(), 'nav'); const el = document.querySelector('.shift-sheet')!;
    expect(el.classList.contains('docked')).toBe(false); expect(el.getAttribute('aria-modal')).toBe('true');
    docked = true; h.sync(); expect(el.classList.contains('docked')).toBe(true); expect(el.getAttribute('aria-modal')).toBe('false');
  });
  it('works with the overlay registerSheet handle (same lifecycle id "shift")', () => {
    const sh = registerSheet('shift'); const { h } = mount(ON, new FakeShiftSim(), { sheet: sh }); h.open('market_hand', opener(), 'nav');
    expect(sh.isOpen).toBe(true); h.close(); flush(); expect(sh.isOpen).toBe(false);
  });
});

describe('row Refill button (§4.1 / §8.2, RF-UI-7/9/10/19/20)', () => {
  it('state mapping comes from refillEligibility.reason only (§12 Q4)', () => {
    expect(refillButtonState({ ok: true })).toBe('affordable');
    expect(refillButtonState({ ok: false, reason: 'no_charges' })).toBe('countdown');
    expect(refillButtonState({ ok: false, reason: 'above_threshold' })).toBe('rested');
    expect(refillButtonState({ ok: false, reason: 'unpaid' })).toBe('unpaid');
  });
  it('markup is the §8.2 required markup exactly (single .lbl, inline .sr-in, data-cd, no aria-label)', () => {
    expect(refillLabelHtml('affordable', 'Market Hand', null, ON)).toBe('<span class="lbl">Refill<span class="sr-in">, Market Hand</span></span>');
    expect(refillLabelHtml('countdown', 'Coop Hand', 150000, ON)).toBe('<span class="lbl">Next charge in<span aria-hidden="true" data-cd=" 2:30"></span><span class="sr-in"> progress, Coop Hand</span></span>');
    expect(refillLabelHtml('rested', 'Egg Grader', null, ON)).toBe('<span class="lbl">Rested, refill below 50%<span class="sr-in">, Egg Grader</span></span>');
    expect(refillLabelHtml('unpaid', 'Field Hand', null, ON)).toBe('<span class="lbl">Refill<span class="sr-in">, Field Hand</span></span>');
  });
  it('rendered: text content = exact names; disabled states use aria-disabled only; no aria-label anywhere on row buttons', () => {
    const sim = new FakeShiftSim(); sim.chargesV = { charges: 0, cap: 2, nextChargeMs: 72000 }; sim.elig.market_hand = { ok: false, reason: 'no_charges' };
    sim.elig.coop_hand = { ok: false, reason: 'unpaid' }; sim.workers.coop_hand = { energy: 20, cdS: 0, unpaid: true }; sim.resume.coop_hand = 12345;
    const { h } = mount(ON, sim); h.open('market_hand', opener(), 'nav');
    const name = (b: HTMLElement) => b.querySelector('.lbl')!.textContent;
    expect(name(refillBtn('market_hand'))).toBe('Next charge in progress, Market Hand');
    expect(refillBtn('market_hand').querySelector('[data-cd]')!.getAttribute('data-cd')).toBe(' 1:12');
    expect(name(refillBtn('coop_hand'))).toBe('Refill, Coop Hand');
    expect(name(refillBtn('grader'))).toBe('Rested, refill below 50%, Egg Grader');
    for (const id of ['market_hand', 'coop_hand', 'grader']) {
      const b = refillBtn(id); expect(b.hasAttribute('aria-label')).toBe(false); expect(b.hasAttribute('disabled')).toBe(false);
      expect(b.getAttribute('aria-disabled')).toBe('true'); expect(b.children).toHaveLength(1);
    }
    const d = document.getElementById(refillBtn('coop_hand').getAttribute('aria-describedby')!)!; expect(d.textContent).toMatch(/^Resumes at \$/);
  });
  it('0-charge name never carries digits while ticking (RF-UI-9)', () => {
    const sim = new FakeShiftSim(); sim.chargesV = { charges: 0, cap: 2, nextChargeMs: 150000 }; sim.elig.market_hand = { ok: false, reason: 'no_charges' };
    const { h } = mount(ON, sim); h.open('market_hand', opener(), 'nav');
    for (const ms of [150000, 99000, 1000, 1]) { sim.chargesV = { ...sim.chargesV, nextChargeMs: ms }; h.sync();
      const b = refillBtn('market_hand'), visibleText = [...b.querySelectorAll('.lbl')].map(x => x.textContent).join('');
      expect(visibleText).toBe('Next charge in progress, Market Hand'); expect(/\d/.test(visibleText)).toBe(false); }
  });
  it('success: refill called, worker.refill hook played once, focus stays on the same button; refused: shake + cantAfford', () => {
    const { h, sim } = mount(); h.open('market_hand', opener(), 'card'); const b = refillBtn('market_hand'); b.focus();
    b.click(); expect(sim.calls.filter(c => c[0] === 'refill')).toHaveLength(1); expect(audio).toEqual(['worker.refill']); expect(document.activeElement).toBe(b);
    const g = refillBtn('grader'); g.click(); expect(g.classList.contains('shake')).toBe(true); expect(audio).toEqual(['worker.refill', 'cantAfford']);
    expect(sim.calls.filter(c => c[0] === 'refill')).toHaveLength(1); // a disabled tap never reaches the sim
    sim.refillResult = { ok: false, reason: 'no_charges' }; b.click(); expect(b.classList.contains('shake')).toBe(true); expect(audio.at(-1)).toBe('cantAfford');
  });
});

describe('header (RF-UI-4, §12 Q5)', () => {
  it('fmt: max(0, ceil(ms/1000)) as m:ss', () => {
    expect(fmtChargeCountdown(150000)).toBe('2:30'); expect(fmtChargeCountdown(149001)).toBe('2:30'); expect(fmtChargeCountdown(1)).toBe('0:01');
    expect(fmtChargeCountdown(0)).toBe('0:00'); expect(fmtChargeCountdown(-500)).toBe('0:00'); expect(fmtChargeCountdown(600000)).toBe('10:00');
  });
  it('Charges N/cap from chargesView; Next charge line only below the cap; follows the sim value (no UI timer)', () => {
    const sim = new FakeShiftSim(); const { h } = mount(ON, sim); h.open('market_hand', opener(), 'nav');
    const nx = document.querySelector<HTMLElement>('.shift-next')!;
    expect(document.querySelector('.shift-charges')!.textContent).toBe('Charges 2/2'); expect(nx.hidden).toBe(true);
    sim.chargesV = { charges: 1, cap: 2, nextChargeMs: 72000 }; h.sync();
    expect(document.querySelector('.shift-charges')!.textContent).toBe('Charges 1/2'); expect(nx.hidden).toBe(false);
    expect(nx.textContent).toBe('Next charge in'); expect(nx.querySelector('[data-cd]')!.getAttribute('data-cd')).toBe(' 1:12');
    t += 60000; h.sync(); expect(nx.querySelector('[data-cd]')!.getAttribute('data-cd')).toBe(' 1:12'); // wall time alone changes nothing
  });
  it('§12 Q9: before materialisation the sim reports charges=cap, nextChargeMs=null → no Next line', () => {
    const sim = new FakeShiftSim(); sim.chargesV = { charges: 2, cap: 2, nextChargeMs: null }; const { h } = mount(ON, sim); h.open(null, opener(), 'nav');
    expect(document.querySelector<HTMLElement>('.shift-next')!.hidden).toBe(true);
  });
});

describe('rows (§4, RF-UI-11/17, pills, at-risk)', () => {
  it('pill mapping: Paused > Unpaid > Asleep > Tired > Refillable (≤T per eligibility) > none above T', () => {
    expect(pillKind('working', 'paused', { ok: true })).toBe('Paused'); expect(pillKind('working', 'resting', { ok: true })).toBe('Paused');
    expect(pillKind('unpaid', 'active', { ok: false, reason: 'unpaid' })).toBe('Unpaid'); expect(pillKind('asleep', 'active', { ok: true })).toBe('Asleep');
    expect(pillKind('tired', 'active', { ok: true })).toBe('Tired'); expect(pillKind('working', 'active', { ok: true })).toBe('Refillable');
    expect(pillKind('working', 'active', { ok: false, reason: 'no_charges' })).toBe('Refillable');
    expect(pillKind('working', 'active', { ok: false, reason: 'above_threshold' })).toBeNull();
  });
  it('at-risk line: warning icon + $X/s at risk; $0 muted without icon; energy only until Saves G2 ETAs (Q7)', () => {
    const { h } = mount(); h.open(null, opener(), 'nav');
    expect(row('market_hand').querySelector('.shift-risk')!.textContent).toMatch(/\/s at risk$/); expect(row('market_hand').querySelector('.shift-risk img')).not.toBeNull();
    expect(row('grader').querySelector('.shift-risk')!.classList.contains('zero')).toBe(true); expect(row('grader').querySelector('.shift-risk img')).toBeNull();
    expect(row('market_hand').querySelector('.shift-energy')!.textContent).toBe('Energy 42%');
  });
  it('with G2 restEtas present: Tired in / Asleep in clauses; Paused rows hide times (RF-UI-17)', () => {
    const sim = new FakeShiftSim(); sim.etas = { market_hand: { etaTiredS: 108, etaAsleepS: 378 } }; sim.rests.coop_hand = 'paused';
    sim.workers.coop_hand = { energy: 40, cdS: 0, paused: true }; sim.etas.coop_hand = { etaTiredS: 10, etaAsleepS: 20 };
    const { h } = mount(ON, sim); h.open(null, opener(), 'nav');
    expect(row('market_hand').querySelector('.shift-energy')!.textContent).toBe('Energy 42% · Tired in 1:48 · Asleep in 6:18');
    expect(row('coop_hand').querySelector('.shift-energy')!.textContent).toBe('Energy 40%');
  });
  it('Rest toggle: setRest(on = currently active), aria-pressed mirrors restState; refused → shake', () => {
    const { h, sim } = mount(); h.open(null, opener(), 'nav'); const r = row('market_hand').querySelector<HTMLButtonElement>('.shift-rest')!;
    expect(r.getAttribute('aria-pressed')).toBe('false'); expect(r.textContent).toBe('Rest, Market Hand'); expect(r.hasAttribute('aria-label')).toBe(false);
    r.click(); expect(sim.calls.at(-1)!.slice(0, 3)).toEqual(['setRest', 'market_hand', true]);
    sim.rests.market_hand = 'resting'; t += 6000; h.sync(); expect(r.getAttribute('aria-pressed')).toBe('true');
    r.click(); expect(sim.calls.at(-1)!.slice(0, 3)).toEqual(['setRest', 'market_hand', false]);
    sim.restResult = { ok: false, reason: 'farm_locked' }; r.click(); expect(r.classList.contains('shake')).toBe(true);
  });
});

describe('flags: Auto-refill row (AR-AC2 / AC-LR17) and Boost slot (AB-UI-13, §16)', () => {
  it('rc2Refill only: no Auto-refill switch, no Boost slot', () => {
    const { h } = mount(); h.open(null, opener(), 'nav'); expect(document.querySelector('.shift-auto')).toBeNull(); expect(document.querySelector('[data-boost-slot]')).toBeNull();
  });
  it('autoRefill: one switch per row named Auto-refill, aria-checked from autoRefillOn, toggles through setAutoRefill', () => {
    const { h, sim } = mount(withFlags({ rc2Refill: 1, autoRefill: 1 })); h.open(null, opener(), 'nav');
    const sw = row('market_hand').querySelector<HTMLButtonElement>('.shift-auto')!; expect(sw.getAttribute('role')).toBe('switch');
    expect(sw.querySelector('.lbl')!.textContent).toBe('Auto-refill'); expect(sw.getAttribute('aria-checked')).toBe('false');
    sw.click(); expect(sim.calls.at(-1)).toEqual(['setAutoRefill', 'market_hand', true]); expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(document.querySelectorAll('.shift-auto')).toHaveLength(3);
  });
  it('autoRefill without rc2Refill = flags off (no sheet at all)', () => {
    const { h, sim } = mount(withFlags({ autoRefill: 1 })); h.open(null, opener(), 'nav'); expect(h.isOpen).toBe(false); expect(sim.calls).toEqual([]);
  });
  it('abilities && rc2Refill: a Boost slot per row in the top grid; #116 hook receives refillAgoSimMs', () => {
    const seen: unknown[] = []; const sim = new FakeShiftSim(); sim.ago.market_hand = 1500;
    const { h } = mount(withFlags({ rc2Refill: 1, abilities: 1 }), sim, { boostSlot: (el, id, ago) => seen.push([el.dataset.boostSlot, id, ago]) });
    h.open(null, opener(), 'nav');
    expect(row('market_hand').querySelector('.shift-top.has-boost > [data-boost-slot]')).not.toBeNull();
    expect(seen).toEqual([['market_hand', 'market_hand', 1500], ['coop_hand', 'coop_hand', undefined], ['grader', 'grader', undefined]]);
  });
});

describe('re-sort (RF-UI-5/6, §8.4): order from shiftOrder; cadence and holds are UI timing', () => {
  it('gate: cadence 5 s, never within 1 s of a tap, held while focused, resumes 1 s after blur', () => {
    const g = new ResortGate(); g.opened(0);
    expect(g.due(SHIFT_SPEC.resortEveryMs - 1)).toBe(false); expect(g.due(SHIFT_SPEC.resortEveryMs)).toBe(true);
    g.tap(5000); expect(g.due(5999)).toBe(false); expect(g.due(6000)).toBe(true);
    g.focus(); expect(g.due(20000)).toBe(false); g.blur(20000); expect(g.due(20999)).toBe(false); expect(g.due(21000)).toBe(true);
  });
  it('rows move as DOM nodes, focus stays on the same worker control, order follows the sim', () => {
    const { h, sim } = mount(); h.open(null, opener(), 'nav');
    const ids = () => [...document.querySelectorAll<HTMLElement>('.shift-row')].map(r => r.dataset.worker);
    expect(ids()).toEqual(['market_hand', 'coop_hand', 'grader']);
    const node = row('grader'); sim.ord = ['grader', 'market_hand', 'coop_hand'];
    t = 4999; h.sync(); expect(ids()).toEqual(['market_hand', 'coop_hand', 'grader']);
    t = 5000; h.sync(); expect(ids()).toEqual(['grader', 'market_hand', 'coop_hand']); expect(row('grader')).toBe(node);
    const b = refillBtn('coop_hand'); b.focus(); sim.ord = ['coop_hand', 'grader', 'market_hand']; t = 20000; h.sync();
    expect(ids()).toEqual(['grader', 'market_hand', 'coop_hand']); expect(document.activeElement).toBe(b); // held while focused
  });
});

describe('opener (RF-UI-16)', () => {
  it('badge N = ≤T active non-Unpaid (Asleep counts); hidden at 0 charges or N = 0; singular/plural names', () => {
    const sim = new FakeShiftSim();
    expect(openerView(sim)).toEqual({ badge: 2, name: 'Refill, 2 workers need a refill' });
    sim.rests.coop_hand = 'paused'; expect(openerView(sim)).toEqual({ badge: 1, name: 'Refill, 1 worker needs a refill' });
    sim.chargesV = { charges: 0, cap: 2, nextChargeMs: 1000 }; expect(openerView(sim)).toEqual({ badge: null, name: 'Refill' });
  });
});

describe('module hygiene', () => {
  it('shift-sheet.ts and shift-adapter.ts emit no telemetry and set no aria-label', async () => {
    const fs = await import('node:fs');
    for (const f of ['src/ui/shift-sheet.ts', 'src/ui/shift-adapter.ts']) {
      const src = fs.readFileSync(f, 'utf8'); expect(src).not.toMatch(/\bemit\(|telemetry\.[a-z]|logEvent|aria-label=/); }
  });
  it('the CSS is injected once per document, only on mount', () => {
    expect(document.getElementById('shift-sheet-css')).toBeNull(); mount(); mount(); expect(document.querySelectorAll('#shift-sheet-css')).toHaveLength(1);
  });
});
void vi; void ({} as ShiftSheetHandle);
