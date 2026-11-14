/**
 * TEL-AC1 / telemetry-spec v0.6.2 L13-20, B3: the ONE foreground clock of a telemetry session (Architect v5-tel-envelope,
 * engineering/tasks/v5-tel-envelope/clock-api.md). Owned by Telemetry; everyone else reads it through `telemetry.clock`.
 * Pure: no DOM, no timers, no sim imports. It never ticks; it is an accumulator moved only by page edges
 * (visibilitychange hidden/visible, pagehide, pageshow{persisted}) via Game. The sim never reads it; `sid` comes from
 * crypto, never from state.rng / evRngState.
 */
export interface SessionClockOpts { now: () => number; hiddenEndMs: number; newSid?: () => string }
/** A rotate: the ended sid, when its hide began, its foreground ms at the hide and the hidden span that ended it. */
export interface Split { prevSid: string; hiddenAt: number; fgAtHide: number; prevHiddenMs: number }
export interface SessionClockView {
  readonly sid: string;
  /** Wall ms of the open hide, else null. */
  readonly hiddenAt: number | null;
  /** A session_end was already emitted for this sid; the next resume must rotate. */
  readonly ended: boolean;
  /** Foreground ms of this sid (hidden time excluded): integer, >= 0, frozen while hidden, never decreases within a sid. */
  nowFgMs(at?: number): number;
}
export interface SessionClock extends SessionClockView {
  pause(at: number): void;
  /** `rotate: false` (R7 frozen tabs) resumes the same sid whatever the gap. */
  resume(at: number, rotate?: boolean): Split | null;
  markEnded(): void;
  rotate(at: number, prevHiddenMs: number): Split;
}
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
/** 6 base36 chars from crypto.getRandomValues (rejection-sampled so every char is uniform). */
export function cryptoSid(): string {
  const c = globalThis.crypto; let s = '';
  while (s.length < 6) {
    const a = new Uint8Array(12);
    if (c?.getRandomValues) c.getRandomValues(a); else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); // no crypto (very old engine): telemetry only
    for (const x of a) if (x < 252 && s.length < 6) s += B36[x % 36];
  }
  return s;
}
export function createSessionClock(o: SessionClockOpts): SessionClock {
  const newSid = o.newSid ?? cryptoSid;
  let sid = newSid(), fgBase = 0, runSince: number | null = o.now(), hiddenAt: number | null = null, ended = false, last = 0;
  const fg = (at: number) => {
    const v = runSince === null ? fgBase : fgBase + Math.max(0, at - runSince);
    last = Math.max(last, Math.floor(v)); return last;
  };
  const clock: SessionClock = {
    get sid() { return sid; },
    get hiddenAt() { return hiddenAt; },
    get ended() { return ended; },
    nowFgMs(at = o.now()) { return fg(hiddenAt ?? at); },
    pause(at) {
      if (hiddenAt !== null) return;
      fgBase = fg(at); runSince = null; hiddenAt = at;
    },
    rotate(at, prevHiddenMs) {
      const split: Split = { prevSid: sid, hiddenAt: hiddenAt ?? at, fgAtHide: fg(hiddenAt ?? at), prevHiddenMs: Math.max(0, Math.round(prevHiddenMs)) };
      sid = newSid(); fgBase = 0; last = 0; runSince = at; hiddenAt = null; ended = false;
      return split;
    },
    resume(at, rotate = true) {
      if (hiddenAt === null) return null;
      const gap = at - hiddenAt;
      if (rotate && (ended || gap >= o.hiddenEndMs)) return clock.rotate(at, Math.max(0, gap));
      runSince = Math.max(at, hiddenAt); hiddenAt = null; // hidden time excluded; a clock that went back never adds negative time
      return null;
    },
    markEnded() { ended = true; },
  };
  return clock;
}
