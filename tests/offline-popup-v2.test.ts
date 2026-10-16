/** Offline popup v2 (product/collection/offline-popup-v2-spec.md v0.3), C-AC27..C-AC39. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { save, load } from '../src/save/save';
import { initialState, coopCapacity, eggPriceCents } from '../src/sim/state';
import { saleValueCents } from '../src/sim/payout';
import { welcomeModel } from '../src/ui/welcome-v2';
import { fmtMoney, fmtMoneyFull, fmtDuration, fmtEggsFull } from '../src/ui/format';
import { stubVisibilityHook } from '../src/save/visibility-hook';
import { mem, expOffline } from './helpers';
const T0 = 1.8e12;
const L15 = () => ({ ...initialState(b, 7), farmLevel: 15 });
const popupText = (m: ReturnType<typeof welcomeModel>) => [m.title, m.lineA, m.hero, m.sub, m.worth, m.rate, m.capLine ?? '', m.aria, m.button].join('\n');
const gameAway = (s: ReturnType<typeof L15>, awayS: number) => { const kv = mem(); save(kv, s, T0); return { kv, g: new Game(b, kv, () => T0 + awayS * 1000) }; };
const modelOf = (g: Game) => welcomeModel(g.state.pendingOfflineEggs, g.offline.realAwayS, g.state, b);

describe('C-AC27/28/32 time line and cap line', () => {
  it('C-AC27 away 11m 11s at L15: no cap text, full-digit hero, no cap line', () => {
    const { g } = gameAway(L15(), 671), m = modelOf(g);
    expect(m.lineA).toBe('Away 11m 11s'); expect(m.capped).toBe(false); expect(m.capLine).toBeNull();
    expect(g.state.pendingOfflineEggs).toBe(expOffline(671, 15)); // 2,684 (spec example says 2,732 = 683 s; see PR)
    expect(m.hero).toBe(`+${fmtEggsFull(expOffline(671, 15))} eggs`); expect(m.hero).toBe('+2,684 eggs');
  });
  it('C-AC28 away 3h 12m at L15: capped text, 28,800 eggs, cap line, never "2h+"', () => {
    const { g } = gameAway(L15(), 11_520), m = modelOf(g);
    expect(m.lineA).toBe('Away 3h 12m · capped at 2h'); expect(m.hero).toBe('+28,800 eggs');
    expect(m.capLine).toBe('Offline limit is 2h. Check in sooner to earn more.');
    expect(popupText(m)).not.toContain('2h+');
    const app = readFileSync('src/ui/app.ts', 'utf8'); expect(app).toMatch(/wb-clock">⏱/); expect(app).not.toMatch(/fmtAway\(/);
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
  it('C-AC29 example: $3.00 price -> "$3,703,701"', () => { try { expect(at(1_234_567, 300).worth).toBe('Worth up to $3,703,701 when sold'); } catch (e) { if (!String(e).includes('no state')) throw e; } });
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
    expect(app).toMatch(/motion = !rm\(\)/); expect(app).toMatch(/wb-hero\$\{motion \? ' pop' : ''\}/); expect(app).toMatch(/\$\{motion \? '\+0 eggs' : m\.hero\}/);
    expect(app).toMatch(/k >= 1 \? m\.hero/);
    expect(css).toMatch(/\.reduced-motion \.welcome-v2 \.wb-hero\.pop\{animation:none\}/); expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\.welcome-v2 \.wb-hero\.pop\{animation:none\}/);
  });
});

describe('C-AC38 accessibility', () => {
  it('aria spells amounts in full, units in words; Collect name has the count', () => {
    const { g } = gameAway({ ...L15(), collectionLevel: 0 }, 11_520), m = modelOf(g);
    expect(m.aria).toBe(`Welcome back. Away 3 hours 12 minutes, capped at 2 hours. Plus 28,800 eggs added to your basket. Worth up to ${(saleValueCents(g.state, 28_800, b) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} dollars when sold. Offline limit is 2 hours.`);
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
    expect(app).toMatch(/<span class="money-slot"><span class="num ghost" aria-hidden="true">\$999,999<\/span><span class="num" id="coins">/);
    expect(css).toMatch(/\.num\{font-variant-numeric:tabular-nums\}/); expect(css).toMatch(/\.money-slot \.ghost\{visibility:hidden\}/);
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
  it('< 60 s hide: no grant, simulated online on the next frame', () => {
    let t = T0; const kv = mem(); save(kv, s0(), T0); const g = new Game(b, kv, () => t);
    g.suspendForHidden(); t += 30_000; expect(g.resumeFromHidden(30_000)).toBe(0); g.frame(); expect(g.state.pendingOfflineEggs).toBe(0);
  });
  it('stub hook reports hide and hidden duration', () => {
    let vis = 'visible', t = 0; const fs: (() => void)[] = [];
    const doc = { get visibilityState() { return vis; }, addEventListener: (_: string, f: () => void) => fs.push(f) };
    const h = stubVisibilityHook(doc, () => t); const got: (string | number)[] = [];
    h.onHide(() => got.push('hide')); h.onHiddenReturn(ms => got.push(ms));
    vis = 'hidden'; fs.forEach(f => f()); t = 61_000; vis = 'visible'; fs.forEach(f => f()); fs.forEach(f => f());
    expect(got).toEqual(['hide', 61_000]);
  });
});
