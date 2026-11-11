# p1 test-fix proposal (NOT APPLIED) — QA-D-1030-PRERUN-TRIAGE (1), needs HoQ sign
Target: `artifacts/v5-ui/harness-rc/p1/p1.mjs` (byte-identical to frozen `harness/p1/p1.mjs` sha1 37729ad1). harness/ stays frozen; the pre-run result is NOT re-scored by this. If signed, the change lands in harness-rc only, which means a re-freeze, SUMS refresh, a full self-test and HoO clearance (HoO 10:0x: any change needs a new full self-test + clearance). The re-freeze happening now is the cheap moment to fold it in.
Trace and citations: `p1-trace.md` (same folder). Line numbers are for p1.mjs as frozen.

## F1. readAll: capture the m6 rendering (needed by F2-F4)
Source: HoAUX m6 option A, SIGNED 2026-10-25 02:26 CEST (art-ux/decisions.md:374-375); AC UI-M6-1 / UI-M6-8 (art-ux/m4.1-ui-minors.md:413, :420; v5 pin 05ed7f02); scope m4.1-p2-scope.md:11 (f0524447, D-HOE-20261029-03).
```diff
@@ p1.mjs:140
-    rate: rate ? { text: rate.textContent, aria: rate.getAttribute('aria-label'), sign: rate.dataset.sign, color: rcs.color, role: rate.getAttribute('role') } : null,
+    rate: rate ? { text: rate.textContent, aria: rate.getAttribute('aria-label'), sign: rate.dataset.sign, color: rcs.color, role: rate.getAttribute('role'),
+      warn: rate.classList.contains('warn'), tri: rate.querySelector('.tri')?.textContent ?? null, triHidden: rate.querySelector('.tri')?.getAttribute('aria-hidden') ?? null,
+      wi: (() => { const s = rate.querySelectorAll('svg.wi'); const v = s[0]; return { n: s.length, vis: !!v && getComputedStyle(v).display !== 'none' && v.getClientRects().length > 0, ah: v?.getAttribute('aria-hidden') ?? null }; })() } : null,
```

## F2. asleep mh-asleep / mh-unpaid (p1.mjs:170-171)
```diff
-    ok('asleep', `${id}: HUD #rate role=status; aria ", sales stopped" ${ex.mhStall ? 'present (AC-R2a)' : 'absent'}; ${ex.mhStall ? 'rate <=0 red with ⚠ (AC-R1m/SS-15)' : ''}`,
-      r.rate.role === 'status' && (ex.mhStall ? (/, sales stopped$/.test(r.rate.aria) && r.rate.sign === 'neg' && /^⚠/.test(r.rate.text) && r.rate.color === 'rgb(184, 59, 55)' && !/^\+/.test(r.rate.text)) : !/sales stopped/.test(r.rate.aria)), r.rate);
+    ok('asleep', `${id}: HUD #rate role=status; aria ", sales stopped" ${ex.mhStall ? 'present (AC-R2a)' : 'absent'}; ${ex.mhStall ? 'rate <=0 red with the WARN_SVG icon (.warn, one visible svg.wi aria-hidden) + aria-hidden ▼, no painted U+26A0 (AC-R1m/SS-15; m6 UI-M6-1/-8)' : ''}`,
+      r.rate.role === 'status' && (ex.mhStall ? (/, sales stopped$/.test(r.rate.aria) && r.rate.sign === 'neg' && r.rate.warn && r.rate.wi.n === 1 && r.rate.wi.vis && r.rate.wi.ah === 'true' && r.rate.tri === '▼ ' && r.rate.triHidden === 'true' && /^▼ /.test(r.rate.text) && !/\u26A0/.test(r.rate.text) && r.rate.color === 'rgb(184, 59, 55)' && !/^\+/.test(r.rate.text)) : !/sales stopped/.test(r.rate.aria)), r.rate);
```

## F3. ss28 HUD part (p1.mjs:249 and :252) — ETA part stays informational (SS-28, sales-stopped-spec.md:317: lag logged under KI-SS1/KI-RV5, not a fail)
```diff
@@ :249
-    const trace = []; const t0 = Date.now(); while (Date.now() - t0 < 6000) { const r = await readAll(p); trace.push({ ms: Date.now() - t0, etas: r.etas, rate: r.rate.text }); await p.waitForTimeout(500); }
+    const trace = []; const t0 = Date.now(); while (Date.now() - t0 < 6000) { const r = await readAll(p); trace.push({ ms: Date.now() - t0, etas: r.etas, rate: r.rate.text, sign: r.rate.sign, warn: r.rate.warn && r.rate.wi.vis }); await p.waitForTimeout(500); }
@@ :252  (assertion only; the title text stays except "red" now names the icon)
-    … st0.ok && st.ok && trace.filter(x => x.ms >= 1000).every(x => /^⚠/.test(x.rate)), { before: e0.etas, trace: trace.map(x => [x.ms, x.etas.join('|'), x.rate]) });
+    … st0.ok && st.ok && trace.filter(x => x.ms >= 1000).every(x => x.sign === 'neg' && x.warn && /^▼ /.test(x.rate) && !/\u26A0/.test(x.rate)), { before: e0.etas, trace: trace.map(x => [x.ms, x.etas.join('|'), x.rate, x.warn]) });
```

## F4. ss15 (p1.mjs:256)
```diff
-    ok('ss15', 'SS-15/P-1 HUD: MH asleep (+ CH working) -> rate <=0 red ⚠ in 6/6 samples over 3 s, aria ends ", sales stopped", never "plus"', samples.every(x => x.sign === 'neg' && /^⚠/.test(x.text) && /, sales stopped$/.test(x.aria) && !/plus/.test(x.aria)), samples);
+    ok('ss15', 'SS-15/P-1 HUD: MH asleep (+ CH working) -> rate <=0 red with the WARN_SVG icon (m6) in 6/6 samples over 3 s, aria ends ", sales stopped", never "plus"', samples.every(x => x.sign === 'neg' && x.warn && x.wi.vis && /^▼ /.test(x.text) && !/\u26A0/.test(x.text) && /, sales stopped$/.test(x.aria) && !/plus/.test(x.aria)), samples);
```

## F5. hoe Unpaid MH above T (p1.mjs:183)
Source: rc1-asleep-state-spec v1.0.12 AC-R10 (product/workers/rc1-asleep-state-spec.md:103, sha1 666e8fd5 = v5 pin), copy table :98, precedence :90; P2b in v5 scope (m4.1-p2-scope.md L31; D-HOE-20261029-03, engineering/decisions.md:216). Same expectation already in harness p2/p2.mjs:129-130 (TP1-R10).
```diff
-    ok('hoe', 'Unpaid MH energy 70 (> T=50): disabled Refill captioned "Rested, refill below 50%" (HoE note 3; v1.0.8 AC-R10 targets next patch)', c?.cap === 'Rested, refill below 50%' && c.refill.dis === 'true' && c.refill.desc === 'cap-market_hand', { cap: c?.cap, refill: c?.refill });
+    ok('hoe', 'Unpaid MH energy 70 (> T=50), coins $1.00: Refill aria-disabled, name "Refill Market Hand", caption "Resumes at $2.50" (not "Rested"), describedby capd-market_hand (rc1-asleep v1.0.12 AC-R10, P2b)', c?.cap === 'Resumes at $2.50' && c.refill.dis === 'true' && c.refill.aria === 'Refill Market Hand' && c.refill.desc === 'capd-market_hand', { cap: c?.cap, refill: c?.refill });
```
(The describedby sentence itself is asserted exactly in p2.mjs TP1-R10; not duplicated here.)

## Not changed
- `acr8` (:224) "Rested, refill below 50%" for a WORKING Coop Hand above T stays correct (precedence :90; passes in the run).
- `timing` lat() predicates (:229-237) never tested the glyph; they pass.
- SS-28 string scan (:254) passes and stays.

## Sign-off
HoQ: ______ (sign F1-F5 or name the ones rejected). After sign: apply in harness-rc, refresh SUMS, selftest-full, HoO clearance, Architect/HoQ delta check.
