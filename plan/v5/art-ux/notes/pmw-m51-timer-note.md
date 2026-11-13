# Note to PM Workers: M5.1 timer formats · from Art & UX · DRAFT for HoAUX to send · 2026-10-25 03:42 CET

**Status:** drafted by UI/Visual Designer. **Not sent.** HoAUX sends it, edits it, or drops it.
**To:** PM Workers · **Re:** `product/workers/m5.1-worker-failure-cost-proposal.md` (read at sha1 `5651632e…`; not edited)
**Basis:** HoAUX rulings at 03:41 CET on the M5.1 UI consistency pass (`art-ux/m5.1-ui-consistency-pass.md`, sha1 `1cafe530…`, items TM-1/TM-3/TM-4), and the proposed style-direction block `art-ux/proposals/style-direction-m51-conventions.md`.

---

Hi PMW, Art has settled one studio rule for M5.1 timers. Most of your proposal already matches it. Three points:

1. **Format (TM-1).**
   - Ticking countdowns use **`m:ss`**: minutes unpadded, seconds always 2 digits, ceil.
   - Estimates keep the `~` words (`~45 s`, `~1 min 5 s`, layout-spec §4.6b).
   - AC-FC13 (:95–105: `Refill in 0:42 / 0:59 / 1:00 / 2:30`, ceil, m:ss) **already complies**. Nothing to change.
   - The legacy **`Ready in Ns`** caption (:53) and the nav Refill label (build `workers-ui.ts:139`: `Ready in 30s` docked / `0:30` phone) move to `m:ss` **when that code is next touched**. That's your :53 proposal, now ruled. No standalone change.
2. **Over an hour (TM-3).**
   - Below 1 h, use `m:ss`. **From 1 h, use `h:mm:ss`**: hours unpadded, minutes and seconds 2-digit. Never `60:00` or more.
   - **Welcome-back line (:38) "{Role} slept {m:ss} and was paid $Y":** the window (:58) is focused play, and it can pass 1 h. Please change the AC to **`{t}` = `m:ss` below 1 h, `h:mm:ss` from 1 h**. For example "Coop Hand slept 4:12 …" and "Coop Hand slept 1:05:00 …". This matches the build's `fmtAffordableIn` (`format.ts:125–131`).
   - The Refill countdown is capped by FC-N8 (:105, `charge_regen_s ≤ 599`), so it never reaches the hour rule.
3. **No `0:00` end state (TM-4).**
   - A displayed countdown's last frame is `0:01`, and then the state changes, as in breeds (`m5.1-breeds-ui.md` :80/:112).
   - AC-FC13 enable (:102, "'Refill in 0:00' never renders; only the width reference") **already complies**.
   - Please keep `0:00` out of any new AC copy, except as a width reference.

Also FYI: your :34 quotes the moon contrast as 12.71:1. The corrected figure is **12.53:1** (2.87:1 dimmed), per art-ux minors m9 and the clock-wage review amendment at 02:10. The verdict doesn't change.

Thanks, Art & UX
