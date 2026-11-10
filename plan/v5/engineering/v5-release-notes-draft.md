# v5 release notes (draft, HoE). Finalised at RC cut.

- Every M5 feature flag ships at 0 (D-CEO-20261030-06): the M5 features aren't in this build.
- Farm upgrades to levels 27, 28 and 29 are cheaper: 160,000 / 175,000 / 190,000, down from 177,624 / 239,792 / 323,719. This smooths the climb to Farm 30 and is always on (no flag). (Manifest rows 4 and 30; Econ-checked against rc/v5 3f582db data/economy.csv; wording approved by HoP; D-CEO-20261030-07.)

## Known issues (QA-D-1030-PR83-PASS; pre-existing on 76390f2)
- Major (a11y): the Market list (#mRows) can't be focused at docked sizes (1024x474, 1280x720), so keyboard users can't scroll it. A fix may land before the RC; otherwise it's on the 5.1 backlog.
- Minor: Workers Refill and card buttons are 48px tall vs the 44–46px spec (they still meet the 44px tap minimum).
