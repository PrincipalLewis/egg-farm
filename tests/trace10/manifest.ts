// trace10 S5 manifest (design §8): builder helpers + a hand-written validator of the §8 schema (no new dependency).
// Wall-clock appears only in produced_at, which is never hashed into traces.
import { STREAMS } from './record';

export const CONTRACT_SHA256 = 'fc6a938214c8914dde5fed7b6b51fb770b93e66c3472f10e1836b30a0c4b6c99';
/** R04 Card #4 version of record (D-HOP-2026-11-10-05, replaces 6269b126 of D-HOP-2026-11-10-02): sha1 of product/m5-gate-acs.md. */
export const CARD_OF_RECORD_SHA1 = 'da3de91cd1dec39c4e1fc290671acabd9a3f720d';
export const PROFILES = ['optimal', 'seller15', 'casual'] as const;
export type Profile = typeof PROFILES[number];
export interface StreamInfo { file: string; sha256: string; records: number; seeds: number[] }
export interface PerSeed { seed: number; i10: number | null; t10: number | null; trace_sha256: string; records: number; reach: Record<string, number>; rng_end: unknown }
export interface Manifest {
  schema: 'trace10-manifest-v1';
  producer: { id: 'trace10-producer'; version?: string; git_commit: string; tree_dirty?: false; files: Record<string, string> };
  side: 'before' | 'after';
  run: { cmd: string; argv: string[]; env: Record<string, string>; seeds: number[]; profile: Profile; T: number; tickHz: number; synthetic: boolean; selftest_id?: string | null };
  inputs: { csv_path: string; csv_sha256: string; balance_base_sha256: string; economy_config_sha256: string; card_sha256: string; card_sha1?: string; card_of_record_match?: boolean; contract_sha256: string; balance_built_sha256?: string };
  harness: { commit: string; files: Record<string, string> };
  runtime: { node: string; vite_node: string; vitest: string; platform: string };
  cfg: { name: 'none'; stack: unknown; runtime_streakCap: number; runtime_streakCap_inert: boolean; ship_tc_streak_cap: number | null; src_flags_on: string[]; [k: string]: unknown };
  units: Record<string, unknown>;
  streams: Record<'s1' | 's2' | 's3' | 's4', StreamInfo>;
  per_seed: PerSeed[];
  gaps_export?: { file: string; sha256: string; schema: 'EC-1-optionA-v1' };
  produced_at: string;
}
const HEX64 = /^[0-9a-f]{64}$/, HEX40 = /^[0-9a-f]{40}$/;
const TOP = ['schema', 'producer', 'side', 'run', 'inputs', 'harness', 'runtime', 'cfg', 'units', 'streams', 'per_seed', 'produced_at'];
const isObj = (x: unknown): x is Record<string, any> => typeof x === 'object' && x !== null && !Array.isArray(x);
const has = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** §8 schema checks. Returns a list of errors (empty = valid). Fails closed on anything missing or out of range. */
export function validateManifest(m: unknown): string[] {
  const e: string[] = []; const req = (o: Record<string, unknown>, ks: string[], at: string) => { for (const k of ks) if (!has(o, k)) e.push(`${at}.${k} missing`); };
  if (!isObj(m)) return ['manifest is not an object'];
  req(m, TOP, 'manifest');
  for (const k of Object.keys(m)) if (!TOP.includes(k) && k !== 'gaps_export') e.push(`manifest.${k} not allowed (additionalProperties false)`);
  if (m.schema !== 'trace10-manifest-v1') e.push('schema must be trace10-manifest-v1');
  const p = m.producer; if (!isObj(p)) e.push('producer not an object'); else {
    req(p, ['id', 'git_commit', 'files'], 'producer');
    if (p.id !== 'trace10-producer') e.push('producer.id must be trace10-producer');
    if (typeof p.git_commit !== 'string' || !HEX40.test(p.git_commit)) e.push('producer.git_commit must be a 40-hex sha');
    if (has(p, 'tree_dirty') && p.tree_dirty !== false) e.push('producer.tree_dirty must be false');
    if (!isObj(p.files) || !Object.keys(p.files).length) e.push('producer.files empty'); else for (const [f, h] of Object.entries(p.files)) if (typeof h !== 'string' || !HEX64.test(h)) e.push(`producer.files[${f}] not sha256`);
  }
  if (m.side !== 'before' && m.side !== 'after') e.push('side must be before|after');
  const r = m.run; if (!isObj(r)) e.push('run not an object'); else {
    req(r, ['cmd', 'argv', 'env', 'seeds', 'profile', 'T', 'tickHz', 'synthetic'], 'run');
    if (!Array.isArray(r.argv)) e.push('run.argv not array');
    if (!isObj(r.env)) e.push('run.env not object'); else for (const k of Object.keys(r.env)) if (!['CSV', 'SEEDS', 'S0', 'T', 'PROFS', 'OUT', 'SIDE'].includes(k)) e.push(`run.env.${k} not documented`);
    if (!Array.isArray(r.seeds) || !r.seeds.length || !r.seeds.every((s: unknown) => Number.isSafeInteger(s))) e.push('run.seeds must be a non-empty integer array');
    if (!(PROFILES as readonly string[]).includes(r.profile)) e.push('run.profile invalid');
    if (r.T !== 4000) e.push('run.T must be 4000');
    if (r.tickHz !== 10) e.push('run.tickHz must be 10');
    if (typeof r.synthetic !== 'boolean') e.push('run.synthetic must be boolean');
  }
  const i = m.inputs; if (!isObj(i)) e.push('inputs not an object'); else {
    req(i, ['csv_path', 'csv_sha256', 'balance_base_sha256', 'economy_config_sha256', 'card_sha256', 'contract_sha256'], 'inputs');
    for (const k of ['csv_sha256', 'balance_base_sha256', 'economy_config_sha256', 'card_sha256']) if (has(i, k) && !HEX64.test(String(i[k]))) e.push(`inputs.${k} not sha256`);
    if (i.contract_sha256 !== CONTRACT_SHA256) e.push('inputs.contract_sha256 != EC-2 contract fc6a9382…');
  }
  const h = m.harness; if (!isObj(h)) e.push('harness not an object'); else {
    req(h, ['commit', 'files'], 'harness');
    if (!isObj(h.files) || !Object.keys(h.files).length) e.push('harness.files empty'); else for (const [f, x] of Object.entries(h.files)) if (!HEX64.test(String(x))) e.push(`harness.files[${f}] not sha256`);
  }
  const rt = m.runtime; if (!isObj(rt)) e.push('runtime not an object'); else {
    req(rt, ['node', 'vite_node', 'vitest', 'platform'], 'runtime');
    if (!/^v20\./.test(String(rt.node))) e.push(`runtime.node must be v20.* (got ${rt.node})`);
  }
  const c = m.cfg; if (!isObj(c)) e.push('cfg not an object'); else {
    req(c, ['name', 'stack', 'runtime_streakCap', 'runtime_streakCap_inert', 'ship_tc_streak_cap', 'src_flags_on'], 'cfg');
    if (c.name !== 'none') e.push('cfg.name must be none');
    if (c.runtime_streakCap !== 0.28) e.push('cfg.runtime_streakCap must be 0.28');
    if (has(c, 'ship_tc_streak_cap') && !(c.ship_tc_streak_cap === null || typeof c.ship_tc_streak_cap === 'number')) e.push('cfg.ship_tc_streak_cap must be number|null');
    if (!Array.isArray(c.src_flags_on) || c.src_flags_on.length !== 0) e.push('cfg.src_flags_on must be an empty array');
  }
  if (!isObj(m.units) || !Object.keys(m.units).length) e.push('units table missing/empty');
  const st = m.streams; if (!isObj(st)) e.push('streams not an object'); else for (const s of STREAMS) {
    const x = st[s]; if (!isObj(x)) { e.push(`streams.${s} missing`); continue; }
    req(x, ['file', 'sha256', 'records', 'seeds'], `streams.${s}`);
  }
  if (!Array.isArray(m.per_seed) || !m.per_seed.length) e.push('per_seed missing/empty');
  else for (const ps of m.per_seed) { if (!isObj(ps)) { e.push('per_seed entry not object'); continue; } req(ps, ['seed', 'i10', 't10', 'trace_sha256', 'records', 'reach', 'rng_end'], `per_seed[${ps.seed}]`); }
  if (has(m, 'gaps_export')) { const g = m.gaps_export; if (!isObj(g) || g.schema !== 'EC-1-optionA-v1' || !HEX64.test(String(g.sha256))) e.push('gaps_export invalid'); }
  if (typeof m.produced_at !== 'string') e.push('produced_at must be a string');
  return e;
}
