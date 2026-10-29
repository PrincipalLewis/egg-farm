// v5 / M4.1 patch 2 (engineering/m4.1-p2-scope.md f0524447): Art package acfe36a7 minors (m8, m9, m5, m6, m1, m10) as CSS / markup checks.
// Browser-measured ACs (rects, contrast, animations) live in scripts/m41-p2-browser.mjs; these pin the source rules.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { workersHtml, WARN_SVG, MOON_SVG } from '../src/ui/workers-ui';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const wui = readFileSync(new URL('../src/ui/workers-ui.ts', import.meta.url), 'utf8');
const st = (o: Record<string, unknown> = {}): any => ({ ...initialState(b, 1), ...o });
const rule = (sel: string, last = false) => { const i = last ? css.lastIndexOf(`${sel}{`) : css.indexOf(`${sel}{`); expect(i, sel).toBeGreaterThanOrEqual(0); return css.slice(i + sel.length + 1, css.indexOf('}', i)); };
const sha1 = (t: string) => createHash('sha1').update(t).digest('hex');
// art-ux/assets/*.svg bytes: the inline constants minus the 3 injected attributes must hash to the signed asset sha1
// (icon-warn.svg is one line with no trailing LF; icon-moon-ink.svg ends with one LF).
const asset = (svg: string, cls: string, eol = '') => svg.replace(` class="${cls}" aria-hidden="true" focusable="false"`, '') + eol;

describe('m8 .cooptip (UI-M8-1)', () => {
  it('valid font shorthand 700 14px/1.3 var(--f-body), width max-content, max-width min(320px, 100vw - 32px), radius 12 kept', () => {
    const r = rule('.cooptip');
    expect(r).toContain('font:700 14px/1.3 var(--f-body)'); expect(r).not.toMatch(/inherit/);
    expect(r).toContain('width:max-content'); expect(r).toContain('max-width:min(320px,calc(100vw - 32px))'); expect(r).toContain('border-radius:12px');
    expect(r).not.toMatch(/text-wrap/); // Q-M8-2
  });
});

describe('m9 asleep/unpaid card undim (UI-M9-1/2/6 source rules)', () => {
  it('only .ebar dims on an .is-off card; no .wk-body opacity rule; unpaid word var(--c-danger)', () => {
    expect(css).not.toMatch(/\.wk\.is-off \.wk-body\{opacity/);
    expect(rule('.wk.is-off .wk-body>.ebar')).toBe('opacity:.5');
    expect(rule('.wk.unpaid .st')).toBe('color:var(--c-danger)'); expect(css).not.toMatch(/\.wk\.unpaid \.st\{color:#c55/);
    expect(rule('.wk.is-off .wk-banner,.wk.is-off .wk-refill')).toBe('opacity:1'); // banner + Refill stay at 1
  });
});

describe('m5 card state word: text + inline SVG, no pictograph (UI-M5-1..8, UI-WARN-1..3)', () => {
  const W = (e: number, unpaid = false) => ({ energy: e, cdS: 0, ...(unpaid ? { unpaid: true } : {}) });
  const card = (mood: 'working' | 'tired' | 'asleep' | 'unpaid') => {
    const w = mood === 'working' ? W(90) : mood === 'tired' ? W(20) : mood === 'asleep' ? W(0) : W(60, true);
    const s = st({ farmLevel: 10, coinsCents: 0, workers: { coop_hand: w } });
    const m = workersHtml(s, b).match(/<div class="wk [^"]*" data-w="coop_hand">[\s\S]*?<span class="st">([\s\S]*?)<\/span><\/h3>/);
    expect(m, mood).not.toBeNull(); return m![1];
  };
  it('UI-M5-8 (Engineering ask): each mood renders exactly Working/Tired/Asleep/Unpaid with no \\p{Extended_Pictographic} or U+26A0', () => {
    const want = { working: 'Working', tired: 'Tired', asleep: 'Asleep', unpaid: 'Unpaid' } as const;
    for (const [mood, word] of Object.entries(want)) {
      const stHtml = card(mood as keyof typeof want), text = stHtml.replace(/<svg[\s\S]*?<\/svg>/g, '');
      expect(text, mood).toBe(word); expect(text).not.toMatch(/\p{Extended_Pictographic}|\u26A0/u);
      if (mood === 'asleep') { expect(stHtml).toContain('class="wi wi-moon"'); expect(stHtml).toBe(`Asleep${MOON_SVG}`); }
      else if (mood === 'unpaid') { expect(stHtml).toContain('class="wi"'); expect(stHtml).toContain('d="M7 1.6 12.8 12.4H1.2z"'); expect(stHtml).toBe(`Unpaid${WARN_SVG}`); }
      else expect(stHtml).not.toContain('<svg'); // working/tired: no .wi
    }
  });
  it('UI-M5-1 grep: no U+1F4A4 or U+26A0 left in workers-ui.ts', () => { expect(wui).not.toMatch(/\u{1F4A4}|\u26A0/u); });
  it('UI-WARN-2 / UI-M5-2: icons are the signed assets (sha1), aria-hidden, focusable=false, no other hex than #3E2C23', () => {
    expect(sha1(asset(WARN_SVG, 'wi'))).toBe('317a077ab6e8d7e87bd908a31103a98b3b3b6496'); // art-ux/assets/icon-warn.svg
    expect(sha1(asset(MOON_SVG, 'wi wi-moon', '\n'))).toBe('62b26e80fd15d7fe3cda62b189660800956c4a3d'); // art-ux/assets/icon-moon-ink.svg
    for (const svg of [WARN_SVG, MOON_SVG]) { expect(svg).toMatch(/^<svg class="wi[^"]*" aria-hidden="true" focusable="false" /); expect(new Set(svg.match(/#[0-9A-Fa-f]{3,6}\b/g) ?? [])).toEqual(new Set(svg === WARN_SVG ? ['#3E2C23'] : [])); }
  });
  it('UI-WARN-4 / UI-M5-4/5 CSS: 14px, -2px, 4px gap, white fill; the moon takes the .st ink (color:inherit, load-bearing)', () => {
    expect(rule('.wk .st .wi')).toBe('display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-left:4px;color:#fff');
    expect(rule('.wk .st .wi.wi-moon')).toBe('color:inherit');
  });
  it('UI-M5-6 / Q-WARN-1: banners keep the pinned <img> icons (icon-moon.svg / icon-warning.svg)', () => {
    const s = st({ farmLevel: 10, workers: { coop_hand: W(0), market_hand: W(60, true) } }), h = workersHtml(s, b);
    expect(h).toContain('icon-moon.svg'); expect(h).toContain('icon-warning.svg'); expect(h).not.toMatch(/wk-banner[^>]*>\s*<svg/);
  });
});

describe('m6 HUD rate CSS (UI-M6-2/6/7)', () => {
  const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8'), eco = readFileSync(new URL('../src/ui/s2-economy-ui.ts', import.meta.url), 'utf8');
  it('11px icon at -1.5px, 2px gap, white fill; hidden without .warn; no U+FE0E route; the model strings keep the ⚠ marker (option A)', () => {
    expect(rule('.rate .wi')).toBe('display:inline-block;width:11px;height:11px;vertical-align:-1.5px;margin-right:2px;color:#fff');
    expect(rule('.rate:not(.warn) .wi')).toBe('display:none');
    expect(app + eco).not.toMatch(/\uFE0E|\\uFE0E/);
    expect(eco).toContain('`⚠ ${money}/s`'); expect(eco).toContain('`⚠ \\u2212${money}/s`'); expect(eco).toContain('`⚠ ▼ ${');
    expect(app).toContain('${WARN_SVG}<span class="tri" aria-hidden="true"></span><span class="rt">$0/s</span>');
  });
});

describe('m1 yard reduced motion (UI-M1-9 source rules; bob/popin unchanged, UI-M1-4)', () => {
  it('media + .rm rules right after the .hen.pop rule; bob 1.6s infinite and popin 300ms x1 unchanged', () => {
    expect(css).toContain('.hen.pop{animation:popin 300ms var(--ease-pop),bob 1.6s ease-in-out infinite}@keyframes popin{from{scale:0}}\n/* m1');
    expect(css).toContain('@media (prefers-reduced-motion:reduce){.yard .hen,.yard .hen.pop{animation:none}}');
    expect(css).toContain('.rm .yard .hen,.rm .yard .hen.pop{animation:none}');
    expect(css).toContain('.hen{width:min(15cqw,48px);width:48px;animation:bob 1.6s ease-in-out infinite}');
  });
});

describe('m10 disabled Buy text >= 4.5:1 via --c-muted-strong (UI-M10-1/2/8/9, CSS only)', () => {
  const lum = (hex: string) => { const c = hex.match(/[0-9a-f]{2}/gi)!.map(h => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a: string, c: string) => { const [x, y] = [lum(a), lum(c)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  it('token defined exactly once, in the first :root colour row next to --c-muted, = #5A4C42', () => {
    expect(css.match(/--c-muted-strong:/g)!.length).toBe(1);
    const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
    expect(root).toContain('--c-muted:#6B5D52;--c-muted-strong:#5A4C42;');
  });
  it('shared :39 rule and PT1-14 both use var(--c-muted-strong); cursor:not-allowed; no #5A4C42 literal in either', () => {
    expect(rule('.btn[aria-disabled=true]')).toBe('background:var(--c-disabled);color:var(--c-muted-strong);box-shadow:none;animation:none;cursor:not-allowed');
    expect(rule('.btn.manage-all[aria-disabled=true],nav.actions button.btn.farm-manage-all[aria-disabled=true],.sheet header button.btn.desk-manage-all[aria-disabled=true]', true)).toBe('color:var(--c-muted-strong);background:#CFC6BA'); // PT1-14 (the later rule; :218 keeps its own grey and is overridden)
  });
  it('contrast: #5A4C42 on #CFC6BA >= 4.5 (4.88); old #6B5D52 was 3.76', () => {
    expect(ratio('5A4C42', 'CFC6BA')).toBeGreaterThanOrEqual(4.5); expect(ratio('5A4C42', 'CFC6BA')).toBeCloseTo(4.88, 1); expect(ratio('6B5D52', 'CFC6BA')).toBeCloseTo(3.76, 1);
  });
  it('Buy stays aria-disabled, never native disabled (UI-M10-5)', () => {
    const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    expect(app).toMatch(/class="btn buy \$\{can \? 'affordable' : ''\}"[^>]*aria-disabled="\$\{!can\}"/); expect(app).not.toMatch(/<button class="btn buy[^>]* disabled[ >=]/);
  });
});

describe('CCR #70 nits (n1 income.ts comment + test-only marks, n2 workerBanner without GameState)', () => {
  const inc = readFileSync(new URL('../src/econ/income.ts', import.meta.url), 'utf8');
  it('n1: grossSalesPerSec / salesStopped are marked TEST-ONLY and the stale "Used by the header aria and the worker banners" is gone', () => {
    expect(inc).not.toContain('Used by the header aria and the worker banners');
    expect(inc).toMatch(/TEST-ONLY[^\n]*\n?[^\n]*\nexport const grossSalesPerSec/); expect(inc).toMatch(/TEST-ONLY[\s\S]{0,400}\nexport const salesStopped/);
  });
  it('n2: workerBanner / workerBannerText take no GameState', () => {
    expect(wui).toMatch(/export function workerBanner\(id: WorkerId, m: string \| null, b: Balance, copy/);
    expect(wui).toMatch(/export const workerBannerText = \(id: WorkerId, m: string \| null, b: Balance\)/);
  });
});

describe('Art nit n1 on #70: refund pop never covers #rate (geometry; per-frame overlap is measured in scripts/m41-p2-browser.mjs)', () => {
  it('exppop rises REFUND_RISE_PX (8) at most; the start line leaves the 1.1x box (<= POP_BOX_H) >= 4px below the pill/#rate; coins end on that line', async () => {
    const { REFUND_RISE_PX, POP_BOX_H } = await import('../src/ui/tracks-explainer');
    const kf = css.slice(css.indexOf('@keyframes exppop{'), css.indexOf('}}', css.indexOf('@keyframes exppop{')) + 2);
    const rises = [...kf.matchAll(/calc\(-100% - (\d+)px\)/g)].map(m => +m[1]);
    expect(Math.max(...rises)).toBe(REFUND_RISE_PX); expect(kf).not.toContain('32px');
    expect(POP_BOX_H).toBeGreaterThanOrEqual(Math.ceil(31 * 1.1)); // 26px Fredoka 700 line box (≈31) at the 1.1 overshoot
    expect(css).toContain('transform:translate(var(--dx,14px),var(--dy,-40px)) rotate(180deg)');
  });
});

describe('WCAG 2.4.11 port from rc1 7380b86 (source; keyboard sweep at 360/390/1280 x 3 engines in scripts/m41-p2-browser.mjs)', () => {
  const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  it('--refill-bar-h = measured sticky bar + 8px (0 without), re-measured on resize/dock; cards and their focusables use it as scroll-margin-top', () => {
    expect(app).toContain("const hv = rb ? `${Math.ceil(rb.getBoundingClientRect().height) + 8}px` : '0px'");
    expect(app).toContain("addEventListener('resize', mark); docked.addEventListener?.('change', mark);");
    expect(rule('#uRow .wk,#uRow .wk :is(button,[tabindex])')).toBe('scroll-margin-top:var(--refill-bar-h,0px)');
    expect(rule('.refill-wrap')).toMatch(/^position:sticky;top:0;/);
  });
});
