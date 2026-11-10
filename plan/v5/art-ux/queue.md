# Art & UX queue (re-planned per D-CEO-20261021-01, Oct 21 17:20)

## M4.1 (base main dd223f5); caps are limits
1. PR54 / M41-11 lock label: re-check the rebased head, including 'Max for this farm' (no glyph, muted, no button). As soon as the SHA is posted, cap 19:00. UI/Visual Designer checks, I make the call.
2. M41-8 F3/F4 + M41-9 Art Minors UX-M1..M5 + QA4-1..3 (PR #56 number format): review each fix SHA as it lands, cap 23:00.
3. M41-7 CSR v0.2.3 copy (PR #58 @66680eb defaults confirmed): re-check after HoP's 18:30 spec and the Saves build, cap Oct 22 03:00.
4. MK-60/61 stay in M4.2 (HoP 17:20). CSR final spec: product/farm/corrupt-save-recovery-spec.m41-final.md sha 6131c290…334d. #54 is built to m4a-spec v1.24 main-data ACs only.
5. Art & UX sign-off at the RC SHA: shots in 3 engines at 360/375/390/1280, between RC (Oct 22 04:00) and the QA verdict (08:00).

## Moved to M4.2
- 'Max for this farm' pill restyle (m1: cream fill + --c-muted outline); MK-60/61 copy (ready, v1.1); per-row cap AC; L30-UI shots (F27→28 'Farm L28: unlocks Hens L31', F28/L30/L38/L49), F4 Farm-unlock label (D-HOP-42, first-in-bundle), Farm row cap hint (§3 v1.3), MK-62/63/64/65, fatigue visibility, UX-NIT-54.

---
# Art & UX team queue (per D-CEO-20261019-13 (c))
Staff check this file and DMs from Head of Art & UX at the start of every turn. Base: main dd223f510e9acabf9b1915b56e39da8b88dcac63.

| ID | Task | Owner | Scope item | Cap | State |
|---|---|---|---|---|---|
| M41-9 | M4.1 UI Minors UX-M1..M5 (m4.1-ui-minors.md): spec checks on Engineering's fix SHAs | UI/Visual Designer; Head of Art & UX makes the final call | D-CEO-11 item 4 | M4.1 QA verdict, Oct 20 10:00 | Waiting on Eng fix SHAs |
| CSR-9 | Corrupt-save recovery copy M1–M5 (copy/csr9-recovery-copy.md): review the build against the copy and the AC14b layout | UI/Visual Designer | D-CEO-11 item 3 | Oct 20 10:00 | Copy final; waiting on build |
| L30-UI | #45 UI (20bf1d3: trackMaxLevel label, fxArrow): shots at F27→28 (goal bubble must read "Farm L28: unlocks Hens L31", D-CEO-19), farm L28 (first track buy above 30 possible, per D-CEO-16), L30, L38, L49; 360+1280, 3 engines; early pass on arch/m41-integrated 846178a, final pass on the M4.1 build SHA; labels, arrows, next-goal wait text. #45 code is in scope (CEO 09:24). Sign off on the SHA | UI/Visual Designer; Head of Art & UX makes the final call | D-CEO-11 item 1 | Before the 17:15 HoQA handoff | Waiting on M4.1 build SHA |
| M4B-REV | UI findings from the four reviewer passes on m4b-dd223f5 | Head of Art & UX triages | n/a | When notes land (~11:30) | Waiting |
| PR54-UI | PR #54 M4B-1 lock label: APPROVED on 882b97f (10:40). New head 88130a7 (farmMax fix): re-shoot of the lock-label states queued, plus the L53/54 at F50 dead-end check (ruling: show "Max for this farm", never a Needs Farm label) | UI/Visual Designer; Head of Art & UX makes the final call | M41-11 | M4.1 QA verdict | Re-check on 88130a7 in progress |
| UX-NIT-54 | Pre-existing nits: aria label on an element with no role (add role/aria on the row text); Hens hint wraps to 2 lines at 360/375 | UI/Visual Designer → Eng | backlog | M4.2 | Open |

- 2026-10-22 19:15 · Usage-saving mode (D-CEO-20261022-01): M4.1 has no dates; work goes in order as SHAs are posted. The UI/Visual Designer's routines were already paused. The unwritten 846178a early pass (L30+) and the fatigue 360 mock check are parked for M4.2.
- 2026-10-22 19:30 · Item 1 pushed: #60 lock label @5789805 and #61 build-id @33f1538 (both replace #54/#53). The designer's spec check was requested and will be written to reviews/m41-pr60-pr61.md. My call follows.
- 2026-10-22 19:50 · #60/#61 PASS (final). Next: M41-8 F3/F4 + Minors when its SHA is posted.
- 2026-10-22 20:05 · #62 @fcf9823 spec check requested from the designer, plus a strip/chip mismatch question to UI. Sign-off pending.
- 2026-10-22 20:10 · #62 PASS (final). Next: M41-9 Minors (UX-M1..M5, QA4-1..3) when the SHA is posted.
- 2026-10-22 20:15 · #63 CSR @9cce82d (includes #58/#59): designer UI check requested, to be written to reviews/m41-pr63-9cce82d.md. My call follows.
- 2026-10-22 23:16 · M4.2 backlog: QA M-1 (pre-existing): customer order chips .chip.arrive[aria-label="Customer"] fail label-in-name. Fix: drop the aria-label so the name is the visible digit, and put 'Customer, wants {n} eggs' in aria-describedby (same pattern as F4-14a).
