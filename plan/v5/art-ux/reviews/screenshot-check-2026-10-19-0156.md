# Screenshot spec check 2026-10-19 01:56 CEST: PASS (PL-1 keyboard shot, PR #43 @ 48bdb09)

Scope: D-CEO-20261019-02 (PL-1 keyboard guard rides with #41, with an Art & UX keyboard shot). Freeze rules for severity: FAIL only on Blocker/Critical/Major.

Note: the shared workspace was restored at about 01:52 CEST, which reset every file mtime. New shots were found by comparing every manifest.json folder against screenshot-check-log.md instead of by date.

## Set reviewed
qa/m3-recheck/pl1-pr43-48bdb09 (manifest.json present; PR 43, branch fix/pl1-key-guard, full SHA 48bdb09fe66a836446eb7d4007be1d44baba009e, pushed, build id m3-rc1-pre+48bdb09 on every shot, Farm tab asserted).
- Chromium, Firefox, WebKit at 1280x800 docked: pl1-a_escape_tap, pl1-c4_enter_hold_2s (6 shots). The 390x844 runs are data only (table-all.md, results-*.jsonl), with no PNGs.

## Checks
| Check | Result |
|---|---|
| Escape tap with Farm Buy focused buys nothing | PASS, 0 levels / 0 coins in all 3 engines (3 tries each, 1280 and 390) |
| Enter held 2s buys exactly one level (no auto-repeat) | PASS, L10 to L11, coins $50K to $48.6K (-1,368) in all 3 engines |
| Enter tap, Space tap, Space hold 2s buy one; Escape with Upgrades or Market open buys nothing | PASS (data, 390x844, 3 engines) |
| Focus ring visible on Buy before the buy | PASS, blue keyboard ring around the green Buy pill (--c-focus, 3:1 or better on the white card) |
| Buy tap target | PASS, about 50px tall at 1280 docked |
| Copy, fit, wrap/ellipsis on the Farm card and panel | PASS, no change from dd52bfd ("Farm level", "Coop upgrade at L20", stat lines, "Level 11 / 30", "$1,710.00") |
| Engine parity | PASS, all 3 engines match |

## Logged, not held
- Minor M-PL1-1 (pre-existing, also on dd52bfd in the pl1-rootcause-dd52bfd data): after any buy, focus drops to the page body (focus-after-buy:BODY in all 3 engines), so the ring disappears and a keyboard player loses their place. Visible in the c4 shots (no ring after the buy), although the manifest state still says "Farm Buy focused". Ask for a follow-up: keep focus on the Buy button, or its re-rendered replacement, after a buy. Not part of PL-1 and doesn't hold #41.
- Nit: the manifest state "Farm Buy focused" on the c4 shots doesn't match the after-buy frame; QA could label it "after buy".

## Seen, not in scope
- /workspace/wt-ui-shots/rc2-minors-2-efd7886 (rc2-minors are parked; covered under screenshot-check-2026-10-17-pr35-efd7886.md).

Still waiting on: the new M4-ON (#41) SHA delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed against dd52bfd.
