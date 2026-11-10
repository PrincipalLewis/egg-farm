/**
 * Shift sheet (Features, HoE/v5-ui-shift-sheet). Behind m4.flags.rc2Refill: at 0 nothing mounts, `openShiftSheet` is a no-op and
 * no DOM is created (flag-0 #app identity, RF-UI-1 / RF-AC1).
 * Art of record: art-ux/m5-refill-flows.md v1.0.1 sha1 43828d0b (anatomy §4, markup §8.2, fit §9, RF-UI-*), Boost slot / Q8:
 * art-ux/m5-abilities-flows.md sha1 fc1ca17d (§16 E-5). Sim contract: ./shift-adapter.ts (G0-API.md rev 6 sha256 5225aab8 §12).
 * The sheet reads sim views and calls Game wrappers only; it derives no sim rule and emits no telemetry.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { registerSheet, type SheetHandle } from './overlay';
import type { WorkerId } from '../sim/workers';
import { mood } from '../sim/workers';
import { WORKER_NAMES, unpaidCaption } from './workers-ui';
import { fmtMoneyShort } from './format';
import type { RefillCtx, ShiftSheetEntry, ShiftSim, ChargesView, Eligibility, RestState } from './shift-adapter';
export type { ShiftSheetEntry } from './shift-adapter';

/** Art-named timings (m5-refill-flows §4 / §8.4 / §8.1 / RF-UI-5). */
export const SHIFT_SPEC = {
  /** Re-sort cadence while open (§4, RF-UI-5). */ resortEveryMs: 5000,
  /** No re-sort within this long of a row tap (§4). */ resortTapHoldMs: 1000,
  /** Re-sort resumes this long after a row control blurs (§8.4). */ resortBlurHoldMs: 1000,
  /** Sheet slide-out before closeComplete under full motion (§8.4 FLIP length reused for the sheet). */ closeMs: 200,
} as const;

export type RefillButtonState = 'affordable' | 'countdown' | 'rested' | 'unpaid' | 'blocked';
/** §4.1 mapping, from the sim's refillEligibility reason only (G0 §12 Q4: no separate threshold view). */
export const refillButtonState = (e: Eligibility): RefillButtonState =>
  e.ok ? 'affordable' : e.reason === 'no_charges' ? 'countdown' : e.reason === 'above_threshold' ? 'rested' : e.reason === 'unpaid' ? 'unpaid' : 'blocked';

/** G0 §12 Q5: display max(0, ceil(ms/1000)) as m:ss, following the sim clock (no UI timer). */
export const fmtChargeCountdown = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** §8.2 required markup: ONE inline `.lbl` wrapper, `.sr-in` suffix, no aria-label. `rested` copy T = the #83 threshold
 *  (manage_prompt_threshold). TODO(Saves R1): read `refill_threshold_pct` once it is in balance.json. */
export function refillLabelHtml(st: RefillButtonState, role: string, nextChargeMs: number | null, b: Balance): string {
  const r = esc(role);
  if (st === 'countdown') return `<span class="lbl">Next charge in<span aria-hidden="true" data-cd=" ${nextChargeMs === null ? '' : fmtChargeCountdown(nextChargeMs)}"></span><span class="sr-in"> progress, ${r}</span></span>`;
  if (st === 'rested') return `<span class="lbl">Rested, refill below ${Math.round(b.workers.energy.manage_prompt_threshold * 100)}%<span class="sr-in">, ${r}</span></span>`;
  return `<span class="lbl">Refill<span class="sr-in">, ${r}</span></span>`;
}

export type PillKind = 'Refillable' | 'Tired' | 'Asleep' | 'Unpaid' | 'Paused' | null;
/** §4.2 pill from sim state: Paused (rest) > Unpaid > Asleep > Tired > Refillable (≤ T per the sim's eligibility) > none. */
export function pillKind(m: ReturnType<typeof mood>, rest: RestState, e: Eligibility): PillKind {
  if (rest !== 'active') return 'Paused';
  if (m === 'unpaid') return 'Unpaid';
  if (m === 'asleep') return 'Asleep';
  if (m === 'tired') return 'Tired';
  if (m === 'working' && (e.ok || e.reason === 'no_charges')) return 'Refillable';
  return null;
}

/** RF-UI-16 opener: N = hired workers ≤ T excluding Paused and Unpaid (Asleep counts); badge iff charges ≥ 1 and N ≥ 1. */
export function openerView(sim: ShiftSim): { badge: number | null; name: string } {
  const c = sim.charges();
  const n = sim.order().filter(id => sim.rest(id) === 'active' && sim.eligibility(id).ok).length;
  if (c.charges < 1 || n < 1) return { badge: null, name: 'Refill' };
  return { badge: n, name: n === 1 ? 'Refill, 1 worker needs a refill' : `Refill, ${n} workers need a refill` };
}

/** RF-UI-5 / §8.4 re-sort gate (UI timing only; the ORDER comes from the sim's shiftOrder). */
export class ResortGate {
  private lastSort = -Infinity; private lastTap = -Infinity; private blurAt = -Infinity; private focused = false;
  opened(t: number) { this.lastSort = t; this.lastTap = -Infinity; this.blurAt = -Infinity; this.focused = false; }
  tap(t: number) { this.lastTap = t; }
  focus() { this.focused = true; }
  blur(t: number) { this.focused = false; this.blurAt = t; }
  due(t: number): boolean {
    return !this.focused && t - this.lastTap >= SHIFT_SPEC.resortTapHoldMs && t - this.blurAt >= SHIFT_SPEC.resortBlurHoldMs
      && t - this.lastSort >= SHIFT_SPEC.resortEveryMs;
  }
  sorted(t: number) { this.lastSort = t; }
}

/** Sheet CSS, injected only when the sheet mounts (rc2Refill = 1), so styles.css and the flag-0 build are untouched.
 *  Sizes are Art's (§4, §8.3, §9, §16): 75% portrait sheet, 328/368 px content (16 px side padding), docked 400 px right column,
 *  Refill flex:1 1 0 / min-width 253 / 48 tall, Rest + ✕ 44×44, gap 8, Boost 44×44 in grid column 2 (column-gap 4). */
export const SHIFT_CSS = `
.shift-sheet{position:fixed;left:0;right:0;bottom:0;height:75%;z-index:40;box-sizing:border-box;padding:0 16px 16px;overflow-y:auto;
  background:var(--c-surface,#fff8e8);border-radius:16px 16px 0 0;box-shadow:0 -4px 16px rgba(0,0,0,.18);transition:transform 200ms ease-out}
.shift-sheet.docked{left:auto;top:0;width:400px;height:auto;border-radius:0}
.shift-sheet.closing{transform:translateY(100%)}.shift-sheet.docked.closing{transform:translateX(100%)}
.shift-head{position:sticky;top:0;display:flex;align-items:center;gap:8px;min-height:56px;background:inherit;z-index:1}
.shift-head h2{margin:0;flex:1;font:700 18px/1.2 Fredoka,sans-serif}.shift-charges{font:400 14px/1.2 Nunito,sans-serif}
.shift-close{width:44px;height:44px;flex:none;padding:0;border:0;background:none;display:flex;align-items:center;justify-content:center}
.shift-close img{width:24px;height:24px}
.shift-next{margin:0 0 8px;font:400 14px/1.2 Nunito,sans-serif}
.shift-row{padding:12px 0;border-top:1px solid var(--c-outline,#3e2c23)}
.shift-top{display:block}.shift-top.has-boost{display:grid;grid-template-columns:minmax(0,1fr) 44px;column-gap:4px}
.shift-top.has-boost .shift-boost{grid-row:1/span 2;grid-column:2;width:44px;height:44px}
.shift-l1{display:flex;align-items:center;gap:6px;white-space:nowrap}
.shift-role{margin:0;font:700 15px/1.3 Nunito,sans-serif}
.shift-pill{font:700 11px/1 Fredoka,sans-serif;padding:2px 6px;border:1.5px solid currentColor;border-radius:999px}
.shift-risk{margin-left:auto;font:700 12px/1.2 Nunito,sans-serif;color:var(--c-danger,#b3261e);display:inline-flex;align-items:center;gap:2px}
.shift-risk.zero{color:var(--c-muted,#6b5a4e)}.shift-risk img{width:14px;height:14px}
.shift-energy{margin:4px 0 8px;font:400 12px/1.3 Nunito,sans-serif;white-space:nowrap}
.shift-auto{display:flex;align-items:center;gap:8px;width:304px;max-width:100%;height:52px;margin-bottom:8px}
.shift-actions{display:flex;gap:8px;align-items:center}
.shift-refill{width:auto;flex:1 1 0;min-width:253px;min-height:48px;box-sizing:border-box}
.shift-rest{width:44px;height:44px;flex:none;padding:0;display:flex;align-items:center;justify-content:center}
.shift-rest img{width:20px;height:20px}
.shift-sheet .lbl{white-space:nowrap}.shift-sheet .sr-in{font-size:0;line-height:0;color:transparent}
.shift-sheet [data-cd]::after{content:attr(data-cd);white-space:pre}
.shift-desc{margin:4px 0 0;font:400 12px/1.3 Nunito,sans-serif}
.shift-sheet .shake{animation:shake 300ms linear}
@media (prefers-reduced-motion:reduce){.shift-sheet{transition:none}.shift-sheet .shake{animation:refusedFlash 300ms steps(1,end) 1}}
.rm .shift-sheet,.reduced-motion .shift-sheet{transition:none}
.rm .shift-sheet .shake,.reduced-motion .shift-sheet .shake{animation:refusedFlash 300ms steps(1,end) 1}
`;

export interface ShiftMountOpts {
  doc: Document; host: HTMLElement; b: Balance; sim: ShiftSim;
  now: () => number; docked: () => boolean; rm: () => boolean; asset: (f: string) => string;
  audio?: { play(hook: string): boolean }; toast?: (text: string) => void; sheet?: SheetHandle;
  /** #116 owns the Boost chip; the sheet only provides the slot and passes refillAgoSimMs through (G0 §12 Q10). */
  boostSlot?: (slot: HTMLElement, id: WorkerId, refillAgoSimMs: number | undefined) => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
}
export interface ShiftSheetHandle {
  open(id: WorkerId | null, opener: HTMLElement, entry: ShiftSheetEntry): void;
  close(): void; sync(): void; destroy(): void;
  readonly isOpen: boolean; readonly el: HTMLElement | null; readonly ctx: RefillCtx | null;
}

interface RowEls { row: HTMLElement; head: HTMLElement; pill: HTMLElement; risk: HTMLElement; energy: HTMLElement; refill: HTMLButtonElement;
  rest: HTMLButtonElement; auto: HTMLButtonElement | null; boost: HTMLElement | null; key: string }

export function mountShiftSheet(o: ShiftMountOpts): ShiftSheetHandle {
  const { doc, b, sim } = o, sheet = o.sheet ?? registerSheet('shift'), later = o.setTimeout ?? ((f, ms) => setTimeout(f, ms));
  const gate = new ResortGate();
  if (!doc.getElementById('shift-sheet-css')) { const st = doc.createElement('style'); st.id = 'shift-sheet-css'; st.textContent = SHIFT_CSS; doc.head.append(st); }
  let el: HTMLElement | null = null, list: HTMLElement | null = null, opener: HTMLElement | null = null, ctx: RefillCtx | null = null;
  let closing = false, rows = new Map<WorkerId, RowEls>();
  const flag = (f: 'rc2Refill' | 'autoRefill' | 'abilities') => flagOn(b, f);
  const autoOn = () => flag('rc2Refill') && flag('autoRefill'), boostOn = () => flag('rc2Refill') && flag('abilities');

  const refused = (btn: HTMLElement) => {
    btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
    o.audio?.play('cantAfford');
  };
  function buildRow(id: WorkerId): RowEls {
    const role = WORKER_NAMES[id], hid = `shift-h-${id}`;
    const row = doc.createElement('section'); row.className = 'shift-row'; row.dataset.worker = id;
    row.setAttribute('role', 'group'); row.setAttribute('aria-labelledby', hid);
    row.innerHTML = `<div class="shift-top${boostOn() ? ' has-boost' : ''}"><div class="shift-l1"><h3 class="shift-role" id="${hid}" tabindex="-1">${esc(role)}</h3>`
      + `<span class="shift-pill" hidden></span><span class="shift-risk"></span></div><p class="shift-energy"></p>`
      + (boostOn() ? `<div class="shift-boost" data-boost-slot="${id}"></div>` : '') + `</div>`
      + (autoOn() ? `<button type="button" class="shift-auto" role="switch" aria-checked="false"><span class="lbl">Auto-refill</span><span class="knob" aria-hidden="true"></span><span class="onoff" aria-hidden="true">Off</span></button>` : '')
      + `<div class="shift-actions"><button type="button" class="btn shift-refill"></button>`
      + `<button type="button" class="shift-rest" aria-pressed="false"><img src="${o.asset('icon-pause.svg')}" alt="" aria-hidden="true"><span class="sr-in">Rest, ${esc(role)}</span></button></div>`;
    const q = <T extends HTMLElement>(s: string) => row.querySelector(s) as T;
    const r: RowEls = { row, head: q('.shift-role'), pill: q('.shift-pill'), risk: q('.shift-risk'), energy: q('.shift-energy'), refill: q('.shift-refill'),
      rest: q('.shift-rest'), auto: row.querySelector('.shift-auto'), boost: row.querySelector('.shift-boost'), key: '' };
    r.refill.addEventListener('click', () => {
      gate.tap(o.now());
      if (r.refill.getAttribute('aria-disabled') === 'true' || !ctx) return refused(r.refill);
      const res = sim.refill(id, ctx); if (!res.ok) return refused(r.refill);
      o.audio?.play('worker.refill'); syncNow(); // focus stays on the same button (its content changes, the node does not)
    });
    r.rest.addEventListener('click', () => {
      gate.tap(o.now()); if (!ctx) return;
      const res = sim.setRest(id, sim.rest(id) === 'active', ctx); if (!res.ok) return refused(r.rest); syncNow();
    });
    r.auto?.addEventListener('click', () => { gate.tap(o.now()); sim.setAutoRefill(id, !sim.autoOn(id)); syncNow(); });
    row.addEventListener('focusin', e => { if (e.target !== r.head) gate.focus(); });
    row.addEventListener('focusout', e => { if (e.target !== r.head) gate.blur(o.now()); });
    if (r.boost) o.boostSlot?.(r.boost, id, sim.refillAgoSimMs(id));
    return r;
  }
  function syncRow(id: WorkerId, r: RowEls, c: Readonly<ChargesView>) {
    const w = sim.worker(id), e = sim.eligibility(id), rest = sim.rest(id), m = mood(w, b), role = WORKER_NAMES[id];
    const st = refillButtonState(e), pill = pillKind(m, rest, e), risk = sim.atRiskCentsPerS(id);
    const etas = rest === 'active' && m !== 'unpaid' ? sim.restEtas?.(id) : undefined; // TODO(Saves G2 Q7): etaTiredS/etaAsleepS
    const energy = `Energy ${Math.round(w?.energy ?? 0)}%` + (etas?.etaTiredS != null && m === 'working' ? ` · Tired in ${fmtChargeCountdown(etas.etaTiredS * 1000)}` : '')
      + (etas?.etaAsleepS != null && m !== 'asleep' ? ` · Asleep in ${fmtChargeCountdown(etas.etaAsleepS * 1000)}` : '');
    const resume = st === 'unpaid' ? sim.resumeAtCents(id) : null;
    const key = [st, st === 'countdown' ? (c.nextChargeMs === null ? '' : fmtChargeCountdown(c.nextChargeMs)) : '', pill, risk, energy, rest, resume, sim.autoOn(id)].join('|');
    if (key === r.key) return; r.key = key;
    r.pill.hidden = !pill; r.pill.textContent = pill ?? ''; r.pill.dataset.kind = pill ?? '';
    r.risk.classList.toggle('zero', risk <= 0);
    r.risk.innerHTML = (risk > 0 ? `<img src="${o.asset('icon-warning.svg')}" alt="" aria-hidden="true">` : '') + `${esc(fmtMoneyShort(risk))}/s at risk`;
    r.energy.textContent = energy;
    const lbl = refillLabelHtml(st, role, c.nextChargeMs, b); if (r.refill.innerHTML !== lbl) r.refill.innerHTML = lbl;
    r.refill.dataset.state = st;
    if (st === 'affordable') r.refill.removeAttribute('aria-disabled'); else r.refill.setAttribute('aria-disabled', 'true');
    if (resume !== null) { r.refill.setAttribute('aria-describedby', `shift-d-${id}`); ensureDesc(r.row, `shift-d-${id}`, unpaidCaption(resume)); }
    else { r.refill.removeAttribute('aria-describedby'); r.row.querySelector(`#shift-d-${id}`)?.remove(); }
    r.rest.setAttribute('aria-pressed', String(rest !== 'active'));
    const rel = sim.restEligibility?.(id); // TODO(Saves G2 Q6): proactive Rest gating
    if (rel && !rel.ok) r.rest.setAttribute('aria-disabled', 'true'); else r.rest.removeAttribute('aria-disabled');
    if (r.auto) { const on = sim.autoOn(id); r.auto.setAttribute('aria-checked', String(on)); r.auto.querySelector('.onoff')!.textContent = on ? 'On' : 'Off'; }
  }
  const ensureDesc = (row: HTMLElement, id: string, text: string) => {
    let d = row.querySelector<HTMLElement>(`#${id}`); if (!d) { d = doc.createElement('p'); d.id = id; d.className = 'shift-desc'; row.append(d); }
    if (d.textContent !== text) d.textContent = text;
  };
  function applyOrder(order: WorkerId[]) {
    if (!list) return;
    const active = doc.activeElement as HTMLElement | null;
    for (const id of order) { let r = rows.get(id); if (!r) { r = buildRow(id); rows.set(id, r); } list.append(r.row); }
    for (const [id, r] of rows) if (!order.includes(id)) { r.row.remove(); rows.delete(id); }
    if (active && active !== doc.activeElement && el?.contains(active)) active.focus({ preventScroll: true }); // RF-UI-6
  }
  function syncHeader(c: Readonly<ChargesView>) {
    if (!el) return;
    const ch = el.querySelector('.shift-charges')!, nx = el.querySelector<HTMLElement>('.shift-next')!;
    const t = `Charges ${c.charges}/${c.cap}`; if (ch.textContent !== t) ch.textContent = t;
    const below = c.charges < c.cap && c.nextChargeMs !== null; nx.hidden = !below;
    if (below) { const cd = ` ${fmtChargeCountdown(c.nextChargeMs!)}`, sp = nx.querySelector<HTMLElement>('[data-cd]')!; if (sp.dataset.cd !== cd) sp.dataset.cd = cd; }
  }
  function syncNow() {
    if (!el || closing) return;
    el.classList.toggle('docked', o.docked()); el.setAttribute('aria-modal', String(!o.docked()));
    const c = sim.charges(); syncHeader(c);
    const t = o.now();
    if (gate.due(t)) { applyOrder(sim.order()); gate.sorted(t); }
    for (const id of sim.order()) if (!rows.has(id)) applyOrder(sim.order()); // newly hired: add without waiting for the cadence
    for (const [id, r] of rows) syncRow(id, r, c);
  }
  function finishClose() {
    el?.remove(); el = null; list = null; rows = new Map(); closing = false; ctx = null;
    sheet.closeComplete();
    const tq = sim.takeAutoRefillToast(); // AR-AC9 / AC-LR14: one coalesced toast after close (§12 Q8: drain whenever the UI chooses)
    if (tq && tq.n > 0) o.toast?.(tq.n === 1 && tq.worker ? `Auto-refilled ${WORKER_NAMES[tq.worker]}` : `Auto-refilled ${tq.n} workers`);
    const back = opener; opener = null; back?.focus({ preventScroll: true });
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); handle.close(); } };
  const handle: ShiftSheetHandle = {
    open(id, op, entry) {
      if (!flag('rc2Refill')) return;
      if (el && !closing) { opener = op; focusTarget(id); return; }
      if (closing) finishClose();
      opener = op;
      const stallId = entry === 'stall_chip' ? sim.stallId() ?? undefined : undefined; // §12 Q3: read StallView; never noteStallChipTap here
      const sheetId = sim.open(entry, stallId);
      ctx = stallId !== undefined ? { sheetId, entryPoint: entry, stallId } : { sheetId, entryPoint: entry }; // §12 Q2: one ctx until closeComplete
      el = doc.createElement('div'); el.className = 'shift-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'shift-title');
      el.innerHTML = `<header class="shift-head"><h2 id="shift-title" tabindex="-1">Shift</h2><span class="shift-charges"></span>`
        + `<button type="button" class="shift-close"><img src="${o.asset('icon-close.svg')}" alt="" aria-hidden="true"><span class="sr-in">Close</span></button></header>`
        + `<p class="shift-next" hidden>Next charge in<span aria-hidden="true" data-cd=""></span></p><div class="shift-list"></div>`;
      list = el.querySelector('.shift-list');
      el.querySelector('.shift-close')!.addEventListener('click', () => handle.close());
      el.addEventListener('keydown', onKey);
      o.host.append(el); sheet.opened();
      gate.opened(o.now()); applyOrder(sim.order()); syncNow();
      focusTarget(id);
    },
    close() {
      if (!el || closing) return;
      closing = true; el.classList.add('closing');
      if (o.rm()) finishClose(); else later(finishClose, SHIFT_SPEC.closeMs);
    },
    sync: () => syncNow(),
    destroy() { if (el) { el.remove(); el = null; sheet.closeComplete(); } closing = false; rows = new Map(); ctx = null; opener = null; },
    get isOpen() { return !!el; }, get el() { return el; }, get ctx() { return ctx; },
  };
  function focusTarget(id: WorkerId | null) {
    const t = (id && rows.get(id)?.head) || el?.querySelector<HTMLElement>('#shift-title');
    t?.scrollIntoView?.({ block: 'nearest' }); t?.focus({ preventScroll: true });
  }
  return handle;
}

let current: ShiftSheetHandle | null = null;
/** app.ts (flag on only) registers the mounted sheet; tests may too. */
export const setShiftSheet = (h: ShiftSheetHandle | null): void => { current = h; };
/** Agreed entry point (Shift HANDOFF, 1d79672c + HoE): focuses `id`'s row heading, returns focus to `opener` on close.
 *  No-op when rc2Refill = 0 or the sheet is not mounted. */
export function openShiftSheet(id: WorkerId, opener: HTMLElement, entry: ShiftSheetEntry): void { current?.open(id, opener, entry); }
