import './ui/styles.css';
import { balance } from './config/balance';
import { Game } from './game';
import { newerStoredVersion } from './save/save';
import { startAutosave } from './save/autosave';
import { TabLease, channel } from './save/tab-lease';
import { IdbMirror, reconcile } from './save/idb-mirror';
import { mountApp } from './ui/app';
import { showTabGuardDialog, showNewerSaveDialog } from './ui/save-recovery';
import { IOS_FLAG_ENABLED } from './ui/ios-tip';
import { Audio, AUDIO_UNLOCK_MS, withTimeout } from './ui/audio';
import { RenderPump } from './ui/render-pump';

import { BUILD_ID } from './build-id';
const VERSION = BUILD_ID;
const ASSETS = ['icon-coin', 'icon-egg', 'icon-settings', 'icon-nest', 'icon-coop', 'icon-market', 'icon-upgrade', 'icon-customer', 'icon-close',
  'icon-offline-earnings', 'nest-eggs', 'char-chicken', 'coop-l1', 'coop-l5', 'coop-l10', 'coop-l20', 'icon-manage', 'icon-manage-all', 'ring-cooldown', 'overlay-yawn'].map(n => `${import.meta.env.BASE_URL}assets/${n}.svg`);
const root = document.getElementById('app')!;
const audio = new Audio(`${import.meta.env.BASE_URL}assets/audio/`);

// 3.1 Loading / Tap to start (the tap is the audio-unlock gesture)
const start = document.createElement('div'); start.className = 'start';
start.innerHTML = `<div class="logo">Egg Farm</div><img src="${ASSETS.find(a => a.includes('char-chicken'))}" width="96" height="96" alt=""><div class="bar"><i></i></div>`;
document.body.append(start);
const bar = start.querySelector('.bar i') as HTMLElement;

async function preload() {
  let done = 0;
  await Promise.all([...ASSETS.map(src => new Promise<void>((res, rej) => { const i = new Image(); i.onload = () => { bar.style.width = `${(++done / ASSETS.length) * 100}%`; res(); }; i.onerror = rej; i.src = src; })),
    document.fonts?.ready]);
}
function showError() {
  start.querySelector('.bar')?.remove(); start.querySelector('button')?.remove();
  const b = document.createElement('button'); b.className = 'btn secondary'; b.textContent = "Couldn't load — Retry"; b.onclick = () => location.reload(); start.append(b);
}
/** AC14c/AC14d: one persistent, polite notice (shown once). */
function saveNotice(text: string) {
  if (document.querySelector('.save-warn')) return;
  const n = document.createElement('div'); n.className = 'save-warn'; n.setAttribute('role', 'status'); n.textContent = text; document.body.append(n);
}
export const NO_STORAGE_TEXT = "Your browser isn't letting us save right now (low space or private mode), so progress won't be saved.";
/** Single-tab guard: this tab lost the save. Sim/saving already stopped (Game.deactivate); freeze render, mute, show notice. */
let frozen = false;
function otherTabModal() {
  frozen = true; audio.mute();
  showTabGuardDialog(f => `${import.meta.env.BASE_URL}assets/${f}`, [root], () => {
    try { sessionStorage.setItem('eggfarm.playHere', '1'); } catch { /* ignore */ }
    setTimeout(() => location.reload(), 0); // let "Loading…" paint first
  });
}
/** Refused newer-build save: a read-only Game (telemetry only, mirror null, no save on load) and the session-long layer.
 *  No lease, UI, sim, autosave or pagehide save. Nit n1: there is intentionally no Game handle or lease callback here. */
function refuseNewer(version: number, idbRaw: string | null) {
  try { new Game(balance, localStorage, () => Date.now(), undefined, VERSION, null, idbRaw); } catch { /* storage blocked: still refuse */ }
  showNewerSaveDialog(a => `${import.meta.env.BASE_URL}assets/${a}`, version, () => location.reload());
}
async function boot() {
  const asset = (a: string) => `${import.meta.env.BASE_URL}assets/${a}`;
  // M4A-31(b)/(f)6 + review M1: the newer-save check runs FIRST, before the flush request, the lease claim, reconcile or
  // any Game write. It covers localStorage main, .bak and the IndexedDB copy. A refused tab never joins the single-tab
  // guard (so a live tab is never frozen or made to save by it) and writes no save key anywhere.
  const mirror = await IdbMirror.open();
  let idbRaw: string | null = null; if (mirror) idbRaw = await mirror.read();
  let preNewer: number | null = null; try { preNewer = newerStoredVersion(localStorage, idbRaw); } catch { /* localStorage blocked: Game reports it */ }
  if (preNewer !== null) { refuseNewer(preNewer, idbRaw); return; }
  // Single-tab guard: this (newest) tab claims the save BEFORE reading it, so an older tab's next save is blocked and
  // offline earnings are granted only by the tab that owns the save.
  let playHere = false; try { playHere = sessionStorage.getItem('eggfarm.playHere') === '1'; sessionStorage.removeItem('eggfarm.playHere'); } catch { /* ignore */ }
  let gRef: Game | null = null;
  const lease = new TabLease(localStorage, channel(), () => gRef?.deactivate());
  await lease.requestFlush(300); // the current owner saves its latest state and holds
  // D2: re-read IndexedDB BEFORE the claim (the owner may just have flushed into it; its write transaction was created
  // before this read, so the read sees it). Review minor main.ts:79-80: re-check for a newer save here too, so a newer
  // build that saved during the flush is refused BEFORE we claim, and the live tab never flashes 'Game open in another tab'.
  // From here to `new Game` there is no await, so nothing else can save in between.
  if (mirror) idbRaw = await mirror.read();
  let preNewer2: number | null = null; try { preNewer2 = newerStoredVersion(localStorage, idbRaw); } catch { /* blocked */ }
  if (preNewer2 !== null) { lease.stop(); refuseNewer(preNewer2, idbRaw); return; }
  const takeover = lease.claim(playHere);
  const seedParam = new URLSearchParams(location.search).get('marketSeed'); // debug: fixed market RNG (MK-5)
  let restored = false; // save_restore fires only when the IndexedDB copy actually replaced localStorage (QA D1)
  if (mirror) { try { restored = reconcile(localStorage, idbRaw, balance) === 'idb'; } catch { /* localStorage blocked: Game reports it */ } }
  if (!lease.owns()) { otherTabModal(); return; } // an even newer tab claimed while IndexedDB opened
  const g = new Game(balance, localStorage, () => Date.now(), seedParam !== null ? (Number(seedParam) >>> 0) || 1 : undefined, VERSION, mirror, idbRaw);
  if (g.newerSave !== null) { // race: a newer build saved during the hand-over. Refuse; Game is read-only and never wrote.
    lease.release(); lease.stop(); showNewerSaveDialog(asset, g.newerSave, () => location.reload()); return;
  }
  gRef = g; g.canWrite = () => lease.owns(); lease.onFlush = () => g.flushForHandover(); g.onInactive = otherTabModal;
  // QA BUG-2: a newer build saved while this tab was live (found right before a write). Game already stopped all writes
  // and the sim; release the lease, stop autosave, freeze render and show the session-long .newer-save layer.
  let stopAutosave: (() => void) | null = null;
  g.onNewerSave = v => { lease.release(); lease.stop(); stopAutosave?.(); frozen = true; audio.mute(); showNewerSaveDialog(asset, v, () => location.reload()); };
  if (takeover) g.telemetry.track('tab_guard_takeover', { reason: takeover });
  if (restored) g.telemetry.track('save_restore', { source: 'idb' });
  // The only release global (allowlist in check-release-build): read-only, no install_id. See Telemetry.snapshotJSON.
  (window as any).eggfarmExportTelemetry = () => g.telemetry.snapshotJSON();
  if (IOS_FLAG_ENABLED) (window as any).eggfarm = g; // debug/QA handle, compiled out of release (__IOS_FLAG__, QA rc1 item 2)
  g.onStorageFail = () => saveNotice(NO_STORAGE_TEXT); if (g.storageFailed) saveNotice(NO_STORAGE_TEXT);
  const ui = mountApp(root, g, balance, audio, VERSION, { newGame: g.isNewGame, recovery: g.recovery });
  // CEO ruling: debug globals stay out of release. ui.rates() remains on the mountApp() return for m3/rc1-ui.
  if (IOS_FLAG_ENABLED) (window as any).eggfarmUi = ui; // dev/QA builds only (__IOS_FLAG__), checked by check-release-build
  // D3/D4 (rc1): ?debug=1 cheat panel and ?perf=1 SM-9 sampler exist only in QA/dev builds. Same build-time flag as the
  // eggfarmOnb/eggfarmQaRecovery hooks (__IOS_FLAG__ = mode !== 'production'): release dead-code-eliminates both chunks.
  if (IOS_FLAG_ENABLED) {
    const q = new URLSearchParams(location.search);
    if (q.get('debug') === '1') import('./debug/panel').then(m => m.mountDebug(g, balance));
    if (q.get('perf') === '1') import('./debug/frame-sampler').then(m => m.mountPerfOverlay(q));
  }
  // S2-4b: sim and UI always advance together; a timer fallback covers paused/throttled rAF (was sim-only, so the UI froze).
  // Tab guard: once frozen (older tab) neither the sim nor the UI advances.
  new RenderPump(() => { if (frozen) return; g.frame(); ui.render(); }, { raf: cb => requestAnimationFrame(cb), setInterval: (cb, ms) => setInterval(cb, ms), now: () => performance.now() }).start();
  window.addEventListener('pagehide', () => { g.endSession(); lease.release(); });
  stopAutosave = startAutosave(() => g.save(), balance.save.autosaveIntervalS * 1000, window, document);
}
preload().then(() => {
  start.querySelector('.bar')?.remove();
  const b = document.createElement('button'); b.className = 'btn'; b.style.cssText = 'width:240px;min-height:56px'; b.textContent = 'Tap to start';
  b.onclick = async () => { b.disabled = true; await withTimeout(audio.unlock(), AUDIO_UNLOCK_MS); audio.play('tapStart'); start.remove(); boot(); };
  start.append(b);
}, showError);
