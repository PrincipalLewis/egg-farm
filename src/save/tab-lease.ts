/**
 * Single-tab guard (product/single-tab-guard.md v1.0, rc1). Replaces AC14d's "second tab is read-only":
 * the NEWEST tab owns the save. Ownership = a lease in localStorage {id, at} (heartbeat every 2 s) plus a
 * BroadcastChannel "eggfarm-save" claim message. Every save checks owns() first (localStorage is the source of truth,
 * the channel only makes the hand-over instant). A lease older than 6 s (owner killed/closed) is taken over silently.
 * No BroadcastChannel: the heartbeat doubles as a poll of the lease record.
 */
export const LEASE_KEY = 'eggfarm.lease', CHANNEL = 'eggfarm-save';
export const GUARD_HEARTBEAT_S = 2, GUARD_STALE_S = 6;
export interface Lease { id: string; at: number }
export type TakeoverReason = 'new_tab' | 'stale' | 'play_here';
export interface LeaseStore { getItem(k: string): string | null; setItem(k: string, v: string): void }
export interface LeaseChannel { postMessage(m: unknown): void; onmessage: ((e: { data: any }) => void) | null; close(): void }
export function readLease(kv: LeaseStore): Lease | null {
  try { const l = JSON.parse(kv.getItem(LEASE_KEY) ?? 'null'); return l && typeof l.id === 'string' && typeof l.at === 'number' ? l : null; } catch { return null; }
}
export class TabLease {
  active = false; private timer: ReturnType<typeof setInterval> | null = null; private lost = false;
  constructor(private kv: LeaseStore, private ch: LeaseChannel | null, private onLost: () => void, private now = () => Date.now(),
    readonly id = Math.random().toString(36).slice(2) + Date.now().toString(36),
    private heartbeatMs = GUARD_HEARTBEAT_S * 1000, private staleMs = GUARD_STALE_S * 1000) {
    if (ch) ch.onmessage = e => { const m = e.data; if (m?.t === 'claim' && m.id !== this.id) this.lose(); };
  }
  /** Take ownership (newest tab wins). Returns why the previous owner (if any) lost it. */
  claim(playHere = false): TakeoverReason | null {
    const prev = readLease(this.kv);
    const reason: TakeoverReason | null = playHere ? 'play_here' : !prev || prev.id === this.id ? null : this.now() - prev.at >= this.staleMs ? 'stale' : 'new_tab';
    try { this.kv.setItem(LEASE_KEY, JSON.stringify({ id: this.id, at: this.now() })); } catch { /* storage blocked: Game reports save failure */ }
    this.ch?.postMessage({ t: 'claim', id: this.id });
    this.active = true; this.lost = false;
    if (!this.timer) this.timer = setInterval(() => this.beat(), this.heartbeatMs);
    return reason;
  }
  /** Before every save write. False (and inactive) when another tab has claimed the save since. */
  owns(): boolean {
    if (!this.active) return false;
    const l = readLease(this.kv);
    if (l && l.id !== this.id) { this.lose(); return false; }
    return true;
  }
  private beat() {
    if (!this.owns()) return;
    try { this.kv.setItem(LEASE_KEY, JSON.stringify({ id: this.id, at: this.now() })); } catch { /* ignore */ }
  }
  private lose() {
    this.active = false; if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (!this.lost) { this.lost = true; this.onLost(); }
  }
  /** pagehide on the owner: mark the lease stale so the next load takes over without waiting 6 s. */
  release() { if (this.owns()) try { this.kv.setItem(LEASE_KEY, JSON.stringify({ id: this.id, at: 0 })); } catch { /* ignore */ } }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.ch?.close(); }
}
export const channel = (win: { BroadcastChannel?: any } = globalThis as any): LeaseChannel | null =>
  typeof win.BroadcastChannel === 'function' ? new win.BroadcastChannel(CHANNEL) : null;
