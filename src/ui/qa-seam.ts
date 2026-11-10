/**
 * v5 F6 + P8: the build:qa-only `window.eggfarmQa` seam (HoE 22:51 done-definition; TASK HoE/p8-qa-hooks).
 * Installed only under IOS_FLAG_ENABLED (__IOS_FLAG__ = mode !== 'production'), same guard as eggfarmQaFitBanners,
 * so release dead-code-eliminates it; scripts/check-release-build.mjs rejects any 'eggfarmQa' in the release bundle.
 *
 * F6 shared hooks:
 *   audio.log / fx.setMax / menu.open|close / sheet.stepClose / overlay.spots
 * P8 hooks (HOE-PORT-REQUEST-groupC):
 *   workers.atRisk()  per-worker $/s (sales-stopped §4.8); Manage target = costliest, ties WORKERS order
 *   layout.showZones() force toast + Full! + ×N hens pill visible (SS-37 / SS-38f)
 * Blocked until Features V51-SS-1 / golden UI land (reported, not faked):
 *   fatigue.force / fatigue.setShare / fatigue.read / stall.force / tc.spawn
 */
import { IOS_FLAG_ENABLED } from './ios-tip';
import type { Audio } from './audio';
import { domZones, type AudioLogEntry, type FxBudget, type LayoutKey, type OverlayCtx, type Spot, type Zone } from './overlay';
import type { Game } from '../game';
import type { Balance } from '../config/balance';
import { workersAtRisk } from '../econ/income';
import type { WorkerId } from '../sim/workers';

export interface EggfarmQa {
  audio: { readonly log: AudioLogEntry[] };
  fx: { setMax(n: number): void; readonly max: number; readonly count: number };
  menu: { open(): void; close(): void };
  sheet: { stepClose(): string | null };
  overlay?: { spots(): { layout: LayoutKey; spots: Spot[]; valid: Spot[]; zones: Zone[] } };
  workers?: { atRisk(): Record<WorkerId, number> };
  layout?: { showZones(): void };
  /** Present as a named stub that throws with the Features blocker; not a working cue force. */
  fatigue?: {
    force(state: 'tired' | 'asleep' | 'none'): void;
    setShare(share: number): void;
    read(): { loss_per_s: number; loss_share: number; n_tired: number; n_asleep: number; n_paused: number };
  };
  stall?: { force(on: boolean): void };
  tc?: { spawn(opts: { spot: string }): void };
}
export interface QaSeamDeps {
  audio: Pick<Audio, 'qaLog'>;
  fx: FxBudget;
  menu: { open(): void; close(): void };
  sheet: { stepClose(): string | null };
  overlay?: Pick<OverlayCtx, 'layout' | 'spots' | 'validSpots'>;
  game?: Game;
  balance?: Balance;
  showZones?: () => void;
}

const P8_BLOCKED = (name: string) => {
  throw new Error(
    `eggfarmQa.${name} blocked: fatigueCue/salesStopped UI and golden spawn are not on the stacked base ` +
      `(Features V51-SS-1 / golden UI). See engineering/tasks/p8-qa-hooks/HANDOFF.md.`,
  );
};

export function installQaSeam(d: QaSeamDeps, w: any = window): EggfarmQa | null {
  if (!IOS_FLAG_ENABLED) return null;
  const log: AudioLogEntry[] = d.audio.qaLog ?? (d.audio.qaLog = []);
  const qa: EggfarmQa = {
    audio: { log },
    fx: { setMax: n => { d.fx.max = Math.max(0, Math.floor(n)); }, get max() { return d.fx.max; }, get count() { return d.fx.count; } },
    menu: { open: () => d.menu.open(), close: () => d.menu.close() },
    sheet: { stepClose: () => d.sheet.stepClose() },
    ...(d.overlay ? { overlay: { spots: () => { const o = d.overlay!, layout = o.layout();
      return { layout, spots: o.spots(), valid: o.validSpots(), zones: domZones(document, layout === 'docked' || layout === 'docked-compact') }; } } } : {}),
    ...(d.game && d.balance ? { workers: { atRisk: () => workersAtRisk(d.game!.state, d.balance!) } } : {}),
    ...(d.showZones ? { layout: { showZones: () => d.showZones!() } } : {}),
    fatigue: {
      force: () => P8_BLOCKED('fatigue.force'),
      setShare: () => P8_BLOCKED('fatigue.setShare'),
      read: () => P8_BLOCKED('fatigue.read'),
    },
    stall: { force: () => P8_BLOCKED('stall.force') },
    tc: { spawn: () => P8_BLOCKED('tc.spawn') },
  };
  w.eggfarmQa = qa; return qa;
}
