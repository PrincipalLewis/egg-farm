# CCGS trial: "game-design-lens" applied to the L10 dead zone
Executor (Grok Bot) · 2026-10-24 · analysis only, no code, no PRs (implementation frozen, M4.2 on hold D-CEO-20261024-04)
Skill used: `/workspace/tools/ccgs-grok-adapted/game-design-lens/SKILL.md`, adapted from Claude Code Game Studios `agents/game-designer.md` (MIT, Donchitos).
Numbers marked [P] are proposals for Economy to simulate. Nothing here goes into economy.csv or balance.json directly.

## 1. Inputs
| Input | State | Note |
|---|---|---|
| Vadim's words (Oct 24): "at level 10 when I am buying all 3 workers there nothing to do… clicking is useless… clicking giving more eggs, clicking on the hens giving more eggs, more golden eggs appear, now I see none, different type of chicken to buy… do much more than just 3 updates and do nothing after that" | FOUND | Verbatim problem statement |
| active-play-study.md (Oct 16) | FOUND | Reference titles, cadence data |
| m4-manage-proposal.md | FOUND | Approved M4 active layer + sim results |
| collection/m4-timed-collectible-spec.md | FOUND | DRAFT v0.5, golden egg |
| queue.md | FOUND | RV-1…RV-7 findings |
| **What is built** (code search, wt-m41-rc1 @ 5d9efa6) | FOUND | see §1a |
| First-party telemetry of real sessions | ABSENT | weakens §3 "dead zone" timings: they come from design docs and Vadim's play, not data |
| Sourced active/idle benchmark | ABSENT | (already a gap in the Oct 16 study) |

### 1a. Specced vs built (the skill's "a specced feature is not a shipped feature" step)
`src/config/balance.json` has a `tc` block with values for golden egg (`egg_*`), worker abilities (`ability_*`, 30 s / 300 s), collect streak (`streak_*`), focus premium, completion bonus and leave penalty. **No TypeScript file in `src/` or `scripts/` reads that block.** Shipped in M4/M4.1: the 3-track split, track milestones, Balanced farm, workers, Pause/Resume. So the whole *active layer* the Oct 16 study recommended (golden egg, abilities + Activate-all, streak) was never built. The Oct 17 feature freeze stopped it (HoQA confirmed for the golden egg today). Economy's 1.5–2.0× active/idle band was measured with that layer on. **The build Vadim is playing sits at ≈1.00× active/idle from F10** (proposal §1, "measured"). That alone explains "clicking is useless". It is an execution gap, not a research gap.

## 2. Target aesthetics (MDA), before mechanics
1. **Sensation**: a tap feels juicy and *does* something visible (eggs fly, number pops).
2. **Expression / Achievement (collection)**: "my farm, my flock". Breeds to own and show off.
3. **Challenge (light)**: timing decisions such as when to pop a boost or catch a golden egg. Not twitch skill.
"Submission" (relaxing idle) must stay intact: a player who never taps still reaches AC7 pacing.

## 3. Nested loop map by stage
| Stage | 30-s micro-loop | 5–15 min meso-loop | Session macro-loop | Dead zone? |
|---|---|---|---|---|
| F1–F2 | Tap Collect → tap Sell: readable, needed | Next Farm level | Unlock first worker | No |
| F3–F7 | Collect still useful. Market Hand sells | Track buys + milestones | Workers unlock | Partial: selling is automated at F3 |
| **F8–F12** | **None.** Coop Hand + Hawker collect and sell. A tap moves eggs a worker would move anyway (≈1.00×) | Buy the next track level. RV-7: "both tracks bought every level", one dominant answer | Refill when workers are tired, but RV-3 says it's invisible | **Yes. Vadim's report** |
| F13–F29 | None (same) | Same buy loop, longer waits. RV-5: ETAs creep | Balanced-farm steps | Yes |
| F30 cap | None | None. RV-1: "flat, no payoff, coins pile up" | None (no prestige) | Yes, total |
Verdict: from F8 the game has **no micro-loop**, and its meso-loop is a false choice. This matches what the Oct 16 study found, and the fix it chose was never built.

## 4. SDT and player-type check (current build, F10+)
- **Autonomy:** false choice (RV-7: buy both). Pause/Resume is the only real decision.
- **Competence:** weak feedback. Income flattens with no cue (RV-3), and coins drop for no visible reason (RV-6).
- **Relatedness:** workers have names and states, but hens are a count (the ×30 pill), not individuals. **Unserved.**
- **Player types:** Achievers get partial service (milestones). Explorers get nothing new after F8. Collectors (Quantic "Completion/Achievement") get nothing: the Collection track is an upgrade, not a set. Nothing for Socializers or Competitors (fine for now).

## 5. Options (Vadim's ideas included, scored)
| # | Option (one-line rule) | Loop | Aesthetic / SDT | Reference | Degenerate risk → mitigation | Knobs [P] | Scope |
|---|---|---|---|---|---|---|---|
| A | **Golden egg (build the existing spec v0.5)**: one golden egg every 2–5 min from F8, 30 s on screen, pays cash / 2× price frenzy / free eggs | micro (timed) | Sensation, Challenge / Competence | Cookie Clicker golden cookie; Egg, Inc. drones (study §3) | Drone-style nerf risk if the payout is too big → active ≤2× idle cap (M4-AC24) | gap 120–300 s, life 30 s, weights 45/35/20 (already in balance.json) | M (spec 80% done, art done, values done) |
| B | **Tap power that scales ("taps give more eggs")**: a manual tap gives `k × eggs/s` worth of instant eggs/coins, not `eggs_per_tap` from the coop, so it can never be out-scaled by workers | micro | Sensation / Competence | Cookie Clicker "cookies per click = % of CpS"; Clicker Heroes | Autoclicker / "tap forever" dominates idle → per-second cap (streak_max_taps_per_s = 1 already exists) + diminishing returns; budget it inside the 2× band | k = 0.5–2 s of income per tap, cap 1–3 taps/s | S–M |
| C | **Tap the hens / coop for eggs**: tapping a hen sprite makes it lay now (+1 egg pop, juice). Combined with the streak: steady tapping builds a decaying ×price multiplier | micro | Sensation, Fantasy | Egg, Inc. "Running Chicken Bonus" (hold to hatch, decays) | Same as B. Merge B+C into one verb so it's not two prompts | streak 0.01/tap, cap 0.30, decay 0.03/s (in balance.json) | S–M |
| D | **Worker abilities + Activate-all** (already specced and simmed, never built): 30 s boost every 5 min per worker | micro/meso | Challenge (timing) / Autonomy | Idle Miner managers | Prompt fatigue with A+C → a cap on prompts per session | 30 s / 300 s, ×1.15 | M |
| E | **Chicken breeds (new)**: buyable/unlockable breeds (e.g. Brown → Leghorn → Silkie → Golden hen), each with a trait (more eggs, higher egg value, golden-egg chance, offline yield). A coop holds N slots, so *which* breeds you keep is a choice. Breeds are a set to complete (Collection) | meso + macro | Expression, Achievement / **Autonomy + Relatedness** (fixes RV-7 and the "×30 hens" anonymity) | Egg, Inc. chicken types/research; Hay Day animals; Idle Miner mine variety (**needs the new study's sourcing**) | A dominant breed makes it a false choice again → traits must be intransitive (each best under a different strategy) and capped by coop slots | slot count, trait sizes, unlock levels | L (new system, art, save migration) |
| F | **Mini-goals / VIP buyer** (M5 list) | meso | Achievement | AdCap event goals, Hay Day visitors | Chore feeling → optional, replaced on claim | — | M |
| G | **Prestige** (late) | macro | Achievement / Competence | every idle reference | Too early resets feel bad → trigger where steps >10 min (≈L23–25) | — | L |

### Packages
- **P1 "Wake the screen" (fastest relief at F8+): A + B/C merged into one tap verb + D.** These are mostly specced and tuned already, so the cost is mainly engineering. It restores a micro-loop at every level.
- **P2 "My flock" (depth): E, then G.** It fixes the false choice and the missing collection, but it's a new system.
- **P3 "Goals": F.** Helps the meso-loop and is weaker on the micro-loop Vadim asked about.

## 6. Recommendation
**P1 first, then E (breeds) as the headline of the next design milestone, then prestige.**
Why: Vadim's complaint is the *micro* loop ("clicking is useless", "I see no golden eggs"). P1 answers it directly, reuses the specs, art and simmed values that already exist (golden egg v0.5, abilities, streak), and Economy already showed the full stack lands at 1.51–1.62× active/idle (inside the CEO band). Breeds answer "do much more than 3 upgrades" and RV-7, but a new system should come with a proper design doc and the wider study now running.
What would change my mind: if the new study shows breeds/collections are the main retention driver in the reference titles, or if Vadim says collecting is what he wants most.

### Decisions for Vadim (short)
1. **First package:** P1 "wake the screen" (Recommended) / P2 breeds first / both in one milestone (bigger, slower).
2. **Tap verb:** one merged "tap hens" verb with a streak (Recommended) / separate "tap = income %" button / both.
3. **Golden egg frequency:** spec 2–5 min (Recommended, ≈2–4 per session) / more often, ~1 min (more fun, needs a smaller payout).
4. **Breeds role:** strategic slots with trade-offs (Recommended) / pure cosmetic collection / straight upgrades (risk: another "buy all").

## 7. Playtest acceptance criteria (measurable)
- PT-1: at F10–F20 with all workers hired, an attentive player has an action whose payoff is visible within 0.5 s available at least once every 30 s.
- PT-2: at F10, 2 minutes of sustained tapping earns 1.3–2.0× the idle income over the same 2 min, and never more than 2.0× over any 10-min window.
- PT-3: a golden egg appears at least twice in a 10-min visible session at F ≥ 8.
- PT-4: a never-tap player still reaches L18 in 17.8–21.7 min (M4 AC7).
- PT-5 (breeds, later): in a 30-min session the best next purchase changes at least every 3 purchases (study Q3 metric), and at least 2 breed setups are within 10% income of each other.
- PT-6: Vadim answers "yes" to "is there something to do at L10?" after a 15-min session.

## 8. Gaps
- No telemetry of real sessions. The dead-zone timings rest on docs and on Vadim's report.
- Breeds have no sourced reference research yet. Hand this to the wider study Product is running now.
- Prompt-fatigue cap (golden egg + abilities + streak + Refill) is not set.
- The streak cap in balance.json is 0.40, but the proposal says 0.30. Reconcile before any build.
