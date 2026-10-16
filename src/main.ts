import './ui/styles.css';
import { balance } from './config/balance';
import { Game } from './game';
import { startAutosave } from './save/autosave';
import { TabLease, channel } from './save/tab-lease';
import { IdbMirror, reconcile } from './save/idb-mirror';
import { mountApp } from './ui/app';
import { showTabGuardDialog } from './ui/save-recovery';
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
async function boot() {
  // Single-tab guard: this (newest) tab claims the save BEFORE reading it, so an older tab's next save is blocked and
  // offline earnings are granted only by the tab that owns the save.
  let playHere = false; try { playHere = sessionStorage.getItem('eggfarm.playHere') === '1'; sessionStorage.removeItem('eggfarm.playHere'); } catch { /* ignore */ }
  let gRef: Game | null = null;
  const lease = new TabLease(localStorage, channel(), () => gRef?.deactivate());
  const takeover = lease.claim(playHere);
  const seedParam = new URLSearchParams(location.search).get('marketSeed'); // debug: fixed market RNG (MK-5)
  // D2: newest valid copy of localStorage / IndexedDB wins.
  const mirror = await IdbMirror.open(); if (mirror) { try { reconcile(localStorage, await mirror.read(), balance); } catch { /* localStorage blocked: Game reports it */ } }
  if (!lease.owns()) { otherTabModal(); return; } // an even newer tab claimed while IndexedDB opened
  const g = new Game(balance, localStorage, () => Date.now(), seedParam !== null ? (Number(seedParam) >>> 0) || 1 : undefined, VERSION, mirror);
  gRef = g; g.canWrite = () => lease.owns(); g.onInactive = otherTabModal;
  if (takeover) g.telemetry.track('tab_guard_takeover', { reason: takeover });
  (window as any).eggfarmExportTelemetry = () => g.telemetry.exportJSON();
  (window as any).eggfarm = g; // debug/QA handle
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
  startAutosave(() => g.save(), balance.save.autosaveIntervalS * 1000, window, document);
}
preload().then(() => {
  start.querySelector('.bar')?.remove();
  const b = document.createElement('button'); b.className = 'btn'; b.style.cssText = 'width:240px;min-height:56px'; b.textContent = 'Tap to start';
  b.onclick = async () => { b.disabled = true; await withTimeout(audio.unlock(), AUDIO_UNLOCK_MS); audio.play('tapStart'); start.remove(); boot(); };
  start.append(b);
}, showError);
