import type { Balance } from '../config/balance';
import * as S from '../sim/state';
import type { Game } from '../game';
const fmt = (n: number) => n >= 1e9 ? (n/1e9).toFixed(2)+'B' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e4 ? (n/1e3).toFixed(1)+'K' : String(Math.floor(n));
const money = (c: number) => '$' + (c / 100).toFixed(2);
/** Placeholder UI — Art & UX owns layout. Reads state, dispatches actions only. */
export function mountUI(root: HTMLElement, g: Game, b: Balance) {
  root.innerHTML = `<h1>Egg Farm</h1><div id="modal"></div><p id="stats"></p>
  <button id="collect">Collect</button> <button id="sellAll">Sell all</button>
  <ul id="queue"></ul><button id="col"></button> <button id="farm"></button>`;
  const $ = (q: string) => root.querySelector(q) as HTMLElement;
  $('#collect').onclick = () => g.dispatch({ type: 'collect' });
  $('#sellAll').onclick = () => g.dispatch({ type: 'sellAll' });
  $('#col').onclick = () => g.dispatch({ type: 'buyCollection' });
  $('#farm').onclick = () => g.dispatch({ type: 'buyFarm' });
  $('#queue').onclick = (e) => { const id = (e.target as HTMLElement).dataset.id; if (id) g.dispatch({ type: 'sell', customerId: +id }); };
  $('#modal').onclick = (e) => { if ((e.target as HTMLElement).id === 'offCollect') g.dispatch({ type: 'collectOffline' }); };
  return () => {
    const s = g.state, cL = s.collectionLevel, fL = s.farmLevel, cap = S.coopCapacity(fL, b);
    $('#modal').innerHTML = s.pendingOfflineEggs > 0
      ? `<p>Welcome back! Away ${Math.round(g.offline.awayS / 60)} min: +${fmt(s.pendingOfflineEggs)} eggs <button id="offCollect">Collect</button></p>` : '';
    $('#stats').textContent = `Coins ${money(s.coinsCents)} · Coop ${fmt(s.coop)}/${cap}${s.coop >= cap ? ' Full!' : ''} · Basket ${fmt(s.basket)} · ${S.eggsPerSec(fL, b).toFixed(1)} eggs/s`;
    $('#queue').innerHTML = s.customers.map(c => `<li><button data-id="${c.id}" ${s.basket < 1 ? 'disabled' : ''}>Sell ${Math.min(Math.floor(s.basket), c.demand)}/${c.demand}</button></li>`).join('');
    const btn = (el: HTMLElement, L: number, cost: number, label: string) => {
      const max = L >= b.maxLevel; el.textContent = max ? `${label} MAX` : `${label} L${L}→${L + 1} — $${cost}`;
      (el as HTMLButtonElement).disabled = max || s.coinsCents < cost * 100;
    };
    btn($('#col'), cL, S.collectionCost(cL, b), `Collect per tap ${S.eggsPerTap(cL, b)}→${S.eggsPerTap(cL + 1, b)}`);
    btn($('#farm'), fL, S.farmCost(fL, b), `Farm`);
  };
}
