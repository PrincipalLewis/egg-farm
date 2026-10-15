import { balance } from './config/balance';
import { Game } from './game';
import { startAutosave } from './save/autosave';
import { mountUI } from './ui/render';
const seedParam = new URLSearchParams(location.search).get('marketSeed'); // debug: fixed market RNG (MK-5)
const g = new Game(balance, localStorage, () => Date.now(), seedParam !== null ? (Number(seedParam) >>> 0) || 1 : undefined);
(window as any).eggfarmExportTelemetry = () => g.telemetry.exportJSON();
const render = mountUI(document.getElementById('app')!, g, balance);
function frame() { g.frame(); render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
setInterval(() => g.frame(), 1000); // keep sim moving if rAF is paused but timers still fire
window.addEventListener('pagehide', () => g.endSession());
startAutosave(() => g.save(), balance.save.autosaveIntervalS * 1000, window, document);
