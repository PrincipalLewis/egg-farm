// QA re-check of player-session-1 fixes B3/B5 (Head of QA, Oct 15). Copy into game/tests/ to run.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { goalAria, spokenDuration } from '../src/ui/next-goal';
import { manageAllHtml, promptManage, workersHtml, showFarmManageAll } from '../src/ui/workers-ui';
const g = (status: string) => ({ key: 'FARM', state: 'waiting', label: 'Farm L6: more customers', status, costCents: 1, tab: 'farm' } as any);
describe('B3 goal chip SR text', () => {
  it('singular/plural', () => {
    expect(goalAria(g('~1 min'))).toContain('about 1 minute.');
    expect(goalAria(g('~1 min'))).not.toContain('1 minutes');
    expect(goalAria(g('~2 min'))).toContain('2 minutes');
    expect(spokenDuration('~1 min 1 s')).toBe('1 minute 1 second');
    expect(spokenDuration('~1 h 5 min')).toBe('1 hour 5 minutes');
    expect(spokenDuration('~45 s')).toBe('45 seconds');
  });
});
describe('B5 Manage all counts only <= threshold', () => {
  const st = (e: number[]) => { const s = initialState(b); s.farmLevel = 6; (s as any).workers = {};
    ['market_hand', 'coop_hand', 'hawker', 'grader'].slice(0, e.length).forEach((id, i) => (s.workers as any)[id] = { energy: e[i], cdS: 0 }); s.manageCdS = 0; return s; };
  it('threshold is 0.4 in balance.json', () => expect(b.workers.energy.manage_prompt_threshold).toBe(0.4));
  it('player repro: 81%, 85%, 90% -> hidden (N=0)', () => { const s = st([81, 85, 90]); expect(promptManage(s, b)).toHaveLength(0); expect(manageAllHtml(s, b)).toBe(''); expect(showFarmManageAll(s, b)).toBe(false); });
  it('boundary 40 counts, 41 does not', () => { const s = st([40, 41, 100]); expect(promptManage(s, b)).toEqual(['market_hand']); expect(manageAllHtml(s, b)).toContain('(1 need it)'); });
  it('per-worker Manage enabled only <= 40%', () => { const h = workersHtml(st([41, 40, 10]), b);
    const m = [...h.matchAll(/data-act="manage" [^>]*aria-disabled="(true|false)"/g)].map(x => x[1]); expect(m.length === 0 || m.includes('true')).toBe(true); });
  it('asleep (0) and unpaid are counted if <= threshold', () => { const s = st([0, 30, 90]); expect(promptManage(s, b).length).toBe(2); });
});
