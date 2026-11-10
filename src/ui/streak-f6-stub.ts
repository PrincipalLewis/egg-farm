/**
 * v5 F6 STUB (temporary; the ONLY F6 seam of the streak / tapCoins UI). F6 (Features: spots / feature registry / mount host) is not
 * on rc/v5 yet and no F6 API note has been published, so this mirrors the subset of `src/ui/overlay.ts` on
 * origin/feat/v5-ui-f6-overlay @ 2b4abf93 (OverlayFeature / OverlayCtx / AudioHooks.play / FxBudget / registerZone) that
 * ui/streak-meter.ts uses. Names and signatures match that branch so the swap is mechanical:
 *   1. delete this file;
 *   2. in ui/streak-meter.ts import the types from './overlay' (OverlayFeature, OverlayCtx) instead of './streak-f6-stub';
 *   3. ui/features.ts: `registerFeature(streakMeter)` and `STREAK_SFX` entries via registerAudioHook (the line F6 reserves for #2).
 * Nothing in the app imports this file, so it adds no DOM and no behaviour while unused.
 */
import type { Balance } from '../config/balance';
import type { M5Flag } from '../config/flags';
import type { Game } from '../game';

export interface Box { left: number; top: number; right: number; bottom: number }
/** The OverlayCtx members the streak feature reads (F6 2b4abf93 `OverlayCtx`, same names). */
export interface OverlayCtx {
  g: Pick<Game, 'state' | 'on'>; b: Balance; root: HTMLElement; scene: HTMLElement;
  /** F6's overlay layer; the pops go on the app's #fx-layer when present (fixed, full viewport), else here. */
  layer(): HTMLElement;
  rm(): boolean;
  audio: { play(hook: string, opts?: { semi?: number; minGapMs?: number }): boolean };
  fx: { admit(el: HTMLElement): void; release(el: HTMLElement): void };
  dialogOpen(): boolean;
  /** No-spawn zone for golden eggs / Broody (meter box + 16 px, golden R14 / ST-AC21). */
  registerZone(name: string, rect: () => Box | null, clear?: number): void;
  asset(f: string): string;
}
/** F6 2b4abf93 `OverlayFeature`. */
export interface OverlayFeature {
  id: string;
  flag?: M5Flag;
  mount(ctx: OverlayCtx): void | (() => void);
  render?(ctx: OverlayCtx, nowMs: number): void;
}

/** Test / pre-F6 harness: a ctx with F6-like defaults (silent audio, a 30-element FX budget, zones collected in `zones`). */
export function stubCtx(p: Pick<OverlayCtx, 'g' | 'b' | 'root'> & Partial<OverlayCtx> & { doc?: Document }) {
  const doc = p.doc ?? document, zones: { name: string; rect: () => Box | null; clear: number }[] = [], live: HTMLElement[] = [];
  let layerEl: HTMLElement | null = null; const scene = p.scene ?? (doc.getElementById('scene') as HTMLElement | null) ?? p.root;
  const ctx: OverlayCtx = {
    scene, rm: () => false, dialogOpen: () => false, asset: f => `${import.meta.env.BASE_URL}assets/${f}`,
    audio: { play: () => false },
    fx: { admit: el => { while (live.length >= 30) live.shift()?.remove(); live.push(el); }, release: el => { const i = live.indexOf(el); if (i >= 0) live.splice(i, 1); } },
    layer: () => { if (!layerEl) { layerEl = doc.createElement('div'); layerEl.className = 'overlay-layer'; scene.append(layerEl); } return layerEl; },
    registerZone: (name, rect, clear = 16) => { zones.push({ name, rect, clear }); },
    ...p,
  };
  return { ctx, zones, live };
}
/** F6 `mountOverlay` subset: mounts each feature (flag-gated like F6) and returns render/destroy. */
export function mountStub(features: OverlayFeature[], ctx: OverlayCtx, flagOn: (f: M5Flag) => boolean) {
  const live = features.filter(f => !f.flag || flagOn(f.flag)), unmounts: (() => void)[] = [];
  for (const f of live) { const u = f.mount(ctx); if (u) unmounts.push(u); }
  return { features: live.map(f => f.id), render: (t: number) => { for (const f of live) f.render?.(ctx, t); }, destroy: () => unmounts.forEach(u => u()) };
}
