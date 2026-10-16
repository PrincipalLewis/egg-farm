/** Market order list renderer, anti-churn (m3-customer-queue-spec v1.1 §5): keyed nodes by order id, one rAF batch per
 *  frame, chip + live region coalesced to <= 1 / 2 s, enter slide only into a visible slot (<= 1 / 240 ms), list frozen
 *  (no adds/removes/moves) while a pointer is down and for 300 ms after release. Never innerHTMLs the list. */
import type { Customer } from '../sim/state';
import { orderView, fitOrderEggs, moreLabel, moreName, type OrderView } from './orders';
export interface ListInput { customers: Customer[]; basket: number; unit: number; visible: number; expanded: boolean; rm: boolean; /** F5 shared coalesced queue length */ waitingLen?: number }
export class OrderList {
  private nodes = new Map<number, HTMLElement>(); private pending: ListInput | null = null; private raf = 0;
  private lastSlide = -Infinity; private lastLeave = -Infinity; private frozenUntil = 0; private pointer = false;
  private chipAt = -Infinity; private chipTimer = 0; private chipShown = ''; private liveShown = -1;
  readonly chip: HTMLButtonElement; private empty: HTMLElement;
  /** Stats for tests/QA (§7.17): nodes created / removed. */
  stats = { created: 0, removed: 0, chipWrites: 0, liveWrites: 0 };
  constructor(private list: HTMLElement, private live: HTMLElement, private avatar: string, emptyHtml: string, private now = () => performance.now(),
    private schedule = (f: () => void) => requestAnimationFrame(f)) {
    this.chip = document.createElement('button'); this.chip.type = 'button'; this.chip.className = 'queue-more'; this.chip.hidden = true;
    this.chip.setAttribute('aria-controls', list.id); this.chip.setAttribute('aria-expanded', 'false');
    this.empty = document.createElement('div'); this.empty.className = 'empty-state'; this.empty.innerHTML = emptyHtml; this.empty.hidden = true;
    list.replaceChildren(this.empty, this.chip);
    list.addEventListener('pointerdown', () => { this.pointer = true; });
    const up = () => { if (this.pointer) { this.pointer = false; this.frozenUntil = this.now() + 300; this.kick(); } };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  get frozen() { return this.pointer || this.now() < this.frozenUntil; }
  update(i: ListInput) { this.pending = i; this.kick(); }
  private kick() { if (!this.raf) this.raf = this.schedule(() => { this.raf = 0; if (this.pending) this.apply(this.pending); }) || 1; }
  private fill(el: HTMLElement, v: OrderView) {
    const cls = `order ${v.state}`; if (el.className.replace(/ (enter|leaving)/g, '') !== cls) el.className = cls + (el.classList.contains('enter') ? ' enter' : '');
    const [e, val] = v.line.split(' · ');
    const E = el.querySelector('.e')!, V = el.querySelector('.v')!, bar = el.querySelector('.bar') as HTMLElement, fillI = bar.firstElementChild as HTMLElement, btn = el.querySelector('button')!;
    if (E.textContent !== e) E.textContent = e; if (V.textContent !== `\u00a0· ${val}`) V.textContent = `\u00a0· ${val}`;
    // fit runs after the button label/state below (Need is wider than Sell): see end of fill()
    const w = `${(v.want ? (v.have / v.want) * 100 : 0).toFixed(2)}%`; if (fillI.style.width !== w) fillI.style.width = w;
    if (bar.getAttribute('aria-valuenow') !== String(v.have)) { bar.setAttribute('aria-valuenow', String(v.have)); bar.setAttribute('aria-valuemax', String(v.want)); bar.setAttribute('aria-label', `Order ${v.have} of ${v.want} eggs`); }
    if (btn.textContent !== v.button) btn.textContent = v.button;
    const bc = `btn sell${v.state === 'wait' ? '' : ' buy affordable'}${v.button.length > 9 ? ' long' : ''}`; if (btn.className !== bc) btn.className = bc;
    { const l1 = E.parentElement as HTMLElement; const fe = fitOrderEggs(e, (t: string) => { if (E.textContent !== t) E.textContent = t; return !l1.clientWidth || l1.scrollWidth <= l1.clientWidth + 0.5 && (V as HTMLElement).scrollWidth <= (V as HTMLElement).clientWidth + 0.5; }); if (E.textContent !== fe) E.textContent = fe; } // F4: NBSP survives flex whitespace trimming
    const dis = String(v.state === 'wait'); if (btn.getAttribute('aria-disabled') !== dis) btn.setAttribute('aria-disabled', dis);
  }
  private make(v: OrderView) {
    const el = document.createElement('div'); el.dataset.row = String(v.id); el.dataset.id = String(v.id);
    el.innerHTML = `<div class="av"><img src="${this.avatar}" alt=""></div><div class="txt"><div class="l1"><span class="e"></span><span class="v"></span></div><div class="bar" role="progressbar" aria-valuemin="0"><i></i></div></div><button data-id="${v.id}"></button>`;
    this.fill(el, v); this.stats.created++; return el;
  }
  /** §5.7 (QA 15): removal = one layout step, but the cards below glide up with a compensating transform (FLIP),
   *  so nothing jumps visually and Layout Instability (CLS) records no shift. */
  private flipRemove(els: HTMLElement[], rm: boolean) {
    const rest = [...this.list.querySelectorAll<HTMLElement>('.order[data-row], .queue-more')].filter(e => !els.includes(e) && !e.hidden);
    const before = rest.map(e => e.getBoundingClientRect().top);
    for (const e of els) e.remove();
    rest.forEach((e, k) => { const d = before[k] - e.getBoundingClientRect().top; if (Math.abs(d) < 0.5) return;
      e.style.transition = 'none'; e.style.transform = `translateY(${d}px)`;
      if (rm) { e.style.transform = ''; return; }
      requestAnimationFrame(() => requestAnimationFrame(() => { e.style.transition = 'transform .2s ease-out'; e.style.transform = ''; setTimeout(() => { e.style.transition = ''; }, 220); })); });
  }
  private apply(i: ListInput) {
    const t = this.now(), frozen = this.frozen;
    const ids = new Set(i.customers.map(c => c.id));
    const shownIds = i.customers.filter((_, k) => i.expanded || k < i.visible).map(c => c.id);
    const shownSet = new Set(shownIds);
    // removals (serve/leave, or no longer in a visible slot) - deferred while frozen
    if (!frozen) {
      const gone = [...this.nodes.keys()].filter(id => !shownSet.has(id));
      const animate = !i.rm && gone.length === 1 && ids.has(gone[0]) === false && t - this.lastLeave >= 240;
      const drop: HTMLElement[] = [];
      for (const id of gone) {
        const el = this.nodes.get(id)!; this.nodes.delete(id); this.stats.removed++;
        if (animate) { this.lastLeave = t; el.classList.add('leaving'); el.removeAttribute('data-row'); setTimeout(() => this.flipRemove([el], i.rm), 240); } else drop.push(el);
      }
      if (drop.length) this.flipRemove(drop, i.rm);
    }
    // updates + additions in FIFO order (new visible orders only ever append at the end)
    for (const c of i.customers) {
      const v = orderView(c, i.basket, i.unit), el = this.nodes.get(c.id);
      if (el) { this.fill(el, v); continue; }
      if (!shownSet.has(c.id) || frozen) continue;
      const n = this.make(v); this.nodes.set(c.id, n);
      if (!i.rm && t - this.lastSlide >= 240) { this.lastSlide = t; n.classList.add('enter'); setTimeout(() => n.classList.remove('enter'), 240); }
      this.list.insertBefore(n, this.chip);
    }
    this.empty.hidden = i.customers.length > 0;
    // chip + live region: <= 1 write / 2 s (trailing, latest value); never animated
    const hidden = Math.max(0, (i.waitingLen ?? i.customers.length) - i.visible), want = hidden > 0 ? `${moreLabel(hidden, i.expanded)}|${moreName(hidden, i.expanded)}|${i.expanded}` : '';
    if (want !== this.chipShown) {
      const write = () => {
        const cur = this.pending ? Math.max(0, (this.pending.waitingLen ?? this.pending.customers.length) - this.pending.visible) : hidden, ex = this.pending?.expanded ?? i.expanded;
        this.chip.hidden = cur === 0; this.chip.textContent = moreLabel(cur, ex); this.chip.setAttribute('aria-label', moreName(cur, ex)); this.chip.setAttribute('aria-expanded', String(ex));
        this.chipShown = cur > 0 ? `${moreLabel(cur, ex)}|${moreName(cur, ex)}|${ex}` : ''; this.chipAt = this.now(); this.stats.chipWrites++;
        if (cur > 0 && cur !== this.liveShown) { this.live.textContent = `${cur} more customers waiting`; this.stats.liveWrites++; } this.liveShown = cur; this.chipTimer = 0;
      };
      const firstOrToggle = this.chipShown === '' || hidden === 0 || this.chipShown.split('|')[2] !== String(i.expanded);
      if (firstOrToggle || t - this.chipAt >= 2000) { clearTimeout(this.chipTimer); write(); }
      else if (!this.chipTimer) this.chipTimer = window.setTimeout(write, 2000 - (t - this.chipAt));
    }
    if (frozen) setTimeout(() => this.kick(), 320);
  }
  node(id: number) { return this.nodes.get(id); }
}
