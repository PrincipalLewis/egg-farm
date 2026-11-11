# M1 Estimate — MVP loop (collect → sell → upgrade collection → upgrade farm)
Estimates in focused dev-days. Total ≈ 9–11 days build + 2 days QA fixes.

| # | Task | Est | Depends on |
|---|------|-----|-----------|
| 1 | Repo scaffold (Vite/TS/Vitest/lint), game loop + tick | 0.5 | — |
| 2 | State model + actions + balance schema (placeholder numbers) | 1 | Product: entity list (draft OK) |
| 3 | Egg collection (manual + passive rate) | 1 | Product: core-loop spec |
| 4 | Customers & selling (demand, prices) | 1.5 | Product: customer/sell rules |
| 5 | Collection upgrades | 1 | Product: upgrade list + cost curves |
| 6 | Farm upgrades (capacity/tier) | 1 | Product: farm tiers |
| 7 | Save/load + migrations + autosave | 1 | — |
| 8 | Offline progress + away summary | 1 | Product: offline cap |
| 9 | UI layout, number formatting, feedback | 1.5–2.5 | Art/UX: wireframes/flows, placeholder art OK |
| 10 | Debug panel + unit tests | 1 | QA: test plan |
| 11 | Plug final balance numbers, polish, `m1-rc1` | 0.5–1 | Product: final economy numbers |
| 12 | QA fix pass | 2 | QA sign-off |

Critical path: Product core-loop spec → tasks 3–6. Tasks 1, 2, 7, 8 start now with placeholders.
