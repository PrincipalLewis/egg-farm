Claude calls used: 0 — no Claude review — no verdict (reason: pass interrupted on Oct 19 by a Grok Bot usage limit; one wrapper call logged ok at 2026-10-19T10:38:51 (usage.log line 207, PASS_ID m4b-dd223f5, role gamer) but its output was never saved, so no verdict rests on it)
# Claude Gamer — m4b-dd223f5 (INCOMPLETE, closed Oct 30)
Per D-CEO-20261028-02 this pass is not rerun; the next Claude Gamer pass is on the v5 RC.

## Unofficial notes, not a review
Build: /tmp/relchk/egg-farm.html, sha256 0bc5bb72…179a4c ✅. The bundle string is m3-rc1-pre+246de09 (runtime check pending). Opened via file://.
## Explainer card on an existing save (09:17–09:32)
- s0: made a pre-M4B save by playing the dd52bfd release (m3-rc1-pre+dd52bfd) for 3 min in profile prof-old (file://).
- s1: opened m4b in the same profile. Runtime build id **m3-rc1-pre+246de09** ✅ (matches Head of QA). The "Welcome back" dialog came first, then the card "Upgrades got an upgrade! Hens and Egg value are now separate. Top them up! [Got it]" (s1-explainer-1st-03).
- s2: reopened the same profile. The welcome-back dialog came again, and **the explainer did not reappear** ✅ (s2-explainer-2nd-03). It shows once and only once.
## c1: natural, 390px, fresh save, 9 min (lock 09:40–09:49)
- The tracks are on the Farm tab: **Hens** (Eggs/s), **Egg value** (price) with milestones ("Next at L5: Grade A ×1.1", "Next at L10: Large ×1.25", "Next at L10: bigger coop · offline ×1.25"). Their level is capped by Farm level ("Hens & Egg value up to L3 → L4").
- Pacing is very dense: first buy at 0:18, and buy gaps are 7–35 s for the whole 9 min (max 35 s at 3:43). Farm L7, Market Hand at 5:45, Coop Hand at 8:50.
- "No eggs to sell" while holding eggs is still present (8:47: 868 eggs held, Sell all reads "No eggs to sell").
## c2: natural, 390px, same save after 4 min offline (+902 eggs), 9 min (lock 09:54–10:03)
- Farm L7 → L16 in 9 min, at about game minutes 13–22. Buy gaps are 7–32 s (max 32 s at 8:54). The pace slows gently but there are no dead stretches.
- Tracks rhythm: Farm level raises the cap, then Hens +1 and Egg value +1 come right away. Milestones: "L20: bigger coop · offline ×1.5", "Jumbo ×1.5".
## c3: natural, 390px, same save after 3 min offline (+1,174 eggs), 9 min (lock ~10:04–10:13)
- Farm L16 → L20 (at about game min 23–34). Buy gaps are 18–40 s (max 40 s at 2:32 and 8:52). Still no dead stretches; it's a steady 20–40 s rhythm.
- Egg value L19 → L20 jumped $9.59 → $12.24 (the Jumbo ×1.5 milestone), which is a nice spike. The next goal reads "Farm L21: Grader tier 3".
- Natural total: ~27 min active / ~34 min game time, ending at Farm L20.
## acc: ACCELERATED (not natural pacing), 390px, a copy of the save taken at the end of c2 (Farm L16), lock ~10:21–10:30
- Method: Playwright `page.clock` was installed and fast-forwarded 15 s of game time per bot loop (~1.5 s real), roughly 10× speed. The return showed "away 18m +6,904 eggs".
- Farm L16 → **L30 in 2:48 real** (3–10 s gaps, accelerated).
- At L30 (acc-30): Hens, Egg value and Farm level all read "Level 30 / 30" with a bright yellow **MAX** button, plus a "Balanced farm 5/5 · +30%" bar. There was **no celebration, toast or message** when the cap was reached (no overlay logged).
- After the cap, only Collection upgrades are left (L23 → L29). Gaps grew to 18 → 25 → 42 → 63 s at accelerated speed, and the goal chip shows "Collection L28 ~17 min" / "L29 ~14 min". In natural time that is a long tail with nothing new.
- Copy nit: Farm L27–L29 cards say "Hens & Egg value up to L30 → L30" (a no-op line).
