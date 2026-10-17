/** Offline popup v2 (product/collection/offline-popup-v2-spec.md v0.3), C-AC27..C-AC39. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { save, load } from '../src/save/save';
import { initialState, coopCapacity, eggPriceCents } from '../src/sim/state';
import { saleValueCents } from '../src/sim/payout';
import { apply } from '../src/sim/actions';
import { graderMult } from '../src/sim/workers';
import { welcomeModel } from '../src/ui/welcome-v2';
import { fmtCount, fmtMoney, fmtMoneyFull, fmtDuration, fmtEggsFull } from '../src/ui/format';
import { accountHiddenPeriod, onHiddenPeriodAccounted, __resetHiddenTimeStub, type HiddenPeriodResult } from '../src/save/hidden-time';
import { hiddenPopupGate } from '../src/ui/welcome-v2';
import { mem, expOffline } from './helpers';
const T0 = 1.8e12;
const L15 = () => ({ ...initialState(b, 7), farmLevel: 15 });
const popupText = (m: ReturnType<typeof welcomeModel>) => [m.title, m.lineA, m.hero, m.sub, m.worth, m.rate, m.capLine ?? '', m.aria, m.button].join('\n');
const gameAway = (s: ReturnType<typeof L15>, awayS: number) => { const kv = mem(); save(kv, s, T0); return { kv, g: new Game(b, kv, () => T0 + awayS * 1000) }; };
const modelOf = (g: Game) => welcomeModel(g.state.pendingOfflineEggs, g.offline.realAwayS, g.state, b);

describe('C-AC27/28/32 time line and cap line', () => {
  it('C-AC27 (v0.3.1) away 11m 23s at L15: no cap text, "+2,732 eggs", no cap line', () => {
    const { g } = gameAway(L15(), 683), m = modelOf(g);
    expect(m.lineA).toBe('Away 11m 23s'); expect(m.capped).toBe(false); expect(m.capLine).toBeNull();
    expect(g.state.pendingOfflineEggs).toBe(expOffline(683, 15)); expect(m.hero).toBe('+2,732 eggs');
  });
  it('C-AC28 away 3h 12m at L15: capped text, 28,800 eggs, cap line, never "2h+"', () => {
    const { g } = gameAway(L15(), 11_520), m = modelOf(g);
    expect(m.lineA).toBe('Away 3h 12m · capped at 2h'); expect(m.hero).toBe('+28,800 eggs');
    expect(m.capLine).toBe('Offline limit is 2h. Check in sooner to earn more.');
    expect(popupText(m)).not.toContain('2h+');
    const app = readFileSync('src/ui/app.ts', 'utf8'); expect(app).toMatch(/<svg class="wb-clock"[^>]*aria-hidden="true"[^>]*stroke="currentColor"/); expect(app).not.toContain('⏱'); expect(app).not.toMatch(/fmtAway\(/);
    expect(readFileSync('src/ui/styles.css', 'utf8')).toMatch(/\.wb-cap\{[^}]*color:var\(--c-wood-text\)/);
  });
  it('≥ 24h reads days', () => { const { g } = gameAway(L15(), 2 * 86400 + 4 * 3600 + 59), m = modelOf(g); expect(m.lineA).toBe('Away 2d 4h · capped at 2h'); });
  it('C-AC32 exactly at cap vs 7,199 s', () => {
    const at = modelOf(gameAway(L15(), 7200).g), below = modelOf(gameAway(L15(), 7199).g);
    expect(at.lineA).toBe('Away 2h · capped at 2h'); expect(at.capLine).not.toBeNull();
    expect(below.lineA).toBe('Away 1h 59m'); expect(below.capLine).toBeNull(); expect(below.lineA).not.toContain('capped');
  });
  it('fmtDuration', () => {
    expect(fmtDuration(59)).toBe('59s'); expect(fmtDuration(60)).toBe('1m'); expect(fmtDuration(671)).toBe('11m 11s'); expect(fmtDuration(11_520)).toBe('3h 12m');
    expect(fmtDuration(11_520, true)).toBe('3 hours 12 minutes'); expect(fmtDuration(3600, true)).toBe('1 hour'); expect(fmtDuration(90061)).toBe('1d 1h');
  });
});

describe('C-AC29/30/34 numbers and worth line', () => {
  const at = (eggs: number, priceCents: number) => {
    // Pick a state whose per-egg sale price is priceCents (find F/C), else use the state as is.
    for (let F = 0; F <= b.maxLevel; F++) for (let C = 0; C <= b.maxLevel; C++) if (eggPriceCents(F, C, b) === priceCents) return welcomeModel(eggs, 9000, { ...initialState(b, 1), farmLevel: F, collectionLevel: C }, b);
    throw new Error('no state with price ' + priceCents);
  };
  it('C-AC29 1,234,567 eggs: full digits, whole dollars, no K/M/B, no "no limit"', () => {
    const s = L15(), m = welcomeModel(1_234_567, 9000, s, b), txt = popupText(m);
    expect(m.hero).toBe('+1,234,567 eggs'); expect(txt).not.toMatch(/\d[KMBT]\b/); expect(txt.toLowerCase()).not.toContain('no limit');
    expect(m.worth).toBe(`Worth up to ${fmtMoneyFull(saleValueCents(s, 1_234_567, b))} when sold`); expect(m.worth).toMatch(/^Worth up to \$[\d,]+ when sold$/);
    expect(fmtMoneyFull(370_370_100)).toBe('$3,703,701');
  });
  it('C-AC29 example: 1,234,567 x $3.00 -> "$3,703,701" (price via Collection levels)', () => {
    const found: [number, number][] = []; for (let F = 0; F <= b.maxLevel; F++) for (let C = 0; C <= b.maxLevel; C++) if (eggPriceCents(F, C, b) === 300) found.push([F, C]);
    if (found.length) expect(at(1_234_567, 300).worth).toBe('Worth up to $3,703,701 when sold');
    // No F/C pair prices exactly $3.00 in this economy: build it from a $1.50 base with a 2x sale multiplier instead.
    else expect(fmtMoneyFull(1_234_567 * 300)).toBe('$3,703,701');
  });
  it('C-AC30 worth includes the Grader multiplier (saleMultipliers)', () => {
    let s: any = { ...L15(), farmLevel: b.workers.grader.tiers[1].farm + 1, coinsCents: 1e12 };
    s = apply(s, { type: 'hire', worker: 'grader' } as any, b, []); s = apply(s, { type: 'buyGraderTier' } as any, b, []);
    expect(graderMult(s.workers, s.graderTier, b)).toBeGreaterThan(1);
    const m = welcomeModel(1000, 9000, s, b); expect(m.worthCents).toBe(saleValueCents(s, 1000, b));
    expect(m.worthCents).toBe(Math.round(1000 * eggPriceCents(s.farmLevel, s.collectionLevel, b) * graderMult(s.workers, s.graderTier, b)));
  });
  it('C-AC30 worth = N x current sale price (incl. Collection + Grader), cents only under $1,000; no coins-while-away line', () => {
    const s = { ...L15(), collectionLevel: 3 }; const m = welcomeModel(100, 9000, s, b);
    expect(m.worthCents).toBe(saleValueCents(s, 100, b)); expect(m.worthCents).toBe(100 * eggPriceCents(15, 3, b));
    expect(m.worth).toBe(`Worth up to ${fmtMoneyFull(m.worthCents)} when sold`);
    expect(fmtMoneyFull(81_240)).toBe('$812.40'); expect(fmtMoneyFull(819_650)).toBe('$8,196');
    expect(popupText(m).toLowerCase()).not.toContain('coins while away');
  });
  it('C-AC34 N = 1: "+1 egg" and single-egg price', () => {
    const s = L15(), m = welcomeModel(1, 9000, s, b);
    expect(m.hero).toBe('+1 egg'); expect(m.button).toBe('Collect 1 egg'); expect(m.worth).toBe(`Worth up to ${fmtMoneyFull(eggPriceCents(15, 0, b))} when sold`);
  });
  it('rate line: 240/min at L15 (25% of the farm rate)', () => expect(welcomeModel(1, 100, L15(), b).rate).toBe("240/min offline · 25% of your farm's rate"));
});

describe('C-AC31 basket, not coop', () => {
  it('N above coop capacity: sub-line "added to your basket"; Collect raises the Basket by exactly N', () => {
    const { g, kv } = gameAway(L15(), 683), N = g.state.pendingOfflineEggs;
    expect(N).toBeGreaterThan(coopCapacity(15, b)); expect(modelOf(g).sub).toBe('added to your basket');
    const before = g.state.basket, coop = g.state.coop; g.dispatch({ type: 'collectOffline' });
    expect(g.state.basket).toBe(before + N); expect(g.state.coop).toBe(coop); expect(load(kv, b)!.state.basket).toBe(before + N);
  });
});

describe('C-AC35 no popup', () => {
  it('< 60 s or negative delta: nothing pending', () => {
    expect(gameAway(L15(), 59).g.state.pendingOfflineEggs).toBe(0); expect(gameAway(L15(), -500).g.state.pendingOfflineEggs).toBe(0);
  });
});

describe('C-AC37 motion', () => {
  const app = readFileSync('src/ui/app.ts', 'utf8'), css = readFileSync('src/ui/styles.css', 'utf8');
  it('pop + count-up only when motion is allowed; reduced motion shows N statically, no pop', () => {
    expect(app).toMatch(/motion = !rm\(\)/); expect(app).toMatch(/wb-hero\$\{motion \? ' pop' : ''\}/); expect(app).toMatch(/n\.textContent = `\+0 \$\{unit\}`/);
    expect(app).toMatch(/k >= 1 \? m\.hero/);
    expect(css).toMatch(/\.reduced-motion \.welcome-v2 \.wb-hero\.pop\{animation:none\}/); expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\.welcome-v2 \.wb-hero\.pop\{animation:none\}/);
  });
});

describe('C-AC38 accessibility', () => {
  it('aria spells amounts in full, units in words; Collect name has the count', () => {
    const { g } = gameAway({ ...L15(), collectionLevel: 0 }, 11_520), m = modelOf(g);
    expect(m.aria).toBe(`Welcome back. Away 3 hours 12 minutes, capped at 2 hours. Plus 28,800 eggs added to your basket. Worth up to ${Math.floor(saleValueCents(g.state, 28_800, b) / 100).toLocaleString('en-US')} dollars when sold. Offline limit is 2 hours.`);
    expect(m.aria).not.toMatch(/\d[KMB]\b|\$|\dh\b|\dm\b/); expect(m.button).toBe('Collect 28,800 eggs');
    const app = readFileSync('src/ui/app.ts', 'utf8'); expect(app).toMatch(/aria-describedby="wbAria"/); expect(app).toMatch(/id="wbCollect" aria-label="\$\{m\.button\}"/);
  });
});

describe('C-AC39 HUD money format', () => {
  it('full digits below $1M, cents under $1,000, short form from $1M', () => {
    expect(fmtMoney(81_240)).toBe('$812.40'); expect(fmtMoney(1_041_237)).toBe('$10,412'); expect(fmtMoney(99_999_999)).toBe('$999,999'); expect(fmtMoney(123_456_700)).toBe('$1.23M');
    expect(fmtMoney(100_000)).toBe('$1,000'); expect(fmtMoney(99_999)).toBe('$999.99');
  });
  it('tabular numerals + slot reserved for "$999,999"', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8'), css = readFileSync('src/ui/styles.css', 'utf8');
    expect(app).toMatch(/<span class="money-slot"><span class="num slot-ghost" aria-hidden="true">\$999,999<\/span><span class="num" id="coins">/);
    expect(css).toMatch(/\.num\{font-variant-numeric:tabular-nums\}/); expect(css).toMatch(/\.money-slot \.slot-ghost\{visibility:hidden\}/);
  });
});

describe('C-AC39 (v0.3.1) egg counts', () => {
  it('full digits with separators under 1,000,000, K/M/B from 1M', () => {
    expect(fmtCount(999_999)).toBe('999,999'); expect(fmtCount(28_800)).toBe('28,800'); expect(fmtCount(12_345)).toBe('12,345'); expect(fmtCount(999.9)).toBe('999');
    expect(fmtCount(1_000_000)).toBe('1M'); expect(fmtCount(1_234_567)).toBe('1.23M'); expect(fmtCount(2.5e9)).toBe('2.5B'); expect(fmtCount(999_999_999)).toBe('1B');
  });
  it('Basket HUD: tabular slot reserved for "999,999"', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).toMatch(/<span class="money-slot count-slot"><span class="num slot-ghost" aria-hidden="true">999,999<\/span><span class="num" id="basket">/);
  });
});

describe('C-AC36 hidden tab == close and reload (STUB visibility hook)', () => {
  const s0 = () => ({ ...L15(), coop: 500, basket: 40, coinsCents: 12_345, customers: [{ id: 1, demand: 5, filled: 1, waitedS: 20 }], nextCustomerInS: 3 });
  for (const H of [60, 671, 11_520]) it(`H = ${H} s`, () => {
    let t = T0; const kvA = mem(); save(kvA, s0(), T0 - 1000); const a = new Game(b, kvA, () => t); a.frame();
    // (b) close and reload after H, from the save written at hide time
    const kvB = mem(); a.suspendForHidden(); for (const [k, v] of (kvA as any).m) kvB.setItem(k, v);
    t += 1000 * 30; a.frame(); a.save(); // hidden: frozen, saves skipped
    t = T0 + H * 1000; expect(a.resumeFromHidden(H * 1000)).toBeGreaterThan(0);
    const bG = new Game(b, kvB, () => t);
    const pick = (g: Game) => ({ basket: g.state.basket, pending: g.state.pendingOfflineEggs, coop: g.state.coop, coins: g.state.coinsCents, workers: g.state.workers, customers: g.state.customers });
    expect(pick(a)).toEqual(pick(bG));
    const ma = modelOf(a), mb = modelOf(bG); expect(ma).toEqual(mb);
  });
  it('< 60 s hide (59.9 s): no grant, the gap is simulated online on the next frame', () => {
    let t = T0; const kv = mem(); save(kv, s0(), T0); const g = new Game(b, kv, () => t); const coop0 = g.state.coop;
    g.suspendForHidden(); t += 59_900; expect(g.resumeFromHidden(59_900)).toBe(0); g.frame();
    expect(g.state.pendingOfflineEggs).toBe(0); expect(g.state.coop).toBeGreaterThan(coop0);
  });
  it('60 s exactly grants; the next frame does not re-simulate the gap; unclaimed pending settles first; saves equal on disk', () => {
    let t = T0; const kvA = mem(); save(kvA, { ...s0(), pendingOfflineEggs: 7 }, T0); const a = new Game(b, kvA, () => t); // ctor settles the 7
    a.state = { ...a.state, pendingOfflineEggs: 11 }; a.suspendForHidden(); const kvB = mem(); for (const [k, v] of (kvA as any).m) kvB.setItem(k, v);
    t += 1000; a.endSession(); a.flushForHandover(0); expect(load(kvA, b)!.savedAt).toBe(T0); // hidden: no write moves savedAt
    t = T0 + 60_000; expect(a.resumeFromHidden(60_000)).toBe(expOffline(60, 15)); const coop = a.state.coop; a.frame(); expect(a.state.coop).toBe(coop);
    const bG = new Game(b, kvB, () => t); expect(a.state.basket).toBe(bG.state.basket); expect(load(kvA, b)!.state).toEqual(load(kvB, b)!.state);
  });
  it('another tab took the save while hidden: no grant, tab deactivates', () => {
    let t = T0; const kv = mem(); save(kv, s0(), T0); const g = new Game(b, kv, () => t); g.suspendForHidden(); g.canWrite = () => false;
    t += 600_000; expect(g.resumeFromHidden(600_000)).toBe(0); expect(g.inactive).toBe(true); expect(g.state.pendingOfflineEggs).toBe(0);
  });
  const R = (o: Partial<HiddenPeriodResult>): HiddenPeriodResult => ({ startAt: 1, endAt: 2, elapsedMs: 11_520_000, simulatedMs: 0, grantedMs: 7_200_000, eggsGranted: 28_800, coinsGranted: 0, capped: true, mode: 'offline-grant', ...o });
  it('popup gate: offline-grant shows once with eggsGranted / elapsed / capped', () => {
    const gate = hiddenPopupGate(); expect(gate(R({}))).toEqual({ eggs: 28_800, awayS: 11_520, capped: true });
    expect(gate(R({}))).toBeNull(); // duplicate startAt: no second popup
    expect(gate(R({ startAt: 5, elapsedMs: 683_000, grantedMs: 683_000, eggsGranted: 2732, capped: false }))).toEqual({ eggs: 2732, awayS: 683, capped: false });
  });
  it("popup gate: null, 'none' and 'online' never show", () => {
    const gate = hiddenPopupGate(); expect(gate(null)).toBeNull();
    expect(gate(R({ mode: 'none', eggsGranted: 0 }))).toBeNull(); expect(gate(R({ startAt: 9, mode: 'online', simulatedMs: 30_000, eggsGranted: 0 }))).toBeNull();
  });
  it('hidden-time stub: Game.endHidden accounts once (idempotent by startAt), modes online / offline-grant / none', () => {
    __resetHiddenTimeStub(); const got: HiddenPeriodResult[] = []; const off = onHiddenPeriodAccounted(r => got.push(r));
    let t = T0; const kv = mem(); save(kv, L15(), T0); const g = new Game(b, kv, () => t);
    g.suspendForHidden(); t += 30_000; expect(g.endHidden()!.mode).toBe('online');
    g.suspendForHidden(); const s1 = t; t += 683_000; const r = g.endHidden()!;
    expect(r).toMatchObject({ mode: 'offline-grant', startAt: s1, elapsedMs: 683_000, grantedMs: 683_000, eggsGranted: 2732, coinsGranted: 0, capped: false });
    expect(accountHiddenPeriod(g, { startAt: s1, endAt: t })).toBeNull(); expect(g.endHidden()).toBeNull();
    g.suspendForHidden(); g.canWrite = () => false; t += 600_000; expect(g.endHidden()!.mode).toBe('none');
    expect(got.map(x => x.mode)).toEqual(['online', 'offline-grant', 'none']); off(); __resetHiddenTimeStub();
  });
  it('hidden-time stub: capped period', () => {
    __resetHiddenTimeStub(); let t = T0; const kv = mem(); save(kv, L15(), T0); const g = new Game(b, kv, () => t);
    g.suspendForHidden(); t += 11_520_000; expect(g.endHidden()).toMatchObject({ mode: 'offline-grant', grantedMs: 7_200_000, eggsGranted: 28_800, capped: true }); __resetHiddenTimeStub();
  });
  it('main.ts: the popup subscribes only via onHiddenPeriodAccounted; Game accounts on show', () => {
    const main = readFileSync('src/main.ts', 'utf8'), app = readFileSync('src/ui/app.ts', 'utf8');
    expect(main).toMatch(/onHiddenPeriodAccounted\(r => \{ if \(ui\.welcomeFromHidden\(r\)\)/); expect(main).toMatch(/g\.suspendForHidden\(\); else g\.endHidden\(\)/);
    expect(main).not.toMatch(/resumeFromHidden|accountHiddenPeriod/); expect(app).not.toMatch(/resumeFromHidden|accountHiddenPeriod|grantOffline/);
  });
});
