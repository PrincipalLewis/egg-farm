import { balance } from './config/balance';
import { Game } from './game';
import { startAutosave } from './save/autosave';
import { mountUI } from './ui/render';
const g = new Game(balance, localStorage);
const render = mountUI(document.getElementById('app')!, g, balance);
function frame() { g.frame(); render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
setInterval(() => g.frame(), 1000); // keep sim moving if rAF is paused but timers still fire
startAutosave(() => g.save(), balance.save.autosaveIntervalS * 1000, window, document);
