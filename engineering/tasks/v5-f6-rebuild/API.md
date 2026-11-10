# F6 overlay mount layer: spot registry API (DRAFT v0.1)

Owner: Features (Senior Engineer, Features & Economy Wiring). Branch `feat/v5-f6-rebuild` off `origin/rc/v5` @ d65391b (#111 golden merged).
Status: **DRAFT v0.2 (implemented on the branch, focused tests green; ⚠ not final until the phase-2 audio/QA-seam port + Architect read)**, published early so golden (Generalist), broody (Generalist) and streak (Hire 3 dec9a396) can code against it.
Signatures marked **[stable]** won't change without a note to all three consumers. Items marked **[draft]** may still change during the port.
Source: a port of the UI layer from #86 (`feat/v5-ui-f6-overlay` @ 2b4abf93) and its sibling bundle-f6 @ 6307674, rebuilt against rc/v5's current APIs. It is not a rebase.

## Files
| Path | What |
|---|---|
| `src/ui/overlay.ts` | Keeps the slim attendance exports UNCHANGED (`attendedProbe`, `AttendedDoc`, `SheetHandle`, `registerSheet`, `anySheetOpen`, `openSheets`, `clearSheets`, `DialogSources`, `makeDialogOpen`, `wireAttended`). Adds the feature registry and the mount host (below). |
| `src/ui/overlay-spots.ts` | Pure spot geometry: `layoutKey`, `spotCentres`, `validSpots`, `domZones`, `DOM_ZONES`. No DOM writes. |
| `src/ui/overlay-spec.ts` | Named Art & UX layout constants (m4-timed-collectible v1.1 §2.1–§2.3, layout-spec §6). The code has no bare literals. Not CSV tunables, so balance.json is untouched. |
| `src/ui/features.ts` | THE feature list. Each consumer adds ONE import line here. No app.ts edit. |
| `src/ui/golden-spots.ts` | Unchanged (rc/v5, #111). F6 `validSpots` delegates its zone test to `validSpotIds`, so the R14 rule exists in one place only. |

app.ts changes once in F6, and only F6 changes it: `import './features'`, then one `mountOverlay(...)` after the DOM is built, then `overlay.render(t)` in `renderAll`. Consumers never edit app.ts.

## Types and exports [stable]
```ts
// overlay-spots.ts
export type LayoutKey = 'phone-360' | 'phone-375' | 'docked' | 'docked-compact';
export type SpotId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
export const SPOT_IDS: readonly SpotId[];
export interface Box { left: number; top: number; right: number; bottom: number }
export interface Spot { id: SpotId; x: number; y: number }            // hit-box centre, viewport px
export interface Zone { name: string; box: Box; clear: number }        // clear = min gap px (0 = must not overlap)
export function layoutKey(vw: number, vh: number, dockedMq: boolean): LayoutKey;
export function spotCentres(key: LayoutKey, vw: number, vh: number, r: { scene: Box; queue?: Box; meter?: Box }, inset?: { left: number; top: number }): Spot[]; // safe-area inset added after rounding (§2.1 rule 1)
export const DOCKED_1280x800: readonly (readonly [number, number])[];
export function validSpots(spots: readonly Spot[], zones: readonly Zone[], vw: number, vh: number): Spot[];
export function domZones(doc?: Document, docked?: boolean): Zone[];

// overlay.ts (additions)
export interface OverlayFeature {
  id: string;                                   // unique; re-registering an id replaces it
  flag?: M5Flag;                                // mounted only while flagOn(b, flag); omit = always on
  mount(ctx: OverlayCtx): void | (() => void);  // optional returned unmount
  render?(ctx: OverlayCtx, nowMs: number): void; // once per app frame, after the app's own render
}
export function registerFeature(f: OverlayFeature): void;
export const registeredFeatures: () => readonly OverlayFeature[];
export const clearFeatures: () => void;        // unit tests only

export interface OverlayCtx {
  g: Game; b: Balance; root: HTMLElement; scene: HTMLElement;
  layer(): HTMLElement;          // div.overlay-layer inside #scene, created on FIRST call (so no DOM while nothing mounts)
  rm(): boolean;                 // reduced motion (in-game toggle OR prefers-reduced-motion), same source app.ts uses
  dialogOpen(): boolean;         // the same makeDialogOpen(...) closure app.ts wires into Game
  attended(): boolean;           // attendedProbe() && !dialogOpen(), exactly what Game's attended probe sees
  layout(): LayoutKey;
  spots(): Spot[];               // the live layout's centres (docked-compact has no S4/S8)
  validSpots(): Spot[];          // spots() filtered against domZones() + every registerZone() zone + the viewport inset
  validSpotIds(): string[];      // validSpots().map(s => s.id), the shape Game.setSpotProbe wants
  registerZone(name: string, rect: () => Box | null, clear?: number): void; // default clear = SPAWN_CLEAR_PX (16)
  registerSheet(id: string): SheetHandle;   // = overlay.registerSheet; open → not attended at EVERY width
  fx: FxBudget;                  // shared ≤ FX_MAX_LIVE (30) live FX elements; the oldest is recycled
  asset(f: string): string;      // the app's asset URL resolver
}
export function mountOverlay(d: OverlayDeps): { ctx: OverlayCtx; features: string[]; render(t: number): void; destroy(): void };
export class FxBudget { max: number; admit(el: HTMLElement): void; release(el: HTMLElement): void; readonly count: number }
```
**[draft]** audio hooks (`ctx.audio.play(hook, {semi})`, `registerAudioHook(hook, file)`, plus the build:qa `eggfarmQa.audio.log`) and the build:qa `window.eggfarmQa.overlay.spots()` seam. These are ported from #86 in phase 2, and the names may change. Until then, use the app's existing `Audio.play(SfxName)`.

## Spot ids per layout (Art v1.1 §2.1–§2.3)
- `phone-360` (vw < 368) and `phone-375`: S1–S4 sit in the left column and S5–S8 in the right, at scene-edge ± 42 px and y = scene.top + {0.32, 0.50, 0.68, 0.86} × scene height.
- `docked` (the app's `(min-width:960px) and (orientation:landscape)` MQ, a play area ≥ 880 px and vh ≥ 700): the 1280×800 reference centres, shifted by the play-area width and scaled in y.
- `docked-compact`: S1–S3 and S5–S7 only, placed between the queue bottom + 48 and the meter top − 48.
- Built-in no-spawn zones: hud, toast (even while transparent), queue, coop (clipped to .farm), nest, full, henpill (0 px clearance), meter, goal, collect, nav, sheet (#panel-layer.open), modal. Docked layouts add the docked column. All zones other than henpill use 16 px clearance. Every hit box (56 px) must also sit ≥ 16 px inside the viewport.

## Lifecycle
1. **Register:** a consumer module calls `registerFeature({...})` when it is evaluated, and `src/ui/features.ts` imports that module. Registration is synchronous and idempotent by id.
2. **Mount:** `mountApp` calls `mountOverlay` once, after the app DOM and `wireAttended` are set up. Only features whose `flag` is on get mounted, in registration order. `mount()` may return an unmount function. `destroy()` runs those in reverse order and removes the lazy layer (used by tests and remounts; production never unmounts).
3. **Render:** `overlay.render(performance.now())` runs inside `renderAll` after the app render, and calls each live feature's `render`.
4. **Flag off / no features:** `mountOverlay` adds NO DOM (the layer is lazy), adds no listeners, and `render` is a no-op. The #app outerHTML hash is identical to rc/v5. This is the F6 acceptance check: a jsdom test plus a browser check.
5. **Attended interplay:** a feature sheet or menu calls `ctx.registerSheet(id)` and `.opened()` / `.closeComplete()`. While it is open, `makeDialogOpen` → `anySheetOpen()` is true, so Game's attended probe is false (golden R6 freeze, streak/sale suspension). Market stays a play surface, and docked Upgrades is not a dialog. Both rules are unchanged from rc/v5. `ctx.attended()` reads the same signal, so a feature never needs its own probe.
6. **Layout change:** app.ts already calls `g.layoutChanged()` on resize and dock change (#111 R15). Spots are recomputed from LIVE rects on every `spots()` / `validSpots()` call, so nothing is cached.

## How each consumer registers
```ts
// src/ui/golden-egg.ts (Generalist): flag 'golden'
import { registerFeature } from './overlay';
registerFeature({ id: 'golden', flag: 'golden', mount(ctx) {
  ctx.g.setSpotProbe(() => ctx.validSpotIds());         // feeds spawnGolden{spots} (R14/R15)
  const host = ctx.layer();                              // egg DOM goes here
  return () => ctx.g.setSpotProbe(() => []);
}, render(ctx, t) { /* draw egg from ctx.g.state; tap → ctx.g.tapGolden() */ } });

// src/ui/streak-meter.ts (Hire 3): flag 'streak'
registerFeature({ id: 'streak', flag: 'streak', mount(ctx) {
  const el = /* meter DOM, placed by the feature */;
  ctx.registerZone('streak-meter', () => el.isConnected ? el.getBoundingClientRect() : null); // +16 px no-spawn
}, render(ctx, t) { /* … */ } });

// src/ui/broody.ts (Generalist): flag 'broody'
registerFeature({ id: 'broody', flag: 'broody', mount(ctx) {
  const nest = /* nest DOM */; ctx.registerZone('broody-nest', () => nest.getBoundingClientRect());
} });
// then in src/ui/features.ts, one line each:
import './golden-egg'; import './streak-meter'; import './broody';
```
Rules: use `ctx.fx.admit(el)` / `release(el)` for every transient FX node. Don't add to `DOM_ZONES`; call `registerZone`. Don't import app.ts. Don't keep your own attended probe.

## Changelog
- v0.1 (cd0d438, 03:05 CET): first publish.
- v0.2 (03:25 CET): implemented on the branch. Adds the optional `inset` on `spotCentres` and the `DOCKED_1280x800` export. `destroy()` now removes the layer. No consumer-facing signature was removed. Tests: `tests/v5-f6-overlay.test.ts` (25).
