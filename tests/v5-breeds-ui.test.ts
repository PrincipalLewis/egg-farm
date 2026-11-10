// @vitest-environment jsdom
// PR-A breeds UI: BR-AC3/3b/31/31a/31b/31c/32 (partial) — checklist c9d8b631
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { breedsOnBalance, breedsOffBalance } from './helpers/breeds-on';
import { hatchUi, farmSoonVisible, FARM_SOON_TEXT, settleLabel } from '../src/ui/breeds-ui';
import { hatchEstimate, fmtRemainMs, type BreedsSave } from '../src/ui/breeds-adapter';

/** HoQA fixture: deep-clone balance.json, ONLY m4.flags.breeds=1 (see tests/helpers/breeds-on.ts). */
const breedsOn = (): Balance => breedsOnBalance();
const breedsOff = (): Balance => breedsOffBalance();

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

describe('BR-AC4 / OQ-6 place + settle', () => {
  it('album select → empty slot places; Remove clears', async () => {
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { leghorn: { stars: 0 }, sussex: { stars: 0 } },
      slots: [null, null, null],
      settleMs: [0, 0, 0],
    };
    const { g, ui } = await mount({ farmLevel: 14, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    const album = document.querySelector('.album-cell.owned[data-breed="leghorn"]') as HTMLElement;
    album.click();
    expect(album.classList.contains('picked')).toBe(true);
    (document.querySelector('.slot.empty') as HTMLElement).click();
    expect(g.state.breeds!.slots[0]).toBe('leghorn');
    expect((g.state.breeds!.settleMs[0] ?? 0) > 0).toBe(true);
    ui.render();
    const remove = document.querySelector('[data-testid="breeds-slot-remove"]') as HTMLButtonElement | null;
    // while settling, Remove may be absent (settling card); advance settle to 0 via dispatch place null on settling via re-render after manual state
    g.state = { ...g.state, breeds: { ...g.state.breeds!, settleMs: [0, 0, 0] as any } };
    ui.render();
    const rmBtn = document.querySelector('[data-testid="breeds-slot-remove"]') as HTMLButtonElement;
    expect(rmBtn).toBeTruthy();
    rmBtn.click();
    expect(g.state.breeds!.slots[0]).toBeNull();
  });

  it('incubating: Hatch disabled, Ready in m:ss (ceil)', () => {
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      incubator: { breed: 'leghorn', remainingMs: 45_001, costCents: 0 },
    };
    const s = { ...initialState(b), farmLevel: 10, coinsCents: 1e12, breeds: br };
    const u = hatchUi(s as any, b, br);
    expect(u.kind).toBe('hatching');
    expect(u.disabled).toBe(true);
    expect(u.label).toBe('Hatching…');
    expect(u.sub).toBe('Ready in 0:46'); // ceil 45001ms
  });
});

describe('UI-BR-2b next-session highlight fallback', () => {
  it('session N+1 with coach unseen arms glow/dot; same session does not', async () => {
    const b = breedsOn();
    // Session N: F10, coach unseen → records flockHighlightSession, no arm
    localStorage.setItem('eggfarm.ui', JSON.stringify({
      onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, sessions: 0,
    }));
    const kv1 = kvOf();
    kv1.setItem(SAVE_KEY, serialize({
      ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: false,
      tracksV7: 1, seenTracksExplainer: true,
    } as any, 1760000000000));
    const g1 = new Game(b, kv1, () => 1760000000500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g1.state)) {
      const { ensureBreeds } = await import('../src/sim/breeds');
      g1.state = ensureBreeds(g1.state, b);
    }
    document.body.innerHTML = '<div id="app"></div>';
    const { mountApp } = await import('../src/ui/app');
    const ui1 = mountApp(document.getElementById('app')!, g1, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    ui1.render();
    ui1.openPanel('upgrades');
    ui1.render();
    const btn1 = document.getElementById('breeds-entry')!;
    expect(btn1.classList.contains('breeds-dot')).toBe(false);
    const flagsN = JSON.parse(localStorage.getItem('eggfarm.ui')!);
    expect(flagsN.flockHighlightSession).toBeTypeOf('number');
    expect(flagsN.flockHighlightArmed).not.toBe(true);
    ui1.dispose();

    // Session N+1: same flockHighlightSession, sessions bumped on boot → arm
    localStorage.setItem('eggfarm.ui', JSON.stringify({
      onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false,
      sessions: flagsN.sessions, // will +1 on boot
      flockHighlightSession: flagsN.flockHighlightSession,
    }));
    const kv2 = kvOf();
    kv2.setItem(SAVE_KEY, serialize({
      ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: false,
      tracksV7: 1, seenTracksExplainer: true,
    } as any, 1760000001000));
    const g2 = new Game(b, kv2, () => 1760000001500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g2.state)) {
      const { ensureBreeds } = await import('../src/sim/breeds');
      g2.state = ensureBreeds(g2.state, b);
    }
    document.body.innerHTML = '<div id="app"></div>';
    const ui2 = mountApp(document.getElementById('app')!, g2, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    ui2.render();
    ui2.openPanel('upgrades');
    ui2.render();
    const btn2 = document.getElementById('breeds-entry')!;
    expect(btn2.classList.contains('breeds-dot')).toBe(true);
    expect(g2.state.abilitiesCoachSeen).toBe(false); // calls card still pending
  });
});

describe('BR-AC25 / BR-R18 offline reveal after welcome-back', () => {
  it('pendingReveal shows only after welcome Collect/dismiss; not before', async () => {
    const b = breedsOn();
    localStorage.setItem('eggfarm.ui', JSON.stringify({
      onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true,
    }));
    const kv = kvOf();
    kv.setItem(SAVE_KEY, serialize({
      ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true,
      tracksV7: 1, seenTracksExplainer: true, pendingOfflineEggs: 12,
    } as any, 1760000000000));
    const g = new Game(b, kv, () => 1760000000500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g.state)) {
      const { ensureBreeds } = await import('../src/sim/breeds');
      g.state = ensureBreeds(g.state, b);
    }
    // Ensure pending eggs survived load
    if (g.state.pendingOfflineEggs <= 0) g.state = { ...g.state, pendingOfflineEggs: 12 };
    g.pendingReveal = 'brahma' as any;
    document.body.innerHTML = '<div id="app"></div>';
    const { mountApp } = await import('../src/ui/app');
    const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    ui.render();
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeNull();
    ui.showWelcome();
    expect(document.querySelector('.card #wbCollect, #wbCollect')).toBeTruthy();
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeNull(); // not until welcome closes
    (document.getElementById('wbCollect') as HTMLButtonElement).click();
    const card = document.querySelector('[data-testid="breeds-reveal"]');
    expect(card).toBeTruthy();
    expect(card!.textContent).toMatch(/Brahma/);
    (card!.querySelector('.reveal-ok') as HTMLButtonElement).click();
    expect(g.pendingReveal).toBeNull();
    expect(document.querySelector('[data-testid="breeds-reveal"]')).toBeNull();
  });
});

describe('E8 familyClamp bind → sim (#126)', () => {
  it('adapter calls sim familyClamp(s,b,family); label iff rawBp > clampedBp', async () => {
    const { familyClamp } = await import('../src/ui/breeds-adapter');
    const { familyClamp: simClamp } = await import('../src/sim/breeds-family');
    const { initialState } = await import('../src/sim/state');
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 } },
      slots: ['ayam_cemani', 'rhode_island_red', null],
      settleMs: [0, 0, 0],
    };
    const mk = (F: number) => ({
      ...initialState(b, 7), farmLevel: F, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: br,
    });
    expect(simClamp(mk(17), b, 'present')).toEqual({ rawBp: 975, clampedBp: 700, atCap: true });
    expect(familyClamp('present', mk(17), b)).toBe('max');
    expect(simClamp(mk(18), b, 'present')).toEqual({ rawBp: 975, clampedBp: 975, atCap: false });
    expect(familyClamp('present', mk(18), b)).toBeUndefined();
  });

  it('Present F17→F18 700→1500 transition shows/hides slot-max in sheet', async () => {
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { ayam_cemani: { stars: 2 }, rhode_island_red: { stars: 2 } },
      slots: ['ayam_cemani', 'rhode_island_red', null],
      settleMs: [0, 0, 0],
    };
    const { ui } = await mount({ farmLevel: 17, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    expect(document.querySelectorAll('[data-testid="breeds-slot-max"]').length).toBeGreaterThan(0);

    document.body.innerHTML = '';
    const m2 = await mount({ farmLevel: 18, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, b);
    m2.ui.openPanel('upgrades');
    m2.ui.render();
    document.getElementById('breeds-entry')!.click();
    expect(document.querySelectorAll('[data-testid="breeds-slot-max"]').length).toBe(0);
  });
});

describe('PR-A checklist extras', () => {
  it('album has 8 cells; unowned use silhouette; pity has no UI string', async () => {
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true }, breedsOn());
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    const cells = document.querySelectorAll('#breeds-body .album-cell');
    expect(cells.length).toBe(8);
    expect(document.querySelectorAll('#breeds-body .album-cell .breed-sil').length).toBe(8);
    expect(document.getElementById('breeds-body')!.textContent).not.toMatch(/pity/i);
  });

  it('BR-AC31b unaffordable press charges nothing', async () => {
    const b = breedsOn();
    const br: BreedsSave = { ...emptyBr(), freeHatchUsed: 1 };
    const { g, ui } = await mount({ farmLevel: 10, coinsCents: 0, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    const btn = document.querySelector('#breeds-body .hatch-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.textContent).not.toMatch(/lock/i);
    const coins = g.state.coinsCents;
    btn.click();
    expect(g.state.coinsCents).toBe(coins);
    expect(g.state.breeds?.incubator).toBeFalsy();
  });

  it('affordable Hatch · $ label + Ready in 1:00 only', async () => {
    const b = breedsOn();
    const br: BreedsSave = { ...emptyBr(), freeHatchUsed: 1 };
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e12, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    const btn = document.querySelector('#breeds-body .hatch-btn')!;
    expect(btn.textContent).toMatch(/^Hatch · \$/);
    expect(document.getElementById('hatch-sub')!.textContent).toBe('Ready in 1:00');
    expect(document.getElementById('breeds-body')!.textContent).not.toMatch(/of income|payback|★|best/i);
  });
});

describe('PR-B seams: ext ctx + presentMirror + flag-0', () => {
  it('presentMirror: null when bp=0; active html when gate open; paused when closed', async () => {
    const { presentMirror, CHIP_PAUSED_DESC } = await import('../src/ui/breeds-adapter');
    expect(presentMirror(0, true)).toBeNull();
    const on = presentMirror(312, true)!;
    expect(on.text).toBe('+3.12%');
    expect(on.paused).toBe(false);
    expect(on.html).toContain('breeds-hud-mirror');
    expect(on.html).not.toContain('paused');
    const off = presentMirror(312, false)!;
    expect(off.paused).toBe(true);
    expect(off.html).toContain('paused');
    expect(off.description).toBe(CHIP_PAUSED_DESC);
  });

  it('Present settled slot uses presentMirror html (gate stub open)', async () => {
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { leghorn: { stars: 0 } },
      slots: ['leghorn', null, null],
      settleMs: [0, 0, 0],
    };
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    expect(document.querySelector('[data-testid="breeds-hud-mirror"]')).toBeTruthy();
    expect(document.querySelector('.breeds-hud-mirror')!.textContent).toMatch(/^\+/);
  });

  it('registerBreedsExt onSync receives openFlock, incomeRate, rollingIncomeRate, reducedMotion; flag-off skips', async () => {
    const { mountBreeds, registerBreedsExt, clearBreedsExtForTests, breedsExtCountForTests } =
      await import('../src/ui/breeds-mount');
    clearBreedsExtForTests();
    const seen: any[] = [];
    registerBreedsExt({
      onSync(ctx) { seen.push(ctx); },
    });
    expect(breedsExtCountForTests()).toBe(1);

    // flag off → null, no fire
    const off = mountBreeds({
      g: { state: initialState(breedsOff()) } as any,
      b: breedsOff(),
      upHeader: document.createElement('header'),
      panelLayer: document.createElement('div'),
      docked: { matches: false },
      closeOtherPanels() {}, openUpgrades() {}, sfx() {},
      rm: () => true,
      saveFlags() {}, getFlags: () => ({}), dirty() {},
      rollingIncomeRate: () => 0,
    });
    expect(off).toBeNull();
    expect(seen.length).toBe(0);

    // flag on → fire with enriched ctx
    const b = breedsOn();
    const kv = kvOf();
    kv.setItem(SAVE_KEY, serialize({
      ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true,
      tracksV7: 1, seenTracksExplainer: true,
    } as any, 1760000000000));
    localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true }));
    const g = new Game(b, kv, () => 1760000000500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g.state)) {
      const { ensureBreeds } = await import('../src/sim/breeds');
      g.state = ensureBreeds(g.state, b);
    }
    document.body.innerHTML = '<div id="uh"></div><div id="pl"></div>';
    const h = mountBreeds({
      g, b,
      upHeader: document.getElementById('uh')!,
      panelLayer: document.getElementById('pl')!,
      docked: { matches: false },
      closeOtherPanels() {}, openUpgrades() {}, sfx() {},
      rm: () => true,
      saveFlags() {}, getFlags: () => ({}), dirty() {},
      rollingIncomeRate: () => 0,
    });
    expect(h).toBeTruthy();
    h!.syncEntry(g.state, {}, 1);
    expect(seen.length).toBeGreaterThanOrEqual(1);
    const ctx = seen[seen.length - 1];
    expect(typeof ctx.openFlock).toBe('function');
    expect(typeof ctx.incomeRate).toBe('function');
    expect(ctx.incomeRate()).toBeTypeOf('number');
    expect(typeof ctx.rollingIncomeRate).toBe('function');
    expect(ctx.rollingIncomeRate()).toBeTypeOf('number');
    expect(ctx.reducedMotion).toBe(true);
    ctx.openFlock();
    expect(h!.isOpen).toBe(true);
    clearBreedsExtForTests();
  });
});

describe('BR-AC4 move + settle carry', () => {
  it('placing an already-slotted breed moves it and keeps settleMs', async () => {
    const b = breedsOn();
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      owned: { leghorn: { stars: 0 }, sussex: { stars: 0 } },
      slots: ['leghorn', null, null],
      settleMs: [120_000, 0, 0],
    };
    const { g, ui } = await mount({ farmLevel: 14, coinsCents: 1e9, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    (document.querySelector('.album-cell.owned[data-breed="leghorn"]') as HTMLElement).click();
    const empties = [...document.querySelectorAll('.slot.empty')] as HTMLElement[];
    // slot 1 empty at F14
    empties[0].click();
    expect(g.state.breeds!.slots[0]).toBeNull();
    expect(g.state.breeds!.slots[1]).toBe('leghorn');
    expect(g.state.breeds!.settleMs[1]).toBe(120_000); // carry (E7)
    expect(g.state.breeds!.settleMs[0]).toBe(0);
  });
});

describe('BR-AC31 aria + incubating DOM', () => {
  it('affordable Hatch aria-label uses fmtMoneyAria shape', async () => {
    const { fmtMoneyAria } = await import('../src/ui/format');
    const { hatchCostCents } = await import('../src/ui/breeds-adapter');
    const b = breedsOn();
    const br: BreedsSave = { ...emptyBr(), freeHatchUsed: 1 };
    const { g, ui } = await mount({ farmLevel: 10, coinsCents: 1e12, abilitiesCoachSeen: true, breeds: br }, b);
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    const btn = document.querySelector('[data-testid="breeds-hatch"]') as HTMLButtonElement;
    const cost = hatchCostCents(g.state, b);
    expect(btn.getAttribute('aria-label')).toContain(fmtMoneyAria(cost));
  });

  it('incubating: silhouette + progressbar; Hatch aria-disabled', async () => {
    const br: BreedsSave = {
      ...emptyBr(), freeHatchUsed: 1,
      incubator: { breed: 'leghorn', remainingMs: 30_000, costCents: 0 },
    };
    const { ui } = await mount({ farmLevel: 10, coinsCents: 1e12, abilitiesCoachSeen: true, breeds: br }, breedsOn());
    ui.openPanel('upgrades');
    ui.render();
    document.getElementById('breeds-entry')!.click();
    expect(document.querySelector('.incu-disc .breed-sil')).toBeTruthy();
    expect(document.querySelector('.incu-meter[role="progressbar"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="breeds-hatch"]')!.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('Q7 / breedAsset / BR-AC49 docked attendance', () => {
  it('Q7: missing freeHatchUsed → Hatch · Free (adapter !== 1)', () => {
    const b = breedsOn();
    const br = { ...emptyBr() }; delete (br as any).freeHatchUsed;
    const s = { ...initialState(b), farmLevel: 10, coinsCents: 0, breeds: br as BreedsSave };
    // freeHatchAvailable uses !== 1 so undefined counts as free
    const u = hatchUi(s as any, b, br as BreedsSave);
    expect(u.kind).toBe('free');
  });

  it('breedAsset maps id underscores to hyphens', async () => {
    const { breedAsset } = await import('../src/ui/breeds-adapter');
    expect(breedAsset('rhode_island_red')).toBe('char-breed-rhode-island-red.svg');
    expect(breedAsset('ayam_cemani')).toBe('char-breed-ayam-cemani.svg');
  });

  it('BR-AC49: docked open does not throw; sheet visible; phone path opens too', async () => {
    const { mountBreeds, clearBreedsExtForTests } = await import('../src/ui/breeds-mount');
    clearBreedsExtForTests();
    const b = breedsOn();
    const kv = kvOf();
    kv.setItem(SAVE_KEY, serialize({
      ...initialState(b), farmLevel: 10, coinsCents: 1e9, abilitiesCoachSeen: true,
      tracksV7: 1, seenTracksExplainer: true,
    } as any, 1760000000000));
    const g = new Game(b, kv, () => 1760000000500, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
    if (!('breeds' in g.state)) {
      const { ensureBreeds } = await import('../src/sim/breeds');
      g.state = ensureBreeds(g.state, b);
    }
    document.body.innerHTML = '<div id="uh"></div><div id="pl"></div>';
    const h = mountBreeds({
      g, b,
      upHeader: document.getElementById('uh')!,
      panelLayer: document.getElementById('pl')!,
      docked: { matches: true },
      closeOtherPanels() {}, openUpgrades() {}, sfx() {},
      rm: () => false,
      saveFlags() {}, getFlags: () => ({}), dirty() {},
      rollingIncomeRate: () => 0,
    })!;
    h.syncEntry(g.state, {}, 1);
    h.open();
    expect(h.isOpen).toBe(true);
    expect(document.getElementById('breeds-sheet')!.hidden).toBe(false);
    h.close();
    expect(h.isOpen).toBe(false);
  });
});

describe('import.meta.glob breeds-ext (PR-A has zero matches)', () => {
  it('eager glob for breeds-ext-*.ts yields empty module map in PR-A', () => {
    const mods = import.meta.glob(['../src/ui/breeds-ext-*.ts', '!../src/ui/breeds-ext-registry.ts'], { eager: true });
    expect(Object.keys(mods).length).toBe(0);
  });
});

describe('breeds-ext-registry leaf (TDZ / registration order)', () => {
  it('fake ext modules register via leaf only; order is push order', async () => {
    const reg = await import('../src/ui/breeds-ext-registry');
    reg.clearBreedsExtForTests();
    const order: string[] = [];
    // Simulate what breeds-ext-*.ts must do: import ONLY the registry leaf.
    reg.registerBreedsExt({ onSync: () => { order.push('a'); } });
    reg.registerBreedsExt({ onSync: () => { order.push('b'); } });
    expect(reg.breedsExtCountForTests()).toBe(2);
    const list = reg.breedsExtList();
    for (const e of list) e.onSync?.({} as any);
    expect(order).toEqual(['a', 'b']);
    // Compatibility re-export from breeds-mount
    const mount = await import('../src/ui/breeds-mount');
    expect(mount.registerBreedsExt).toBe(reg.registerBreedsExt);
    expect(mount.breedsExtCountForTests()).toBe(2);
    reg.clearBreedsExtForTests();
  });
});
