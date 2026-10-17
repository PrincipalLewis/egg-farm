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
    if (ch) ch.onmessage = e => { const m = e.data; if (!m || m.id === this.id) return;
      if (m.t === 'claim') this.lose();
      else if (m.t === 'flush' && this.owns()) { this.onFlush?.(); ch.postMessage({ t: 'flushed', id: this.id, to: m.id }); }
      else if (m.t === 'flushed' && m.to === this.id) this.flushed?.(); };
  }
  /** Owner side of a hand-over: save now and hold (no sim/saves) until the claim arrives. */
  onFlush: (() => void) | null = null; private flushed: (() => void) | null = null;
  /** New tab, before claim + load: ask the current owner to write its latest state, so nothing unsaved is lost.
   *  Resolves on the owner's ack or after `ms` (no owner / killed / no BroadcastChannel). */
  requestFlush(ms = 300): Promise<void> {
    if (!this.ch) return Promise.resolve();
    return new Promise(res => { const t = setTimeout(done, ms); function done() { clearTimeout(t); res(); } this.flushed = () => { this.flushed = null; done(); }; this.ch!.postMessage({ t: 'flush', id: this.id }); });
  }
  /** Take ownership (newest tab wins). Returns why the previous owner (if any) lost it. */
  claim(playHere = false): TakeoverReason | null {
    const prev = readLease(this.kv);
    const reason: TakeoverReason | null = playHere ? 'play_here' : !prev || prev.id === this.id ? null : this.now() - prev.at >= this.staleMs ? 'stale' : 'new_tab';
    this.storageBlocked = !this.write(this.now());
    this.ch?.postMessage({ t: 'claim', id: this.id });
    this.active = true; this.lost = false;
    if (!this.timer) this.timer = setInterval(() => this.beat(), this.heartbeatMs);
    return reason;
  }
  /** v4 (QA f6): the lease record could not be written (quota error or read-back mismatch). This tab still OWNS the save
   *  (a lone tab is never locked out by a stale record it cannot overwrite); only a channel claim takes it over. */
  storageBlocked = false;
  /** Write our lease record and read it back. False when storage refused it (threw, or silently kept another value). */
  private write(at: number): boolean {
    try { this.kv.setItem(LEASE_KEY, JSON.stringify({ id: this.id, at })); } catch { return false; }
    const l = readLease(this.kv); return !!l && l.id === this.id && l.at === at;
  }
  /** Before every save write. False (and inactive) when another tab has claimed the save since. */
  owns(): boolean {
    if (!this.active) return false;
    if (this.storageBlocked) return true; // stale record we couldn't overwrite: not another tab
    const l = readLease(this.kv);
    if (l && l.id !== this.id) { this.lose(); return false; }
    return true;
  }
  private beat() {
    if (!this.owns()) return;
    if (this.storageBlocked) { this.storageBlocked = !this.write(this.now()); return; } // retry; cleared once storage frees up
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
