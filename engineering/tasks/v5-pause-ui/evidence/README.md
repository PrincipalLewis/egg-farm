# Pause UI flag-on screenshot evidence (Art match input)
Code: `wip/hire2/v5-pause-ui` @ `c4b6cc8` src, copied to a throwaway dir with only `m4.flags.pause = 1` in balance.json (nothing committed with the flag on).
Fixture state: farm ≥ unlock, MH paused (energy 80), CH paused, Hawker tired, Grader paused (Rested 100%); Workers tab open.
Engines: chromium (system Chrome), firefox, webkit (playwright-core) × viewports 360 / 390 / 1280. `shot.mjs` = the script, `probe.log` = per-card metrics
(toggle 44×44, 8 px gap to Refill, tops aligned, aria-label / aria-pressed, keyboard Enter keeps focus, #pzLive text, 0 page errors).
Not pixel goldens: the repo has no cheap 3×3 visual-golden runner; these are for Art's eyeball match. 2026-11-10 03:40 CET.
