// Test-only synthetic traces for the EC-2 self-tests (a)(b)(c): a tiny deterministic toy run written through the SAME
// TraceWriter + manifest shape the producer uses. Not the harness; never evidence for PL-AC5(iii).
import { initialState, nextRand, type GameState } from '../../src/sim/state';
import { balance } from '../../src/config/balance';
import { TraceWriter } from './writer';
import { CONTRACT_SHA256, CARD_OF_RECORD_SHA1, type Manifest } from './manifest';
import type { SideData } from './compare';
import { sha256 } from './encode';

const H = (s: string) => sha256(s);
export interface SynthOpts { seeds?: number[]; side?: 'before' | 'after'; profile?: 'optimal' | 'seller15' | 'casual'; n?: number;
  /** inject: from this (seed, tick) on, add `delta` coins after the step (a pre-F10 input change) */ inject?: { seed: number; tick: number; delta: number } }
/** Toy run: per tick one S1, one 'step' S3, an engine draw + tick summary in S4; a Farm buy every 6 ticks (S2 buy + S3 after:buy). */
export function synthSide(o: SynthOpts = {}): SideData {
  const seeds = o.seeds ?? [1, 2, 3], n = o.n ?? 90, w = new TraceWriter();
  for (const seed of seeds) {
    w.beginSeed(seed); w.event(0, ['pause_policy', 'off_cfg_none']); let s: GameState = initialState(balance, seed); let i10: number | null = null, t10: number | null = null;
    w.rng(0, 'init', s.rng, 0, 0, 0, null, null);
    let draws = 0;
    for (let i = 1; i <= n; i++) {
      const t = Math.round(i * 0.1 * 10) / 10; const [x, u] = nextRand(s.rng); draws++;
      s = { ...s, rng: x, coinsCents: s.coinsCents + Math.floor(u * 100) + (o.inject && o.inject.seed === seed && i >= o.inject.tick ? o.inject.delta : 0) };
      w.tick(i, t); w.state(i, 'step', s);
      if (i % 6 === 0 && s.farmLevel < 12) { const before = s.coinsCents; s = { ...s, farmLevel: s.farmLevel + 1, coinsCents: s.coinsCents - 10 };
        w.event(i, ['buy', 'f', 'buyFarm', 'farm', s.farmLevel - 1, 10, before, s.coinsCents, s.farmLevel]); w.state(i, 'after:buy', s);
        if (s.farmLevel === 10 && i10 === null) { i10 = i; t10 = t; } }
      w.rng(i, 'tick', s.rng, draws, 0, 0, null, null);
      w.state(i, 'end', s);
      if (i === i10) w.cut(i, i10, t10);
    }
    if (i10 === null) w.cut(n, null, null);
    w.endSeed();
  }
  const f = w.finish();
  const manifest: Manifest = {
    schema: 'trace10-manifest-v1',
    producer: { id: 'trace10-producer', version: 'synthetic', git_commit: 'f20b91839fdf09ba0ed45a890281ccbf7bf2909d', tree_dirty: false, files: { 'tests/trace10/synth.ts': H('synth') } },
    side: o.side ?? 'before',
    run: { cmd: 'synthetic', argv: [], env: {}, seeds, profile: o.profile ?? 'optimal', T: 4000, tickHz: 10, synthetic: true, selftest_id: 'EC-2-synthetic' },
    inputs: { csv_path: 'synthetic', csv_sha256: H('csv'), balance_base_sha256: H('bal'), economy_config_sha256: H('cfg'), card_sha256: H('card'), card_sha1: CARD_OF_RECORD_SHA1, card_of_record_match: true, contract_sha256: CONTRACT_SHA256 },
    harness: { commit: 'f20b91839fdf09ba0ed45a890281ccbf7bf2909d', files: { 'tests/bot-m5.ts': H('bot') } },
    runtime: { node: 'v20.19.2', vite_node: 'synthetic', vitest: 'synthetic', platform: 'linux-x64' },
    cfg: { name: 'none', stack: { on: false }, runtime_streakCap: 0.28, runtime_streakCap_inert: true, ship_tc_streak_cap: 0.28, src_flags_on: [] },
    units: { 'S1.t': { unit: 's', precision: '0.1 (bot-m5.ts L137)' } },
    streams: f.info,
    per_seed: w.summaries.map(x => ({ ...x, reach: {}, rng_end: null })),
    produced_at: '1970-01-01T00:00:00+00:00',
  };
  return { manifest, streams: { ...f.texts } };
}
/** Re-footer a stream body (for unit mutations that must stay footer-valid so only the trace comparison can catch them). */
export function refooter(text: string, mutate: (body: string[]) => string[]): string {
  const ls = text.slice(0, -1).split('\n'); const foot = JSON.parse(ls.pop()!); const body = mutate(ls.map(l => l + '\n'));
  foot[2] = body.length; foot[4] = sha256(body.join('')); return body.join('') + JSON.stringify(foot) + '\n';
}
