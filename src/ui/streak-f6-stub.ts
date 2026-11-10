/**
 * v5 F6 STUB (temporary; the ONLY F6 seam of the streak / tapCoins UI). F6 (Features: feature registry / mount host) is not on
 * rc/v5 yet. This mirrors the subset of OverlayCtx / OverlayFeature that ui/streak-meter.ts uses, from Features' F6 API note
 * DRAFT v0.2 "core stable" (engineering/tasks/v5-f6-rebuild/API.md on origin/feat/v5-f6-rebuild @ 7810680; only [stable]
 * names are used) plus the [draft] `audio.play(hook)` (phase 2, ported from #86 2b4abf93), kept OPTIONAL because v0.2 has none.
 * Swap when F6 merges (mechanical):
 *   1. delete this file; in ui/streak-meter.ts import OverlayCtx / OverlayFeature from './overlay';
 *   2. at the end of ui/streak-meter.ts: `registerFeature(streakMeter)`; ui/features.ts gets `import './streak-meter';`;
 *   3. when F6 phase 2 lands audio hooks: registerAudioHook for each STREAK_SFX entry (files from art-ux/assets/sfx).
 * Nothing in the app imports this file, so it adds no DOM and no behaviour while unused.
 */
import type { Balance } from '../config/balance';
import type { M5Flag } from '../config/flags';
import type { Game } from '../game';

export interface Box { left: number; top: number; right: number; bottom: number }
/** The OverlayCtx members the streak feature reads (F6 API v0.2 `OverlayCtx` [stable], same names and shapes). */
export interface OverlayCtx {
  g: Pick<Game, 'state' | 'on'>; b: Balance; root: HTMLElement; scene: HTMLElement;
  /** F6's overlay layer; the pops go on the app's #fx-layer when present (fixed, full viewport), else here. */
  layer(): HTMLElement;
  rm(): boolean;
  /** [draft] F6 phase 2 audio hooks; absent in API v0.2, so the streak stings are silent until it lands. */
  audio?: { play(hook: string, opts?: { semi?: number; minGapMs?: number }): boolean };
  fx: { admit(el: HTMLElement): void; release(el: HTMLElement): void };
  dialogOpen(): boolean;
  /** No-spawn zone for golden eggs / Broody (meter box + 16 px, golden R14 / ST-AC21). */
  registerZone(name: string, rect: () => Box | DOMRect | null, clear?: number): void;
  asset(f: string): string;
  /** [v1.0, Features answer Q3] pop-live registry: golden/Frenzy pops call set(id, true/false); active() = any on. destroy() clears it. */
  pops?: { set(id: string, on: boolean): void; active(): boolean };
}
/** F6 API v0.2 `OverlayFeature` [stable]. */
export interface OverlayFeature {
  id: string;
  flag?: M5Flag;
  mount(ctx: OverlayCtx): void | (() => void);
  render?(ctx: OverlayCtx, nowMs: number): void;
}

/** Test / pre-F6 harness: a ctx with F6-like defaults (silent audio, a 30-element FX budget, zones collected in `zones`). */
export function stubCtx(p: Pick<OverlayCtx, 'g' | 'b' | 'root'> & Partial<OverlayCtx> & { doc?: Document }) {
  const doc = p.doc ?? document, zones: { name: string; rect: () => Box | DOMRect | null; clear: number }[] = [], live: HTMLElement[] = [];
  let layerEl: HTMLElement | null = null; const popsOn = new Set<string>(); const scene = p.scene ?? (doc.getElementById('scene') as HTMLElement | null) ?? p.root;
  const ctx: OverlayCtx = {
    scene, rm: () => false, dialogOpen: () => false, asset: f => `${import.meta.env.BASE_URL}assets/${f}`,
    audio: { play: () => false },
    fx: { admit: el => { while (live.length >= 30) live.shift()?.remove(); live.push(el); }, release: el => { const i = live.indexOf(el); if (i >= 0) live.splice(i, 1); } },
    layer: () => { if (!layerEl) { layerEl = doc.createElement('div'); layerEl.className = 'overlay-layer'; scene.append(layerEl); } return layerEl; },
    registerZone: (name, rect, clear = 16) => { zones.push({ name, rect, clear }); },
    pops: Object.assign({ set: (id: string, on: boolean) => { if (on) popsOn.add(id); else popsOn.delete(id); }, active: () => popsOn.size > 0 }, { clear: () => popsOn.clear() }),
    ...p,
  };
  return { ctx, zones, live, popsOn };
}
/** F6 `mountOverlay` subset: mounts each feature (flag-gated like F6) and returns render/destroy. */
export function mountStub(features: OverlayFeature[], ctx: OverlayCtx, isOn: (f: M5Flag) => boolean) {
  const live = features.filter(f => !f.flag || isOn(f.flag)), unmounts: (() => void)[] = [];
  for (const f of live) { const u = f.mount(ctx); if (u) unmounts.push(u); }
  return { features: live.map(f => f.id), render: (t: number) => { for (const f of live) f.render?.(ctx, t); }, destroy: () => { unmounts.reverse().forEach(u => u()); unmounts.length = 0; (ctx.pops as { clear?: () => void } | undefined)?.clear?.(); /* F6 v1.0: destroy() clears pops */ } };
}
