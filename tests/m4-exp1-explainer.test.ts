// @vitest-environment jsdom
// M4-AC-EXP1 / M4A-33: one-time tracks explainer, triggered only by Game.onTracksCommitted (existing save upgraded in-session).
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { validate, serialize, checksum, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { Game } from '../src/game';
import { showTracksExplainer, EXP_TITLE, EXP_BODY, EXP_MS, EXP_RETRY_MS } from '../src/ui/tracks-explainer';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const mainState = () => { const { hensLevel, eggValueLevel, celebratedMilestones, tracksV7, ...r } = { ...initialState(balance), farmLevel: 10, collectionLevel: 7, coinsCents: 1e12 } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; void tracksV7; return r; };
const raw6 = (st: object) => { const j = JSON.stringify(st); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(j)}","state":${j}}`; };
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');
const boot = (kv: any, b = on) => new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
/** Mount the real app; returns the game, the explainer count and a buy counter. */
async function mount(g: Game, b: Balance) {
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  return { ui, cards: () => document.querySelectorAll('.tracks-exp').length };
}
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('M4-AC-EXP1 tracks explainer', () => {
  it('migrated save: shown once at the in-session commit, persisted, never again after reload', async () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, raw6(mainState()));
    const g = boot(kv); expect(g.tracksMigrationPending).toBe(true);
    const { cards } = await mount(g, on); expect(cards()).toBe(0); // not at boot
    expect(await g.startTracksMigration()).toBe('committed');
    expect(cards()).toBe(1);
    const card = document.querySelector('.tracks-exp')!;
    expect(card.querySelector('h2')!.textContent).toBe(EXP_TITLE); expect(card.querySelector('p')!.textContent).toBe(EXP_BODY);
    expect(card.querySelectorAll('button').length).toBe(1); expect(card.querySelector('button')!.textContent).toBe('Got it');
    expect(card.getAttribute('aria-modal')).toBe('false');
    expect(g.state.seenTracksExplainer).toBe(true);
    expect(JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true); // persisted when shown
    (card.querySelector('button') as HTMLButtonElement).click(); expect(cards()).toBe(0);
    g.onTracksCommitted!(); expect(cards()).toBe(0); // a second commit signal never re-shows
    const g2 = boot(kv); expect(g2.state.seenTracksExplainer).toBe(true); expect(g2.tracksMigrationPending).toBe(false);
    const m2 = await mount(g2, on); expect(await g2.startTracksMigration()).toBe('none'); expect(m2.cards()).toBe(0);
  });
  it('D-HOP-2026-10-19-13: committed but reloaded before it showed -> shown on load, once', async () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, raw6(mainState()));
    const g = boot(kv); g.onTracksCommitted = null; expect(await g.startTracksMigration()).toBe('committed'); // no UI yet
    expect(g.state.seenTracksExplainer).toBeUndefined();
    const g2 = boot(kv); expect(g2.tracksMigratedWithBackup).toBe(true);
    const m2 = await mount(g2, on); expect(m2.cards()).toBe(1); expect(g2.state.seenTracksExplainer).toBe(true);
    const g3 = boot(kv); const m3 = await mount(g3, on); expect(m3.cards()).toBe(0);
  });
  it('fresh M4 farm never sees it', async () => {
    const g = boot(kvOf()); expect(g.state.tracksV7).toBe(1);
    expect(g.tracksMigratedWithBackup).toBe(false);
    const { cards } = await mount(g, on); expect(await g.startTracksMigration()).toBe('none'); expect(cards()).toBe(0);
    expect(g.state.seenTracksExplainer).toBeUndefined();
  });
  it('M4 off: never shown, and a stored seenTracksExplainer is kept on load and save', async () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, raw6(mainState()));
    const g = boot(kv, off); const { cards } = await mount(g, off);
    expect(await g.startTracksMigration()).toBe('none'); expect(cards()).toBe(0);
    expect(showTracksExplainer(g)).toBeNull(); expect(cards()).toBe(0);
    const kv2 = kvOf(); kv2.setItem(SAVE_KEY, serialize({ ...initialState(on), tracksV7: 1, v6BackupId: 'x', seenTracksExplainer: true } as any, 1760000000000));
    const g2 = boot(kv2, off); expect(g2.state.seenTracksExplainer).toBe(true);
    g2.save(); expect(JSON.parse(kv2.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true);
  });
  it('persistence: optional field, SAVE_VERSION 6, old v6 save loads with it false, round trip keeps it with a valid checksum', () => {
    expect(SAVE_VERSION).toBe(6);
    const old = validate(raw6(mainState()), on); expect(old.ok).toBe(true);
    if (old.ok) { expect(old.file.version).toBe(6); expect(!!old.file.state.seenTracksExplainer).toBe(false); }
    const st = { ...initialState(on), tracksV7: 1 as const, seenTracksExplainer: true };
    for (const b of [on, off]) { const r = validate(serialize(st, 1760000000000), b); expect(r.ok && r.file.state.seenTracksExplainer).toBe(true); }
    // the migration (unmarked save with the field) does not reset it
    const mig = validate(raw6({ ...mainState(), seenTracksExplainer: true }), on); expect(mig.ok && mig.file.state.seenTracksExplainer).toBe(true);
    // export/import = the raw save string; a tampered field fails the checksum
    const exported = serialize(st, 1760000000000); expect(validate(exported, on).ok).toBe(true);
    expect(validate(exported.replace('"seenTracksExplainer":true', '"seenTracksExplainer":false'), on).ok).toBe(false);
  });
  it('v1.15: a tap outside on Buy buys exactly 1 and the card stays; a tap on the card closes it', async () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, raw6(mainState()));
    const g = boot(kv); const { ui, cards } = await mount(g, on);
    document.getElementById('modal-layer')?.classList.remove('open');
    ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render();
    await g.startTracksMigration(); expect(cards()).toBe(1);
    expect(document.querySelector('.tracks-exp')!.nextElementSibling).toBeNull(); // no backdrop
    const dispatch = vi.spyOn(g, 'dispatch'); const buys = () => dispatch.mock.calls.filter(([a]) => a.type === 'buyFarm').length;
    const btn = () => document.querySelector<HTMLButtonElement>('#uRow button.buy[data-kind=farm]')!; expect(btn()).toBeTruthy();
    btn().click(); expect(buys()).toBe(1); expect(cards()).toBe(1);
    (document.querySelector('.tracks-exp p') as HTMLElement).click(); expect(cards()).toBe(0); expect(buys()).toBe(1);
    // Esc and the 8 s timeout (direct, card re-shown on a fresh state)
    const fake = { state: { ...g.state, seenTracksExplainer: false }, balance: on, save() {} } as any;
    showTracksExplainer(fake); expect(cards()).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(cards()).toBe(0);
    vi.useFakeTimers(); fake.state.seenTracksExplainer = false; showTracksExplainer(fake); expect(cards()).toBe(1);
    vi.advanceTimersByTime(EXP_MS); expect(cards()).toBe(0);
  });
});

describe('Saves m1: explainer only when the flag can be persisted', () => {
  const fake = (o: any = {}) => { const saved: any[] = []; const g: any = { state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: false, ...o, save() { if (g.canPersist) saved.push(g.state.seenTracksExplainer); } }; return { g, saved }; };
  it('read-only / inactive / held: no card, flag unset; once writable: card shows and the flag is saved', () => {
    vi.useFakeTimers();
    const { g, saved } = fake();
    expect(showTracksExplainer(g)).toBeNull(); expect(document.querySelectorAll('.tracks-exp').length).toBe(0); expect(g.state.seenTracksExplainer).toBeUndefined();
    vi.advanceTimersByTime(3000); expect(document.querySelectorAll('.tracks-exp').length).toBe(0); expect(saved).toEqual([]);
    g.canPersist = true; vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll('.tracks-exp').length).toBe(1); expect(saved).toEqual([true]);
  });
  it('real Game: readOnly and inactive both block canPersist', () => {
    const g = boot(kvOf()); expect(g.canPersist).toBe(true);
    g.readOnly = true; expect(g.canPersist).toBe(false); g.readOnly = false;
    g.inactive = true; expect(g.canPersist).toBe(false); g.inactive = false;
    g.holdUntil = Date.now() + 1e9; expect(g.canPersist).toBe(false);
  });
  it('hidden tab: no card until visible', () => {
    vi.useFakeTimers(); const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { g } = fake({ canPersist: true }); expect(showTracksExplainer(g)).toBeNull(); expect(g.state.seenTracksExplainer).toBeUndefined();
    vis.mockReturnValue('visible'); vi.advanceTimersByTime(1000); expect(document.querySelectorAll('.tracks-exp').length).toBe(1); expect(g.state.seenTracksExplainer).toBe(true);
    vis.mockRestore();
  });
});

describe('§11 refund line and reduced motion', () => {
  const g = (refund: number) => ({ state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: true, migrationRefundCents: refund, save() {} }) as any;
  it('refund > 0: line with the money formatter; refund 0: omitted', async () => {
    const { fmtMoney } = await import('../src/ui/format');
    showTracksExplainer(g(123456)); const r = document.querySelector('.tracks-exp-refund');
    expect(r!.textContent!.trim()).toBe(`We refunded +${fmtMoney(123456)} for your old upgrades.`); expect(r!.querySelector('img')).toBeTruthy();
    document.body.innerHTML = ''; showTracksExplainer(g(0));
    expect(document.querySelector('.tracks-exp')).toBeTruthy(); expect(document.querySelector('.tracks-exp-refund')).toBeNull();
  });
  it('reduced motion: 150 ms opacity fade only (no scale)', async () => {
    const css = (await import('node:fs')).readFileSync(process.cwd() + '/src/ui/styles.css', 'utf8');
    const m = css.match(/@media \(prefers-reduced-motion:reduce\)\{\.tracks-exp\{animation:(\w+) \.15s[^}]*\}\}/); expect(m).toBeTruthy();
    const kf = css.match(new RegExp(`@keyframes ${m![1]}\\{([^@]*?)\\}\\}`))![1]; expect(kf).toContain('opacity'); expect(kf).not.toContain('scale');
  });
});

describe('gate5 A: toasts held while the card is open; card waits for a modal; 8 s timer starts on appear', () => {
  it('a Coop upgraded! toast fired while the card is open is held, then plays after it closes', async () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, raw6(mainState()));
    const g = boot(kv); const { ui, cards } = await mount(g, on);
    document.getElementById('modal-layer')?.classList.remove('open'); // no Welcome back in the way for this case
    await g.startTracksMigration(); expect(cards()).toBe(1);
    const toast = () => document.querySelector('.toast') as HTMLElement;
    toast().textContent = ''; toast().classList.remove('show');
    g.state = { ...g.state, celebratedTier: -1 } as any; ui.render();
    expect(toast().textContent).not.toMatch(/Coop upgraded!/); expect(toast().classList.contains('show')).toBe(false);
    (document.querySelector('.tracks-exp-ok') as HTMLButtonElement).click(); expect(cards()).toBe(0);
    expect(toast().textContent).toMatch(/^Coop upgraded!/);
  });
  it('waits while a modal (Welcome back!) is open, shows after it closes; the 8 s timer starts when it appears', () => {
    vi.useFakeTimers();
    const layer = document.createElement('div'); layer.id = 'modal-layer'; layer.className = 'open'; document.body.append(layer);
    const g: any = { state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: true, save() {} };
    expect(showTracksExplainer(g)).toBeNull(); expect(g.state.seenTracksExplainer).toBeUndefined();
    vi.advanceTimersByTime(20_000); expect(document.querySelectorAll('.tracks-exp').length).toBe(0); // never together with the dialog
    layer.classList.remove('open'); vi.advanceTimersByTime(EXP_RETRY_MS); expect(document.querySelectorAll('.tracks-exp').length).toBe(1);
    vi.advanceTimersByTime(EXP_MS - 1); expect(document.querySelectorAll('.tracks-exp').length).toBe(1); // full 8 s from appear
    vi.advanceTimersByTime(1); expect(document.querySelectorAll('.tracks-exp').length).toBe(0);
  });
});

describe('P46-M1 focus: to Got it on open, back to the active Upgrades tab on close', () => {
  for (const how of ['gotit', 'esc', 'enter'] as const) it(`close via ${how}`, () => {
    document.body.innerHTML = '<div class="tabs"><button data-tab="collection">C</button><button data-tab="farm" class="active">F</button></div><button id="other">x</button>';
    (document.getElementById('other') as HTMLElement).focus();
    const g: any = { state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: true, save() {} };
    const el = showTracksExplainer(g)!; const ok = el.querySelector('button')!; expect(document.activeElement).toBe(ok);
    if (how === 'gotit') ok.click();
    else ok.dispatchEvent(new KeyboardEvent('keydown', { key: how === 'esc' ? 'Escape' : 'Enter', bubbles: true, cancelable: true }));
    expect(document.querySelector('.tracks-exp')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('[data-tab=farm]'));
  });
  it('no Upgrades tab: bottom-nav Upgrades button', () => {
    document.body.innerHTML = '<button data-nav="upgrades">U</button><button id="collect">c</button>';
    const g: any = { state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: true, save() {} };
    showTracksExplainer(g)!.querySelector('button')!.click(); expect(document.activeElement!.getAttribute('data-nav')).toBe('upgrades');
  });
});

describe('P46-M1 CCR major: focus return only when it was on the card, never to a hidden tab', () => {
  const g = () => ({ state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: true, save() {} }) as any;
  it('B-M1: sheet closed -> bottom-nav Upgrades button (not the hidden tab, not #collect)', () => {
    document.body.innerHTML = '<div id="p-upgrades" hidden><button data-tab="farm" class="active">F</button></div><nav><button data-nav="upgrades">U</button></nav><button id="collect">c</button>';
    showTracksExplainer(g())!.querySelector('button')!.click(); expect(document.activeElement!.getAttribute('data-nav')).toBe('upgrades');
  });
  it('B-M1: no tab or nav rendered -> #collect last resort', () => {
    document.body.innerHTML = '<div hidden><button data-tab="farm" class="active">F</button><button data-nav="upgrades">U</button></div><button id="collect">c</button>';
    showTracksExplainer(g())!.querySelector('button')!.click(); expect(document.activeElement!.id).toBe('collect');
  });
  it('timer close while the user focuses another control: focus is left alone', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="tabs"><button data-tab="farm" class="active">F</button></div><button id="buy">b</button>';
    showTracksExplainer(g()); (document.getElementById('buy') as HTMLElement).focus();
    vi.advanceTimersByTime(EXP_MS); expect(document.querySelector('.tracks-exp')).toBeNull(); expect(document.activeElement!.id).toBe('buy');
  });
});

describe('HoE Major #49: storage blocked (localStorage.setItem throws)', () => {
  it('no card, no flag, no save, no retry; a reload changes nothing', async () => {
    const { TabLease } = await import('../src/save/tab-lease');
    vi.useFakeTimers();
    const kv = { getItem: () => null, setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); } };
    let saves = 0; const state = { ...initialState(on), tracksV7: 1 };
    for (let load = 0; load < 2; load++) { // first load, then a reload with the same (unsaved) state
      const lease = new TabLease(kv, null, () => {}); lease.claim(); expect(lease.storageBlocked).toBe(true);
      expect(lease.owns()).toBe(true); // canWrite() stays true while blocked: the gate must not rely on it
      const g: any = { state: { ...state }, balance: on, canPersist: true, migrationRefundCents: 0, save() { saves++; } };
      expect(showTracksExplainer(g, document, () => lease.storageBlocked)).toBeNull();
      vi.advanceTimersByTime(EXP_RETRY_MS * 5);
      expect(document.querySelectorAll('.tracks-exp').length).toBe(0); expect(g.state.seenTracksExplainer).toBeUndefined();
      lease.stop();
    }
    expect(saves).toBe(0); vi.useRealTimers();
  });
  it('control: same fake with storage writable shows the card once', () => {
    const g: any = { state: { ...initialState(on), tracksV7: 1 }, balance: on, canPersist: true, save() {} };
    expect(showTracksExplainer(g, document, () => false)).not.toBeNull(); expect(document.querySelectorAll('.tracks-exp').length).toBe(1);
    expect(g.state.seenTracksExplainer).toBe(true); expect(showTracksExplainer(g, document, () => false)).toBeNull();
    document.querySelector('.tracks-exp')?.remove();
  });
});
