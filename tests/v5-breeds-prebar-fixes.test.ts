// @vitest-environment jsdom
// PR-A pre-bar fixes (HoQA qa/m3-recheck/breeds-pra-bd5b068a.md 0ad57cfe): one block per failed case.
// Layout legs (rects, 0×0, off-screen, px sizes, axe) are proven in the Chromium/FF/WK harness
// (scripts are in engineering/reviews/v5-breeds-ui-a-prebar-fixes.md); jsdom covers DOM/AX/focus/copy.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { breedsOnBalance } from './helpers/breeds-on';
import { hatchUi, activeTotalsText, revealCopy } from '../src/ui/breeds-ui';
import type { BreedsSave } from '../src/ui/breeds-adapter';

const breedsOn = (): Balance => breedsOnBalance();
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');
const emptyBr = (): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 1, freeHatchUsed: 0, flockCompleteLogged: 0,
});

async function game(o: Record<string, unknown>, b: Balance) {
  const kv = kvOf();
  kv.setItem(SAVE_KEY, serialize({ ...initialState(b), tracksV7: 1, seenTracksExplainer: true, abilitiesCoachSeen: true, ...o } as any, 1760000000000));
  const g = new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
  if (!('breeds' in g.state)) { const { ensureBreeds } = await import('../src/sim/breeds'); g.state = ensureBreeds(g.state, b); }
  if (o.breeds) g.state = { ...g.state, breeds: o.breeds } as any;
  return g;
}
/** Full app mount (phone: matchMedia false). */
async function mount(o: Record<string, unknown>, b = breedsOn()) {
  const g = await game(o, b);
  const uiFlags = { onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false };
  localStorage.setItem('eggfarm.ui', JSON.stringify(uiFlags));
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui };
}
const openFlockPhone = (ui: { openPanel(p: any): void }) => { ui.openPanel('upgrades'); (document.getElementById('breeds-entry') as HTMLButtonElement).click(); };
/** Direct mountBreeds with an explicit docked flag (docked overlay legs). */
async function mountDirect(o: Record<string, unknown>, docked: boolean) {
  const { mountBreeds, clearBreedsExtForTests } = await import('../src/ui/breeds-mount');
  clearBreedsExtForTests();
  const b = breedsOn();
  const g = await game(o, b);
  document.body.innerHTML = '<section id="p-upgrades"><header id="uh"><h2>Upgrades</h2><button class="icon-btn close" aria-label="Close"></button></header></section><div id="pl"><div class="scrim"></div></div>';
  const h = mountBreeds({
    g, b, upHeader: document.getElementById('uh')!, panelLayer: document.getElementById('pl')!,
    docked: { matches: docked }, closeOtherPanels() {}, openUpgrades() {}, sfx() {}, rm: () => false,
    saveFlags() {}, getFlags: () => ({ flockOpened: true }), dirty() {}, rollingIncomeRate: () => 0,
  })!;
  h.syncEntry(g.state, { flockOpened: true }, 1);
  return { g, h, b };
}
/** Accessible-name approximation: text content minus aria-hidden subtrees, whitespace-collapsed. */
const visibleName = (el: Element): string => {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll('[aria-hidden="true"]').forEach(x => x.remove());
  return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
};
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; try { localStorage.removeItem('eggfarm.ui'); } catch { /* */ } });

describe('BR-UI-14 Hatch aria-describedby includes the Farm-soon note', () => {
  it('note shown → #hatch-fs exists once and is in describedby; hidden → not referenced', async () => {
    const b = breedsOn();
    const { farmCost } = await import('../src/config/formulas');
    const need = farmCost(28, b);
    const { g, ui } = await mount({ farmLevel: 28, coinsCents: 0, breeds: { ...emptyBr(), freeHatchUsed: 1 } }, b);
    g.breedsEstimateOverride = { defaultPerS: need / 30 };
    openFlockPhone(ui);
    const fs = document.querySelectorAll('#hatch-fs');
    expect(fs.length).toBe(1);
    expect(fs[0].textContent).toBe('Needs next Farm upgrade');
    expect(fs[0].getAttribute('data-testid')).toBe('breeds-farmsoon');
    expect(fs[0].getAttribute('aria-live')).toBeNull();
    const hb = document.querySelector('[data-testid="breeds-hatch"]')!;
    expect(hb.getAttribute('aria-describedby')!.split(/\s+/)).toEqual(['hatch-sub', 'hatch-fs']);
    g.breedsEstimateOverride = { defaultPerS: need / 91 };
    ui.render();
    expect(document.getElementById('hatch-fs')).toBeNull();
    expect(document.querySelector('[data-testid="breeds-hatch"]')!.getAttribute('aria-describedby')).toBe('hatch-sub');
  });
});

describe('BR-UI-03 locked slot placeholder copy', () => {
  it('F10: "Slot 2 · Farm 14" / "Slot 3 · Farm 20", not focusable, glyph aria-hidden, read once', async () => {
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e9 });
    openFlockPhone(ui);
    const locked = [...document.querySelectorAll('#breeds-body .slot.locked')];
    expect(locked.map(visibleName)).toEqual(['Slot 2 · Farm 14', 'Slot 3 · Farm 20']);
    for (const el of locked) {
      expect(el.tagName).toBe('DIV');
      expect(el.getAttribute('tabindex')).toBeNull();
      expect(el.querySelector('button')).toBeNull();
      expect(el.querySelector('.sr')).toBeNull(); // no duplicate hidden copy
      const glyph = [...el.querySelectorAll('span')].find(s => s.textContent!.includes('🔒'));
      expect(glyph!.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('BR-UI-17 / BR-UI-34 filled slot: accessible name starts with visible text; Remove not nested', () => {
  it('no aria-label replaces the visible "Leghorn …" text; slot control is a button; Remove is a sibling', async () => {
    const br = { ...emptyBr(), freeHatchUsed: 1, owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null] };
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9, breeds: br });
    openFlockPhone(ui);
    const card = document.querySelector('#breeds-body .slot.filled')!;
    expect(card.getAttribute('aria-label')).toBeNull();
    expect(card.getAttribute('aria-labelledby')).toBeNull();
    expect(card.getAttribute('role')).toBeNull();
    const main = card.querySelector('.slot-main')!;
    expect(main.tagName).toBe('BUTTON');
    expect(main.getAttribute('aria-label')).toBeNull();
    expect(visibleName(main)).toBe('Leghorn +3.12% lay Present');
    const rem = card.querySelector('.slot-remove')!;
    expect(rem.tagName).toBe('BUTTON');
    expect(rem.closest('.slot-main')).toBeNull(); // nested-interactive = 0
    expect(visibleName(rem)).toBe('Remove');
    expect(document.querySelectorAll('#breeds-body [aria-label^="Slot "]').length).toBe(0);
  });
  it('Remove still empties the slot (OQ-6)', async () => {
    const br = { ...emptyBr(), freeHatchUsed: 1, owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null] };
    const { g, ui } = await mount({ farmLevel: 20, coinsCents: 1e9, breeds: br });
    openFlockPhone(ui);
    (document.querySelector('#breeds-body .slot-remove') as HTMLButtonElement).click();
    expect((g.state as any).breeds.slots[0]).toBeNull();
  });
});

describe('BR-UI-19 / BR-UI-34 album stars and settling slot name', () => {
  it('owned album cell has exactly 2 aria-hidden star glyphs; settling slot name "Sussex +15% away · inactive Settling 2:00"', async () => {
    const br = { ...emptyBr(), freeHatchUsed: 1, owned: { leghorn: { stars: 1 }, sussex: { stars: 0 } }, slots: ['leghorn', 'sussex', null], settleMs: [0, 120000, 0] };
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9, breeds: br });
    openFlockPhone(ui);
    const cell = document.querySelector('.album-cell[data-breed="leghorn"]')!;
    expect(cell.querySelectorAll('.album-stars .star').length).toBe(2);
    expect(cell.querySelector('.album-stars')!.getAttribute('aria-hidden')).toBe('true');
    expect(visibleName(cell)).toBe('Leghorn Slot 1');
    expect(document.getElementById(cell.getAttribute('aria-describedby')!)!.textContent).toBe('1 of 2 stars');
    expect(cell.contains(document.getElementById(cell.getAttribute('aria-describedby')!))).toBe(false);
    expect(visibleName(document.querySelector('.slot.settling')!)).toBe('Sussex +15% away · inactive Settling 2:00');
  });
});

describe('BR-UI-13 E5 / Flock complete sub-lines', () => {
  const b = breedsOn();
  it('(a) F13 all Commons at 2★ → "More breeds at Farm 14" / "All Commons at 2★"', () => {
    const br = { ...emptyBr(), freeHatchUsed: 1, owned: { leghorn: { stars: 2 }, sussex: { stars: 2 }, orpington: { stars: 2 } } };
    const hu = hatchUi({ ...initialState(b), farmLevel: 13, coinsCents: 1e12 } as any, b, br as any);
    expect(hu).toMatchObject({ kind: 'gate', label: 'More breeds at Farm 14', sub: 'All Commons at 2★', disabled: true });
  });
  it('(b) all 8 at 2★ → "Flock complete" / "All 8 breeds at 2★ · slots still work"', () => {
    const owned = Object.fromEntries(['leghorn', 'sussex', 'orpington', 'rhode_island_red', 'brahma', 'ayam_cemani', 'cochin', 'cream_legbar'].map(k => [k, { stars: 2 }]));
    const hu = hatchUi({ ...initialState(b), farmLevel: 28, coinsCents: 1e12 } as any, b, { ...emptyBr(), freeHatchUsed: 1, owned } as any);
    expect(hu).toMatchObject({ kind: 'complete', label: 'Flock complete', sub: 'All 8 breeds at 2★ · slots still work' });
  });
  it('(b) DOM: Flock complete is a non-focusable label pill, not a button', async () => {
    const owned = Object.fromEntries(['leghorn', 'sussex', 'orpington', 'rhode_island_red', 'brahma', 'ayam_cemani', 'cochin', 'cream_legbar'].map(k => [k, { stars: 2 }]));
    const { ui } = await mount({ farmLevel: 28, coinsCents: 1e12, breeds: { ...emptyBr(), freeHatchUsed: 1, owned } });
    openFlockPhone(ui);
    const pill = document.querySelector('[data-testid="breeds-hatch"]')!;
    expect(pill.tagName).toBe('SPAN');
    expect(pill.classList.contains('maxed')).toBe(true);
    expect(pill.textContent).toBe('Flock complete');
    expect(document.getElementById('hatch-sub')!.textContent).toBe('All 8 breeds at 2★ · slots still work');
  });
});

describe('BR-UI-06 Active totals row (body order Incubator → Slots → Active totals → Album)', () => {
  it('nothing settled → "Active: none yet · a breed works once it has settled (5:00)"', async () => {
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9 });
    openFlockPhone(ui);
    const kids = [...document.getElementById('breeds-body')!.children].map(e => e.className.split(' ')[0]);
    expect(kids).toEqual(['incu-card', 'breeds-slots', 'breeds-totals', 'breeds-album']);
    expect(document.querySelector('[data-testid="breeds-totals"]')!.textContent).toBe('Active: none yet · a breed works once it has settled (5:00)');
  });
  it('settled Leghorn 1★ + settling Sussex → applied, settled-only values', () => {
    const b = breedsOn();
    const br = { ...emptyBr(), owned: { leghorn: { stars: 1 }, sussex: { stars: 0 } }, slots: ['leghorn', 'sussex', null], settleMs: [0, 120000, 0] };
    const s = { ...initialState(b), farmLevel: 20 } as any;
    expect(activeTotalsText(s, b, br as any)).toBe('Active: Lay +3.12% · Away +0% · Nest +0%');
  });
  it('(max) suffix when the family clamp reports raw > clamped', () => {
    const b = breedsOn();
    const br = { ...emptyBr(), owned: { sussex: { stars: 2 }, brahma: { stars: 2 } }, slots: ['sussex', 'brahma', null] };
    const s = { ...initialState(b), farmLevel: 20 } as any;
    const clamp = (f: string) => f === 'away' ? { rawBp: 5000, clampedBp: 3000, atCap: true } : undefined;
    expect(activeTotalsText(s, b, br as any, clamp as any)).toBe('Active: Lay +0% · Away +30% (max) · Nest +0%');
  });
  it('clamp-bind: default clamp is the real sim view (F17 Present 975 raw → 700 "(max)"; F18 → 975, no max)', () => {
    const b = breedsOn();
    const br = { ...emptyBr(), owned: { ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 } }, slots: ['ayam_cemani', 'rhode_island_red', null], settleMs: [0, 0, 0] };
    const at = (F: number) => ({ ...initialState(b), farmLevel: F, breeds: br }) as any;
    expect(activeTotalsText(at(17), b, br as any)).toBe('Active: Lay +7% (max) · Away +0% · Nest +0%');
    expect(activeTotalsText(at(18), b, br as any)).toBe('Active: Lay +9.75% · Away +0% · Nest +0%');
  });
});

describe('BR-UI-21 reveal card: kicker, placement, Esc/scrim close the card first, focus kept inside', () => {
  it('copy: new breed auto-slotted / not slotted / duplicate', () => {
    const b = breedsOn();
    const a = { ...emptyBr(), owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [300000, 0, 0] };
    expect(revealCopy(a as any, 'leghorn', b)).toMatchObject({ kicker: 'New breed!', name: 'Leghorn', placement: 'Added to slot 1 · settling 5:00' });
    const c = { ...emptyBr(), owned: { leghorn: { stars: 0 } } };
    expect(revealCopy(c as any, 'leghorn', b).placement).toBe('Not slotted · place it from the album');
    const d = { ...emptyBr(), owned: { leghorn: { stars: 1 } } };
    expect(revealCopy(d as any, 'leghorn', b).kicker).toBe('Star up! ★ +1');
    expect(revealCopy(a as any, 'leghorn', b).meta).toBe('Common · Present');
  });
  it('DOM: role=dialog card inside a scrim; focus on Nice!; Tab stays; Esc closes the card but not the sheet', async () => {
    const br = { ...emptyBr(), freeHatchUsed: 1, owned: { leghorn: { stars: 0 } } };
    const { g, ui } = await mount({ farmLevel: 20, coinsCents: 1e9, breeds: br });
    g.pendingReveal = 'leghorn' as any;
    openFlockPhone(ui);
    const card = document.querySelector('[data-testid="breeds-reveal"] [role="dialog"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.getAttribute('aria-modal')).toBe('true');
    expect(card.querySelector('.reveal-kicker')!.textContent).toBe('New breed!');
    expect(card.querySelector('.reveal-place')!.textContent).toBe('Not slotted · place it from the album');
    const ok = card.querySelector('.reveal-ok') as HTMLButtonElement;
    expect(document.activeElement).toBe(ok);
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(ok);
    esc();
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeNull();
    expect(g.pendingReveal).toBeNull();
    expect(document.getElementById('breeds-sheet')!.hidden).toBe(false); // first Esc = the card only
    esc();
    expect(document.getElementById('breeds-sheet')!.hidden).toBe(true);
  });
  it('scrim tap closes the card', async () => {
    const br = { ...emptyBr(), freeHatchUsed: 1, owned: { leghorn: { stars: 0 } } };
    const { g, ui } = await mount({ farmLevel: 20, coinsCents: 1e9, breeds: br });
    g.pendingReveal = 'leghorn' as any;
    openFlockPhone(ui);
    (document.querySelector('[data-testid="breeds-reveal"]') as HTMLElement).click();
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeNull();
  });
});

describe('BR-UI-06 / BR-UI-07 focus returns to the Flock entry; scrim closes the phone sheet', () => {
  it('docked: Close and Esc return focus to #breeds-entry', async () => {
    const { h } = await mountDirect({ farmLevel: 20, coinsCents: 1e9 }, true);
    const entry = document.getElementById('breeds-entry') as HTMLButtonElement;
    entry.focus(); entry.click();
    expect(h.isOpen).toBe(true);
    const close = document.querySelector('#breeds-sheet .breeds-close') as HTMLButtonElement;
    close.focus(); close.click();
    expect(h.isOpen).toBe(false);
    expect(document.activeElement).toBe(entry);
    entry.click();
    expect(h.onEsc()).toBe(true);
    expect(document.activeElement).toBe(entry);
  });
  it('phone ‹ back: Upgrades returns and focus is on #breeds-entry', async () => {
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9 });
    openFlockPhone(ui);
    (document.querySelector('#breeds-sheet .breeds-back') as HTMLButtonElement).click();
    expect(document.getElementById('p-upgrades')!.hidden).toBe(false);
    expect(document.activeElement).toBe(document.getElementById('breeds-entry'));
  });
  it('phone Close/Esc: entry is inside the now-hidden Upgrades sheet → focus goes to the Upgrades nav button (its invoker)', async () => {
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9 });
    openFlockPhone(ui);
    (document.querySelector('#breeds-sheet .breeds-close') as HTMLButtonElement).click();
    expect(document.getElementById('breeds-sheet')!.hidden).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-nav="upgrades"]'));
    openFlockPhone(ui);
    esc();
    expect(document.activeElement).toBe(document.querySelector('[data-nav="upgrades"]'));
  });
  it('phone scrim tap closes the Flock sheet', async () => {
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9 });
    openFlockPhone(ui);
    (document.querySelector('#panel-layer .scrim') as HTMLElement).click();
    expect(document.getElementById('breeds-sheet')!.hidden).toBe(true);
  });
  it('per-frame render keeps keyboard focus on the same control (no innerHTML churn)', async () => {
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9 });
    openFlockPhone(ui);
    (document.querySelector('[data-testid="breeds-hatch"]') as HTMLElement).focus();
    ui.render(); ui.render();
    expect((document.activeElement as HTMLElement).dataset.testid).toBe('breeds-hatch');
  });
});

describe('BR-UI-35 axe landmark-no-duplicate-banner: the Flock dialog header is not a banner', () => {
  it('#breeds-sheet > header has role="none"', async () => {
    await mountDirect({ farmLevel: 20 }, false);
    expect(document.querySelector('#breeds-sheet > header')!.getAttribute('role')).toBe('none');
  });
  it('docked Close is not the generic .sheet .close (hidden docked); entry keeps aria-haspopup=dialog', async () => {
    await mountDirect({ farmLevel: 20 }, true);
    const c = document.querySelector('#breeds-sheet .breeds-close')!;
    expect(c.classList.contains('close')).toBe(false);
    expect(document.getElementById('breeds-entry')!.getAttribute('aria-haspopup')).toBe('dialog');
  });
});
