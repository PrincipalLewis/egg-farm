/**
 * v5 F6: the UI overlay layer (m5.0-sizing.md §2 row F6, §4 hotspot 1). One place for what every M5 scene feature needs, so
 * golden egg / streak meter / broody mount through one registration line (ui/features.ts) instead of editing app.ts:
 *  - spawn spots: 8 per layout (Art & UX m4-timed-collectible.md v1.1 §2.1-§2.3, which superseded v1.0 §2), checked
 *    against LIVE rects of the no-spawn zones (+ zones features register: streak meter +16, broody box, …);
 *  - the attended signal: dialogOpen() (modal / Upgrades sheet / tracks explainer / recovery / rotate / alertdialog), with
 *    the Market sheet a play surface, never a dialog (D-HOP-2026-10-29-06 Q-F1c-1); attended = visible && focused && !dialogOpen();
 *  - the audio hook registry (QA contract decisions.md 2026-10-29 23:07: one {hook, file, tMs, semi} per sound started);
 *  - the reduced-motion switch; the FX budget (≤ 30 live elements).
 * Pure refactor while every M5 flag is off: no feature is registered, no DOM is added, nothing reads the spots.
 */
import { DIALOG_SEL } from './onboarding';
import { explainerOpen } from './tracks-explainer';
import type { Audio, SfxName } from './audio';
import { SFX } from './audio';
import { flagOn, type M5Flag } from '../config/flags';
import type { Balance } from '../config/balance';
import type { Game } from '../game';

// ---------------------------------------------------------------- spawn spots (Art v1.1 §2)
export type LayoutKey = 'phone-360' | 'phone-375' | 'docked' | 'docked-compact';
export type SpotId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
export interface Box { left: number; top: number; right: number; bottom: number }
export interface Spot { id: SpotId; x: number; y: number }
export const SPOT_IDS: SpotId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
/** Hit box 56 (visual 40), §2: ≥ 16 px clear of every zone and ≥ 16 px inside the viewport; 0 px for the ×N hens pill. */
export const HIT_PX = 56, CLEAR_PX = 16;
/** §2.2 1280×800 docked reference centres (S1..S8); docked layouts derive from these (§2.1). */
export const DOCKED_1280x800: readonly (readonly [number, number])[] = [[110, 240], [230, 330], [110, 440], [230, 540], [680, 240], [770, 330], [650, 440], [770, 560]];
const PHONE_F = [0.32, 0.50, 0.68, 0.86];
/** §2.1 layout key. `dockedMq` = the app's own matchMedia('(min-width:960px) and (orientation:landscape)'). */
export function layoutKey(vw: number, vh: number, dockedMq: boolean): LayoutKey {
  if (!dockedMq) return vw < 368 ? 'phone-360' : 'phone-375';
  return vw - 400 < 880 || vh < 700 ? 'docked-compact' : 'docked';
}
/** §2.1 spot centres (whole px) for a layout, from live rects (scene; docked-compact also queue + meter), plus safe-area insets. */
export function spotCentres(key: LayoutKey, vw: number, vh: number, r: { scene: Box; queue?: Box; meter?: Box }, inset = { left: 0, top: 0 }): Spot[] {
  let pts: [number, number][];
  if (key === 'phone-360' || key === 'phone-375') {
    const s = r.scene, h = s.bottom - s.top;
    pts = SPOT_IDS.map((_, i) => [i < 4 ? s.left + 42 : s.right - 42, s.top + Math.round(PHONE_F[i % 4] * h)]);
  } else if (key === 'docked') {
    const dx = (vw - 400 - 880) / 2, k = (vh - 56) / 744;
    pts = DOCKED_1280x800.map(([x, y]) => [x + dx, 56 + (y - 56) * k]);
  } else {
    const s = r.scene, L = s.left + 58, R = s.right - 44, yt = r.queue!.bottom + 48, yb = r.meter!.top - 48, ym = Math.round((yt + yb) / 2);
    pts = [[L, yt], [L, ym], [L, yb], [NaN, NaN], [R, yt], [R, ym], [R, yb], [NaN, NaN]]; // S4/S8 unused
  }
  return pts.map(([x, y], i) => ({ id: SPOT_IDS[i], x: Math.round(x) + inset.left, y: Math.round(y) + inset.top })).filter(p => Number.isFinite(p.x));
}
export interface Zone { name: string; box: Box; clear: number }
const hit = (p: Spot): Box => ({ left: p.x - HIT_PX / 2, top: p.y - HIT_PX / 2, right: p.x + HIT_PX / 2, bottom: p.y + HIT_PX / 2 });
/** Gap between two boxes (0 when they touch/overlap; Chebyshev-style per axis, the clearance §2 measures). */
export const gap = (a: Box, b: Box) => Math.max(0, Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom));
const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
/** §2 runtime rule 2: keep spots whose hit box is ≥ clear px from every zone (0 = must not overlap) and ≥ 16 px inside the viewport. */
export function validSpots(spots: Spot[], zones: Zone[], vw: number, vh: number): Spot[] {
  return spots.filter(p => { const h = hit(p);
    if (h.left < CLEAR_PX || h.top < CLEAR_PX || h.right > vw - CLEAR_PX || h.bottom > vh - CLEAR_PX) return false;
    return zones.every(z => z.clear > 0 ? !overlaps(h, z.box) && gap(h, z.box) >= z.clear : !overlaps(h, z.box)); });
}
/** The §2 no-spawn zones read live from the DOM. Features add theirs (streak meter, broody box, chips) with registerZone. */
export interface DomZone { name: string; sel: string; clear: number; clipTo?: string; /** zone even while transparent (toast strip) */ always?: boolean }
export const DOM_ZONES: readonly DomZone[] = [
  { name: 'hud', sel: 'header.hud', clear: CLEAR_PX }, { name: 'toast', sel: '.toast', clear: CLEAR_PX, always: true },
  { name: 'queue', sel: '#queue', clear: CLEAR_PX }, { name: 'coop', sel: '#coop', clear: CLEAR_PX, clipTo: '.farm' },
  { name: 'nest', sel: '#scene .nest', clear: CLEAR_PX }, { name: 'full', sel: '#full', clear: CLEAR_PX },
  { name: 'henpill', sel: '#henpill', clear: 0 }, { name: 'meter', sel: '#meter', clear: CLEAR_PX }, { name: 'goal', sel: '#goal', clear: CLEAR_PX },
  { name: 'collect', sel: '#collect', clear: CLEAR_PX }, { name: 'nav', sel: 'nav.actions', clear: CLEAR_PX },
  { name: 'sheet', sel: '#panel-layer.open', clear: CLEAR_PX }, { name: 'modal', sel: '#modal-layer.open', clear: CLEAR_PX },
];
/** Docked only: the docked column (#panel-layer is a fixed full-screen layer at phone layouts, so it is a zone there only while open). */
export const DOCKED_COLUMN: DomZone = { name: 'docked-column', sel: '#panel-layer', clear: CLEAR_PX };
const shown = (el: Element | null, always = false): el is HTMLElement => { if (!el || (el as HTMLElement).hidden) return false; const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && (always || (cs.visibility !== 'hidden' && +cs.opacity > 0)); };
const box = (r: DOMRect | Box): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
export function domZones(doc: Document = document, docked = false): Zone[] {
  const out: Zone[] = [];
  for (const z of docked ? [...DOM_ZONES, DOCKED_COLUMN] : DOM_ZONES) { const el = doc.querySelector(z.sel); if (!shown(el, z.always)) continue; let b = box(el.getBoundingClientRect());
    if (z.clipTo) { const c = doc.querySelector(z.clipTo)?.getBoundingClientRect(); if (c) b = { left: Math.max(b.left, c.left), top: Math.max(b.top, c.top), right: Math.min(b.right, c.right), bottom: Math.min(b.bottom, c.bottom) }; }
    out.push({ name: z.name, box: b, clear: z.clear }); }
  return out;
}

// ---------------------------------------------------------------- attended (F6a probe absorbed; Q-F1c-1)
export type AttendedDoc = Pick<Document, 'visibilityState' | 'hasFocus'>;
/** true iff document.visibilityState === 'visible' && document.hasFocus() (F6a, unchanged). */
export const attendedProbe = (doc: AttendedDoc = document): boolean => doc.visibilityState === 'visible' && doc.hasFocus();
export type SheetName = 'market' | 'upgrades' | null;
export interface DialogSources { sheet(): SheetName; doc?: Pick<Document, 'querySelector'> }
/** F6 dialogOpen(): a modal (settings/welcome/confirm, recovery, rotate prompt, any alertdialog = onboarding DIALOG_SEL), the tracks
 *  explainer, or the Upgrades sheet. The Market sheet is a play surface (Q-F1c-1): it never counts, whatever else is shown. */
export const makeDialogOpen = (src: DialogSources) => (): boolean => {
  const doc = src.doc ?? document;
  return !!doc.querySelector(DIALOG_SEL) || explainerOpen(doc as Document) || src.sheet() === 'upgrades';
};
/** The one wiring line for Game's attended probe: visible && focused && !dialogOpen(). The UI never passes `suspended` for sheet sales. */
export const wireAttended = (g: Pick<Game, 'setAttendedProbe'>, dialogOpen: () => boolean, doc: AttendedDoc = document) =>
  g.setAttendedProbe(() => attendedProbe(doc) && !dialogOpen());

// ---------------------------------------------------------------- audio hooks (decisions.md 2026-10-29 23:07, GE-AC24)
export interface AudioLogEntry { hook: string; file: string; tMs: number; semi: number }
/** hook → asset file (no extension). Built-in hooks are the SFX names; features add theirs with registerAudioHook. The sell asset
 *  stays `sfx-sell-coin` (accepted stand-in until sfx-sell-01..03 land; not renamed). */
export const AUDIO_HOOKS = new Map<string, string>(Object.entries(SFX));
export const registerAudioHook = (hook: string, file: string, audio?: Pick<Audio, 'load'>) => { AUDIO_HOOKS.set(hook, file); audio?.load(file); };
export class AudioHooks {
  /** `audio` may be a test double with only play(name) (older jsdom mounts): built-in hooks still reach it. The QA log lives on
   *  Audio (Audio.qaLog) so sounds started outside the overlay (tapStart in main.ts) are logged too. */
  constructor(private audio: Partial<Pick<Audio, 'playFile' | 'play'>>) {}
  /** Plays a registered hook; true iff a sound actually started. semi defaults to 0 (+2 only for Frenzy player sells, GE-AC24). */
  play(hook: string, opts: { semi?: number; minGapMs?: number } = {}): boolean {
    const file = AUDIO_HOOKS.get(hook); if (!file) return false;
    const semi = opts.semi ?? 0, gapMs = opts.minGapMs ?? 60;
    if (this.audio.playFile) return this.audio.playFile(file, gapMs, semi, hook);
    this.audio.play?.(hook as SfxName, gapMs); return false;
  }
  sfx = (n: SfxName) => { this.play(n); };
}

// ---------------------------------------------------------------- reduced motion
/** Same semantics as before F6: the in-game toggle OR prefers-reduced-motion, applied as html.reduced-motion + root.rm. */
export function reducedMotion(flag: () => boolean, root: HTMLElement, mq: Pick<MediaQueryList, 'matches'> = matchMedia('(prefers-reduced-motion: reduce)')) {
  const rm = () => flag() || mq.matches;
  const apply = () => { document.documentElement.classList.toggle('reduced-motion', rm()); root.classList.toggle('rm', rm()); };
  return { rm, apply };
}

// ---------------------------------------------------------------- FX budget
/** ≤ max live FX elements (30, layout-spec §6); the oldest is recycled. `max` is QA-settable (eggfarmQa.fx.setMax). */
export class FxBudget {
  max = 30; readonly live: HTMLElement[] = [];
  admit(el: HTMLElement) { while (this.live.length >= this.max) this.live.shift()?.remove(); this.live.push(el); }
  release(el: HTMLElement) { const i = this.live.indexOf(el); if (i >= 0) this.live.splice(i, 1); }
  get count() { return this.live.length; }
}

// ---------------------------------------------------------------- feature registration
export interface OverlayCtx {
  g: Game; b: Balance; root: HTMLElement; scene: HTMLElement;
  /** The overlay layer inside #scene, created on first use (absent while no feature mounts). */
  layer(): HTMLElement;
  rm(): boolean; audio: AudioHooks; fx: FxBudget; dialogOpen(): boolean; attended(): boolean;
  layout(): LayoutKey; spots(): Spot[]; validSpots(): Spot[];
  registerZone(name: string, rect: () => Box | null, clear?: number): void;
  asset(f: string): string;
}
export interface OverlayFeature {
  id: string;
  /** Mounted only while this M5 flag is on (flagOn); omit for always-on. */
  flag?: M5Flag;
  mount(ctx: OverlayCtx): void | (() => void);
  /** Called once per rendered frame after the app's own render. */
  render?(ctx: OverlayCtx, nowMs: number): void;
}
const REGISTRY: OverlayFeature[] = [];
/** The one registration line a feature module needs (ui/features.ts lists them). Re-registering an id replaces it. */
export function registerFeature(f: OverlayFeature) { const i = REGISTRY.findIndex(x => x.id === f.id); if (i >= 0) REGISTRY.splice(i, 1, f); else REGISTRY.push(f); }
export const registeredFeatures = (): readonly OverlayFeature[] => REGISTRY;
export const clearFeatures = () => { REGISTRY.length = 0; };

export interface OverlayDeps { g: Game; b: Balance; root: HTMLElement; scene: HTMLElement; docked: Pick<MediaQueryList, 'matches'>;
  rm(): boolean; audio: AudioHooks; fx: FxBudget; dialogOpen(): boolean; asset(f: string): string; doc?: Document }
/** Mounts every registered feature whose flag is on. With none (F6), it adds nothing to the DOM and render() is a no-op. */
export function mountOverlay(d: OverlayDeps) {
  const doc = d.doc ?? document; let layerEl: HTMLElement | null = null; const extra: { name: string; rect: () => Box | null; clear: number }[] = [];
  const vw = () => doc.documentElement.clientWidth || innerWidth, vh = () => doc.documentElement.clientHeight || innerHeight;
  const ctx: OverlayCtx = {
    g: d.g, b: d.b, root: d.root, scene: d.scene, rm: d.rm, audio: d.audio, fx: d.fx, dialogOpen: d.dialogOpen, asset: d.asset,
    attended: () => attendedProbe(doc) && !d.dialogOpen(),
    layer: () => { if (!layerEl) { layerEl = doc.createElement('div'); layerEl.className = 'overlay-layer'; d.scene.append(layerEl); } return layerEl; },
    layout: () => layoutKey(vw(), vh(), d.docked.matches),
    spots: () => { const q = (s: string) => doc.querySelector(s)?.getBoundingClientRect(); const sc = q('#scene'); if (!sc) return [];
      return spotCentres(ctx.layout(), vw(), vh(), { scene: sc, queue: q('#queue'), meter: q('#meter') }); },
    validSpots: () => validSpots(ctx.spots(), [...domZones(doc, d.docked.matches), ...extra.flatMap(z => { const r = z.rect(); return r ? [{ name: z.name, box: r, clear: z.clear }] : []; })], vw(), vh()),
    registerZone: (name, rect, clear = CLEAR_PX) => { extra.push({ name, rect, clear }); },
  };
  const live = REGISTRY.filter(f => !f.flag || flagOn(d.b, f.flag)), unmounts: (() => void)[] = [];
  for (const f of live) { const u = f.mount(ctx); if (u) unmounts.push(u); }
  return { ctx, features: live.map(f => f.id), render: (t: number) => { for (const f of live) f.render?.(ctx, t); }, destroy: () => unmounts.forEach(u => u()) };
}
