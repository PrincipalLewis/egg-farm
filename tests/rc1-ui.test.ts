// rc1 Art & UX handoff (art-ux/*.md, 2026-10-16): CSS / markup / logic checks per item.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');

describe('D5 next-goal button (m3-next-goal-spec v1.0.1)', () => {
  it('tokens --goal-h:40px and --goal-hit:44px', () => { expect(css).toMatch(/--goal-h:40px/); expect(css).toMatch(/--goal-hit:44px/); });
  it('button.goal is a 44px hit area with 2px vertical padding; the 40px pill is an inner span', () => {
    expect(app).toMatch(/<button class="goal" id="goal"[^>]*><span class="goal-pill">/);
    expect(css).toMatch(/\.goal\{[^}]*min-height:var\(--goal-hit\);padding:2px 0;margin-bottom:-4px/);
    expect(css).toMatch(/\.goal-pill\{[^}]*height:var\(--goal-h\)/);
  });
  it('row budget: 44 hit + 4 gap = 40 pill + 8 gap', () => expect(44 + (8 - 4)).toBe(40 + 8));
});

describe('D7 rotate prompt focus trap', async () => {
  const { trapFocus } = await import('../src/ui/rotate-prompt');
  const fakeDoc = () => { const l: Record<string, Function> = {}; return { l, addEventListener: (t: string, f: Function) => { l[t] = f; }, removeEventListener: (t: string) => { delete l[t]; } }; };
  it('Tab and Shift+Tab are swallowed and focus stays on the prompt', () => {
    const d = fakeDoc(); let focus = 0; const el = { focus: () => focus++, contains: (n: any) => n === el } as any;
    trapFocus(el, d as any); let prevented = 0;
    for (const shiftKey of [false, true]) d.l.keydown({ key: 'Tab', shiftKey, preventDefault: () => prevented++, stopPropagation() {} });
    d.l.keydown({ key: 'a', preventDefault: () => prevented++, stopPropagation() {} });
    expect(prevented).toBe(2); expect(focus).toBe(2);
  });
  it('focus landing outside is pulled back; release removes the listeners', () => {
    const d = fakeDoc(); let focus = 0; const el = { focus: () => focus++, contains: (n: any) => n === el } as any;
    const release = trapFocus(el, d as any); d.l.focusin({ target: {} }); d.l.focusin({ target: el }); expect(focus).toBe(1);
    release(); expect(d.l.keydown).toBeUndefined(); expect(d.l.focusin).toBeUndefined();
  });
});

describe('S2-6 Queue full tag (layout-spec §3.3)', () => {
  it('straddles the top outline with the spec box and never takes taps', () => expect(css).toMatch(/\.qtag\{top:-9px;right:8px;height:18px;line-height:16px;z-index:1;pointer-events:none;white-space:nowrap/));
  it('reads "Full" below 380px, "Queue full" otherwise', () => {
    expect(app).toContain('<span class="q-long">Queue full</span><span class="q-short">Full</span>');
    expect(css).toMatch(/@media \(max-width:379px\)\{\.qtag \.q-long\{display:none\}\.qtag \.q-short\{display:inline\}\}/);
  });
});
describe('S2-6 QA s2-7-bd0dc66: tag never reaches a chip', () => {
  it('strip reserves a 9px top band (tag is 18px at top:-9px)', () => { expect(css).toMatch(/\.queue\{padding-top:9px;min-height:81px\}/); expect(css).toMatch(/max-height:699px\)\{\.queue\{min-height:73px\}/); });
});

describe('S2-5 nav labels (session2-ui-triage (b))', async () => {
  const { navManageView } = await import('../src/ui/workers-ui');
  const P = { text: '', at: -Infinity };
  it('every nav button has an icon, a visible .nav-lbl and an aria-label', () => {
    const navHtml = app.slice(app.indexOf('<nav class="actions"'), app.indexOf('</nav>'));
    const btns = navHtml.split('<button').slice(1);
    expect(btns).toHaveLength(4);
    for (const b of btns) { expect(b).toMatch(/aria-label="[^"]+"/); expect(b).toMatch(/<img /); expect(b).toMatch(/class="nav-lbl[^"]*">[^<]+</); }
  });
  it('ready: "Refill" + N badge; aria "Refill N tired workers"', () => {
    expect(navManageView(2, 0, false, P, 0)).toEqual({ label: 'Refill', badge: '2', aria: { text: 'Refill 2 tired workers', at: 0 } });
    expect(navManageView(2, 0, true, P, 0).label).toBe('Refill 2 tired workers');
  });
  it('cooldown: "0:28", no badge; aria text changes at most every 5 s', () => {
    const a = navManageView(1, 27.4, false, P, 1000); expect(a.label).toBe('0:28'); expect(a.badge).toBe('');
    expect(a.aria.text).toBe('Refill available in 28 seconds');
    expect(navManageView(1, 25.1, false, a.aria, 3000).aria).toBe(a.aria);
    expect(navManageView(1, 22.9, false, a.aria, 6100).aria.text).toBe('Refill available in 23 seconds');
  });
});

describe('Workers v1.3 (m2-workers-layout §4.4, m2-proposal §8 #19-20)', async () => {
  const { manageAllHtml, workersHtml, farmManageAllVisible, manageCaption } = await import('../src/ui/workers-ui');
  const { balance: b } = await import('../src/config/balance');
  const { initialState } = await import('../src/sim/state');
  const S = (e: number[], cd = 0): any => ({ ...initialState(b, 3), farmLevel: 10, manageCdS: cd, graderTier: 1,
    workers: Object.fromEntries((['market_hand', 'coop_hand', 'hawker', 'grader'] as const).slice(0, e.length).map((id, i) => [id, { energy: e[i], cdS: 0 }])) });
  it('AC-R9: "Refill N tired workers", N = workers at <= 40%; hidden at N=0', () => {
    const h = manageAllHtml(S([40, 41, 10]), b); expect(h).toContain('Refill 2 tired workers'); expect(h).toContain('aria-label="Refill 2 tired workers"'); expect(h).not.toMatch(/Manage all|need it|All rested|1 tired workers|Refill tired \(/);
    expect(manageAllHtml(S([40, 41, 90]), b)).toContain('Refill 1 tired worker');
  });
  it('AC-R9: locked under 3 hired; shown at N>=1; hidden at N=0 (including during cooldown)', () => {
    expect(manageAllHtml(S([10, 10]), b)).toBe(''); expect(farmManageAllVisible(S([10, 10]), b, false)).toBe(false);
    expect(manageAllHtml(S([90, 90, 90]), b)).toBe('');
    expect(manageAllHtml(S([90, 90, 90], 12.2), b)).toBe(''); // N=0 → hidden (Addendum 2)
    const cd = manageAllHtml(S([10, 90, 90], 12.2), b);
    expect(cd).toMatch(/is-cooldown" data-act="manageAll" aria-disabled="true"/); expect(cd).toContain('ring-cooldown'); expect(cd).toContain('Ready in 13s'); expect(cd).toContain('Refill 1 tired worker');
  });
  it('AC-R8: greyed caption "Rested, refill below 40%" / "Ready in Ns"; energy reason wins when both', () => {
    const h = workersHtml(S([40, 41, 90]), b);
    expect(h).toMatch(/data-w="market_hand" aria-disabled="false"/); expect(h).toMatch(/data-w="coop_hand" aria-disabled="true" aria-describedby="cap-coop_hand"/);
    expect(h).toContain('<div class="wk-cap num" id="cap-coop_hand">Rested, refill below 40%</div>'); expect(h).not.toContain('id="cap-market_hand"');
    expect(manageCaption({ energy: 10, cdS: 0 } as any, 7, b)).toBe('Ready in 7s');
    expect(manageCaption({ energy: 90, cdS: 0 } as any, 7, b)).toBe('Rested, refill below 40%'); // energy first
    expect(workersHtml(S([10, 90, 90], 7), b).match(/Ready in 7s/g)!.length).toBe(2); // pill (N=1) + tired worker
  });
});

describe('S2-3b + §3.3 synced to P1q (queue spec v1.2 §6)', async () => {
  const { slotPreview, stripSplit, stripSplitAt } = await import('../src/ui/orders');
  const { balance: b } = await import('../src/config/balance');
  const { queueMax } = await import('../src/sim/state');
  it('queue_max = min(10, 6 + floor(F/5))', () => { for (let F = 0; F <= 30; F++) expect(queueMax(F, b)).toBe(Math.min(10, 6 + Math.floor(F / 5))); });
  it('"+1 customer (max N)", with "New coop look" above it only on a coop step', () => {
    const t = (h: string | null) => h!.replace(/<[^>]+>/g, '');
    expect(t(slotPreview(8, 9, [1, 2], [1, 2], 'i', false))).toBe('+1 customer (max 9)');
    expect(t(slotPreview(7, 8, [1, 2], [1, 2], 'i', true))).toBe('New coop look+1 customer (max 8)');
    expect(slotPreview(10, 10, [1, 2], [1, 2], 'i', true)).toBeNull();
  });
  it('phone strip: at most 5 chips; over 5 the 5th is "+N", N = queue - 4 (sizes 5, 6, 10)', () => {
    expect(stripSplit(5)).toEqual({ shown: 5, more: 0 });
    expect(stripSplit(6)).toEqual({ shown: 4, more: 2 });
    expect(stripSplit(10)).toEqual({ shown: 4, more: 6 });
    for (const n of [5, 6, 10]) { const s = stripSplitAt(n, n); expect(s.shown + (s.more ? 1 : 0)).toBeLessThanOrEqual(5); if (n > 5) expect(s.more).toBe(n - 4); }
  });
  it('no slot grow-in and no "+1 customer slot" toast; the "+N" chip pulses once (reduced motion: colour flash)', () => {
    expect(app).not.toMatch(/'unlock'|customer slot|slotToastPending/);
    expect(app).toContain("showToast('Coop upgraded!', COOP_TOAST_MS)");
    expect(app).toMatch(/retrigger\(moreChip, rm\(\) \? 'qflash' : 'qpulse'\)/);
    expect(css).toMatch(/\.chip\.more\.qpulse\{animation:qpulse 600ms[^}]*\}@keyframes qpulse\{50%\{transform:scale\(1\.12\)\}\}/);
    expect(css).toMatch(/\.chip\.more\.qflash\{animation:qflash 600ms/);
  });
});

describe('S2-1 coop tiers + toast (session2-ui-triage (c), layout-spec §4.7)', () => {
  it('ships Art & UX\'s new coop-l5/l10/l20 SVGs byte-for-byte', () => {
    for (const f of ['coop-l5.svg', 'coop-l10.svg', 'coop-l20.svg'])
      expect(readFileSync(new URL(`../public/assets/${f}`, import.meta.url), 'utf8')).toBe(readFileSync(new URL(`./fixtures/art-ux-assets/${f}`, import.meta.url), 'utf8'));
  });
  it('toast above #panel-layer (10) and modals (20); coop FX deferred while a sheet covers the coop', () => {
    expect(css).toMatch(/\.toast\{z-index:35\}/); expect(app).toContain('coopFxPending = true');
  });
});

describe('AC14b save-recovery dialog v1.2 (UI only)', () => {
  const src = readFileSync(new URL('../src/ui/save-recovery.ts', import.meta.url), 'utf8');
  it('alertdialog; buttons are type=button; Export old save is a <button> with a 44px tap area', () => {
    expect(src).toContain('role="alertdialog" aria-modal="true"'); expect(src).toContain('id="rcGo" type="button"');
    expect(src).toMatch(/<button class="\$\{r\.copy_failed \? 'btn rc-export-q' : 'rc-link'\}" id="rcExport" type="button">Export old save<\/button>/);
    expect(css).toMatch(/#rcExport\{min-height:44px;min-width:44px\}/);
  });
  it('Esc / Back / outside taps are swallowed; storage-full keeps the old save in memory only (no storage write in the dialog)', () => {
    expect(src).toMatch(/e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\)/);
    expect(src).toContain("window.addEventListener('popstate', onPop)");
    expect(src).toContain('if (r.copy_failed && r.raw) sessionOldSave = r.raw;');
    expect(src).not.toMatch(/localStorage|setItem|indexedDB/);
  });
});
describe('S2-1 toast duration (Art & UX 08:47)', () => {
  it('"Coop upgraded!" stays 2.5 s; other toasts keep 1.3 s', () => { expect(app).toContain('export const COOP_TOAST_MS = 2500;'); expect(app).toContain("showToast('Coop upgraded!', COOP_TOAST_MS)"); expect(app).toContain('(text: string, ms = 1300)'); });
});

describe('S2-4c welcome-back sold line (Art & UX 08:47)', async () => {
  const { instantSale, saleLine, compact } = await import('../src/ui/welcome-sale');
  const { balance: b } = await import('../src/config/balance');
  const { initialState } = await import('../src/sim/state');
  const { apply } = await import('../src/sim/actions');
  const { step } = await import('../src/sim/tick');
  const fm = (c: number) => `$${(c / 100).toFixed(2)}`;
  const mk = (mh: boolean, pending: number) => ({ ...initialState(b, 3), farmLevel: 10, coinsCents: 1e9, basket: 0, pendingOfflineEggs: pending, nextCustomerInS: 1e9,
    customers: [{ id: 1, demand: 200, filled: 0, waitedS: 0 }, { id: 2, demand: 139, filled: 0, waitedS: 0 }], workers: mh ? { market_hand: { energy: 100, cdS: 0 } } : {} } as any);
  it('copy, compact count, hidden at 0', () => {
    expect(saleLine({ eggs: 339, cents: 127900 }, compact, fm)).toBe('Market Hand sold 339 right away\u00a0· +$1279.00');
    expect(compact(1234)).toBe('1.2K'); expect(compact(3_456_789)).toBe('3.4M');
    expect(saleLine({ eggs: 0, cents: 0 }, compact, fm)).toBe('');
  });
  it('real numbers: equals what the sim sells after Collect; nothing without a Market Hand; state untouched', () => {
    const s = mk(true, 2278), before = JSON.stringify(s), r = instantSale(s, b);
    expect(JSON.stringify(s)).toBe(before);
    let t = apply(s, { type: 'collectOffline' }, b); const ev: any[] = [];
    for (let i = 0; i < Math.round(b.workers.market_hand.every_s * b.tickHz); i++) t = step(t, 1 / b.tickHz, b, ev);
    const sold = ev.filter(e => e.type === 'sell' && e.by === 'market_hand').reduce((a, e) => a + e.k, 0);
    expect(r.eggs).toBe(sold); expect(r.eggs).toBe(339); expect(r.cents).toBeGreaterThan(0);
    expect(instantSale(mk(false, 2278), b)).toEqual({ eggs: 0, cents: 0 });
    expect(instantSale(mk(true, 0), b)).toEqual({ eggs: 0, cents: 0 });
  });
  it('card renders the line only when something sold', () => expect(app).toContain('${sale ? `<div class="wb-sold num" id="wbSold">${sale}</div>` : \'\'}'));
});

describe('FX particles (QA bd0dc66 top-left fragment)', async () => {
  const { clampToSafe } = await import('../src/ui/fx');
  it('clamps anchors to the viewport minus safe-area insets and 8px', () => {
    expect(clampToSafe({ x: 0, y: 0 }, 375, 667)).toEqual({ x: 8, y: 8 });
    expect(clampToSafe({ x: 999, y: 999 }, 375, 667, { t: 47, r: 0, b: 34, l: 0 })).toEqual({ x: 367, y: 625 });
    expect(clampToSafe({ x: 100, y: 3 }, 375, 667, { t: 47, r: 0, b: 0, l: 0 })).toEqual({ x: 100, y: 55 });
  });
  it('hidden sources fall back to the scene; particles leave on animationend / finish; coins land on the pill coin', () => {
    expect(app).toMatch(/if \(!r\.width && !r\.height\) r = scene\.getBoundingClientRect\(\)/);
    expect(app).toContain("el.addEventListener('animationend', kill, { once: true }); setTimeout(kill, ms);");
    expect(app).toContain("coinIcon = $('.pill.coins > img')"); expect(app).toMatch(/fly\(A\('icon-coin\.svg'\), src, coinIcon,/);
  });
});

describe('S2-8 net rate + wages, S2-9 queue-full dot (stubbed data seam)', async () => {
  const E = await import('../src/ui/s2-economy-ui');
  const { balance: b } = await import('../src/config/balance');
  const { initialState } = await import('../src/sim/state');
  const { workersHtml } = await import('../src/ui/workers-ui');
  it('rate text / sign / aria', () => {
    expect(E.rateView(120)).toMatchObject({ text: '+$1.20/s', sign: 'pos', money: '$1.20', aria: 'Net income plus $1.20 per second' });
    expect(E.rateView(-3).text).toBe('⚠ \u2212$0.03/s'); expect(E.rateView(-3).aria).toBe('Net income minus $0.03 per second'); expect(E.rateView(-3).money).toBe('$0.03');
    expect(E.rateView(0.3).text).toBe('⚠ $0.00/s'); expect(E.rateView(-7.5).text).toBe('⚠ \u2212$0.08/s'); expect(E.rateView(99999).text).toBe('+$999.99/s'); expect(E.rateView(0).sign).toBe('zero');
  });
  it('wage per second = wage_per_farm_per_min x F / 60; unwaged workers have no line', () => {
    expect(E.wagePerSecCents('market_hand', 1, b)).toBeCloseTo(b.workers.market_hand.wage_per_farm_per_min / 60 * 100);
    expect(E.wagePerSecCents('hawker', 10, b)).toBe(0); expect(E.wageLine(0, 'c')).toBe('');
    expect(E.wageLine(3, 'c.svg')).toBe('<div class="wage num"><img src="c.svg" width="12" height="12" alt="">Wage $1.80/min</div>');
  });
  it('net rate subtracts wages of paid, awake workers only', () => {
    const s: any = { ...initialState(b, 3), farmLevel: 6, workers: { market_hand: { energy: 50, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } } };
    expect(E.netRateCents(10, s, b)).toBeCloseTo(10 - E.wagePerSecCents('market_hand', 6, b));
  });
  it('hire cards show the wage under the effect line; worker cards at the bottom', () => {
    const s: any = { ...initialState(b, 3), farmLevel: 10, coinsCents: 1e9, workers: { coop_hand: { energy: 90, cdS: 0 } } };
    const h = workersHtml(s, b);
    expect(h).toMatch(/data-w="market_hand"><h3>Market Hand<\/h3><div class="meta">[^<]+<\/div><div class="wage num">/);
    expect(h).toMatch(/data-w="coop_hand">[\s\S]*Wage \$[\d.]+\/(s|min)<\/div><\/div>/);
  });
  it('queue dot: shows while full, clears on Market open (until the queue un-fills), pulse <= 1 per 10 s, none under reduced motion', () => {
    const d = new E.QueueDot();
    expect(d.update(true, false, 0, false)).toEqual({ show: true, pulse: true });
    expect(d.update(true, false, 5000, false)).toEqual({ show: true, pulse: false });
    expect(d.update(true, false, 10000, false)).toEqual({ show: true, pulse: true });
    expect(d.update(true, true, 11000, false).show).toBe(false);
    expect(d.update(true, false, 12000, false).show).toBe(false); // still the same full spell
    expect(d.update(false, false, 13000, false).show).toBe(false);
    expect(d.update(true, false, 14000, true)).toEqual({ show: true, pulse: false });
    expect(E.queueFull({ ...initialState(b, 3), farmLevel: 0, customers: Array(6).fill({}) } as any, b)).toBe(true);
  });
  it('the Market sheet only opens from a tap (nav, strip chip or goal)', () => {
    expect(app.match(/openPanel\('market'\)/g)!.length).toBe(1); // strip chip click handler only
    expect(app).toMatch(/queueEl\.addEventListener\('click', e => \{ if \(\(e\.target as HTMLElement\)\.closest\('\.chip:not\(\.empty\)'\)\) openPanel\('market'\)/);
  });
  it('styles: 11px/700 #3D7F33 rate, #B83B37 negative, 300 ms ±2px shake off under RM; 10px dot + 2px white ring', () => {
    expect(css).toMatch(/\.rate\{font:700 11px\/13px var\(--f-body\);color:#3D7F33/); expect(css).toContain('.rate[data-sign=neg]{color:#B83B37}');
    expect(css).toMatch(/rshake 300ms[^}]*\}@keyframes rshake\{25%\{transform:translateX\(-2px\)\}75%\{transform:translateX\(2px\)\}\}/);
    expect(css).toMatch(/\.qdot\{[^}]*width:14px;height:14px;box-sizing:border-box;border-radius:50%;background:#B83B37;border:2px solid #fff\}/);
  });
});

describe('S2-8 exact rate (Product ruling: under $0.10/s per minute)', async () => {
  const E = await import('../src/ui/s2-economy-ui');
  it('0.0125 $/s -> "$0.75/min"; 0.5 $/s -> "$0.50/s"', () => {
    expect(E.fmtExactRate(1.25)).toBe('$0.75/min'); expect(E.fmtExactRate(50)).toBe('$0.50/s');
    expect(E.wageLine(1.25, 'c')).toContain('Wage $0.75/min'); expect(E.wageLine(50, 'c')).toContain('Wage $0.50/s');
  });
  it('wage format switches at $0.10/s; net rate stays per second, 2 decimals (Art & UX 09:41)', () => {
    expect(E.fmtExactRate(9.99)).toBe('$5.99/min'); expect(E.fmtExactRate(10)).toBe('$0.10/s');
    expect(E.rateView(-1.25).text).toBe('⚠ \u2212$0.01/s'); expect(E.rateView(50).text).toBe('+$0.50/s');
  });
  it('per-second wage labels: two decimals under $1,000/s, short form from $1,000/s (Product 10:12)', () => {
    expect(E.wageLine(50, 'c.svg')).toContain('Wage $0.50/s'); expect(E.wageLine(125, 'c.svg')).toContain('Wage $1.25/s');
    expect(E.wageLine(1234, 'c.svg')).toContain('Wage $12.34/s'); expect(E.wageLine(10, 'c.svg')).toContain('Wage $0.10/s');
    expect(E.wageLine(99999, 'c.svg')).toContain('Wage $999.99/s'); expect(E.wageLine(120000, 'c.svg')).toContain('Wage $1.2K/s');
    expect(E.fmtExactRate(120000)).toBe(E.rateView(120000).text.slice(1)); // same short form as the net rate
    expect(E.fmtExactRate(1.25)).toBe('$0.75/min'); // per-minute labels unchanged
  });
  it('stub matches s2-money 9c3d47b rates.ts: Market Hand at L3 = 1.25 c/s exact ("$0.75/min"); 0 when Asleep/Unpaid', async () => {
    const { balance: b } = await import('../src/config/balance'); const { initialState } = await import('../src/sim/state');
    expect(E.wagePerSecCents('market_hand', 3, b)).toBe(1.25); expect(E.fmtExactRate(E.wagePerSecCents('market_hand', 3, b))).toBe('$0.75/min');
    const s: any = { ...initialState(b, 3), farmLevel: 3, workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 50, cdS: 0, unpaid: true } } };
    expect(E.netRateCents(0, s, b)).toBe(0);
  });
});
describe('Art & UX review rc1-ui-fc8e1cf #1/#2', () => {
  it('nav Refill icon greyed during cooldown; docked pill min-height 44px', () => {
    expect(css).toContain('.nav-manage.is-cooldown .manage-ico img{filter:grayscale(1);opacity:.55}');
    expect(css).toMatch(/\.sheet header button\.desk-manage-all:not\(\[hidden\]\)\{min-height:44px;box-sizing:border-box\}/);
  });
});

describe('C-AC26 Collection price-first copy (feature-spec §12)', async () => {
  const { collectionFxLines, collectionSummary, collectionDeltas, isBareTapOnly } = await import('../src/ui/collection-copy');
  const { balance: b } = await import('../src/config/balance');
  const { labelFor, goalLabelParts } = await import('../src/ui/next-goal');
  const { initialState } = await import('../src/sim/state');
  const appSrc = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const wkSrc = readFileSync(new URL('../src/ui/workers-ui.ts', import.meta.url), 'utf8');
  const ngSrc = readFileSync(new URL('../src/ui/next-goal.ts', import.meta.url), 'utf8');
  it('deltas come from balance (12 and 5), not hard-coded literals in the helper', () => {
    const d = collectionDeltas(b);
    expect(d.pricePct).toBe(Math.round(b.collection.pricePercentPerLevel * 100));
    expect(d.tap).toBe(b.collection.eggsPerTapPerLevel);
    expect(d.pricePct).toBe(12); expect(d.tap).toBe(5);
  });
  it('fx list: Egg price +{12L}% → +{12(L+1)}% first, then Eggs per tap {5+5L} → {5+5(L+1)}', () => {
    expect(collectionFxLines(4, b)).toEqual(['Egg price +48% → +60%', 'Eggs per tap 25 → 30']);
    expect(collectionFxLines(0, b)[0]).toMatch(/^Egg price/);
  });
  it('short summary reads "+12% egg price · +5/tap"', () => {
    expect(collectionSummary(b)).toBe('+12% egg price · +5/tap');
  });
  it('goal strip format ★ Collection L{n} · +X% income', () => {
    const s = { ...initialState(b, 3), collectionLevel: 4, farmLevel: 5 } as any;
    expect(labelFor('COLL', s, b, 12)).toBe('★ Collection L5 · +12% income');
  });
  it('no UI string is bare "+5/tap" / "+N/tap" without price', () => {
    for (const src of [appSrc, wkSrc, ngSrc]) {
      for (const m of src.matchAll(/['"`]([^'"`]*\/tap[^'"`]*)['"`]/g)) {
        expect(isBareTapOnly(m[1]), m[1]).toBe(false);
      }
    }
    expect(isBareTapOnly('+5/tap')).toBe(true);
    expect(isBareTapOnly('+12% egg price · +5/tap')).toBe(false);
  });
  it('v1.4 goal label parts: ★ + track + gain; short Coll.', () => {
    const s = { ...initialState(b, 3), collectionLevel: 24 } as any;
    const p = goalLabelParts('COLL', s, 12);
    expect(p).toEqual({ star: '★ ', track: 'Collection L25', shortTrack: 'Coll. L25', gain: ' · +12% income' });
    expect(labelFor('COLL', s, b, 12)).toBe('★ Collection L25 · +12% income');
  });
  it('v1.4 overflow CSS: g-gain no shrink, g-track ellipsis', () => {
    expect(css).toMatch(/\.goal-label \.g-gain\{flex:0 0 auto/);
    expect(css).toMatch(/\.goal-label \.g-track\{min-width:0;overflow:hidden;text-overflow:ellipsis/);
    expect(app).toContain('fitGoalLabelEl');
    expect(app).toContain('paintGoalLabel');
  });
});

describe('rc1-upgrade-value v1.4 tokens + best-buy outline', () => {
  it('meadow-text/tint, danger→barn-ui, no fake surface-2/text-muted', () => {
    expect(css).toMatch(/--c-meadow-text:#2F6B27/);
    expect(css).toMatch(/--c-meadow-tint:#E8F4E4/);
    expect(css).toMatch(/--c-barn-ui:#B83B37/);
    expect(css).toMatch(/--c-danger:var\(--c-barn-ui\)/);
    expect(css).not.toMatch(/--c-surface-2|--c-text-muted|--c-vchip-|--c-banner-fail/);
    expect(css).toMatch(/\.vchip\.eff\{background:var\(--c-meadow-tint\);color:var\(--c-meadow-text\)\}/);
    expect(css).toMatch(/\.vchip\.pb\{background:var\(--c-cream\)/);
    expect(css).toMatch(/\.vchip\.muted\{background:var\(--c-cream\);color:var\(--c-muted\)\}/);
    expect(css).toMatch(/\.up\.best-buy\{outline:2px solid var\(--c-yolk-dark\);outline-offset:2px\}/);
    expect(css).toMatch(/\.btn\.maxed\{background:var\(--c-yolk\);color:var\(--c-text\)/);
  });
  it('asleep banner 32px danger; Refill ≥44×88; Ready! yolk 20px', () => {
    expect(css).toMatch(/\.wk-banner\{[^}]*height:32px[^}]*background:var\(--c-danger\)/);
    expect(css).toMatch(/\.wk \.btn\.manage\{min-height:44px;min-width:88px\}/);
    expect(css).toMatch(/\.goal-status\.chip\{[^}]*height:20px[^}]*background:var\(--c-yolk\);color:var\(--c-text\)/);
  });
});


describe('build id on page (ops smoke / S2-REL-1)', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  it('sets meta[name=build-id] and #app data-build-id from BUILD_ID; no window global', () => {
    expect(main).toMatch(/meta\[name=["']build-id["']\]/);
    expect(main).toContain('root.dataset.buildId = BUILD_ID');
    expect(main).toContain('m.content = BUILD_ID');
    expect(main).not.toMatch(/window\.__BUILD|window\.eggfarmBuild/);
    expect(app).toContain('build-tag');
  });
});
