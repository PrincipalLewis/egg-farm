// @vitest-environment jsdom
// PR-A breeds UI: BR-AC3/3b/31/31a/31b/31c/32 (partial) — checklist c9d8b631
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { hatchUi, farmSoonVisible, FARM_SOON_TEXT, settleLabel } from '../src/ui/breeds-ui';
import { hatchEstimate, type BreedsSave } from '../src/ui/breeds-adapter';

const breedsOn = (): Balance => ({
  ...balance,
  m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags!, breeds: 1 } },
});
const breedsOff = (): Balance => ({
  ...balance,
  m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags!, breeds: 0 } },
});

const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');

async function mount(o: Record<string, unknown>, b: Balance) {
  const kv = kvOf();
  kv.setItem(SAVE_KEY, serialize({ ...initialState(b), tracksV7: 1, seenTracksExplainer: true, ...o } as any, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }));
  const g = new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
  // ensure breeds key exists when flag on (first tick normally creates it)
  if (b.m4?.flags?.breeds === 1 && !('breeds' in g.state)) {
    const { ensureBreeds } = await import('../src/sim/breeds');
    g.state = ensureBreeds(g.state, b);
  }
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui };
}

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });

const emptyBr = (): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 1, freeHatchUsed: 0, flockCompleteLogged: 0,
});

describe('breeds-ui hatchUi helpers (checklist §2 Hatch states)', () => {
  it('BR-AC31a: free hatch → Hatch · Free enabled', () => {
    const b = breedsOn();
    const s = { ...initialState(b), farmLevel: 10, coinsCents: 0, breeds: emptyBr() };
    const u = hatchUi(s as any, b, s.breeds!);
    expect(u.kind).toBe('free');
    expect(u.label).toBe('Hatch · Free');
    expect(u.sub).toBe('Ready in 1:00');
    expect(u.disabled).toBe(false);
  });
  it('BR-AC31b: unaffordable → dimmed, no lock, Ready in 1:00', () => {
    const b = breedsOn();
    const br = { ...emptyBr(), freeHatchUsed: 1 as 0 | 1 };
    const s = { ...initialState(b), farmLevel: 10, coinsCents: 0, breeds: br };
    const u = hatchUi(s as any, b, br);
    expect(u.kind).toBe('unaffordable');
    expect(u.disabled).toBe(true);
    expect(u.label.startsWith('Hatch · ')).toBe(true);
    expect(u.label).not.toMatch(/lock/i);
    expect(u.sub).toBe('Ready in 1:00');
  });
  it('BR-AC31c note text constant', () => {
    expect(FARM_SOON_TEXT).toBe('Needs next Farm upgrade');
  });
  it('BR-AC32 settling label m:ss', () => {
    expect(settleLabel(252_000)).toBe('Settling 4:12');
    expect(settleLabel(0)).toBe('Settling 0:00');
  });
});

describe('BR-AC3 Flock entry mount (checklist §1 / §6 BR-AC3)', () => {
  it('flag off: no #breeds-entry', async () => {
    await mount({ farmLevel: 12, coinsCents: 1e9 }, breedsOff());
    expect(document.getElementById('breeds-entry')).toBeNull();
    expect(document.querySelectorAll('#p-upgrades .tabs [data-tab]').length).toBe(3);
  });
  it('F9 flag on: no #breeds-entry', async () => {
    await mount({ farmLevel: 9, coinsCents: 1e9 }, breedsOn());
    expect(document.getElementById('breeds-entry')).toBeNull();
  });
  it('F10 flag on: #breeds-entry in Upgrades header, 44px class, 3 tabs', async () => {
    await mount({ farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true }, breedsOn());
    const btn = document.getElementById('breeds-entry');
    expect(btn).toBeTruthy();
    expect(btn!.closest('#p-upgrades header')).toBeTruthy();
    expect(btn!.classList.contains('breeds-entry')).toBe(true);
    expect(document.querySelectorAll('#p-upgrades .tabs [data-tab]').length).toBe(3);
  });
});

describe('BR-AC3 sheet open / Esc (checklist §1 Flock sheet)', () => {
  it('opens #breeds-sheet from entry; Esc closes', async () => {
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true }, breedsOn());
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const sheet = document.getElementById('breeds-sheet')!;
    expect(sheet.hidden).toBe(false);
    expect(document.getElementById('breeds-body')!.querySelector('.hatch-btn')!.textContent).toBe('Hatch · Free');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('breeds-sheet')!.hidden).toBe(true);
  });
  it('F14 shows 2 unlocked slots (third locked)', async () => {
    const { ui } = await mount({ farmLevel: 14, coinsCents: 1e9, abilitiesCoachSeen: true }, breedsOn());
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const slots = [...document.querySelectorAll('#breeds-body .slot')];
    expect(slots.length).toBe(3);
    expect(slots.filter(s => s.classList.contains('locked')).length).toBe(1);
    expect(slots.filter(s => s.classList.contains('empty')).length).toBe(2);
  });
});

describe('BR-AC31a Free → paid label after hatch', () => {
  it('after free hatch press, label is Hatch · $… and Free never returns', async () => {
    const { g, ui } = await mount({ farmLevel: 10, coinsCents: 1e12, abilitiesCoachSeen: true }, breedsOn());
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const btn = document.querySelector('#breeds-body .hatch-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('Hatch · Free');
    btn.click();
    // incubating or cost label
    const after = document.querySelector('#breeds-body .hatch-btn')!.textContent!;
    expect(after).not.toBe('Hatch · Free');
    expect(g.state.breeds?.freeHatchUsed).toBe(1);
  });
});
