/** Slim v5 attendance API (unchanged) + the v5 F6 overlay mount layer below (feature registry, spots, FX budget; no audio engine). */
import type { Game } from '../game';
import { DIALOG_SEL } from './onboarding';
import { explainerOpen } from './tracks-explainer';
import { flagOn, type M5Flag } from '../config/flags';
import type { Balance } from '../config/balance';
import { FX_MAX_LIVE, SPAWN_CLEAR_PX } from './overlay-spec';
import { domZones, layoutKey, spotCentres, toBox, validSpots, type Box, type LayoutKey, type Spot, type Zone } from './overlay-spots';
export type { Box, LayoutKey, Spot, SpotId, Zone } from './overlay-spots';

export type AttendedDoc = Pick<Document, 'visibilityState' | 'hasFocus'>;
export const attendedProbe = (doc: AttendedDoc = document): boolean =>
  doc.visibilityState === 'visible' && doc.hasFocus();

export interface SheetHandle {
  readonly id: string;
  opened(): void;
  closeComplete(): void;
  readonly isOpen: boolean;
}
const sheets = new Map<string, boolean>();
/** A closing sheet is still open. Call closeComplete only after its real lifecycle completes.
 * Layout-independent, including docked. Registering the same id shares one lifecycle entry. */
export function registerSheet(id: string): SheetHandle {
  if (!sheets.has(id)) sheets.set(id, false);
  return {
    id,
    opened: () => { sheets.set(id, true); },
    closeComplete: () => { sheets.set(id, false); },
    get isOpen() { return sheets.get(id) === true; },
  };
}
export const anySheetOpen = (): boolean => {
  for (const open of sheets.values()) if (open) return true;
  return false;
};
export const openSheets = (): string[] => [...sheets].filter(([, open]) => open).map(([id]) => id);
/** Unit-test isolation only; not exposed on window or a QA hook. */
export const clearSheets = (): void => { sheets.clear(); };

export interface DialogSources {
  sheet(): 'market' | 'upgrades' | null;
  /** Current docked landscape layout. Permanently docked Upgrades is a play surface, not a dialog. */
  docked?: () => boolean;
  doc?: Pick<Document, 'querySelector'>;
}
/** Existing dialogs/explainer and mobile Upgrades suspend attendance. Market remains a play surface.
 * Permanently docked Upgrades is not an open modal; registered sheets still suspend at every width. */
export const makeDialogOpen = (src: DialogSources) => (): boolean => {
  const doc = src.doc ?? document;
  const upgradesDialog = src.sheet() === 'upgrades' && !(src.docked?.() ?? false);
  return !!doc.querySelector(DIALOG_SEL) || explainerOpen(doc as Document) || upgradesDialog || anySheetOpen();
};
/** One Game probe shared by frame focus and player-sale suspension; always reads current state. */
export const wireAttended = (g: Pick<Game, 'setAttendedProbe'>, dialogOpen: () => boolean, doc: AttendedDoc = document): void =>
  g.setAttendedProbe(() => attendedProbe(doc) && !dialogOpen());

// ---------------------------------------------------------------- v5 F6 overlay mount layer (engineering/tasks/v5-f6-rebuild/API.md)
// Ported from #86 (2b4abf93 / bundle-f6 6307674) against rc/v5. The slim attendance exports above are unchanged. With no feature
// registered, or every feature's flag off, mountOverlay adds no DOM and no listeners, and render() is a no-op.

/** ≤ max live FX elements (layout-spec §6), shared by app.ts and every overlay feature; the oldest is recycled. */
export class FxBudget {
  max = FX_MAX_LIVE; readonly live: HTMLElement[] = [];
  admit(el: HTMLElement) { while (this.live.length >= this.max) this.live.shift()?.remove(); this.live.push(el); }
  release(el: HTMLElement) { const i = this.live.indexOf(el); if (i >= 0) this.live.splice(i, 1); }
  get count() { return this.live.length; }
}
export interface OverlayCtx {
  g: Game; b: Balance; root: HTMLElement; scene: HTMLElement;
  /** div.overlay-layer inside #scene, created on the first call (absent while nothing mounts). */
  layer(): HTMLElement;
  rm(): boolean; dialogOpen(): boolean;
  /** attendedProbe() && !dialogOpen(): the same signal Game's attended probe reads. */
  attended(): boolean;
  layout(): LayoutKey; spots(): Spot[]; validSpots(): Spot[];
  /** validSpots() ids: the shape Game.setSpotProbe wants (#111 R14/R15). */
  validSpotIds(): string[];
  /** Extra no-spawn zone read live on every validSpots() call; rect() null = absent. clear defaults to SPAWN_CLEAR_PX. */
  registerZone(name: string, rect: () => Box | DOMRect | null, clear?: number): void;
  /** F6-AC-SHEET: open => not attended, at every width. */
  registerSheet(id: string): SheetHandle;
  fx: FxBudget; asset(f: string): string;
}
export interface OverlayFeature {
  id: string;
  /** Mounted only while flagOn(b, flag); omit for always-on. */
  flag?: M5Flag;
  mount(ctx: OverlayCtx): void | (() => void);
  /** Once per rendered frame, after the app's own render. */
  render?(ctx: OverlayCtx, nowMs: number): void;
}
const FEATURES: OverlayFeature[] = [];
/** The one registration line a feature module needs (ui/features.ts imports the module). Re-registering an id replaces it. */
export function registerFeature(f: OverlayFeature): void {
  const i = FEATURES.findIndex(x => x.id === f.id); if (i >= 0) FEATURES.splice(i, 1, f); else FEATURES.push(f);
}
export const registeredFeatures = (): readonly OverlayFeature[] => FEATURES;
/** Unit-test isolation only. */
export const clearFeatures = (): void => { FEATURES.length = 0; };

export interface OverlayDeps { g: Game; b: Balance; root: HTMLElement; scene: HTMLElement; docked: Pick<MediaQueryList, 'matches'>;
  rm(): boolean; dialogOpen(): boolean; fx: FxBudget; asset(f: string): string; doc?: Document }
export interface OverlayHost { ctx: OverlayCtx; features: string[]; render(t: number): void; destroy(): void }
/** Mounts every registered feature whose flag is on, in registration order. */
export function mountOverlay(d: OverlayDeps): OverlayHost {
  const doc = d.doc ?? document; let layerEl: HTMLElement | null = null;
  const extra: { name: string; rect: () => Box | DOMRect | null; clear: number }[] = [];
  const vw = () => doc.documentElement.clientWidth || innerWidth, vh = () => doc.documentElement.clientHeight || innerHeight;
  const ctx: OverlayCtx = {
    g: d.g, b: d.b, root: d.root, scene: d.scene, rm: d.rm, dialogOpen: d.dialogOpen, fx: d.fx, asset: d.asset,
    attended: () => attendedProbe(doc) && !d.dialogOpen(),
    layer: () => { if (!layerEl) { layerEl = doc.createElement('div'); layerEl.className = 'overlay-layer'; d.scene.append(layerEl); } return layerEl; },
    layout: () => layoutKey(vw(), vh(), d.docked.matches),
    spots: () => { const q = (s: string) => doc.querySelector(s)?.getBoundingClientRect(); const sc = q('#scene'); if (!sc) return [];
      const qu = q('#queue'), me = q('#meter');
      return spotCentres(ctx.layout(), vw(), vh(), { scene: toBox(sc), queue: qu && toBox(qu), meter: me && toBox(me) }); },
    validSpots: () => {
      const zones: Zone[] = [...domZones(doc, d.docked.matches), ...extra.flatMap(z => { const r = z.rect(); return r ? [{ name: z.name, box: toBox(r), clear: z.clear }] : []; })];
      return validSpots(ctx.spots(), zones, vw(), vh());
    },
    validSpotIds: () => ctx.validSpots().map(s => s.id),
    registerZone: (name, rect, clear = SPAWN_CLEAR_PX) => { extra.push({ name, rect, clear }); },
    registerSheet,
  };
  const live = FEATURES.filter(f => !f.flag || flagOn(d.b, f.flag)), unmounts: (() => void)[] = [];
  for (const f of live) { const u = f.mount(ctx); if (u) unmounts.push(u); }
  const renderers = live.filter(f => f.render);
  return { ctx, features: live.map(f => f.id), render: t => { for (const f of renderers) f.render!(ctx, t); },
    destroy: () => { while (unmounts.length) unmounts.pop()!(); layerEl?.remove(); layerEl = null; } };
}
