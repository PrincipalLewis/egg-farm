/** Display formatters (layout-spec §1, feature-spec F7). Pure; unit-tested. */
export const fmtCount = (n: number) => {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 1 : 2).replace(/\.?0+$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
};
/** Coins: always 2 decimals under 1K ($12.40), "$1,234.50" under 10K, then $12.3K / $1.2M. */
export const fmtMoney = (cents: number) => {
  const d = cents / 100;
  if (d < 10_000) return '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + fmtCount(d);
};
/** Welcome-back "You were away 1h 12m"; at/over cap -> "2h+". */
export const fmtAway = (s: number, capS: number) => {
  if (s >= capS) return `${Math.floor(capS / 3600)}h+`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : m ? `${m}m` : `${Math.floor(s)}s`;
};
/** F7: <10 min "~1 min 5 s"/"~45 s"; 10-60 min nearest whole min; >=60 min "~1 h 5 min"; no income "—". */
export const fmtTimeToAfford = (seconds: number | null) => {
  if (seconds === null || !isFinite(seconds)) return '—';
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `~${s} s`;
  if (s < 600) { const m = Math.floor(s / 60), r = s % 60; return r ? `~${m} min ${r} s` : `~${m} min`; }
  if (s < 3600) return `~${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return m ? `~${h} h ${m} min` : `~${h} h`;
};
/** Upgrade-card ETA (Product copy, Oct 16): "Affordable in a moment" under 10 s; "Affordable in ~m:ss"; "~h:mm:ss" from 1 h; no income "Affordable in —". Same seconds as fmtTimeToAfford. */
export const fmtAffordableIn = (seconds: number | null) => {
  if (seconds === null || !isFinite(seconds)) return 'Affordable in —';
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 10) return 'Affordable in a moment';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60, p = (n: number) => String(n).padStart(2, '0');
  return `Affordable in ~${h ? `${h}:${p(m)}` : m}:${p(r)}`;
};
/** Goal-strip status (art-ux rc1-upgrade-value v1.4): short ~m:ss / ~1h 59m / — (Ready! is separate). */
export const fmtGoalEta = (seconds: number | null) => {
  if (seconds === null || !isFinite(seconds)) return '—';
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 3600) {
    const m = Math.floor(s / 60), r = s % 60;
    return `~${m}:${String(r).padStart(2, '0')}`;
  }
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return m ? `~${h}h ${m}m` : `~${h}h`;
};
/** C-AC25 (Product + Art & UX Oct 16): Welcome-back gain, N = pendingOfflineEggs (eggs actually added to the Basket).
 *  Hero "+N": thousands separators up to 9,999,999, then short form (+12.3M); line 2 "egg(s) added to your basket". */
export const offlineEggsParts = (n: number) => {
  const k = Math.max(0, Math.floor(n));
  return { hero: `+${k <= 9_999_999 ? k.toLocaleString('en-US') : fmtCount(k)}`, line2: `${k === 1 ? 'egg' : 'eggs'} added to your basket` };
};
export const offlineEggsLine = (n: number) => { const p = offlineEggsParts(n); return `${p.hero} ${p.line2}`; };
/** Rolling income over the last windowMs of play (coins/s), for the time-to-afford hint. */
export class IncomeRate {
  private ev: { t: number; cents: number }[] = [];
  constructor(private windowMs = 60_000) {}
  add(t: number, cents: number) { this.ev.push({ t, cents }); }
  centsPerSec(now: number) {
    this.ev = this.ev.filter(e => now - e.t <= this.windowMs);
    const total = this.ev.reduce((a, e) => a + e.cents, 0); return total / (this.windowMs / 1000);
  }
  secondsToAfford(now: number, needCents: number) { const r = this.centsPerSec(now); return needCents <= 0 ? 0 : r > 0 ? needCents / r : null; }
}
