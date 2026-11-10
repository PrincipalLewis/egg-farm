// @vitest-environment jsdom
// Breeds UI PR-B — Present HUD chip (BR-AC52 / 52b / 52c; UI doc v0.2.7 §7a/§7b, UI-BR-16..21). TDD: written before breeds-hud.ts.
import { describe, it, expect, beforeEach } from 'vitest';
import { presentMirror } from '../src/ui/breeds-adapter'; // PR-A hosts the mirror (seams 3d40e76e §2); PR-B's copy is deleted
import { mountPresentChip, presentChipModel, POP_CAP_MS, TIP_MS, CHIP_TIP_TEXT, CHIP_PAUSED_DESC } from '../src/ui/breeds-hud';
import { PRB_STUB_TUNABLES, STUB_PRESENT_GATE } from '../src/ui/breeds-adapter';
import { flagOnBalance, flagOffBalance, stateWith, leghorn312, breeds, RefGate, HUD_HTML } from './fixtures/breeds-prB/setup';

const W = PRB_STUB_TUNABLES.present_calm_w_s * 1000, K = PRB_STUB_TUNABLES.present_calm_k;
let clock = 0; const now = () => clock;
beforeEach(() => { document.body.innerHTML = HUD_HTML; clock = 0; });
const chip = () => document.querySelector<HTMLElement>('[data-testid="breeds-hud-chip"]');
const desc = () => document.getElementById(chip()!.getAttribute('aria-describedby')!)!.textContent;
/** Accessible name from content (no aria-label/labelledby on the chip): text minus aria-hidden subtrees. */
const accName = (el: Element): string => { let t = ''; el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.textContent; else if (n instanceof Element && n.getAttribute('aria-hidden') !== 'true') t += accName(n); }); return t; };
const visibleText = (el: Element) => [...el.querySelectorAll('.breeds-hud-pt')].map(x => x.textContent).join('');

describe('BR-AC52 format', () => {
  it.each([[312, '+3%', '+3.12%'], [1312, '+13%', '+13.12%'], [1500, '+15%', '+15.00%']])('%i bp → %s (exact %s)', (bp, label, exact) => {
    const m = presentChipModel(bp, true)!; expect(m.label).toBe(label); expect(m.exact).toBe(exact);
  });
  it('0 bp → no model (no chip)', () => expect(presentChipModel(0, true)).toBeNull());
});

describe('BR-AC52 / 52c chip DOM', () => {
  const b = flagOnBalance();
  it('flag off → mount returns null and the HUD markup is byte-identical', () => {
    const before = document.body.innerHTML;
    expect(mountPresentChip({ doc: document, b: flagOffBalance(), now })).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });
  it('no settled Present breed → no chip, markup unchanged (settling, empty, away-only)', () => {
    const before = document.body.innerHTML; const h = mountPresentChip({ doc: document, b, now })!;
    for (const br of [breeds(), leghorn312(1000), breeds({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null] })]) {
      h.sync(stateWith(b, 10, br)); expect(chip()).toBeNull(); expect(document.body.innerHTML).toBe(before);
    }
  });
  it('active: solid, "+3%", no aria-label, name "+3% active", description exact value', () => {
    const h = mountPresentChip({ doc: document, b, now })!; h.sync(stateWith(b, 10, leghorn312()));
    const c = chip()!;
    expect(c.getAttribute('role')).toBe('button'); expect(c.tabIndex).toBe(0);
    expect(c.hasAttribute('aria-label')).toBe(false); expect(c.hasAttribute('aria-labelledby')).toBe(false);
    expect(visibleText(c)).toBe('+3%'); expect(accName(c)).toBe('+3% active'); expect(accName(c).startsWith(visibleText(c))).toBe(true);
    expect(desc()).toBe('Breed bonus +3.12% active'); expect(c.dataset.state).toBe('active'); expect(c.classList.contains('paused')).toBe(false);
    expect(c.closest('.breeds-hud-row')!.contains(document.getElementById('rate'))).toBe(true); // right of #rate, same row
    expect(document.querySelector('.hud')!.classList.contains('has-pchip')).toBe(true);
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });
  it('pending: dashed + strike class, name "+3% paused", paused description, no ring/progress child', () => {
    const g = new RefGate(W, K); for (let i = 0; i < K; i++) g.tap(i * 1000); clock = (K - 1) * 1000;
    const h = mountPresentChip({ doc: document, b, now, gate: g })!; h.sync(stateWith(b, 10, leghorn312()));
    const c = chip()!; expect(c.dataset.state).toBe('paused'); expect(c.classList.contains('paused')).toBe(true);
    expect(accName(c)).toBe('+3% paused'); expect(desc()).toBe(CHIP_PAUSED_DESC);
    expect(c.querySelector('[role=progressbar], .pr')).toBeNull(); expect(c.hasAttribute('aria-label')).toBe(false);
  });
  it('k = 0 never pending', () => {
    const g = new RefGate(W, 0); for (let i = 0; i < 20; i++) g.tap(i * 100); clock = 1900;
    const h = mountPresentChip({ doc: document, b, now, gate: g })!; h.sync(stateWith(b, 10, leghorn312()));
    expect(chip()!.dataset.state).toBe('active');
  });
  it('the production stub gate is open (never pending)', () => {
    const h = mountPresentChip({ doc: document, b, now, gate: STUB_PRESENT_GATE })!; h.sync(stateWith(b, 10, leghorn312()));
    expect(chip()!.dataset.state).toBe('active');
  });
  it('chip hides when the breed is unslotted → markup back to the rc/v5 bytes', () => {
    const before = document.body.innerHTML; const h = mountPresentChip({ doc: document, b, now })!;
    h.sync(stateWith(b, 10, leghorn312())); expect(chip()).not.toBeNull();
    h.sync(stateWith(b, 10, breeds({ owned: { leghorn: { stars: 1 } } }))); expect(chip()).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });
  it('E9: Present clamp 700 below F18 → 1500 from F18 on the next sync', () => {
    const br = breeds({ owned: { cream_legbar: { stars: 2 }, ayam_cemani: { stars: 2 } }, slots: ['cream_legbar', 'ayam_cemani', null] }); // 600 + 525
    const h = mountPresentChip({ doc: document, b, now })!;
    h.sync(stateWith(b, 17, br)); expect(desc()).toBe('Breed bonus +7.00% active');
    h.sync(stateWith(b, 18, br)); expect(desc()).toBe('Breed bonus +11.25% active');
  });
  it('dispose removes everything it added', () => {
    const before = document.body.innerHTML; const h = mountPresentChip({ doc: document, b, now })!;
    h.sync(stateWith(b, 10, leghorn312())); h.dispose(); expect(document.body.innerHTML).toBe(before);
  });
});

describe('BR-AC52 tap / tooltip', () => {
  const b = flagOnBalance();
  it('tap shows the tooltip for TIP_MS, aria-hidden, not referenced by describedby; tap never bubbles', () => {
    let bubbled = 0; document.body.addEventListener('click', () => bubbled++); document.body.addEventListener('pointerdown', () => bubbled++);
    const timers: Array<[() => void, number]> = [];
    const h = mountPresentChip({ doc: document, b, now, setTimer: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimer: () => {} })!;
    h.sync(stateWith(b, 10, leghorn312()));
    chip()!.dispatchEvent(new Event('pointerdown', { bubbles: true })); chip()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tip = document.querySelector<HTMLElement>('[data-testid="breeds-hud-tip"]')!;
    expect(bubbled).toBe(0); expect(tip.hidden).toBe(false); expect(tip.textContent).toBe(CHIP_TIP_TEXT);
    expect(tip.getAttribute('aria-hidden')).toBe('true'); expect(chip()!.getAttribute('aria-describedby')).not.toContain(tip.id || '__none__');
    expect(timers.at(-1)![1]).toBe(TIP_MS); timers.at(-1)![0](); expect(tip.hidden).toBe(true);
  });
  it('Enter / Space show the tooltip and are swallowed', () => {
    const h = mountPresentChip({ doc: document, b, now })!; h.sync(stateWith(b, 10, leghorn312()));
    for (const key of ['Enter', ' ']) { const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); chip()!.dispatchEvent(e); expect(e.defaultPrevented).toBe(true); }
    expect(document.querySelector<HTMLElement>('[data-testid="breeds-hud-tip"]')!.hidden).toBe(false);
  });
  it('suppressed while a .toast is visible', () => {
    document.getElementById('toast')!.classList.add('show');
    const h = mountPresentChip({ doc: document, b, now })!; h.sync(stateWith(b, 10, leghorn312()));
    chip()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector<HTMLElement>('[data-testid="breeds-hud-tip"]')!.hidden).toBe(true);
  });
});

describe('BR-AC52b pop cap + per-tick sync (reference gate, tick = 100 ms)', () => {
  const b = flagOnBalance(), s = stateWith(b, 10, leghorn312());
  const run = (rm = false) => {
    const g = new RefGate(W, K); const taps = [0, 1, 2, 3, 4, 5, 10.5, 11.5, 12.5, 13.5, 14.5].flatMap(t => [t * 1000, (t + 30) * 1000]);
    const h = mountPresentChip({ doc: document, b, now, gate: g, rm: () => rm })!; const pops: number[] = []; const mism: number[] = [];
    let prevPops = 0;
    for (clock = 0; clock <= 60000; clock += 100) {
      for (const t of taps) if (t === clock) g.tap(t);
      h.sync(s);
      const want = g.open(null, null, clock) ? 'active' : 'paused', c = chip()!;
      if (c.dataset.state !== want || accName(c) !== `+3% ${want}` || c.classList.contains('paused') !== (want === 'paused')) mism.push(clock);
      if (h.pops > prevPops) { pops.push(clock); prevPops = h.pops; }
    }
    return { pops, mism, h };
  };
  it('state matches the gate on every tick; exactly 2 pops at 10 s and 40 s', () => {
    const { pops, mism } = run(); expect(mism).toEqual([]); expect(pops).toEqual([10000, 40000]);
  });
  it('reduced motion: no pops at all', () => { expect(run(true).pops).toEqual([]); });
  it('boundary: return at t0 + 9,999 swaps; t0 + 10,000 pops (performance.now rule)', () => {
    let open = true; const gate = { open: () => open };
    const h = mountPresentChip({ doc: document, b, now, gate })!; clock = 0; h.sync(s); // load: no pop
    expect(h.pops).toBe(0);
    const flip = (t: number) => { clock = t - 1; open = false; h.sync(s); clock = t; open = true; h.sync(s); };
    flip(1000); expect(h.pops).toBe(1);               // first return pops (t0 = 1000)
    flip(1000 + POP_CAP_MS - 1); expect(h.pops).toBe(1); // 9,999 → instant swap
    flip(1000 + POP_CAP_MS); expect(h.pops).toBe(2);     // 10,000 → pops
  });
  it('returns at t0 + 5,000 and t0 + 10,000 → 2 pops total', () => {
    let open = true; const gate = { open: () => open };
    const h = mountPresentChip({ doc: document, b, now, gate })!; clock = 0; h.sync(s);
    const flip = (t: number) => { clock = t - 1; open = false; h.sync(s); clock = t; open = true; h.sync(s); };
    flip(2000); flip(7000); flip(12000); expect(h.pops).toBe(2);
  });
  it('no pop on load (mount while open) or on settle (chip appears while open)', () => {
    const h = mountPresentChip({ doc: document, b, now })!;
    clock = 0; h.sync(stateWith(b, 10, leghorn312(1000))); clock = 1000; h.sync(stateWith(b, 10, leghorn312(0)));
    expect(chip()).not.toBeNull(); expect(h.pops).toBe(0);
  });
});

describe('Slot-card mirror (PR-A adapter presentMirror; same copy as the chip) (BR-AC52c mirror)', () => {
  const b = flagOnBalance();
  it('plain text, struck when paused; no role / tabindex / describedby; same description sentences', () => {
    const a = presentMirror(312, true)!, p = presentMirror(312, false)!;
    expect(a.text).toBe('+3.12%'); expect(a.description).toBe('Breed bonus +3.12% active'); expect(p.description).toBe(CHIP_PAUSED_DESC);
    const host = document.createElement('button'); host.innerHTML = `Leghorn ${p.html} lay Present`;
    const m = host.querySelector('.breeds-hud-mirror')!; expect(m.classList.contains('paused')).toBe(true);
    for (const at of ['role', 'tabindex', 'aria-describedby', 'aria-label']) expect(m.hasAttribute(at)).toBe(false);
    expect(host.textContent).toContain('+3.12%'); expect(presentMirror(0, true)).toBeNull();
    void b;
  });
});

describe('PR-A seam: presentMirror + copy come from breeds-adapter (seams 3d40e76e §2)', () => {
  it('breeds-hud has no presentMirror of its own; chip copy is the adapter export (one source)', async () => {
    const hudMod: Record<string, unknown> = await import('../src/ui/breeds-hud'), ad = await import('../src/ui/breeds-adapter');
    expect(hudMod.presentMirror).toBeUndefined();
    expect(hudMod.CHIP_PAUSED_DESC).toBe(ad.CHIP_PAUSED_DESC); expect(hudMod.chipActiveDesc).toBe(ad.chipActiveDesc);
    const m = presentChipModel(312, true)!; expect(m.description).toBe(ad.presentMirror(312, true)!.description);
    expect(presentChipModel(312, false)!.description).toBe(ad.presentMirror(312, false)!.description);
  });
});
