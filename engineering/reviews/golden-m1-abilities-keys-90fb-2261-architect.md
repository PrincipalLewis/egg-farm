# Architect M1 recheck · #108 `90fb447` + #111 `2261670` · 2026-11-05 22:13 CET (Europe/Belgrade)

**Prior FAIL:** #108 `dfaffa6` / #111 `901972a` — `M5_TC_KEYS.abilities` swallowed into golden EOL comment (`formulas.ts`).

## Tips
| PR | Head | Draft |
|---|---|---|
| #108 | `90fb44747f3c590dec1de6fb31d4c5568cefbfee` | yes |
| #111 | `2261670206ee9538b1e16cb1818a4f66ec6deef1` (merge of 90fb447; base still `98d2cbe`) | yes |

## Delta (#108 vs `dfaffa6`)
2 files, +21/−2: `formulas.ts` restores **real** object entry `abilities: ['ability_s', 'ability_cd_s']`; `tests/v5-golden-spawn.test.ts` pin + GE-AC33 comment clarify.  
#111 vs `901972a`: same 2-file delta via ordinary merge (ancestor of 90fb447).

## Mapping is source, not comment
```ts
abilities: ['ability_s', 'ability_cd_s'],  // own key — verified REAL_ENTRY
```
Pin test executes `expect([...M5_TC_KEYS.abilities]).toEqual(...)` and `validateBalance` with `abilities:1` deleting each key.

## Independent vitest (rule 21 flock acquired)
| Tip | Result |
|---|---|
| `90fb447` | **1 passed** (`M5_TC_KEYS.abilities stays a real entry…`) |
| `2261670` | **1 passed** (same filter) |

Logs: `scratch/architect/recheck-m1-90fb-2261/`.

## Verdict
**M1 CLOSED** on both Draft tips. Prior #108 FAIL / #111 FAIL(integration) **cleared for this Major only**.  
Full #108/#111 ship still: Draft / no Ready; hosted SKIPPED; broader gates not re-run this turn (pin-only). Stays Draft.
