/** QA/dev debug panel, loaded only with ?debug=1 (separate chunk). Mutates state via Game, never via the UI. */
import type { Game } from '../game';
import type { Balance } from '../config/balance';
import * as S from '../sim/state';
import { resetProgress } from '../save/save';
export function mountDebug(g: Game, b: Balance) {
  const el = document.createElement('details'); el.className = 'dbg'; el.open = true;
  el.innerHTML = `<summary>debug</summary><pre id="dbgInfo"></pre><div>
    <button data-a="coins100">+$100</button><button data-a="coins10k">+$10K</button><button data-a="eggs">+100 eggs</button><button data-a="fill">Fill coop</button>
    <button data-a="t60">+60 s</button><button data-a="t600">+10 min</button><button data-a="cust">+customer</button><button data-a="clearq">Clear queue</button>
    <button data-a="f+">Farm +1</button><button data-a="f-">Farm −1</button><button data-a="c+">Coll +1</button><button data-a="c-">Coll −1</button>
    <button data-a="off1h">Offline 1h (reload)</button><button data-a="off3h">Offline 3h (reload)</button>
    <button data-a="onb">Replay onboarding</button><button data-a="tele">Export telemetry</button><button data-a="reset">Reset save</button></div>`;
  document.body.append(el);
  const info = el.querySelector('#dbgInfo')!;
  const set = (patch: Partial<S.GameState>) => { g.state = { ...g.state, ...patch }; g.save(); };
  const clampL = (L: number) => Math.max(0, Math.min(b.maxLevel, L));
  el.addEventListener('click', e => {
    const a = (e.target as HTMLElement).dataset?.a; if (!a) return; const s = g.state;
    switch (a) {
      case 'coins100': set({ coinsCents: s.coinsCents + 100_00 }); break;
      case 'coins10k': set({ coinsCents: s.coinsCents + 10_000_00 }); break;
      case 'eggs': set({ basket: s.basket + 100 }); break;
      case 'fill': set({ coop: S.coopCapacity(s.farmLevel, b) }); break;
      case 't60': g.debugAdvance(60_000); break;
      case 't600': for (let i = 0; i < 10; i++) g.debugAdvance(60_000); break;
      case 'cust': set({ nextCustomerInS: 0.01 }); break;
      case 'clearq': set({ customers: [] }); break;
      case 'f+': case 'f-': set({ farmLevel: clampL(s.farmLevel + (a === 'f+' ? 1 : -1)) }); break;
      case 'c+': case 'c-': set({ collectionLevel: clampL(s.collectionLevel + (a === 'c+' ? 1 : -1)) }); break;
      case 'off1h': g.debugBackdateSave(3_600_000); location.reload(); break;
      case 'off3h': g.debugBackdateSave(3 * 3_600_000); location.reload(); break;
      case 'onb': { // keeps the save: only flags the overlay to replay on next load
        const k = 'eggfarm.ui'; const f = JSON.parse(localStorage.getItem(k) ?? '{}'); f.replayOnboarding = true; localStorage.setItem(k, JSON.stringify(f));
        g.save(); location.reload(); break; }
      case 'tele': { const u = URL.createObjectURL(new Blob([g.telemetry.exportJSON()], { type: 'application/json' })); const l = document.createElement('a'); l.href = u; l.download = 'eggfarm-telemetry.json'; l.click(); break; }
      case 'reset': g.resetting = true; g.telemetry.track('save_reset'); g.telemetry.flush(true); resetProgress(localStorage); void g.clearMirror().then(() => location.reload()); break;
    }
  });
  let last = 0, frames = 0, fps = 0;
  (function tick(t: number) {
    frames++; if (t - last > 1000) { fps = frames; frames = 0; last = t; }
    const s = g.state, F = s.farmLevel, C = s.collectionLevel;
    info.textContent = `fps ${fps}  seed ${s.rng}\nF${F} C${C}  coins ${(s.coinsCents / 100).toFixed(2)}\ncoop ${s.coop.toFixed(2)}/${S.coopCapacity(F, b)}  basket ${s.basket}\n`
      + `eps ${S.eggsPerSec(F, b)}  price ${(S.eggPriceCents(F, C, b) / 100).toFixed(2)}\nnext cust ${s.nextCustomerInS.toFixed(1)}s  q ${s.customers.length}/${S.queueMax(F, b)}\n`
      + `demand ${S.demandRange(F, b).join('-')}  events ${g.telemetry.events().length}`;
    requestAnimationFrame(tick);
  })(0);
}
