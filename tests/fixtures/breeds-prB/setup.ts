/** PR-B test fixtures (Features). Flag-on balance is an in-memory overlay of the shipped balance; never written to disk. */
import { balance, type Balance } from '../../../src/config/balance';
import { initialState, type GameState } from '../../../src/sim/state';
import type { BreedsSave } from '../../../src/sim/breeds';

export const flagOnBalance = (): Balance => {
  const b = structuredClone(balance) as Balance & { m4: { enabled: number; flags: Record<string, number> } };
  b.m4.enabled = 1; b.m4.flags = { ...b.m4.flags, breeds: 1 }; return b;
};
export const flagOffBalance = (): Balance => structuredClone(balance);

export const breeds = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 1,
  freeHatchUsed: 1, flockCompleteLogged: 0, ...o,
});
/** A state at Farm F with a breeds root. Leghorn at 1★ = floor(250 × 1.25) = 312 bp (BR-AC52 seeded value). */
export const stateWith = (b: Balance, F: number, br: BreedsSave, extra: Partial<GameState> = {}): GameState =>
  ({ ...initialState(b), farmLevel: F, breeds: br, ...extra } as GameState);
export const leghorn312 = (settleMs = 0) => breeds({ owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null], settleMs: [settleMs, 0, 0] });

/** Reference Present gate for tests ONLY (stands in for the Saves sim gate): open iff fewer than k counted taps in the
 *  trailing (now − W, now] window, k = 0 never closes. Spec BR-R12b / BR-AC52b. */
export class RefGate {
  taps: number[] = [];
  /** `focusNow` = the reference's FOCUS clock (ms). PresentGateSource.open(s, b) carries no clock (Architect m3, BR-R12b is sim focus
   *  seconds); rc/v5 GameState has no focus accumulator yet (Saves' presentGateOpen owns it), so the reference gets an injected one. */
  constructor(public wMs: number, public k: number, private focusNow: () => number = () => 0) {}
  tap(t: number) { this.taps.push(t); }
  open = (_s?: unknown, _b?: unknown) => { const now = this.focusNow(); return this.k === 0 || this.taps.filter(t => t > now - this.wMs && t <= now).length < this.k; };
}
/** Present calm-gate tunables for the reference gate (spec §5 L648-654; BR-R12b/c). Test fixtures only (Architect nit: moved out of
 *  src). TODO(Saves #126 commit 1): read bc(b, 'present_calm_w_s' | 'present_calm_k') once presentGateOpen lands. */
export const PRB_STUB_TUNABLES = {
  /** bc_present_calm_w_s: trailing focus-seconds window of the Present rate gate (BR-R12b). */
  present_calm_w_s: 10,
  /** bc_present_calm_k: counted taps in the window that close the gate; 0 = never pending (BR-R12c). */
  present_calm_k: 6,
} as const;

/** Minimal copy of the rc/v5 HUD + scene markup the PR-B mounts attach to (src/ui/app.ts:78, :88). */
export const HUD_HTML = `<div class="hud"><div class="pill coins" aria-label="Coins"><img alt=""><span class="coins-col"><span class="num" id="coins"></span><span class="rate num" id="rate" role="status" aria-label="Net income zero per second"><span class="tri" aria-hidden="true"></span><span class="rt">$0/s</span></span></span></div><div class="pill basket"><span class="num" id="basket"></span></div><div class="spacer"></div><button id="settings" aria-label="Settings"></button></div><div class="toast" id="toast"></div>`;
export const YARD_HTML = (n: number) => `<div class="yard" id="yard">${Array.from({ length: 12 }, (_, i) => `<span>${[2, 3, 1, 4, 0, 5, 8, 9, 7, 10, 6, 11].indexOf(i) < n ? `<img class="hen" src="/assets/char-chicken.svg" alt="">` : ''}</span>`).join('')}</div>`;
