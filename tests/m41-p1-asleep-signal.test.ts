// M4.1 patch 1 (S2 bug D-HOP-2026-10-24-11): the rc1 asleep-state signal (product/workers/rc1-asleep-state-spec.md AC-R1-R9, QA PASS
// @8a49d35) ported onto the release line. Tests are the asleep subset of rc1 7380b86 tests/rc1-ui.test.ts, tests/review-5d8a058.test.ts
// and tests/income-bestbuy.test.ts (goal-strip, order-card, welcome-back, wage-line and queue-dot cases left out with their code).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { mood } from '../src/sim/workers';
import { incomePerSec, asleepOrUnpaidCount, productionStopped, collectPerSec, salesStopped, grossSalesPerSec } from '../src/econ/income';
import { rateView, headerRate, headerRateText } from '../src/ui/s2-economy-ui';
import { workerBanner, workerBannerText, workersHtml, manageAllHtml, manageCaption, farmManageAllVisible, navManageView, BANNER_ICON } from '../src/ui/workers-ui';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
const st = (o: Record<string, unknown> = {}): any => ({ ...initialState(b, 1), ...o });

describe('AC-R1 / AC-R5 asleep count (badge source) + AC-R2 / AC-R4 live income', () => {
  it('asleep Coop Hand drops collect/s; badge counts; productionStopped', () => {
    const awake = st({ farmLevel: 10, collectionLevel: 8, workers: { coop_hand: { energy: 100, cdS: 0 } } });
    const asleep = st({ farmLevel: 10, collectionLevel: 8, workers: { coop_hand: { energy: 0, cdS: 0 } } });
    expect(collectPerSec(awake, b)).toBeGreaterThan(collectPerSec(asleep, b));
    expect(productionStopped(asleep, b)).toBe(true); expect(asleepOrUnpaidCount(asleep, b)).toBe(1);
    const two = st({ farmLevel: 10, workers: { coop_hand: { energy: 0, cdS: 0 }, market_hand: { energy: 40, cdS: 0, unpaid: true } } });
    expect(asleepOrUnpaidCount(two, b)).toBe(2); // AC-R5: 2+ asleep/unpaid -> correct count
    expect(asleepOrUnpaidCount({ ...two, workers: { coop_hand: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } } }, b)).toBe(0); // after Refill/resume
  });
  it('AC-R4: asleep Grader keeps asleep_bonus_share of its bonus', () => {
    const base = st({ farmLevel: 18, collectionLevel: 10, graderTier: 1, workers: { grader: { energy: 100, cdS: 0 } } });
    const asleep = { ...base, workers: { grader: { energy: 0, cdS: 0 } } };
    const none = st({ farmLevel: 18, collectionLevel: 10, graderTier: 0, workers: {} });
    expect(incomePerSec(asleep, b)).toBeGreaterThan(incomePerSec(none, b)); expect(incomePerSec(asleep, b)).toBeLessThan(incomePerSec(base, b));
  });
});

describe('S2-8 / AC-R2 HUD rate (T6: text === aria money)', () => {
  it('rate text / sign / aria', () => {
    expect(rateView(120)).toMatchObject({ text: '+$1.20/s', sign: 'pos', money: '$1.20', aria: 'Net income plus $1.20 per second' });
    expect(rateView(-3).text).toBe('⚠ \u2212$0.03/s'); expect(rateView(-3).aria).toBe('Net income minus $0.03 per second'); expect(rateView(-3).money).toBe('$0.03');
    expect(rateView(0.3).text).toBe('⚠ $0.00/s'); expect(rateView(-7.5).text).toBe('⚠ \u2212$0.08/s'); expect(rateView(99999).text).toBe('+$999.99/s'); expect(rateView(0).sign).toBe('neg');
  });
  it('rateView text and aria share the same money token', () => {
    for (const cps of [13461, 3461, 0, -7, 120000, 99999]) {
      const v = rateView(cps); expect(v.aria).toContain(v.money);
      expect(v.text.replace('⚠ ', '').replace('\u2212', '').replace('+', '')).toBe(`${v.money}/s`);
    }
    const pos = rateView(13461, { stopped: true }); expect(pos.sign).toBe('pos'); expect(pos.money).toBe('$134.61');
    const z = rateView(0, { stopped: true }); expect(z.sign).toBe('neg'); expect(z.aria).toBe('Net income $0.00 per second, sales stopped');
    expect(rateView(-25, { stopped: true }).aria).toBe('Net income minus $0.25 per second, sales stopped'); expect(rateView(0).aria).toBe('Net income $0.00 per second');
  });
  it('M41-9 big rates use the shared short form (never "$1000.0M"); Qa+ spelled in aria', () => {
    expect(rateView(1e5).text).toBe('+$1K/s'); expect(rateView(123_456_789_00).text).toBe('+$123.5M/s'); expect(rateView(1e11).text).toBe('+$1B/s');
    const qa = rateView(1.2e17); expect(qa.text).toBe('+$1.2Qa/s'); expect(qa.aria).toBe('Net income plus $1.2 quadrillion per second');
    expect(rateView(-1.2e17).text).toBe('⚠ \u2212$1.2Qa/s');
  });
  it('HUD neg rate keeps ⚠ and adds ▼ (asleep $0 → ⚠ ▼ $0.00/s)', () => {
    expect(headerRateText(rateView(0, { stopped: true }))).toBe('⚠ ▼ $0.00/s'); expect(headerRateText(rateView(-3))).toBe('⚠ ▼ \u2212$0.03/s');
  });
  it('#5: a sub-cent positive rate is $0.00 but not red; <= 0 is red', () => {
    expect(rateView(0.3).sign).toBe('zero'); expect(rateView(0).sign).toBe('neg'); expect(rateView(-0.3).sign).toBe('neg');
  });
  it('styles: 11px/700 #3D7F33 rate, #B83B37 negative, 300 ms ±2px shake off under RM; markup has #rate under #coins', () => {
    expect(css).toMatch(/\.rate\{font:700 11px\/13px var\(--f-body\);color:#3D7F33/); expect(css).toContain('.rate[data-sign=neg]{color:#B83B37}');
    expect(css).toMatch(/rshake 300ms[^}]*\}@keyframes rshake\{25%\{transform:translateX\(-2px\)\}75%\{transform:translateX\(2px\)\}\}/);
    expect(app).toContain('<span class="coins-col"><span class="num" id="coins"></span><span class="rate num" id="rate" role="status"');
  });
});

describe('PM Workers ruling (a) + art-ux §6 banners; review 23a3798 #3 #4 #5', () => {
  const ws = (o: any) => ({ market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, ...o });
  const S = (workers: any) => st({ farmLevel: 30, collectionLevel: 20, coinsCents: 1e9, celebratedTier: 3, graderTier: 1, workers });
  const noSales = { ...b, farm: { ...(b as any).farm, customerIntervalBaseS: 1e12, customerIntervalMinS: 1e12, demandLoFactor: 1e-20, demandHiFactor: 1e-20 } } as any; // ~no customers: gross sales $0.00
  it('asleep Hawker and asleep Grader: headerRate (the app wiring) is > 0, not red, no "stopped"', () => {
    const s = S(ws({ hawker: { energy: 0, cdS: 0 }, grader: { energy: 0, cdS: 0 } }));
    expect(mood(s.workers.hawker, b)).toBe('asleep'); expect(mood(s.workers.grader, b)).toBe('asleep');
    const v = headerRate(s, b); expect(v.sign).toBe('pos'); expect(headerRateText(v)).not.toMatch(/⚠|▼/); expect(v.aria).not.toMatch(/stopped/);
    expect(workerBanner('hawker', 'asleep', s, b)).toMatchObject({ text: 'Hawker asleep: sales slowed', short: 'Asleep: sales slowed', aria: 'Hawker is asleep. Sales are slowed.', icon: 'icon-moon.svg' });
    const pct = Math.round(b.workers.grader.asleep_bonus_share * 100);
    expect(workerBanner('grader', 'asleep', s, b)).toMatchObject({ text: `Grader asleep: bonus down to ${pct}%`, aria: `Grader is asleep. Bonus down to ${pct} percent.` });
    const html = workersHtml(s, b), bans = html.match(/<div class="wk-banner[^]*?<\/div>/g) ?? []; expect(bans.length).toBe(2); for (const x of bans) expect(x).not.toMatch(/production stopped|💤|⚠/); expect(html).toContain('icon-moon.svg');
  });
  it('§6 copy (spec v1.0.6, AC-R1c): Coop Hand "collecting stopped"; unpaid uses its own row with the warning icon', () => {
    const s = S(ws({ coop_hand: { energy: 0, cdS: 0 } })); expect(salesStopped(s, b)).toBe(false);
    expect(workerBanner('coop_hand', 'asleep', s, b)).toMatchObject({ text: 'Coop Hand asleep: collecting stopped', short: 'Asleep: collecting stopped', aria: 'Coop Hand is asleep. Auto-collecting has stopped.', icon: 'icon-moon.svg' });
    const u = S(ws({ coop_hand: { energy: 50, cdS: 0, unpaid: true } }));
    expect(workerBanner('coop_hand', 'unpaid', u, b)).toMatchObject({ text: 'Coop Hand unpaid: collecting stopped', short: 'Unpaid: collecting stopped', aria: 'Coop Hand is unpaid. Auto-collecting has stopped.', icon: 'icon-warning.svg' });
  });
  it('HoE Oct 24: each banner effect comes ONLY from its own role/state, never from the global salesStopped()', () => {
    const s = st({ farmLevel: 1, coinsCents: 0, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } } });
    expect(salesStopped(s, noSales)).toBe(true); // gross sales $0.00 (no customers) ...
    expect(workerBanner('coop_hand', 'asleep', s, noSales)!.text).toBe('Coop Hand asleep: collecting stopped'); // ... but the Coop Hand keeps its own copy
    const hv = headerRate(s, noSales); expect(hv.sign).toBe('neg'); expect(hv.aria).not.toMatch(/stopped/); // the Market Hand is working: no HUD reason
    const h = st({ farmLevel: 30, coinsCents: 0, workers: { market_hand: { energy: 0, cdS: 0 }, hawker: { energy: 0, cdS: 0 }, grader: { energy: 0, cdS: 0 } }, graderTier: 1 });
    expect(salesStopped(h, b)).toBe(true);
    expect(workerBanner('hawker', 'asleep', h, b)!.text).toBe('Hawker asleep: sales slowed');
    expect(workerBanner('grader', 'asleep', h, b)!.text).toMatch(/^Grader asleep: bonus down to \d+%$/);
    for (const x of workersHtml(h, b).match(/<div class="wk-banner[^]*?<\/div>/g) ?? []) expect(x).not.toMatch(/production stopped|Production is stopped/);
  });
  it('Market Hand asleep + Coop Hand unpaid: each banner its own copy; HUD aria ", sales stopped"', () => {
    const s = S({ market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 50, cdS: 0, unpaid: true } });
    expect(workerBanner('market_hand', 'asleep', s, b)).toMatchObject({ text: 'Market Hand asleep: sales stopped', aria: 'Market Hand is asleep. Auto-sales have stopped.' });
    expect(workerBanner('coop_hand', 'unpaid', s, b)).toMatchObject({ text: 'Coop Hand unpaid: collecting stopped', aria: 'Coop Hand is unpaid. Auto-collecting has stopped.' });
    const html = workersHtml(s, b);
    expect(html).toContain('data-full="Market Hand asleep: sales stopped"'); expect(html).toContain('data-full="Coop Hand unpaid: collecting stopped"');
    const v = headerRate(s, b); expect(v.sign).toBe('neg'); expect(v.aria).toMatch(/^Net income (minus \$[\d.,]+ |\$0\.00 )per second, sales stopped$/);
    expect(headerRateText(v)).toMatch(/^⚠ ▼ /);
    const u = S({ market_hand: { energy: 60, cdS: 0, unpaid: true }, coop_hand: { energy: 90, cdS: 0 } }); // Market Hand unpaid alone
    expect(headerRate(u, b).aria).toMatch(/, sales stopped$/);
  });
  it('only the Coop Hand off (Market Hand working): no "sales stopped" anywhere; the rate stays the real figure', () => {
    for (const ch of [{ energy: 0, cdS: 0 }, { energy: 50, cdS: 0, unpaid: true }]) {
      const s = S({ market_hand: { energy: 100, cdS: 0 }, coop_hand: ch });
      const v = headerRate(s, b); expect(v.aria).not.toMatch(/stopped/); expect(v.sign).toBe('pos');
      const html = workersHtml(s, b); expect(html).not.toMatch(/sales stopped|production stopped/); expect(html).toMatch(/Coop Hand (asleep|unpaid): collecting stopped/);
    }
  });
  it('review #8: copy numbers come from balance', () => {
    const b2 = { ...b, workers: { ...b.workers, energy: { ...b.workers.energy, manage_prompt_threshold: 0.5 }, grader: { ...b.workers.grader, asleep_bonus_share: 0.2 } } } as any;
    expect(manageCaption({ energy: 90, cdS: 0 } as any, 0, b2)).toBe('Rested, refill below 50%');
    expect(workerBannerText('grader', 'asleep', S(ws({})), b2)).toContain('20%');
  });
  it('AC-R1 card: banner first, greyed body, Refill stays visible; aria carries the role; icon 14px aria-hidden', () => {
    const h = workersHtml(S(ws({ coop_hand: { energy: 0, cdS: 0 } })), b);
    expect(h).toMatch(/<div class="wk asleep is-off" data-w="coop_hand"><div class="wk-banner asleep" role="status"><img class="wb-ico" src="[^"]*icon-moon\.svg" width="14" height="14" alt="" aria-hidden="true">/);
    expect(h).toContain('<span class="sr">Coop Hand is asleep. Auto-collecting has stopped.</span>');
    expect(h).toMatch(/data-w="coop_hand"[^]*?<div class="wk-refill"><button class="btn secondary manage" aria-label="Refill Coop Hand"/);
    expect(workersHtml(S(ws({})), b)).not.toContain('wk-banner'); // AC-R5: cleared after Refill / resume
  });
});

describe('S2-5 nav labels + AC-R9 / AC-R8 Refill copy', () => {
  const P = { text: '', at: -Infinity };
  const S = (e: number[], cd = 0): any => ({ ...initialState(b, 3), farmLevel: 10, manageCdS: cd, graderTier: 1,
    workers: Object.fromEntries((['market_hand', 'coop_hand', 'hawker', 'grader'] as const).slice(0, e.length).map((id, i) => [id, { energy: e[i], cdS: 0 }])) });
  const T = Math.round(b.workers.energy.manage_prompt_threshold * 100);
  it('every nav button has an icon, a visible .nav-lbl and an aria-label', () => {
    const navHtml = app.slice(app.indexOf('<nav class="actions"'), app.indexOf('</nav>'));
    const btns = navHtml.split('<button').slice(1);
    expect(btns).toHaveLength(4);
    for (const x of btns) { expect(x).toMatch(/aria-label="[^"]+"/); expect(x).toMatch(/<img /); expect(x).toMatch(/class="nav-lbl[^"]*">[^<]+</); }
  });
  it('ready: "Refill" + N badge; aria "Refill N tired workers"', () => {
    expect(navManageView(2, 0, false, P, 0)).toEqual({ hideLabel: false, label: 'Refill', badge: '2', aria: { text: 'Refill 2 tired workers', at: 0 } });
    expect(navManageView(2, 0, true, P, 0).label).toBe('Refill 2 tired workers');
  });
  it('cooldown: "0:28" visual-only (aria-hidden), stable name for the whole cooldown (review 23a3798 #1)', () => {
    const a = navManageView(1, 27.4, false, P, 1000); expect(a.label).toBe('0:28'); expect(a.badge).toBe(''); expect(a.hideLabel).toBe(true);
    expect(a.aria.text).toBe('Refill, cooling down');
    for (const [cd, t] of [[25.1, 3000], [22.9, 6100], [1.2, 27000]]) { const v = navManageView(1, cd, false, a.aria, t); expect(v.aria).toBe(a.aria); expect(v.hideLabel).toBe(true); }
    const d = navManageView(1, 27.4, true, P, 1000); expect(d.label).toBe('Ready in 28s'); expect(d.hideLabel).toBe(true); expect(d.aria.text).toBe('Refill, cooling down');
    expect(navManageView(2, 0, false, a.aria, 30000)).toMatchObject({ hideLabel: false, aria: { text: 'Refill 2 tired workers' } });
  });
  it('AC-R9: "Refill N tired workers", N = workers at <= threshold; hidden at N=0', () => {
    const h = manageAllHtml(S([T, T + 1, 10]), b); expect(h).toContain('Refill 2 tired workers'); expect(h).toContain('aria-label="Refill 2 tired workers"'); expect(h).not.toMatch(/Manage all|need it|All rested|1 tired workers|Refill tired \(/);
    expect(manageAllHtml(S([T, T + 1, 90]), b)).toContain('Refill 1 tired worker');
  });
  it('AC-R9 (D-HOP-2026-10-17-05, main): shown only with >= 3 hired and N>=1; hidden at N=0 (including during cooldown)', () => {
    expect(manageAllHtml(S([10, 10]), b)).toBe(''); expect(farmManageAllVisible(S([10, 10]), b, false)).toBe(false);
    expect(manageAllHtml(S([90, 90, 90]), b)).toBe(''); expect(manageAllHtml(S([90, 90, 90], 12.2), b)).toBe('');
    const cd = manageAllHtml(S([10, 90, 90], 12.2), b);
    expect(cd).toMatch(/is-cooldown" data-act="manageAll" aria-disabled="true"/); expect(cd).toContain('ring-cooldown'); expect(cd).toContain('Ready in 13s'); expect(cd).toContain('Refill 1 tired worker');
  });
  it('AC-R8: greyed caption "Rested, refill below N%" / "Ready in Ns"; energy reason wins when both', () => {
    const h = workersHtml(S([T, T + 1, 90]), b);
    expect(h).toMatch(/data-w="market_hand" aria-disabled="false"/); expect(h).toMatch(/data-w="coop_hand" aria-disabled="true" aria-describedby="cap-coop_hand"/);
    expect(h).toContain(`<div class="wk-cap num" id="cap-coop_hand">Rested, refill below ${T}%</div>`); expect(h).not.toContain('id="cap-market_hand"');
    expect(manageCaption({ energy: 10, cdS: 0 } as any, 7, b)).toBe('Ready in 7s');
    expect(manageCaption({ energy: 90, cdS: 0 } as any, 7, b)).toBe(`Rested, refill below ${T}%`);
    expect(workersHtml(S([10, 90, 90], 7), b).match(/Ready in 7s/g)!.length).toBe(2);
  });
  it('AC-R6: no player-facing "Manage" string in the UI sources (coach, buttons, nav)', () => {
    for (const f of ['app.ts', 'workers-ui.ts', 'onboarding.ts', 'next-goal.ts']) {
      const src = readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
        .replace(/\/\*[^]*?\*\//g, '').replace(/\/\/[^\n'"`]*$/gm, '');
      expect(src, f).not.toMatch(/['"`>][^'"`<]*\bManage\b[^'"`<]*['"`<]/);
    }
  });
});

describe('Art: asleep visuals (v1.4 §7, FIX1, rc1-ui-fc8e1cf)', () => {
  it('asleep banner 32px danger; Refill >= 44x88; danger token', () => {
    expect(css).toMatch(/--c-danger:var\(--c-barn-ui\)/);
    expect(css).toMatch(/\.wk-banner\{[^}]*height:32px[^}]*background:var\(--c-danger\);color:#fff;font:700 12px\/16px var\(--f-body\)[^}]*white-space:nowrap/);
    expect(css).toMatch(/\.wk \.btn\.manage\{min-height:44px;min-width:88px\}/);
  });
  it('asleep badge anchors top-right (-6,-6) on Workers tab and Upgrades nav', () => {
    expect(css).toMatch(/\.asleep-badge\{position:absolute;top:-6px;right:-6px/);
    expect(css).toMatch(/\.tabs \[data-tab=workers\]\{position:relative\}/); expect(css).toMatch(/nav \[data-nav=upgrades\]\{position:relative\}/);
  });
  it('nav Refill icon greyed during cooldown; docked pill min-height 44px', () => {
    expect(css).toContain('.nav-manage.is-cooldown .manage-ico img{filter:grayscale(1);opacity:.55}');
    expect(css).toMatch(/\.sheet header button\.desk-manage-all:not\(\[hidden\]\)\{min-height:44px;box-sizing:border-box\}/);
  });
  it('Art ruling (A): banner icons are named in one place and are byte-identical to rc1 8a49d35', () => {
    expect(BANNER_ICON).toEqual({ asleep: 'icon-moon.svg', unpaid: 'icon-warning.svg' });
    // sha256 of `git show 8a49d35:public/assets/<file>` (pinned; the git cross-check below runs when the commit is reachable)
    const PIN = { 'icon-moon.svg': '9bbd988c7e0b6de7000d25f6b8f9b76afcfce5c9cb2883a6cdf9342e057db5d8', 'icon-warning.svg': '51bf9e2b9c6a8958dc45aede3eac826acd6c8c3b10f6629fbf4c7e02bb6b6b90' } as Record<string, string>;
    for (const f of Object.keys(PIN)) {
      const head = createHash('sha256').update(readFileSync(new URL(`../public/assets/${f}`, import.meta.url))).digest('hex');
      expect(head, f).toBe(PIN[f]);
      let rc1: Buffer | null = null; try { rc1 = execFileSync('git', ['show', `8a49d35:public/assets/${f}`], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* shallow clone: pin only */ }
      if (rc1) expect(createHash('sha256').update(rc1).digest('hex'), `${f} vs 8a49d35`).toBe(head);
    }
  });
});
