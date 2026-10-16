/** M4-A track copy (art-ux/m4-tracks-copy.md v1.0). Pure strings, unit-tested. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { balancedStrip } from '../sim/tracks';
const pct = (mult: number) => Math.round((mult - 1) * 100);
export const trackLockText = (F: number) => `Needs Farm L${F + 1}`;
export function balancedStripText(s: GameState, b: Balance, aria = false): string {
  const st = balancedStrip(s, b), T = b.m4!.milestones.balanced;
  if (aria) {
    const lv = { Hens: s.hensLevel, 'Egg value': s.eggValueLevel, Farm: s.farmLevel };
    const [w, L] = Object.entries(lv).sort((a, z) => a[1] - z[1])[0];
    return `Balanced farm ${st.n} of ${st.of}. Weakest: ${w}, level ${L}${st.nextLevel !== null ? ` of ${st.nextLevel}` : ''}.`;
  }
  return st.nextLevel === null ? `Balanced farm ${st.n}/${st.of} · +${pct(T[T.length - 1].mult)}%` : `Balanced farm ${st.n}/${st.of} · next +${pct(T[st.n].mult)}% at all ≥ ${st.nextLevel}`;
}
const GRADES = ['Grade A', 'Large', 'Jumbo'];
export function milestoneToast(id: string, b: Balance): string {
  const [kind, n] = id.split(':'), k = +n, M = b.m4!.milestones;
  if (kind === 'hens') return `Hens L${k}: laying boost ×${M.hens.find(m => m.level === k)!.mult}`;
  if (kind === 'grade') { const i = M.grades.findIndex(g => g.level === k); return `Egg value L${k}: ${GRADES[i] ?? 'Grade'} ×${M.grades[i].mult}`; }
  return `Balanced farm ${k}/${M.balanced.length}: +${pct(M.balanced[k - 1].mult)}% income`;
}
