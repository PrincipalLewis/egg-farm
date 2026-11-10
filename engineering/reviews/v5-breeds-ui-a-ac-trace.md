# Breeds UI PR-A — AC → test trace (Ready-candidate)

**Head:** `9816b3ea8633b39b30bbd562b3635414c41f14e3` (9816b3e) · Ready-candidate
**Files:** `tests/v5-breeds-ui.test.ts`, `tests/helpers/breeds-on.test.ts`, `tests/v5-breeds-qa-seam.test.ts`  
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
| BR-AC52 / strip | **PR-B** | |
| BR-AC23b/c | **PR-B** (#100) | |
| E8 familyClamp | stub `undefined` (no label) | **Dep:** Saves `saves/breeds-sim-prB-traits` |
| D1–D6 drift | adapter null-safe | **Rebase** when drift lands on `rc/v5` |

## Deferred (not PR-A blockers)
- Full vite `release-bundle` qaBreeds assert — coded; run in final gate set
- Greyscale 9/9 (Art) · docked browser visual (UIQA)
- Present calm-gate real `gateOpen` (Saves) — stub `true` in slot mirror
