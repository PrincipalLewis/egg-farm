// @vitest-environment jsdom
// PR-A breeds UI: BR-AC3/3b/31/31a/31b/31c/32 (partial) — checklist c9d8b631
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { hatchUi, farmSoonVisible, FARM_SOON_TEXT, settleLabel } from '../src/ui/breeds-ui';
import { hatchEstimate, fmtRemainMs, type BreedsSave } from '../src/ui/breeds-adapter';

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
  const uiFlags = { onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false };
  kv.setItem('eggfarm.ui', JSON.stringify(uiFlags));
  localStorage.setItem('eggfarm.ui', JSON.stringify(uiFlags));
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
afterEach(() => { document.body.innerHTML = ''; try { localStorage.removeItem('eggfarm.ui'); } catch { /* */ } });

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
  it('OQ-3 ceil remainingMs (never 0:00 while ms>0)', () => {
    expect(fmtRemainMs(1)).toBe('0:01');
    expect(fmtRemainMs(1000)).toBe('0:01');
    expect(fmtRemainMs(1001)).toBe('0:02');
    expect(fmtRemainMs(0)).toBe('0:00');
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

describe('BR-AC31c / 31e Farm-soon note', () => {
  const paidBr = (): BreedsSave => ({ ...emptyBr(), freeHatchUsed: 1 });

  it('AC31c: ETA 90s → note; 91s → no note; copy exact; DOM count 1', async () => {
    const b = breedsOn();
    const { farmCost } = await import('../src/config/formulas');
    const need = farmCost(28, b); // $
    const { g, ui } = await mount({ farmLevel: 28, coinsCents: 0, abilitiesCoachSeen: true, breeds: paidBr() }, b);
    g.breedsEstimateOverride = { defaultPerS: need / 90 };
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const notes = document.querySelectorAll('[data-farm-soon="1"]');
    expect(notes.length).toBe(1);
    expect(notes[0].textContent).toBe(FARM_SOON_TEXT);
    expect(notes[0].textContent).not.toMatch(/\d|★|best|payback/i);

    g.breedsEstimateOverride = { defaultPerS: need / 91 };
    ui.render();
    expect(document.querySelectorAll('[data-farm-soon="1"]').length).toBe(0);
  });

  it('AC31e hook: default 85 / aw 95 → note; 95 / 85 → no note', async () => {
    const b = breedsOn();
    const { farmCost } = await import('../src/config/formulas');
    const need = farmCost(28, b);
    const { g, ui } = await mount({ farmLevel: 28, coinsCents: 0, abilitiesCoachSeen: true, breeds: paidBr() }, b);
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();

    g.breedsEstimateOverride = { defaultPerS: need / 85, assumeWorkingPerS: need / 95 };
    ui.render();
    expect(document.querySelectorAll('[data-farm-soon="1"]').length).toBe(1);

    g.breedsEstimateOverride = { defaultPerS: need / 95, assumeWorkingPerS: need / 85 };
    ui.render();
    expect(document.querySelectorAll('[data-farm-soon="1"]').length).toBe(0);
  });

  it('AC31c: free hatch / flock complete → no note (via hatchEstimate.show)', () => {
    const b = breedsOn();
    const sFree = { ...initialState(b), farmLevel: 28, coinsCents: 0, breeds: emptyBr() };
    expect(farmSoonVisible(hatchEstimate(sFree as any, b, { defaultPerS: 1e9 }))).toBe(false);
  });
});

describe('BR-AC3b highlight (UI-BR-2 / 2b)', () => {
  it('coachSeen: glow+dot arm; after open never repeats', async () => {
    const kv = kvOf();
    const b = breedsOn();
    kv.setItem(SAVE_KEY, serialize({ ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true, tracksV7: 1, seenTracksExplainer: true } as any, 1760000000000));
    // mountApp reads UI flags from localStorage (not Game kv)
    localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, sessions: 0 }));
    const g = new Game(b, kv, () => 1760000000500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g.state)) {
      const { ensureBreeds } = await import('../src/sim/breeds');
      g.state = ensureBreeds(g.state, b);
    }
    const { mountApp } = await import('../src/ui/app');
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    ui.render();
    ui.openPanel('upgrades');
    ui.render();
    const btn = document.getElementById('breeds-entry')!;
    expect(btn.classList.contains('breeds-dot')).toBe(true);
    btn.click();
    expect(btn.classList.contains('breeds-dot')).toBe(false);
    expect(btn.classList.contains('breeds-glow')).toBe(false);
    // close and reopen entry still no highlight
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ui.render();
    expect(document.getElementById('breeds-entry')!.classList.contains('breeds-dot')).toBe(false);
  });

  it('coach unseen same session: no glow/dot', async () => {
    await mount({ farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: false }, breedsOn());
    // entry may exist; highlight should not arm without coach or next-session fallback
    const btn = document.getElementById('breeds-entry');
    expect(btn).toBeTruthy();
    expect(btn!.classList.contains('breeds-dot')).toBe(false);
    expect(btn!.classList.contains('breeds-glow')).toBe(false);
  });
});

describe('BR-AC32 reveal + RM + settle ring', () => {
  it('reveal card has RM class under reduced motion; Nice! dismisses; no auto-remove', async () => {
    const b = breedsOn();
    const kv = kvOf();
    kv.setItem(SAVE_KEY, serialize({ ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true, tracksV7: 1, seenTracksExplainer: true } as any, 1760000000000));
    localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true }));
    const g = new Game(b, kv, () => 1760000000500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g.state)) { const { ensureBreeds } = await import('../src/sim/breeds'); g.state = ensureBreeds(g.state, b); }
    const { mountApp } = await import('../src/ui/app');
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    ui.render();
    g.pendingReveal = 'leghorn' as any;
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    const card = document.querySelector('[data-testid="breeds-reveal"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.classList.contains('rm')).toBe(true);
    expect(card.querySelector('[data-testid="breeds-reveal-ok"]')).toBeTruthy();
    // still present after 50ms (no auto-dismiss)
    await new Promise(r => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeTruthy();
    (card.querySelector('.reveal-ok') as HTMLButtonElement).click();
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeNull();
    expect(g.pendingReveal).toBeNull();
  });

  it('settling ring has no infinite CSS animation', async () => {
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { leghorn: { stars: 0 } },
      slots: ['leghorn', null, null],
      settleMs: [300_000, 0, 0],
    };
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const ring = document.querySelector('.settle-ring') as HTMLElement;
    expect(ring).toBeTruthy();
    const anim = getComputedStyle(ring).animationName;
    expect(anim === 'none' || anim === '' || anim === 'initial').toBe(true);
    expect(document.querySelector('.settle-lab')!.textContent).toMatch(/^Settling /);
  });
});

describe('PR-A checklist remaining rows (focused)', () => {
  it('F20: 3 unlocked slots; silhouette opacity 0.55', async () => {
    const { ui } = await mount({ farmLevel: 20, coinsCents: 1e9, abilitiesCoachSeen: true }, breedsOn());
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const slots = [...document.querySelectorAll('#breeds-body .slot')];
    expect(slots.filter(s => s.classList.contains('locked')).length).toBe(0);
    expect(slots.length).toBe(3);
    const sil = document.querySelector('.breed-sil') as HTMLImageElement;
    expect(sil).toBeTruthy();
    expect(sil.style.opacity).toBe('0.55');
    expect(sil.getAttribute('src')).toMatch(/char-breed-silhouette\.svg/);
  });

  it('BR-AC10 gate copy More breeds at Farm 14', () => {
    const b = breedsOn();
    const owned: BreedsSave['owned'] = {
      leghorn: { stars: 2 }, sussex: { stars: 2 }, orpington: { stars: 2 },
    };
    const br: BreedsSave = { ...emptyBr(), freeHatchUsed: 1, owned };
    const s = { ...initialState(b), farmLevel: 10, coinsCents: 1e12, breeds: br };
    const u = hatchUi(s as any, b, br);
    expect(u.kind).toBe('gate');
    expect(u.label).toBe('More breeds at Farm 14');
  });

  it('BR-AC11 flock complete label', () => {
    const b = breedsOn();
    const owned: BreedsSave['owned'] = Object.fromEntries(
      (['leghorn','sussex','orpington','rhode_island_red','brahma','ayam_cemani','cochin','cream_legbar'] as const)
        .map(id => [id, { stars: 2 }]),
    );
    const br: BreedsSave = { ...emptyBr(), freeHatchUsed: 1, owned };
    const s = { ...initialState(b), farmLevel: 24, coinsCents: 1e12, breeds: br };
    const u = hatchUi(s as any, b, br);
    expect(u.kind).toBe('complete');
    expect(u.label).toBe('Flock complete');
  });

  it('E10 unknown unlocked slot id renders empty', async () => {
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { leghorn: { stars: 0 } },
      slots: ['silkie' as any, null, null],
      settleMs: [0, 0, 0],
    };
    const { ui } = await mount({ farmLevel: 14, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, breedsOn());
    ui.openPanel('upgrades');
    document.getElementById('breeds-entry')!.click();
    const slots = [...document.querySelectorAll('#breeds-body .slot')];
    expect(slots[0].classList.contains('empty')).toBe(true);
  });
});
