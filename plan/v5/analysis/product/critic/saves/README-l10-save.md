# Fast-forward saves for build m4.1+5d9efa6 (PR #67 head 5d9efa6)

Release build has no cheat path: `?debug=1` / `?perf=1` and `window.eggfarm` are compiled out (IOS_FLAG off;
check-release-build enforces it). There is no Settings import (Settings only exports a log / save file).
So fast-forward = write a valid save into localStorage key `eggfarm.save` before the game boots.

Save format (src/save/save.ts): `{"version":6,"savedAt":<ms>,"saveSeq":N,"sum":"<fnv1a32 of JSON.stringify(state)>","state":{...}}`.
`sum` covers only `state`, so `savedAt` can be rewritten freely (set it to now to avoid an offline-earnings popup).

## Files
- `l10-save.json` — Farm L10, Collection L10, Hens L12, Egg value L12, $16.47, Market Hand + Coop Hand + Hawker hired
  (energy 100), Grader not bought, M4 tracks marker set, explainer seen, milestones pre-celebrated. ~11 min of sim play.
- `l20-save.json` — Farm L20, Coll 16, Hens 22, Egg value 21, $553.96, same 3 workers (~27 min of sim play).
- `l10-devtools-snippet.js`, `l20-devtools-snippet.js` — paste-into-console one-liners.
- `gen-l10-save.ts` — generator (build's own sim + tests/bot-m4 seller15 pick, 4 taps/s, sellAll, manageAll, hires ASAP).
  Regenerate: `cd ../wt-5d9efa6 && npx vite-node ../saves/gen-l10-save.ts -- <farmLevel>`. Output passes `validate()`.
- `verify-save.mjs` — headless Chrome check (run under `flock /workspace/egg-farm-studio/.browser-test.lock timeout 120 ...`).
  Verified: loads at http://127.0.0.1:8795/ with build-id m4.1+5d9efa6, 0 page errors, 55 hens, survives reload.

## Steps (Chrome, by hand)
1. Open http://127.0.0.1:8795/ (or the release HTML). Use a fresh profile/incognito, or DevTools > Application >
   Storage > "Clear site data" first: an existing IndexedDB copy with a higher saveSeq can win over the injected one.
2. DevTools Console: paste the contents of `l10-devtools-snippet.js` and press Enter. Page reloads into the L10 farm.
3. Click "Tap to start".

## Playwright
`ctx.addInitScript(r => { if (!sessionStorage.seeded) { const d = JSON.parse(r); d.savedAt = Date.now();
localStorage.setItem('eggfarm.save', JSON.stringify(d)); sessionStorage.seeded = 1; } }, rawJson)` on a fresh context.
