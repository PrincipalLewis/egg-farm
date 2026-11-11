// FC-AC9 on the real #11 build (lane U). Mirrors art-ux/scratch/fcac9/measure2.mjs (same state, same rect fields, same
// toast/Full!/×155 pill forcing) but uses the shipped .fchip/.fslot from ui/v5-fatigue-cue instead of a CSS mock.
// Flag-on = TEST-ONLY patch of m4.flags in the served bundle (salesStopped + fatigueCue); Rule 2 shown via window.eggfarmQaStall.
// Usage: node measure-ui.mjs <dist-qa dir> <out.json> <shotsdir> <engines csv> <viewports csv>   (analyse: python3 art-ux/scratch/fcac9/analyse2.py out.json)
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
const [, , DIST, OUTF, SHOTS, ENGS, VPS] = process.argv;
const pw = createRequire('/workspace/wt-ui-fc/package.json')('playwright-core');
const L = { chromium: () => pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }), firefox: () => pw.firefox.launch(), webkit: () => pw.webkit.launch() };
const CT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain' };
const MODES = ['off', 'on-tired', 'on-asleep', 'on-open'];
const vps = VPS.split(',').map(v => v.split('x').map(Number));
fs.mkdirSync(SHOTS, { recursive: true });
const res = []; let buildId = null;
for (const eng of ENGS.split(',')) {
  const br = await L[eng](); res.push({ engine: eng, version: br.version() });
  for (const flagOn of [false, true]) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('http://ui.local/**', r => { let f = new URL(r.request().url()).pathname; if (f === '/') f = '/index.html'; const fp = path.join(DIST, f); if (!fs.existsSync(fp)) return r.fulfill({ status: 404 });
      let body = fs.readFileSync(fp); if (flagOn && /\/assets\/index-[^/]+\.js$/.test(f)) body = body.toString().replace('salesStopped:0', 'salesStopped:1').replace('fatigueCue:0', 'fatigueCue:1');
      r.fulfill({ body, contentType: CT[path.extname(f)] ?? 'application/octet-stream' }); });
    await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 10, sfx: false })));
    await p.goto('http://ui.local/'); await p.getByText('Tap to start').click({ force: true, timeout: 5000 }).catch(() => {});
    await p.waitForFunction(() => window.eggfarm && window.eggfarmUi && window.eggfarmQaStall, null, { timeout: 15000 });
    buildId = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content);
    await p.waitForTimeout(700); await p.evaluate(() => document.fonts.ready);
    for (const [w, h] of vps) for (const mode of MODES.filter(m => (m === 'off') !== flagOn)) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(150);
      const m = await p.evaluate(async (mode) => {
        const $ = s => document.querySelector(s);
        const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return (r.width || r.height) ? { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) } : null; };
        document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp,.coach,.cooptip').forEach(e => e.remove());
        const g = window.eggfarm, S = window.eggfarmQaStall;
        const asleep = mode === 'on-asleep';
        g.state = { ...g.state, farmLevel: 12, hensLevel: 10, collectionLevel: 5, coinsCents: 5e6, coop: 3, basket: 3, seenTracksExplainer: true, nextCustomerInS: 1e9,
          workers: { market_hand: { energy: asleep ? 0 : 30, cdS: 0 }, coop_hand: { energy: 25, cdS: 0 } } };
        S.reset(); S.atRisk = { market_hand: 666600, coop_hand: 333300 };
        if (mode !== 'off') S.cue = { share: 0.5, shown: true, episodeId: 'e1', suppressedByStall: false };
        window.eggfarmUi.render(); window.eggfarmUi.render();
        document.querySelector('.farm-banner')?.setAttribute('hidden', ''); // Rule 3 banner measured separately (v5-ss-banner-rects); spots are the question here
        { const rt = $('#rate .rt'); if (rt) rt.textContent = '−$999.9K/s'; } // before any popover placement (Art measure2 sets it too)
        if (document.getElementById('fpop') && !document.getElementById('fpop').hidden) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // start each case closed
        if (mode === 'on-open') { const c = $('.hud .fchip'); if (c && c.offsetParent) c.click(); await new Promise(r => setTimeout(r, 120)); }
        const t = $('.toast'); t.classList.remove('show'); t.style.top = '';
        const hud0 = { coins: R($('.pill.coins')), rate: R($('#rate')), basket: R($('.pill.basket')), settings: R($('#settings')) };
        $('#full').hidden = false; const hp = $('#henpill'); hp.hidden = false; hp.textContent = '×155\u00a0hens';
        const qb = $('#queue').getBoundingClientRect().bottom; t.textContent = 'Coop upgraded! +1 customer slot'; t.style.top = `${Math.round(qb + 8)}px`; t.classList.add('below'); t.style.transition = 'none'; t.classList.add('show');
        const chip = $('.hud .fchip'), sub = $('.fslot .fsub'), fslot = $('.farm > .fslot');
        const vis = e => !!e && !e.hidden && e.getBoundingClientRect().width > 0;
        const ch = vis(chip) ? chip : vis(sub) ? sub : null;
        return { mode, hud: R($('.hud')), coins: R($('.pill.coins')), rate: R($('#rate')), basket: R($('.pill.basket')), settings: R($('#settings')), hud0,
          fslot: fslot && fslot.offsetHeight ? R(fslot) : null, fchip: R(ch), fchipPill: R(ch && ch.querySelector('.fchip-pill')), variant: vis(chip) ? 'icon' : vis(sub) ? 'sub' : 'none',
          chipName: ch ? ch.textContent : null, chipDescribedby: ch ? ch.getAttribute('aria-describedby') : null, chipHasAriaLabel: ch ? ch.hasAttribute('aria-label') : null,
          chipExpanded: ch ? ch.getAttribute('aria-expanded') : null, chipControls: ch ? ch.getAttribute('aria-controls') : null,
          rateClipped: $('#rate').scrollWidth > $('#rate').clientWidth + 0.5, hudScrollW: $('.hud').scrollWidth,
          queue: R($('#queue')), scene: R($('#scene')), coop: R($('#coop')), nest: R($('.nest')), full: R($('#full')), yard: R($('#yard')), henpill: R(hp),
          henImgs: [...document.querySelectorAll('#yard > span')].map(s => R(s.querySelector('img'))),
          meter: R($('#meter')), goal: R($('#goal')), collect: R($('#collect')), nav: R($('nav.actions')), panel: null, farm: R($('.farm')), toast: R(t),
          pop: vis($('#fpop')) ? R($('#fpop')) : null, popBtn: vis($('#fpop')) ? R($('#fpop .fpop-m')) : null, vw: innerWidth, vh: innerHeight };
      }, mode);
      m.errs = [...errs]; res.push({ engine: eng, vp: `${w}x${h}`, mode, m });
      await p.screenshot({ path: path.join(SHOTS, `fcac9-ui-${w}x${h}-${mode}-${eng}.png`) });
    }
    await ctx.close();
  }
  await br.close();
}
fs.writeFileSync(OUTF, JSON.stringify({ build: buildId, res }, null, 0)); console.log('wrote', res.length, 'build', buildId);
