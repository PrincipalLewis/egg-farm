/**
 * v5 F6: the build:qa-only `window.eggfarmQa` seam (HoE 22:51 done-definition). Installed only under IOS_FLAG_ENABLED
 * (__IOS_FLAG__ = mode !== 'production'), same guard as eggfarmQaFitBanners, so release dead-code-eliminates it;
 * scripts/check-release-build.mjs rejects any 'eggfarmQa' in the release bundle. F6 owns these shared hooks:
 *   audio.log        one {hook, file, tMs, semi} per sound actually started (decisions.md 2026-10-29 23:07, GE-AC24); semi 0 default
 *   fx.setMax(n)     FX budget cap (default 30, layout-spec §6), for FX-budget ACs
 *   menu.open()      opens the Settings menu (modal); menu.close() closes any open modal
 *   sheet.stepClose()  one Escape-like close step: the open modal first, else the open sheet; returns what it closed (or null)
 * Feature PRs extend the object (golden egg, streak, broody) in their own modules, never by editing app.ts.
 */
import { IOS_FLAG_ENABLED } from './ios-tip';
import type { Audio } from './audio';
import type { AudioLogEntry, FxBudget } from './overlay';

export interface EggfarmQa {
  audio: { readonly log: AudioLogEntry[] };
  fx: { setMax(n: number): void; readonly max: number; readonly count: number };
  menu: { open(): void; close(): void };
  sheet: { stepClose(): string | null };
}
export interface QaSeamDeps { audio: Pick<Audio, 'qaLog'>; fx: FxBudget; menu: { open(): void; close(): void }; sheet: { stepClose(): string | null } }

export function installQaSeam(d: QaSeamDeps, w: any = window): EggfarmQa | null {
  if (!IOS_FLAG_ENABLED) return null;
  const log: AudioLogEntry[] = d.audio.qaLog ?? (d.audio.qaLog = []);
  const qa: EggfarmQa = {
    audio: { log },
    fx: { setMax: n => { d.fx.max = Math.max(0, Math.floor(n)); }, get max() { return d.fx.max; }, get count() { return d.fx.count; } },
    menu: { open: () => d.menu.open(), close: () => d.menu.close() },
    sheet: { stepClose: () => d.sheet.stepClose() },
  };
  w.eggfarmQa = qa; return qa;
}
