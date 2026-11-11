# Q-AB-N20 / AC-M5A-9b — 2026-11-05 Europe/Belgrade

**Status:** authored + re-pinned to abilities **v1.3.11 `12fec4b0`**; **BLOCKED-ON-BUILD #86**; no interim gate; fixture/unit PASS.

## Spec diff findings (8034ba7f → 12fec4b0)
Q8-only hunk (D-PMW-2026-11-05-03 / review-abilities-v1311.md):
1. Header + changelog for v1.3.11 Art Q8 mirror (`fc1ca17d`).
2. §5.1 docked: when Refill visible → compact 48 px, 8 px right of Refill, visible `N`/`4:51`/`—`, names via `.sr-in`; without Refill → ≥132 px.
3. §5.6 Activate-all note: compact visible text when Refill visible; names/describedby unchanged.
4. AC-M5A-8: docked+Refill final-RC compact geometry bullet.
5. AC-M5A-10: docked compact name via `.sr-in` equals exact names.
No unrelated drift. Placement ruling (HoQ): Refill visible → Art/Refill; Refill hidden → desk-manage-all.

## Cross-map
plan **AC-M5A-9b** ≡ Art **AB-UI-7** ≡ spec **AC-M5A-8** docked+Refill + **AC-M5A-10** compact name.

## Plan
- Pre-edit (HoQ v0.12): sha256 `1e2e1123…` — backup `.bak-1e2e1123`
- Post-edit (UIQA cite pass): see SHA256SUMS
- Count **36** / ≈**35.75 h** unchanged

## Harness
See SHA256SUMS. Probe pin now `12fec4b0` / v1.3.11. `N20_CROSSMAP` + desk-manage-all hidden-path asserts.

## Fixture/unit
```
cd artifacts/v5-ui/harness-rc-next && node tests/m5b-rules.test.mjs ab
# m5b-rules.test: 213/213 pass
```

## BLOCKED-SPEC
None.

## Live run (when #86 handed over)
One engine at a time; verify build-id; ports never :4173; flock timeout 600; `QA_N20_UNBLOCK=1 node m5/abilities-v08.mjs <engine> <960x600|1280x720> n20`.
