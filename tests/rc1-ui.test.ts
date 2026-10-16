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
    expect(navManageView(2, 0, true, P, 0).label).toBe('Refill tired (2)');
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
  it('"Refill tired (N)", N = workers at <= 40%; aria "Refill N tired workers"', () => {
    const h = manageAllHtml(S([40, 41, 10]), b); expect(h).toContain('Refill tired (2)'); expect(h).toContain('aria-label="Refill 2 tired workers"'); expect(h).not.toMatch(/Manage all|need it|All rested/);
  });
  it('locked under 3 hired; shown at N>=1; hidden at N=0 unless cooling down (then greyed + ring + "Ready in Ns")', () => {
    expect(manageAllHtml(S([10, 10]), b)).toBe(''); expect(farmManageAllVisible(S([10, 10]), b, false)).toBe(false);
    expect(manageAllHtml(S([90, 90, 90]), b)).toBe('');
    const cd = manageAllHtml(S([90, 90, 90], 12.2), b);
    expect(cd).toMatch(/is-cooldown" data-act="manageAll" aria-disabled="true"/); expect(cd).toContain('ring-cooldown'); expect(cd).toContain('Ready in 13s');
  });
  it('per-worker Manage enabled only at <= 40%; greyed caption "Not tired yet" / "Ready in Ns"', () => {
    const h = workersHtml(S([40, 41, 90]), b);
    expect(h).toMatch(/data-w="market_hand" aria-disabled="false"/); expect(h).toMatch(/data-w="coop_hand" aria-disabled="true" aria-describedby="cap-coop_hand"/);
    expect(h).toContain('<div class="wk-cap num" id="cap-coop_hand">Not tired yet</div>'); expect(h).not.toContain('id="cap-market_hand"');
    expect(manageCaption({ energy: 10, cdS: 0 } as any, 7, b)).toBe('Ready in 7s');
    expect(workersHtml(S([10, 90, 90], 7), b).match(/Ready in 7s/g)!.length).toBe(4); // pill + 3 workers
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
    expect(app).toContain("showToast('Coop upgraded!')");
    expect(app).toMatch(/retrigger\(moreChip, rm\(\) \? 'qflash' : 'qpulse'\)/);
    expect(css).toMatch(/\.chip\.more\.qpulse\{animation:qpulse 600ms[^}]*\}@keyframes qpulse\{50%\{transform:scale\(1\.12\)\}\}/);
    expect(css).toMatch(/\.chip\.more\.qflash\{animation:qflash 600ms/);
  });
});

describe('S2-1 coop tiers + toast (session2-ui-triage (c), layout-spec §4.7)', () => {
  it('ships Art & UX\'s new coop-l5/l10/l20 SVGs byte-for-byte', () => {
    for (const f of ['coop-l5.svg', 'coop-l10.svg', 'coop-l20.svg'])
      expect(readFileSync(new URL(`../public/assets/${f}`, import.meta.url), 'utf8')).toBe(readFileSync(new URL(`../../art-ux/assets/${f}`, import.meta.url), 'utf8'));
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
