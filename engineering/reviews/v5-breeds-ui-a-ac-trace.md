# Breeds UI PR-A — AC → test trace (Ready-candidate)

**Head:** `d5327077bf99b0e467b5b9da15fb992406e8bb2c` · Ready (final gates green @ 0ae9d907)
**Pre-bar fixes:** `engineering/reviews/v5-breeds-ui-a-prebar-fixes.md` (HoQA `breeds-pra-bd5b068a.md`)  
**Files:** `tests/v5-breeds-prebar-fixes.test.ts`, `tests/v5-breeds-ui.test.ts`, `tests/helpers/breeds-on.test.ts`, `tests/v5-breeds-qa-seam.test.ts`  
**Fixture:** `tests/helpers/breeds-on.ts` — `balance.json` stays `breeds=0`.

| AC / row | Test(s) | Notes |
|---|---|---|
| BRD-AC1 / flag off | `flag off: no #breeds-entry` | |
| BR-AC3 F9/F10/F14/F20 | F9 / F10 / F14 locked / F20×3 | OQ-2 locked Farm N |
| BR-AC3 sheet + Esc | `opens #breeds-sheet… Esc closes` | |
| BR-AC3b / UI-BR-2 | `coachSeen: glow+dot…`, `coach unseen…` | |
| UI-BR-2b | `session N+1 with coach unseen arms…` | |
| BR-AC4 move + settle | `placing an already-slotted breed moves…` | settle carry |
| BR-AC4 / OQ-6 place+Remove | `album select → empty slot… Remove clears` | |
| BR-AC10 | `More breeds at Farm 14` | |
| BR-AC11 | `Flock complete` | |
| BR-AC31 / silhouette | F20 silhouette 0.55; incubating sil + meter | |
| BR-AC31 aria | `aria-label uses fmtMoneyAria` | |
| BR-AC31a | Free hatch helpers + after press | |
| BR-AC31b | unaffordable dimmed / press no-op | |
| BR-AC31c / 31e | 90/91 note; 85/95 hook iff | |
| BR-AC32 reveal RM | RM class; Nice! dismiss; no auto-remove | |
| BR-AC32 settle ring | no infinite animation | |
| OQ-3 ceil | fmtRemainMs + incubating 0:46 | |
| E10 | unknown slot → empty | |
| BR-AC25 / BR-R18 | welcome Collect → reveal | |
| Q7 | missing freeHatchUsed → Free | |
| breedAsset | `_` → `-` | |
| BR-AC49 docked | docked open/close sheet | phone hold = registerSheet('flock') |
| presentMirror / ext ctx | unit + Present slot DOM; openFlock/incomeRate/rm | |
| breeds-ext glob | zero matches in PR-A | |
| HoQA breeds-on / qaBreeds | helper isolation; seam rejects marker | release-bundle at final gates |
| BR-AC33–35 | `<img src>` sprites vendored | greyscale = Art review |
| BR-UI-02 entry rect | probe (CSS) | pre-bar fix `8abcf165` |
| BR-UI-03 | `BR-UI-03 locked slot placeholder copy` | `prebar-fixes.test.ts` |
| BR-UI-06 | `BR-UI-06 Active totals row …` ×3; focus block; probe sheet rect | |
| BR-UI-07 | `BR-UI-06 / BR-UI-07 focus returns …` ×5; probe Close rect + focus | phone focus → Upgrades nav (ruling) |
| BR-UI-13 | `BR-UI-13 E5 / Flock complete sub-lines` ×3 | |
| BR-UI-14 | `BR-UI-14 Hatch aria-describedby includes the Farm-soon note` | `hatch-sub hatch-fs` |
| BR-UI-17 | `BR-UI-17 / BR-UI-34 filled slot …` ×2; probe Remove ≥44 | |
| BR-UI-19 | `BR-UI-19 / BR-UI-34 album stars …`; probe cells/sprites | |
| BR-UI-21 | `BR-UI-21 reveal card …` ×3; probe reveal | |
| BR-UI-34 | 17/34 + 19/34 + `per-frame render keeps keyboard focus`; probe ariaSnapshot | |
| BR-UI-35 | `BR-UI-35 axe landmark-no-duplicate-banner …` ×2; probe axe | |
| BR-AC52 / strip | **PR-B** | |
| BR-AC23b/c | **PR-B** (#100) | |
| E8 familyClamp (clamp-bind) | `E8 familyClampState bind → sim (#126)` ×2; `clamp-bind: default clamp is the real sim view` (F17 "Lay +7% (max)" / F18 "Lay +9.75%") | sim `familyClamp` via #126 on rc/v5 `68f58c0f` |
| D1–D6 drift | adapter null-safe | **Rebase** when drift lands on `rc/v5` |

## Deferred (not PR-A blockers)
- Full vite `release-bundle` qaBreeds assert — coded; run in final gate set
- Greyscale 9/9 (Art) · docked browser visual (UIQA)
- Present calm-gate real `gateOpen` (Saves) — stub `true` in slot mirror
