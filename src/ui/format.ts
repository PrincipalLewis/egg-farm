/** Display formatters (layout-spec §1, feature-spec F7). Pure; unit-tested. */
const TIERS: [number, string][] = [[1e3, 'K'], [1e6, 'M'], [1e9, 'B'], [1e12, 'T']];
/** BUG-3: round first, then pick the suffix (999,960 -> "1M", never "1000K"). K: 1 decimal; M+: 2 under 10, else 1. */
export const fmtCount = (n: number) => {
  n = Math.floor(n);
  if (n < 1e4) return n.toLocaleString('en-US');
  let i = TIERS.length - 1; while (i > 0 && n < TIERS[i][0]) i--;
  for (;; i++) {
    const [d, u] = TIERS[i], v = n / d, dp = i === 0 || v >= 10 ? 1 : 2, r = v.toFixed(dp);
    if (+r >= 1000 && i < TIERS.length - 1) continue;
    return r.replace(/\.?0+$/, '') + u;
  }
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
/** Art & UX compact money for pops/cards: "$12.50" under $1,000, then "$1.2K" / "$3.4M". */
export const fmtMoneyShort = (cents: number) => { const d = cents / 100; if (d < 1000) return fmtMoney(cents);
  const [v, u] = d >= 1e12 ? [d / 1e12, 'T'] : d >= 1e9 ? [d / 1e9, 'B'] : d >= 1e6 ? [d / 1e6, 'M'] : [d / 1e3, 'K']; return '$' + (Math.floor(v * 10) / 10).toFixed(1).replace(/\.0$/, '') + u; };
