import './ui/styles.css';
import { balance } from './config/balance';
import { Game } from './game';
import { startAutosave } from './save/autosave';
import { bus, guardTabs } from './save/tab-guard';
import { readOnlyKV } from './save/save';
import { mountApp } from './ui/app';
import { Audio, AUDIO_UNLOCK_MS, withTimeout } from './ui/audio';

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
export const TWO_TAB_TEXT = "Egg Farm is open in another tab. Progress in this tab won't be saved.";
export const NO_STORAGE_TEXT = "Your browser isn't letting us save right now (low space or private mode), so progress won't be saved.";
/** AC14d: ask other tabs before the Game is built, so a second tab never writes the save (even the load-time save). */
async function probeTabs(): Promise<{ second: boolean }> {
  const t = guardTabs(bus(), () => {});
  await new Promise(r => setTimeout(r, 200));
  return { second: t.second };
}
async function boot() {
  const tabs = await probeTabs();
  const seedParam = new URLSearchParams(location.search).get('marketSeed'); // debug: fixed market RNG (MK-5)
  const g = new Game(balance, tabs.second ? readOnlyKV(localStorage) : localStorage, () => Date.now(), seedParam !== null ? (Number(seedParam) >>> 0) || 1 : undefined, VERSION);
  (window as any).eggfarmExportTelemetry = () => g.telemetry.exportJSON();
  (window as any).eggfarm = g; // debug/QA handle
  if (tabs.second) { g.readOnly = true; saveNotice(TWO_TAB_TEXT); }
  g.onStorageFail = () => saveNotice(NO_STORAGE_TEXT); if (g.storageFailed) saveNotice(NO_STORAGE_TEXT);
  const ui = mountApp(root, g, balance, audio, VERSION, { newGame: g.isNewGame, recovery: g.recovery });
  if (new URLSearchParams(location.search).get('debug') === '1') import('./debug/panel').then(m => m.mountDebug(g, balance));
  { const q = new URLSearchParams(location.search); if (q.get('perf') === '1') import('./debug/frame-sampler').then(m => m.mountPerfOverlay(q)); }
  function frame() { g.frame(); ui.render(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  setInterval(() => g.frame(), 1000); // keep sim moving if rAF is paused but timers still fire
  window.addEventListener('pagehide', () => g.endSession());
  startAutosave(() => g.save(), balance.save.autosaveIntervalS * 1000, window, document);
}
preload().then(() => {
  start.querySelector('.bar')?.remove();
  const b = document.createElement('button'); b.className = 'btn'; b.style.cssText = 'width:240px;min-height:56px'; b.textContent = 'Tap to start';
  b.onclick = async () => { b.disabled = true; await withTimeout(audio.unlock(), AUDIO_UNLOCK_MS); audio.play('tapStart'); start.remove(); boot(); };
  start.append(b);
}, showError);
