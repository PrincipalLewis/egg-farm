// window.eggfarmExportTelemetry (the one release global) is read-only and returns no install_id.
import { describe, it, expect, vi } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
import { TELEMETRY_KEY } from '../src/telemetry/telemetry';
import { mem } from './helpers';
describe('eggfarmExportTelemetry snapshot', () => {
  it('touches no money, save, game state or storage; open windows reported without closing them; no install_id', () => {
    const kv = mem(); let t = 1000; const g = new Game(b, kv, () => t);
    g.state = { ...g.state, coop: 20 }; g.dispatch({ type: 'collect' }); g.telemetry.sum('wage_x_cents', 5); // open tap + worker windows
    const state = JSON.stringify(g.state), save = kv.getItem(SAVE_KEY), tel = kv.getItem(TELEMETRY_KEY), n = g.telemetry.events().length, w = g.telemetry.writes;
    const spy = vi.spyOn(kv, 'setItem');
    const out = JSON.parse(g.telemetry.snapshotJSON()); const again = JSON.parse(g.telemetry.snapshotJSON());
    expect(JSON.stringify(g.state)).toBe(state); expect(kv.getItem(SAVE_KEY)).toBe(save); expect(kv.getItem(TELEMETRY_KEY)).toBe(tel);
    expect(spy).not.toHaveBeenCalled(); expect(g.telemetry.events().length).toBe(n); expect(g.telemetry.writes).toBe(w);
    expect(again.events).toEqual(out.events); // idempotent
    expect(Object.keys(out).sort()).toEqual(['events', 'exportedAt']);
    expect(JSON.stringify(out)).not.toContain(g.installId); expect(out.events.some((e: any) => 'install_id' in e)).toBe(false);
    expect(out.events.find((e: any) => e.type === 'session_start')).toMatchObject({ build: 'dev' });
    expect(out.events.filter((e: any) => e.open).map((e: any) => e.type).sort()).toEqual(['tap', 'worker_summary']);
  });
});
