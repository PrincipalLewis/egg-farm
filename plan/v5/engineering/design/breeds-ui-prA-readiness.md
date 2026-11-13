# breeds-ui-1 PR-A readiness (read-only)

Date: 2026-11-10 00:21 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Scope: **PR-A only** (HoE 00:19 CET). No code. Full 26–34h sizing deferred to Generalist.  
`origin/rc/v5` (fetched): **`f20b91839fdf09ba0ed45a890281ccbf7bf2909d`** (#95/#96 breeds A+B merged; #108 tip).  
Product pin: `product/m5.1-breeds-spec.md` **v0.2 rev. 3.8.9** sha1 `ea922eb8574740f15c1998cf534689d1259c12a7` / sha256 `ec8fb0206d18432a4a78f15a911528f5ef528ea8cc043ecb153c9ba0360ae8e1`.

## 1. Art / UI docs + sprites on disk?

**Yes.** Of-record UI doc is live **v0.2.7** (notes-only amendment of signed v0.2.6; UI-BR-1…23 all present).

| Artifact | Path | sha256 |
|---|---|---|
| **Of record (v0.2.7 / signed v0.2.6 text)** | `art-ux/m5.1-breeds-ui.md` (sha1 `f349f29f…`) | `5c3b08387f1cf0c53667d2e2dc4341358d2d7606188e746540831b0ddadedd92` |
| Pin copy | `artifacts/v5-ui/specs/m5.1-breeds-ui.f349f29f.md` | same as live |
| **v0.2.5 SIGNED backup** | `art-ux/scratch/m51-breeds-backup/m5.1-breeds-ui.v0.2.5.md` | `63f90a83ddcc574b68a1832f7cfec0e96f7dfdfcad2c1519137866a6f9c1db04` |
| v0.2.5 amendment snap | `…/m5.1-breeds-ui.v0.2.5-2334.md` | `0d641a40073bdb34ab0fb8d6a830b14ccb0d10ff3e3131107dcfff128303d5f0` |
| v0.2.6 **draft** (pre-sign `e5a621b8`) | `…/m5.1-breeds-ui.v0.2.6-draft-e5a621b8.md` | `bce16c3afc10fc8a60bfb73c5c84d7e0c3f604ec4fe71b3670b119568fdc4ba8` |

No separate `*.v0.2.6.md` signed file: live v0.2.7 **is** the signed v0.2.6 text + notes. Wireframes: `art-ux/wireframes/m5.1-breeds-*.png` + `m5.1-breeds-manifest.json`.

**Sprites (9) — on disk under Art, not yet in `game` `public/assets` on rc/v5:**

| File | sha256 |
|---|---|
| `art-ux/assets/char-breed-ayam-cemani.svg` | `ed3a119b0ff4d133b01f9442a9faee90e44b23afaa4181d83882e7a040320eac` |
| `art-ux/assets/char-breed-brahma.svg` | `65e7dc78a8d1e09218f1b4f38c9543e5974e87871231efbe545ad1401a0561df` |
| `art-ux/assets/char-breed-cochin.svg` | `ae5d1b8143307b4daee724166613c78b4cd7cb3bd8ccaceafd9439d1c309aff7` |
| `art-ux/assets/char-breed-cream-legbar.svg` | `c9406161526b6db3eac8214bb6938ad1341456f2c3e87bc1d90a9acc53fe394d` |
| `art-ux/assets/char-breed-leghorn.svg` | `d490d7849184f716bcda105134e36ffea3aededd81c936760b016bb9dfa06ad5` |
| `art-ux/assets/char-breed-orpington.svg` | `3351516e09176da9180abf52e79f26e20aaab66983cf147b0a75d678c03d1ebb` |
| `art-ux/assets/char-breed-rhode-island-red.svg` | `4d3914b9683a348d90f03b9ea713818fd66e8dc5a7414f07428e7b6cfef11006` |
| `art-ux/assets/char-breed-silhouette.svg` | `a051854da09efdff4810daaca7aa9893ffc55efb8c30510fb70db9281ac83f2d` |
| `art-ux/assets/char-breed-sussex.svg` | `2894961191e6f4d80246fc926aff41ba28882df2469e459e868e911c47bc852b` |

PR-A must **vend** these into `game/public/assets/` (or equivalent asset pipeline). Entry icon can reuse existing `public/assets/char-chicken.svg`. Yard/sprite ACs 33/34 stay **PR-B**.

## 2. Sim surface on rc/v5 after #95/#96 (PR-A needs)

| Need | Status | Where |
|---|---|---|
| **`pendingReveal`** | **Exposed** | `src/game.ts:37` field; set `game.ts:116` via `applyOffline` → `breedsOffline` reveal. UI clears after welcome-back card (BR-R18). Not saved. |
| **`hatchEstimate`** | **Exposed** | `src/sim/breeds-hatch.ts:89–95` (`HatchEstimate { show, defaultEtaS, assumeWorkingEtaS }`). Override: `game.ts:41` `breedsEstimateOverride`. QA hook: `src/debug/breeds-qa.ts:8–11` → `eggfarmQa.breeds.hatchEstimate` (dev/QA only). |
| **Flock / Hatch gating** (unlock, free/paid, unaffordable, flock-complete, rarity lock copy) | **Exposed as helpers + save fields** (no single DTO) | `unlockedSlots` `src/config/breeds.ts:30`; `isFlockComplete` `src/sim/breeds.ts:31`; `eligible` `breeds-hatch.ts:30`; `hatchCostCents` `:50`; `startHatch` guards `:61–64` (`freeHatchUsed`, incubator busy, flock complete, coins); `BreedsSave` `breeds.ts:14–18` (`owned`, `slots`, `incubator.remainingMs`, `settleMs`, `freeHatchUsed`, …). Actions: `src/sim/actions.ts:17,115–116` `hatch` / `placeBreed`. |
| Present calm **gate** (open/paused for chip) | **Gap — PR-B / Saves** | Not on GameState; no `presentOpen` export. `BC_SPEC_DEFAULTS` lacks `bc_present_calm_*`. Out of PR-A write scope. |
| Trait → income / Away eggs | **Gap — Saves (not PR-A)** | `slotTraitBp` exists (`breeds-hatch.ts:83`) but is unused by `income.ts` / offline grant. Sheet can still show roster bp from `ROSTER` + stars. |

**Verdict for PR-A:** sim is sufficient. No sim/save edits required to start Flock entry/sheet/Hatch/slots/album/reveal.

Attendance pattern ready: `registerSheet` / `anySheetOpen` in `src/ui/overlay.ts:19–31` (phone sheet = menu; docked overlay still registers — matches Q-UI-10 / BR-AC49 docked vs phone).

## 3. Generalist 26–34h / PR-A 15–18h split

**Agree.** PR-A at **15–18h** fits the sheet+Hatch+slots+reveal slice; Present chip / BB strip / yard sprites / full a11y sweep as PR-B is the right cut. 26–34h total across both PRs is plausible.

## 4. PR-A Ready ETA (CET)

Assume build start **00:40 CET** (on this report), **16h** median build + **~2h** gates + independent self-review → **Ready Draft PR ≈ 18:30–19:00 CET Tue 2026-11-10**.  
Band if 15–18h: **~17:30–20:30 CET**. Hosted SUCCESS / HoQA outside this ETA.

## Risks (PR-A only)

1. **Asset vend:** sprites live only under `art-ux/assets/` today — forget to copy → broken album/incubator.  
2. **Docked Flock + Refill pill** (UI-BR-15 icon-only) vs `#116`/`placeFarmMA` header crowding — measure early at 1280/1024.  
3. **Highlight stagger BR-AC3b** depends on Shift-calls intro dismiss state — wire carefully or tests flake.  
4. **`pendingReveal` after welcome-back** ordering easy to get wrong (show once, clear, no double card).  
5. Do **not** pull Present chip / BB strip into PR-A (scope creep → blows the 15–18h).

