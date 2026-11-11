// SCHEMA SELECT (D-CEO-20261030-04 / QA-D-1030-SAVES-RC-1, 2026-10-30): default --schema shipped = the telemetry rc/v5 3f582db ships
// (src/telemetry/telemetry.ts + call sites, table SHIPPED below with file:line). --schema v062 = the original v0.6.2 checker, unchanged;
// under `shipped` every v0.6.2-only assertion is still evaluated but recorded as N/A-by-scope (cited, never counted), not deleted.
// Telemetry v0.6.2 checker (Saves QA, prep 2026-10-29). Captures the real event log in-browser (UI-driven play only) and
// asserts names (allowlist, T-AC9), payload schemas (required / enums / types / forbidden), envelope (sid + fgMs, no sessionMs),
// session_start-only fields, privacy, and firing rules T-AC1/3/5/8 (+T-AC2 best effort), plus the Saves-lane events
// save_corrupt / save_recovery_notice_shown|_dismissed (CSR-10, IDB1-6) and save_restore {source:'idb'} (IDB1-7), offline_grant.
// usage: node telemetry-check.mjs --html <egg-farm.html> --port 5961 --out <dir> [--engine chromium] [--flags breeds,zeroGainUi,pause,abilities] [--expect-build m4.1+sha]
// Flags: conditional fields/events are required ONLY for flags named in --flags and must be ABSENT otherwise.
import { serve, serveDir, launch, watch, seedLS, ids, start, skipOnb, play, writeJSON, readText, sha256, dismissWelcome } from './lib.mjs';
import { parseArgs } from 'node:util'; import path from 'node:path'; import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
const { values: A } = parseArgs({ options: { html: { type: 'string' }, port: { type: 'string', default: '5961' }, out: { type: 'string' }, engine: { type: 'string', default: 'chromium' }, flags: { type: 'string', default: '' }, balance: { type: 'string' }, 'expect-build': { type: 'string' }, 'hidden-hard': { type: 'boolean', default: false }, only: { type: 'string' }, 'milestone-ids': { type: 'string' }, 'ring-size': { type: 'string', default: '5000' }, 'selftest-only': { type: 'boolean', default: false }, 'qa-dir': { type: 'string' }, schema: { type: 'string', default: 'shipped' }, errata: { type: 'string' }, 'economy-csv': { type: 'string' } } });
if (!['shipped', 'v062'].includes(A.schema)) { console.error('--schema shipped|v062'); process.exit(2); } const V062 = A.schema === 'v062';
// v5 RE-TARGET (2026-10-30 13:2x, HoQ): telemetry v0.6.2 ships in v5, always on, no flag (D-CEO-20261030-09; ship-set product/v5-ship-set.md c3aba321 "Not flags";
// manifest rows 11/24 = v5, D-HOE-20261030-18). src/telemetry/schema.ts is NOT in rc/v5 3f582db/e77fc5c (G-8, row 11 open), so --schema shipped
// is a REHEARSAL mode for a pre-row-11 build; the v5 RC gate is to run --schema v062 once row 11 lands (open question to HoE/HoQ).
const NA_V062 = 'NOT-YET-IN-BUILD: telemetry v0.6.2 is v5 always-on (D-CEO-20261030-09, ship-set c3aba321, manifest rows 11/24), but this build predates row 11 (no src/telemetry/schema.ts); recorded, not counted, under --schema shipped (rehearsal only)';
if (!A.html || !A.out) { console.error('need --html --out'); process.exit(2); }
const HERE = path.dirname(new URL(import.meta.url).pathname); const SCH = JSON.parse(readFileSync(path.join(HERE, '../spec/telemetry-v062.schema.json'), 'utf8'));
const FX = path.join(HERE, '../fixtures'); const P1B = readText(path.join(FX, 'p1-30b29d3/p1-B-workers-F10.save.json'));
const want = id => !A.only || A.only.split(',').includes(id);
// Flags: from the BUILD's committed balance.json when --balance is given (m4.enabled === 1 && m4.flags.<k> === 1, config/flags.ts flagOn);
// --flags, if also given, must name exactly that set (else exit 2). Ship-set d71ed8cf (D-HOP-2026-10-30-51): all 14 flags on, bestBuyV2 = 1 REQUIRED (was c3aba321/56090a61: 13 on, bestBuyV2 off).
let FL = A.flags.split(',').filter(Boolean), FLAGS_SRC = A.flags ? '--flags' : 'none (all off)', BJ = null;
if (A.balance) { let bj; try { bj = JSON.parse(readFileSync(A.balance, 'utf8')); } catch (e) { console.error(`--balance ${A.balance} unreadable`); process.exit(2); }
  const m = (bj && bj.m4) || {}, f = (m.flags && typeof m.flags === 'object') ? m.flags : {}, on = m.enabled === 1 ? Object.keys(f).filter(k => f[k] === 1).sort() : [];
  if (A.flags && [...new Set(FL)].sort().join(',') !== on.join(',')) { console.error(`--flags '${A.flags}' != balance.json flags-on '${on.join(',')}'`); process.exit(2); }
  BJ = bj; FL = on; FLAGS_SRC = `balance.json ${sha256(readFileSync(A.balance))}`; }
const FLAGS = new Set(FL); const OUT = path.resolve(A.out);
const res = { html_sha256: sha256(readFileSync(A.html)), schema_sha256: sha256(readFileSync(path.join(HERE, '../spec/telemetry-v062.schema.json'))), flags: [...FLAGS], flags_source: FLAGS_SRC, checks: [], scenarios: {} };
// D-HOP-2026-10-29-04 (spec addendum 20:20, telemetry-spec.md sha256 6d504570): G-TEL-1/2 events are ALLOWED with CLOSED payloads, HARD in T-AC9.
// Any field outside the list, any non-enum string, or an id that does not match its track/level FAILS. Unverified M5 fields/flags stay TRIAGE-ON-RC (logged, never fail).
// Milestone ids = balance-data enum (src/sim/tracks.ts reachedMilestones: hens:<level>, grade:<level>, balanced:<tier>); default = 30b29d3/22eac98 balance.json m4.milestones; the gate passes the RC's.
const MILESTONE_IDS = new Set((A['milestone-ids'] ?? 'hens:10,hens:20,hens:30,grade:5,grade:10,grade:20,balanced:1,balanced:2,balanced:3,balanced:4,balanced:5').split(',').filter(Boolean)); res.milestoneIds = [...MILESTONE_IDS];
const NOTICE = { notice: ['M1', 'M2', 'M3', 'M4', 'M5', 'storage', 'cantsave'], source: ['bak', 'idb', 'v6_backup', 'none', 'deferred', null], variant: ['level', 'age', 'fallback'], store: ['ls', 'idb', null] }; // src/ui/save-recovery.ts L47-54, L113
const CLOSED = { // allowed payload fields (besides the envelope); validators return a problem string or ''
  save_recovery_notice_shown: { req: ['notice', 'source', 'store'], opt: ['variant'], v: e => ['notice', 'source', 'variant', 'store'].filter(f => f in e && !NOTICE[f].includes(e[f])).map(f => `${f}=${JSON.stringify(e[f])} not in enum`).join('; ') },
  milestone_reached: { req: ['id', 'track', 'level', 'mult'], opt: [], v: e => { const [k, n] = String(e.id).split(':'); const want = { hens: 'hens', grade: 'egg_value' }[k];
    return [!MILESTONE_IDS.has(e.id) && `id ${JSON.stringify(e.id)} not in milestone enum`, !want && `id kind ${k} is not a milestone (hens|grade)`, !['hens', 'egg_value'].includes(e.track) && `track ${JSON.stringify(e.track)} not hens|egg_value`, want && e.track !== want && `track ${e.track} does not match id ${e.id}`,
      !(Number.isInteger(e.level) && e.level === +n) && `level ${e.level} does not match id ${e.id}`, !(typeof e.mult === 'number' && Number.isFinite(e.mult) && e.mult > 0) && `mult ${e.mult} not a positive number`].filter(Boolean).join('; '); } },
  balanced_tier: { req: ['id', 'tier', 'min_level'], opt: [], v: e => { const [k, n] = String(e.id).split(':');
    return [!MILESTONE_IDS.has(e.id) && `id ${JSON.stringify(e.id)} not in milestone enum`, k !== 'balanced' && `id kind ${k} is not balanced`, !(Number.isInteger(e.tier) && e.tier === +n) && `tier ${e.tier} does not match id ${e.id}`, !(Number.isInteger(e.min_level) && e.min_level >= 0) && `min_level ${e.min_level} not a non-negative integer`].filter(Boolean).join('; '); } } };
CLOSED.save_recovery_notice_dismissed = CLOSED.save_recovery_notice_shown;
// ---- SHIPPED schema: rc/v5 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec (read 2026-10-30 by Saves QA; HoQ to OK before re-pin) ----
// Envelope telemetry.ts:40 (track), :58 (worker_summary), :62 (tap): {type, ts: integer ms, sessionMs: integer >= 0} on every stored event,
// ts - sessionMs == the Telemetry's sessionStart (one constant per page load = the shipped session identity). No sid/fgMs (v0.6.2 envelope).
// Field types: i = integer, n = finite number, b = boolean, s = string, a = array, [..] = enum, T = literal true. '?' = optional.
const WID = ['market_hand', 'coop_hand', 'hawker', 'grader'], MOOD = ['working', 'tired', 'asleep', 'unpaid'];   // sim/workers.ts:4, :6
const CORRUPT = ['missing', 'empty', 'parse', 'wrong_type', 'version', 'missing_state', 'checksum', 'invalid_state'];   // save/save.ts:201
const RSRC = ['bak', 'idb', 'v6_backup', 'none', 'deferred'];   // save/save.ts:237
const SKIN = ['golden_egg', 'broody_hen'];   // sim/events.ts:25
const SHIPPED = {
  session_start: { f: { install_id: 's', build: 's' }, src: 'game.ts:57' },
  session_end: { f: {}, src: 'game.ts:305 (endSession, main.ts:145 pagehide)' },
  tap: { f: { count: 'i', eggs: 'n' }, src: 'telemetry.ts:62 (closeTapWindow; game.ts:115 collect -> tap)' },
  worker_summary: { f: { windowMs: 'i' }, dyn: /^(wage_(market_hand|coop_hand|hawker|grader)_cents|coop_hand_eggs|market_hand_eggs|market_hand_cents)$/, src: 'telemetry.ts:58; keys game.ts:116-118' },
  customer_arrive: { f: { id: 'i', N: 'i' }, src: 'sim/events.ts:4' },
  customer_served: { f: { id: 'i', N: 'i', partial: 'b' }, src: 'sim/events.ts:5' },
  customer_partial: { f: { id: 'i', N: 'i', filled: 'n' }, src: 'sim/events.ts:6' },
  customer_lost: { f: { reason: ['timeout', 'full_queue'], 'id?': 'i', 'N?': 'i' }, src: 'sim/events.ts:7' },
  sell: { f: { id: 'i', k: 'n', N: 'i', price: 'n', value: 'n', by: ['player'] }, src: "sim/events.ts:8; by 'market_hand' is summed, game.ts:118" },
  upgrade: { f: { upgrade: ['collection', 'farm', 'hens', 'eggValue'], newLevel: 'i', cost: 'n', coinsBefore: 'n', 'track?': ['farm', 'hens', 'egg_value', 'collection'] }, src: 'sim/events.ts:9' },
  worker_hire: { f: { worker: WID, cost: 'n', farm: 'i' }, src: 'sim/events.ts:12' },
  worker_manage: { f: { worker: WID, energyBefore: 'n' }, src: 'sim/events.ts:13' },
  worker_manage_all: { f: { workers: 'a', energyBefore: 'a' }, src: 'sim/events.ts:14' },
  worker_state: { f: { worker: WID, state: MOOD }, src: 'sim/events.ts:15' },
  worker_yawn: { f: { worker_id: WID, energy_pct: 'n', farm_level: 'i' }, src: 'sim/events.ts:16' },
  grader_tier: { f: { tier: 'i', mult: 'n', cost: 'n' }, src: 'sim/events.ts:18' },
  milestone_reached: { closed: true, src: 'sim/events.ts:19 (validator CLOSED.milestone_reached)' },
  balanced_tier: { closed: true, src: 'sim/events.ts:20 (validator CLOSED.balanced_tier)' },
  coop_full: { f: { phase: ['start', 'end'], 'durationMs?': 'i' }, src: 'game.ts:124-125' },
  offline_grant: { f: { secondsAway: 'n', eggs: 'n' }, src: 'game.ts:109' },
  save_restore: { f: { source: ['idb'] }, src: 'game.ts:70' },
  save_corrupt: { f: { reason: CORRUPT, had_backup: 'b', restored_from_backup: 'b', build: 's', 'copy_failed?': 'T', recovered_from: RSRC, store: ['ls', 'idb'], tried: 'a', 'restored_version?': 'i', migrated: 'b' }, src: 'game.ts:81-85; save.ts:201, :237-238' },
  save_savedat_invalid: { f: {}, src: 'game.ts:100' },
  save_newer_version: { f: { version: 'i', build: 's', 'live?': 'T' }, src: 'game.ts:66, :299' },
  save_migration_aborted: { f: { store: 's', reason: 's', path: 's', attempt_count: 'i', 'stuck_on_v6?': 'T' }, src: 'game.ts:206' },
  save_backup_idb_unavailable: { f: { reason: 's', path: 's' }, src: 'game.ts:225' },
  save_migrated: { f: { from: 'i', to: 'i', migration: 's', refund_cents: 'n', farm_level: 'i', backup_stores: 'a' }, src: 'game.ts:252' },
  save_failed: { f: { reason: 's' }, src: 'game.ts:282' },
  tab_guard_blocked_write: { f: {}, src: 'game.ts:273' },
  tab_guard_takeover: { f: { reason: 's' }, src: 'main.ts:122' },
  save_reset: { f: {}, src: 'ui/app.ts:282; debug/panel.ts:38' },
  save_recovery_export: { f: { case: ['R', 'F', 'Q', 'D'] }, src: 'ui/app.ts:748; save.ts:241' },
  save_recovery_notice_shown: { closed: true, src: 'ui/save-recovery.ts:113, :207 (validator CLOSED, enums save-recovery.ts:47, :52-53)' },
  save_recovery_notice_dismissed: { closed: true, src: 'ui/save-recovery.ts:113, :209' },
  coop_hand_tip: { f: { phase: ['tap', 'shown'], 'farm?': 'i' }, src: 'ui/app.ts:157, :626' },
  goal_tap: { f: { target: 's', state: ['ready', 'waiting', 'noincome', 'done'] }, src: 'ui/app.ts:448; ui/next-goal.ts:14' },
  onboarding_step: { f: { step: 'i', name: 's', 'action?': ['shown', 'open', 'dismiss', 'done'], 'timeout?': 'T' }, src: 'telemetry.ts:85; ui/app.ts:647-702' },
  onboarding_skip: { f: { atStep: 'i' }, src: 'telemetry.ts:86; ui/app.ts:700' },
  onboarding_abandon: { f: { atStep: 'i', reason: ['reload'] }, src: 'ui/app.ts:693' },
  ios_home_tip_shown: { f: { browser: 's' }, src: 'ui/app.ts:723' },
  ios_home_tip_dismissed: { f: {}, src: 'ui/app.ts:728' },
  // M5.0 sim events (sim/events.ts:29-40): allowed ONLY with their m4.flags.* on (FLAGS = the build's balance.json, see --balance); any of them with its flag off FAILS.
  collectible_spawned: { flag: 'golden+broody', f: { skin: SKIN, farm_level: 'i', collection_level: 'i', slot_id: 's', interval_s: 'n', deferred_ms: 'n' }, src: 'sim/events.ts:30' },
  collectible_collected: { flag: 'golden+broody', f: { skin: SKIN, reaction_ms: 'n', in_warning: 'b', reward_type: ['cash', 'frenzy', 'eggs', 'eggs_cash', 'broody_cash'], reward_value: 'n', reward_duration_s: 'n', farm_level: 'i', 'nest_fill_share?': 'n' }, src: 'sim/events.ts:31' },
  collectible_expired: { flag: 'golden+broody', f: { skin: SKIN, reason: ['timeout', 'offline', 'reload', 'takeover', 'reset'], farm_level: 'i' }, src: 'sim/events.ts:32' },
  frenzy_started: { flag: 'golden', f: { mult: 'n', duration_s: 'n', farm_level: 'i', grader_tier: 'i' }, src: 'sim/events.ts:33' },
  frenzy_ended: { flag: 'golden', f: { extra_coins: 'n', eggs_sold: 'n', sold_by_player: 'n', sold_by_workers: 'n', reason: ['timeout', 'reset'] }, src: 'sim/events.ts:34' },
  streak_started: { flag: 'streak', f: { farm_level: 'i', collection_level: 'i' }, src: 'sim/events.ts:35' },
  streak_peak: { flag: 'streak', f: { value: 'n', duration_s: 'n', credited_taps: 'n', time_at_cap_s: 'n', extra_coins: 'n', frenzy_overlap_s: 'n', reason: 's', max_tier: 'i' }, src: 'sim/events.ts:36; game.ts:304' },
  abilities_unlocked: { flag: 'abilities', f: { farm: 'i', hired: 'a' }, src: 'sim/events.ts:37' },
  ability_used: { flag: 'abilities', f: { worker: WID, farm: 'i', energy_pct: 'n', mood: MOOD, via_all: 'b', t_since_ready_s: 'n', in_sheet: 'b' }, src: 'sim/events.ts:38' },
  ability_blocked: { flag: 'abilities', f: { worker: WID, reason: ['cooldown', 'asleep', 'unpaid', 'paused', 'lockout'], count: 'i' }, src: 'sim/events.ts:39' },
  ability_ended: { flag: 'abilities', f: { worker: WID, cause: ['expired', 'paused', 'offline', 'asleep', 'unpaid'], effect_s: 'n' }, src: 'sim/events.ts:40' } };
const ENV_S = ['type', 'ts', 'sessionMs'], V062_ENV = ['sid', 'fgMs'];   // telemetry.ts:40/:58/:62 (3f582db). --schema shipped (pre-row-11 rehearsal): sid/fgMs ABSENT.
// v5 target: --schema v062 REQUIRES sid (^[0-9a-z]{6}$) + fgMs and forbids sessionMs (qa spec telemetry-v062.schema.json envelope). No schema.ts in rc/v5
// to cite yet (G-8): presence/shape stay on the spec until HoE lands row 11 and names the file:line (open question).
const tOk = (t, v) => Array.isArray(t) ? t.includes(v) : t === 'i' ? Number.isInteger(v) : t === 'n' ? typeof v === 'number' && Number.isFinite(v) : t === 'b' ? typeof v === 'boolean' : t === 's' ? typeof v === 'string' : t === 'a' ? Array.isArray(v) : t === 'T' ? v === true : false;
const LONG_OK = { session_start: ['install_id', 'build'], save_corrupt: ['build'], save_newer_version: ['build'], save_migration_aborted: ['path'], save_backup_idb_unavailable: ['path'], save_migrated: ['migration'] };
/** Shipped-schema problems for one STORED event (LS eggfarm.telemetry). */
// S-AC5 (QA-D-1030-SAVES-RC-2): the count of upgrade events must EQUAL the purchases the harness made (bought = successful buy clicks, lib.mjs play()); >= 1 alone is not enough.
function sAc5Problems(bought, ups) { const p = [];
  if (!Number.isInteger(bought) || bought < 1) p.push(`harness bought ${bought} (< 1): S-AC5 not exercised`);
  if (ups.length !== bought) p.push(`upgrade events ${ups.length} != harness purchases ${bought}`);
  ups.forEach((e, i) => { if (!Number.isInteger(e.newLevel)) p.push(`upgrade[${i}].newLevel ${e.newLevel} not integer`); if (!(e.coinsBefore >= e.cost)) p.push(`upgrade[${i}] coinsBefore ${e.coinsBefore} < cost ${e.cost}`); });
  return p; }
function shippedProblems(e) {
  const P = []; const s = SHIPPED[e.type]; if (typeof e.type !== 'string') return ['event without string type'];
  if (!s) return [`not in shipped allowlist: ${e.type}`];
  if (!Number.isInteger(e.ts)) P.push(`${e.type}: envelope ts ${JSON.stringify(e.ts)} not integer`);
  if (!(Number.isInteger(e.sessionMs) && e.sessionMs >= 0)) P.push(`${e.type}: envelope sessionMs ${JSON.stringify(e.sessionMs)} not integer >= 0`);
  for (const f of V062_ENV) if (f in e) P.push(`${e.type}: ${f} present (v0.6.2 envelope is not in the shipped build: drift)`);
  if (s.flag && !s.flag.split('+').some(fl => FLAGS.has(fl))) P.push(`${e.type}: fired with flag ${s.flag} off (build balance.json)`);
  if (s.closed) { const C = CLOSED[e.type]; const allowed = new Set([...ENV_S, ...C.req, ...C.opt]); for (const f of C.req) if (!(f in e)) P.push(`${e.type}: required ${f} missing`);
    for (const f of Object.keys(e)) if (!allowed.has(f)) P.push(`${e.type}: field ${f} outside the closed list`); const bad = C.v(e); if (bad) P.push(`${e.type}: ${bad}`); }
  else { const allowed = new Set(ENV_S);
    for (const [k, t] of Object.entries(s.f)) { const opt = k.endsWith('?'), f = opt ? k.slice(0, -1) : k; allowed.add(f);
      if (!(f in e)) { if (!opt) P.push(`${e.type}: required ${f} missing`); continue; } if (!tOk(t, e[f])) P.push(`${e.type}.${f}=${JSON.stringify(e[f])} not ${Array.isArray(t) ? 'in enum ' + JSON.stringify(t) : t}`); }
    for (const f of Object.keys(e)) if (!allowed.has(f) && !(s.dyn && s.dyn.test(f) && typeof e[f] === 'number' && Number.isFinite(e[f]))) P.push(`${e.type}: field ${f} outside the closed list`); }
  if (e.type === 'offline_grant' && 'awayS' in e) P.push('offline_grant: forbidden field awayS (G-TEL-3: use secondsAway)');
  if (e.type === 'tap' && !(Number.isInteger(e.count) && e.count >= 1 && e.eggs >= 0)) P.push(`tap: count ${e.count} / eggs ${e.eggs} out of range`);
  if (e.type === 'save_corrupt' && Array.isArray(e.tried)) for (const t of e.tried) if (!(t && ['bak', 'idb', 'v6_backup'].includes(t.source) && ['valid', 'invalid', 'absent', 'unavailable'].includes(t.result) && Object.keys(t).every(k => ['source', 'result', 'reason'].includes(k)))) P.push(`save_corrupt.tried entry ${JSON.stringify(t)} not {source,result,reason?} (save.ts:238)`);
  if (e.type === 'worker_manage_all' && !(Array.isArray(e.workers) && e.workers.every(w => WID.includes(w)) && Array.isArray(e.energyBefore) && e.energyBefore.length === e.workers.length)) P.push('worker_manage_all: workers/energyBefore malformed');
  for (const [k, v] of Object.entries(e)) if (typeof v === 'string') { if (v.length > SCH.privacy.maxStringLen && !(LONG_OK[e.type] ?? []).includes(k)) P.push(`${e.type}.${k}: free text? len ${v.length}`); for (const pat of SCH.privacy.patterns) if (new RegExp(pat).test(v)) P.push(`${e.type}.${k}: PII-like value`); }
  return P; }
// T-AC9 (D-HOE-20261030-19 F-6, D-HOP-2026-10-30-41, HoQ C-1 FINAL): under v0.6.2 only NON-legacy events are validated; an event tagged legacy:true
// (kept from a pre-0.6.2 bare-array ring on load) is skipped; a non-legacy event that fails validation FAILS.
const tAc9Problems = e => (e && e.legacy === true) ? [] : schemaProblems(e);
const evProblems = e => V062 ? tAc9Problems(e) : shippedProblems(e);
// Row 24 / G-8 (D-HOE-20261030-19/-20, D-HOP-41, HoQ C-1 FINAL): stored ring eggfarm.telemetry = {v: '0.6.2', events: [...]}; export header carries schema_version '0.6.2'.
const TELEMETRY_SCHEMA_VERSION = '0.6.2';
const ringProblems = raw => { const P = []; if (Array.isArray(raw)) P.push('ring is a bare array (pre-0.6.2 format) after a v0.6.2 build wrote it');
  else if (!raw || typeof raw !== 'object') P.push(`ring missing or not an object (${JSON.stringify(raw)})`);
  else { if (raw.v !== TELEMETRY_SCHEMA_VERSION) P.push(`ring.v ${JSON.stringify(raw.v)} != '${TELEMETRY_SCHEMA_VERSION}'`); if (!Array.isArray(raw.events)) P.push('ring.events not an array'); } return P; };
const exportHeaderProblems = x => { const P = []; if (!x || typeof x !== 'object' || Array.isArray(x)) return ['export not an object'];
  if (x.schema_version !== TELEMETRY_SCHEMA_VERSION) P.push(`export schema_version ${JSON.stringify(x.schema_version)} != '${TELEMETRY_SCHEMA_VERSION}'`); if (!Array.isArray(x.events)) P.push('export events not an array'); return P; };
// C-3 (HoQ ruling 2026-10-30, = D-HOE-20261030-19 G-4): refill_used only, NO manage_used alias on the wire or in the export.
const V5_FORBIDDEN_EVENTS = ['manage_used'];
/** Shipped session identity: every event of one page load has the same anchor ts - sessionMs (telemetry.ts:40/:58/:62). */
const anchor = e => e.ts - e.sessionMs;
// sales_stall (sales-stopped-spec 2c2c323b §8; allowed only with m4.flags.salesStopped on, SS-23). Closed list per §8; no reuse_count.
// resolved_by = the 14 values of product/market/sales-stopped-spec.md L249 (chip_manage added 2026-10-30; conversion L270-273). No schema.ts enum in rc/v5 to cross-check (G-8).
/** TS7 SS-19 pairing (sales-stopped §8 L253): >= 1 shown, exactly one resolved per shown stall_id, no reuse_count. [] = OK. */
const ts7Pairing = st => { const shown = st.filter(e => e.phase === 'shown'), resd = st.filter(e => e.phase === 'resolved'), P = [];
  if (shown.length < 1) P.push('no shown'); for (const sh of shown) { const n = resd.filter(x => x.stall_id === sh.stall_id).length; if (n !== 1) P.push(`stall_id ${sh.stall_id}: ${n} resolved`); }
  if (st.some(e => 'reuse_count' in e)) P.push('reuse_count present'); return P; };
const RESOLVED_BY_SPEC_L249 = ['chip_refill', 'chip_sell_all', 'chip_collect', 'chip_manage', 'refill_elsewhere', 'sell_elsewhere', 'collect_elsewhere', 'auto_resume', 'queue_empty', 'basket_empty', 'paused', 'focus_lost', 'cause_changed', 'none'];
const STALL = { phase: ['shown', 'resolved'], cause: ['mh_asleep', 'mh_paused', 'mh_unpaid', 'no_mh', 'ch_asleep', 'ch_unpaid', 'other'], st: ['working', 'tired', 'asleep', 'unpaid', 'paused', 'none'],
  resolved_by: ['chip_refill', 'chip_sell_all', 'chip_collect', 'chip_manage', 'refill_elsewhere', 'sell_elsewhere', 'collect_elsewhere', 'auto_resume', 'queue_empty', 'basket_empty', 'paused', 'focus_lost', 'cause_changed', 'none'] };
if (FLAGS.has('salesStopped')) CLOSED.sales_stall = { req: ['phase', 'stall_id', 'cause', 'farm_level', 'queue_len', 'sellable_eggs', 'coop_eggs', 'mh_state', 'ch_state', 'focus_s_since_last_sale', 'session_s'], opt: ['prev_stall_id', 'resolved_by', 'time_to_resolve_s', 'chip_tapped'],
  v: e => [!STALL.phase.includes(e.phase) && `phase ${e.phase}`, !STALL.cause.includes(e.cause) && `cause ${e.cause}`, !STALL.st.includes(e.mh_state) && `mh_state ${e.mh_state}`, !STALL.st.includes(e.ch_state) && `ch_state ${e.ch_state}`,
    e.phase === 'resolved' && !(STALL.resolved_by.includes(e.resolved_by) && typeof e.time_to_resolve_s === 'number' && typeof e.chip_tapped === 'boolean') && 'resolved needs resolved_by enum + time_to_resolve_s + chip_tapped',
    e.phase === 'shown' && ['resolved_by', 'time_to_resolve_s', 'chip_tapped'].some(f => f in e) && 'shown carries resolved-only fields'].filter(Boolean).join('; ') };
// ==== Errata rev 13 PINNED (TASK saves-qa/rev12-tel, 2026-10-30): product/collection/telemetry-spec-errata-v5.md sha1 a0e8f6d7085939756021856c25429a55d8a8d847
// (frozen telemetry-spec-errata-v5.a0e8f6d7.md), pinned by HoE in engineering/v5-rc-manifest.md L131 (replaces rev 12 0cfe168a, which replaced rev 7 fd7d5921). Pure checks; self-tested below in
// every mode; applied at runtime to every captured log under --schema v062 (N/A-by-scope under shipped).
const ERRATA_SHA1 = 'a0e8f6d7085939756021856c25429a55d8a8d847';
// Pinned set, V-3 L143-152 (+ tip_shown{id:clock_wage}); ring types L154. dead_zone pinned since rev 9.
const PINNED_SET_REV13 = ['sales_stall', 'fatigue_cue_shown', 'fatigue_cue_tapped', 'shift_sheet_opened', 'refill_used', 'rest_toggled', 'first_worker_hired', 'autorefill_toggled',
  'abilities_unlocked', 'ability_used', 'ability_ended', 'ability_blocked', 'worker_paused', 'worker_resumed', 'hatch_started', 'flock_complete', 'milestone_reached', 'balanced_tier', 'zero_gain_purchase', 'dead_zone'];
const RING_REV13 = ['breed_revealed', 'breed_slotted', 'best_buy_shown', 'best_buy_followed', 'best_buy_suppressed_zero_gain'];
/** Pinned-set check against the errata text: the V-3 code block must list exactly PINNED_SET_REV13. */
const pinnedSetProblems = txt => { const m = String(txt || '').match(/## V-3 §3\.2 pinned set[\s\S]*?```\n([\s\S]*?)```/); if (!m) return ['V-3 pinned-set block not found in errata text'];
  const got = [...m[1].matchAll(/\b([a-z][a-z0-9_]+)\b/g)].map(x => x[1]).filter(n => !['e', 'type', 'id', 'tip_shown', 'clock_wage'].includes(n));
  const P = []; for (const n of PINNED_SET_REV13) if (!got.includes(n)) P.push(`${n} not in errata V-3 pinned set`); for (const n of got) if (!PINNED_SET_REV13.includes(n)) P.push(`errata V-3 lists ${n}, checker does not`);
  if (!/tip_shown[\s\S]*clock_wage/.test(m[1])) P.push('tip_shown clock_wage predicate missing'); return P; };
// telemetry.bbv2.* (rev 13 L86-92, G-17): hand-set TOP-LEVEL balance.json `telemetry.bbv2` block, never economy.csv, never m4.telemetry. Exactly 4 keys.
const BBV2_SPEC = { shown_min_gap_s: 5, zero_gain_eta_max_s: 60, dead_zone_min_s: 30, zero_gain_purchase_cap: 50 };
const bbv2KeyProblems = (bj, csvHeader) => { const P = []; const b = bj && bj.telemetry && bj.telemetry.bbv2;
  if (!b || typeof b !== 'object') P.push('top-level balance.json telemetry.bbv2 block missing');
  else { for (const [k, v] of Object.entries(BBV2_SPEC)) if (b[k] !== v) P.push(`telemetry.bbv2.${k} = ${JSON.stringify(b[k])} != ${v}`); for (const k of Object.keys(b)) if (!(k in BBV2_SPEC)) P.push(`telemetry.bbv2.${k} not in errata rev 13`); }
  const m4t = bj && bj.m4 && bj.m4.telemetry; if (m4t && typeof m4t === 'object' && ('bbv2' in m4t || Object.keys(BBV2_SPEC).some(k => k in m4t))) P.push('bbv2 keys under m4.telemetry (rev 13: top-level telemetry.bbv2 only)');
  if (csvHeader != null) for (const k of Object.keys(BBV2_SPEC)) if (String(csvHeader).split(/[,\s]+/).some(c => c === k || c === `telemetry.bbv2.${k}` || c === `bbv2_${k}`)) P.push(`economy.csv has a ${k} column (rev 13: never from economy.csv)`);
  return P; };
const BBV = (BJ && BJ.telemetry && BJ.telemetry.bbv2) || BBV2_SPEC;   // thresholds of the build under test (spec values if absent)
const bySid = evs => { const m = new Map(); for (const e of evs) { const k = e.sid ?? '?'; if (!m.has(k)) m.set(k, []); m.get(k).push(e); } return m; };
const isInt = (v, lo = -Infinity, hi = Infinity) => Number.isInteger(v) && v >= lo && v <= hi;
const dp = (v, n) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v * 10 ** n - Math.round(v * 10 ** n)) < 1e-6;
// C-2 (HoQ 14:56, = errata rev 13 V-6 L175-178, exclusive emission L176, D-HOP-41): rc2Refill=1 -> only rest_toggled (on:true -> on:false pairs carry paused_duration_s; H-1 fields on on:true), NO worker_paused/
// worker_resumed, session_end WITHOUT paused_worker_s/all_paused_s (ABSENT). rc2Refill=0 + pause=1 -> worker_paused/worker_resumed only, no rest_toggled, session_end carries
// BOTH paused totals, worker_resumed.cause never auto_full. rc2Refill=0 + pause=0 -> paused totals UNVERIFIED (c2Unverified).
const H1 = ['farm', 'mood', 'unpaid', 'ability_active', 'golden_on_screen', 'frenzy_active'], PT = ['paused_worker_s', 'all_paused_s'];
const c2Problems = (evs, rc2, pause) => { const P = [];
  for (const [sid, es] of bySid(evs)) { const se = es.filter(e => e.type === 'session_end');
    if (rc2) { for (const e of se) { const has = PT.filter(f => f in e); if (has.length) P.push(`${sid}: session_end carries ${has.join(',')} with rc2Refill=1 (C-2: absent; derive from rest_toggled pairs)`); }
      for (const e of es) if (e.type === 'worker_paused' || e.type === 'worker_resumed') P.push(`${sid}: ${e.type} with rc2Refill=1 (exclusive emission: rest_toggled only)`);
      const open = new Map(); for (const e of es.filter(e => e.type === 'rest_toggled')) { const w = e.worker;
        if (e.on === true) { if (open.has(w)) P.push(`${sid}: rest_toggled{on:true} ${w} while already paused (unpaired)`); open.set(w, e); const miss = H1.filter(f => !(f in e)); if (miss.length) P.push(`${sid}: rest_toggled{on:true} ${w} lacks ${miss.join(',')}`); if ('paused_duration_s' in e) P.push(`${sid}: rest_toggled{on:true} carries paused_duration_s`); }
        else if (e.on === false) { if (!open.has(w)) P.push(`${sid}: rest_toggled{on:false} ${w} without a preceding on:true (unpaired)`); open.delete(w); if (!(typeof e.paused_duration_s === 'number' && e.paused_duration_s >= 0)) P.push(`${sid}: rest_toggled{on:false} ${w} paused_duration_s ${JSON.stringify(e.paused_duration_s)} not a number >= 0`); const xs = H1.filter(f => f in e); if (xs.length) P.push(`${sid}: rest_toggled{on:false} carries on:true-only ${xs.join(',')}`); }
        else P.push(`${sid}: rest_toggled.on ${JSON.stringify(e.on)} not bool`); } }
    else { for (const e of es) { if (e.type === 'rest_toggled') P.push(`${sid}: rest_toggled with rc2Refill=0 (exclusive emission: worker_paused/worker_resumed)`); if (e.type === 'worker_resumed' && e.cause === 'auto_full') P.push(`${sid}: worker_resumed cause auto_full with rc2Refill=0`); }
      if (pause) for (const e of se) for (const f of PT) if (!(typeof e[f] === 'number' && e[f] >= 0)) P.push(`${sid}: session_end.${f} ${JSON.stringify(e[f])} missing/not >= 0 with rc2Refill=0, pause=1 (C-2, HoQ 14:56: both paused totals required)`); } }
  return P; };
// C-2 rc2Refill=0 + pause=0 (HoQ 14:56): UNSPECIFIED in errata rev 13 -> reported UNVERIFIED (never FAIL), pending PMC rev 14. Returns notes, not problems.
const c2Unverified = (evs, rc2, pause) => (rc2 || pause) ? [] : evs.filter(e => e.type === 'session_end').map(e => `${e.sid ?? '?'}: rc2Refill=0, pause=0: session_end paused totals ${PT.map(f => `${f} ${f in e ? 'present' : 'absent'}`).join(', ')} -> UNVERIFIED (unspecified, pending PMC rev 14)`);
// zero_gain_purchase cap (rev 13 row #21 L80, L90, L155; D-HOE-32 M-2): <= telemetry.bbv2.zero_gain_purchase_cap (50) per session, NO marker,
// session_end.zero_gain_purchase_dropped int >= 0 (bestBuyV2 field: present iff bestBuyV2=1) = events not emitted over the cap.
const zgCapProblems = (evs, cap, bb) => { const P = [];
  for (const [sid, es] of bySid(evs)) { const zg = es.filter(e => e.type === 'zero_gain_purchase'), se = es.filter(e => e.type === 'session_end');
    if (!bb) { if (zg.length) P.push(`${sid}: ${zg.length} zero_gain_purchase with bestBuyV2=0`); if (se.some(e => 'zero_gain_purchase_dropped' in e)) P.push(`${sid}: session_end.zero_gain_purchase_dropped with bestBuyV2=0`); continue; }
    if (zg.length > cap) P.push(`${sid}: ${zg.length} zero_gain_purchase > cap ${cap}`);
    for (const e of zg) if ('capped' in e || 'events' in e || 'episodes' in e) P.push(`${sid}: zero_gain_purchase capped marker present (rev 13: over the cap nothing is emitted, no marker)`);
    for (const e of se) { const d = e.zero_gain_purchase_dropped; if (!isInt(d, 0)) { P.push(`${sid}: session_end.zero_gain_purchase_dropped ${JSON.stringify(d)} not int >= 0 (bestBuyV2=1)`); continue; }
      if (zg.length < cap && d !== 0) P.push(`${sid}: zero_gain_purchase_dropped ${d} > 0 but only ${zg.length} < cap ${cap} emitted`); } }
  return P; };
// ability_blocked marker (rev 13 L156-157, D-HOE-23 (a)): <= 50 events, then ONE marker {capped:true, events:50} (events is always 50), no worker/reason/count, nothing after.
const abCapProblems = evs => { const P = [];
  for (const [sid, es] of bySid(evs)) { const ab = es.filter(e => e.type === 'ability_blocked'), mi = ab.findIndex(e => e.capped === true);
    if (mi < 0) { if (ab.length > 50) P.push(`${sid}: ${ab.length} ability_blocked > 50 and no capped marker`); continue; }
    const m = ab[mi]; if (m.events !== 50) P.push(`${sid}: ability_blocked marker events ${JSON.stringify(m.events)} != 50`); if ('episodes' in m) P.push(`${sid}: ability_blocked marker uses episodes (coop_full key)`);
    for (const f of ['worker', 'reason', 'count']) if (f in m) P.push(`${sid}: ability_blocked marker carries ${f}`); if (mi !== 50) P.push(`${sid}: ${mi} ability_blocked before the marker (must be 50)`);
    if (ab.length > mi + 1) P.push(`${sid}: ${ab.length - mi - 1} ability_blocked after the capped marker`); }
  return P; };
// dead_zone (rev 13 row #22 L81, V-2d): closed {farm int 10..29, s float 1 dp >= dead_zone_min_s, reason 'none_affordable', open?: true}; pinned.
const deadZoneProblems = (e, minS = BBV.dead_zone_min_s) => { const P = []; for (const f of Object.keys(e)) if (!['type', 'ts', 'sid', 'fgMs', 'farm', 's', 'reason', 'open'].includes(f)) P.push(`dead_zone: field ${f} outside the closed list`);
  if (!isInt(e.farm, 10, 29)) P.push(`dead_zone.farm ${JSON.stringify(e.farm)} not int 10 <= farm < 30`); if (!(dp(e.s, 1) && e.s >= minS)) P.push(`dead_zone.s ${JSON.stringify(e.s)} not 1-dp >= ${minS}`);
  if (e.reason !== 'none_affordable') P.push(`dead_zone.reason ${JSON.stringify(e.reason)} != none_affordable`); if ('open' in e && e.open !== true) P.push(`dead_zone.open ${JSON.stringify(e.open)} (only open:true or absent)`); return P; };
// C-1 RULED (D-PMM-2026-10-30-TAPFIELDS; sales-stopped-spec cfff3817 note 3 L868, §8 L290-294): both fatigue_cue_* carry the 6 fields; suppressed_by_stall on shown ONLY.
const FATIGUE6 = ['surface', 'loss_per_s', 'loss_share', 'n_tired', 'n_asleep', 'n_paused'];
const fatigueCueProblems = e => { const P = [], t = e.type, allowed = ['type', 'ts', 'sid', 'fgMs', ...FATIGUE6, ...(t === 'fatigue_cue_shown' ? ['suppressed_by_stall'] : [])];
  for (const f of FATIGUE6) if (!(f in e)) P.push(`${t}: required ${f} missing (C-1, SS note 3)`); for (const f of Object.keys(e)) if (!allowed.includes(f)) P.push(`${t}: field ${f} outside the closed list${f === 'suppressed_by_stall' ? ' (shown only, SS note 3)' : ''}`);
  if ('surface' in e && !['hud_chip', 'banner', 'bubble'].includes(e.surface)) P.push(`${t}.surface ${JSON.stringify(e.surface)} not in enum`); if ('loss_per_s' in e && !isInt(e.loss_per_s, 0)) P.push(`${t}.loss_per_s not int cents >= 0`);
  if ('loss_share' in e && !(dp(e.loss_share, 3) && e.loss_share >= 0 && e.loss_share <= 1)) P.push(`${t}.loss_share ${JSON.stringify(e.loss_share)} not 3-dp in [0,1]`);
  for (const f of ['n_tired', 'n_asleep', 'n_paused']) if (f in e && !isInt(e[f], 0, 4)) P.push(`${t}.${f} ${JSON.stringify(e[f])} not int 0..4`); if ((e.n_tired ?? 0) + (e.n_asleep ?? 0) + (e.n_paused ?? 0) > 4) P.push(`${t}: n_tired + n_asleep + n_paused > 4`);
  if (t === 'fatigue_cue_shown' && typeof e.suppressed_by_stall !== 'boolean') P.push('fatigue_cue_shown.suppressed_by_stall missing/not bool'); return P; };
if (FLAGS.has('bestBuyV2')) CLOSED.dead_zone = { req: ['farm', 's', 'reason'], opt: ['open'], v: e => deadZoneProblems(e).join('; ') };
if (FLAGS.has('fatigueCue')) for (const t of ['fatigue_cue_shown', 'fatigue_cue_tapped']) CLOSED[t] = { req: FATIGUE6, opt: t === 'fatigue_cue_shown' ? ['suppressed_by_stall'] : [], v: e => fatigueCueProblems(e).join('; ') };
// Row #23 best_buy_suppressed_zero_gain (rev 13 L82, D-HOE-20261030-33 eng. L522): NOT built in v5; any emission is a defect (every mode, every flag config).
const sg8Problems = evs => { const n = evs.filter(e => e.type === 'best_buy_suppressed_zero_gain').length; return n ? [`${n} best_buy_suppressed_zero_gain emitted (rev 13 row #23: not built in v5, any emission is a defect)`] : []; };
/** All rev 13 runtime problems for one captured log (v062 only). */
const rev12Problems = evs => [...c2Problems(evs, FLAGS.has('rc2Refill'), FLAGS.has('pause')), ...zgCapProblems(evs, BBV.zero_gain_purchase_cap, FLAGS.has('bestBuyV2')), ...abCapProblems(evs),
  ...evs.filter(e => e.type === 'dead_zone').flatMap(e => deadZoneProblems(e)), ...evs.filter(e => /^fatigue_cue_(shown|tapped)$/.test(e.type)).flatMap(fatigueCueProblems), ...sg8Problems(evs)];
const ALLEV = [];   // every captured v062 log (TS1-TS8), for the rev 13 runtime checks after the run
res.triage = {};
const flagT = (k, why) => { res.triage[k] = (res.triage[k] || { why, n: 0 }); res.triage[k].n++; };
let hard = 0; const ck = (id, pass, d = {}, isHard = true) => { if (!pass && isHard) hard++; res.checks.push({ id, pass: !!pass, hard: isHard, ...d }); console.log(`${pass ? 'PASS' : isHard ? 'FAIL' : 'INFO-FAIL'} ${id} ${JSON.stringify(d.short ?? '')}`); };
/** v0.6.2-only assertion: real check under --schema v062; under shipped it is evaluated, recorded N/A-by-scope with its would-be result, never counted. */
const ckV = (id, pass, d = {}, isHard = true) => { if (V062) return ck(id, pass, d, isHard); res.checks.push({ id, na: NA_V062, wouldPass: !!pass, hard: false, ...d }); console.log(`N/A-BY-SCOPE ${id} (v0.6.2 would ${pass ? 'pass' : 'fail'})`); };
res.schema = A.schema;
/** Extract every event-like object from the stored telemetry value (array today; {ring,pinned,...} tolerated for v0.5 storage). */
function events(v) { const out = []; const walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (typeof x.type === 'string' && 'ts' in x) out.push(x); else Object.values(x).forEach(walk); } }; walk(v); return out; }
const readLS = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('eggfarm.telemetry') || 'null'); } catch { return null; } });
let LAST_RING; async function endAndRead(p, url) { await p.goto(url + 'blank.txt'); LAST_RING = await readLS(p); const ev = events(LAST_RING); ALLEV.push(...ev); return ev; } // navigating away = pagehide -> session_end + flush
const typeOk = (t, v) => t === 'integer' ? Number.isInteger(v) : t === 'boolean' ? typeof v === 'boolean' : t === 'decimal1' ? typeof v === 'number' && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 : true;
/** Schema check of one event; returns list of problems. */
function schemaProblems(e) {
  const P = []; const s = SCH.events[e.type];
  if (SCH.forbiddenEvents.includes(e.type)) P.push(`forbidden event ${e.type}`);
  if (V5_FORBIDDEN_EVENTS.includes(e.type)) P.push(`forbidden event ${e.type} (HoQ C-3: refill_used only, no alias)`);
  const C = CLOSED[e.type]; if (!s && !C) { P.push(`not in allowlist: ${e.type}`); return P; }
  for (const f of SCH.envelope.required) if (!(f in e)) P.push(`${e.type}: envelope ${f} missing`);
  if ('sid' in e && !new RegExp(SCH.envelope.sid).test(e.sid)) P.push(`${e.type}: sid ${JSON.stringify(e.sid)} not 6-char base36`);
  for (const f of SCH.envelope.forbiddenEverywhere) if (f in e) P.push(`${e.type}: forbidden ${f}`);
  if (e.type !== 'session_start') { for (const f of SCH.sessionStartOnly) if (f in e) P.push(`${e.type}: ${f} is session_start-only`); if ('build' in e && !(SCH.sessionStartOnlyExceptions.build.includes(e.type))) P.push(`${e.type}: build is session_start-only`); }
  const privacy = () => { for (const [k, v] of Object.entries(e)) if (typeof v === 'string') { if (v.length > SCH.privacy.maxStringLen && !SCH.privacy.longStringAllowed.includes(k)) P.push(`${e.type}.${k}: free text? len ${v.length}`); for (const pat of SCH.privacy.patterns) if (new RegExp(pat).test(v)) P.push(`${e.type}.${k}: PII-like value`); } };
  if (C) { const allowed = new Set([...SCH.envelope.required, ...C.req, ...C.opt]); for (const f of C.req) if (!(f in e)) P.push(`${e.type}: required ${f} missing`);
    for (const f of Object.keys(e)) if (!allowed.has(f) && !SCH.envelope.forbiddenEverywhere.includes(f)) P.push(`${e.type}: field ${f} outside the closed list (D-HOP-2026-10-29-04)`);
    const bad = C.v(e); if (bad) P.push(`${e.type}: ${bad}`); privacy(); return P; }
  if (e.capped === true && e.type === 'coop_full') return P;
  for (const f of s.required ?? []) if (!(f in e)) P.push(`${e.type}: required ${f} missing`);
  // G-TEL-3 (HoQ correction 2026-10-29 20:14): offline_grant MUST carry secondsAway; awayS FAILS, no fallback (overrides the frozen schema's oneOf).
  if (e.type === 'offline_grant') { if (!('secondsAway' in e)) P.push('offline_grant: required secondsAway missing (G-TEL-3)'); if ('awayS' in e) P.push('offline_grant: forbidden field awayS (G-TEL-3: use secondsAway)'); }
  else if (s.oneOf && !s.oneOf.some(g => g.every(f => f in e))) P.push(`${e.type}: needs one of ${JSON.stringify(s.oneOf)}`);
  for (const f of s.m5 ?? []) if (!(f in e)) flagT(`${e.type}.${f} absent`, 'M5 field, unverified until the RC source is read');
  for (const f of s.forbidden ?? []) if (f in e) P.push(`${e.type}: forbidden field ${f}`);
  for (const [f, en] of Object.entries(s.enums ?? {})) if (f in e && !en.includes(e[f])) P.push(`${e.type}.${f}=${JSON.stringify(e[f])} not in enum`);
  for (const [f, t] of Object.entries(s.types ?? {})) if (f in e && !typeOk(t, e[f])) P.push(`${e.type}.${f}=${JSON.stringify(e[f])} not ${t}`);
  if (s.flag && typeof s.flag === 'object') for (const [fl, fs] of Object.entries(s.flag)) for (const f of fs) { if (FLAGS.has(fl) && !(f in e) && e.type === 'session_end' && fl === 'breeds' && ['present_active_s', 'present_lost_count'].includes(f)) flagT(`session_end.${f} missing with breeds on`, 'M5 flag field, unverified'); if (!FLAGS.has(fl) && f in e) flagT(`${e.type}.${f} present with flag ${fl} off`, 'M5 flag gating, unverified'); }
  if (typeof s.flag === 'string' && !s.flag.split('+').some(fl => FLAGS.has(fl))) flagT(`${e.type} fired with flag ${s.flag} off`, 'M5 flag gating, unverified');
  for (const [k, v] of Object.entries(e)) if (typeof v === 'string') { if (v.length > SCH.privacy.maxStringLen && !SCH.privacy.longStringAllowed.includes(k)) P.push(`${e.type}.${k}: free text? len ${v.length}`); for (const pat of SCH.privacy.patterns) if (new RegExp(pat).test(v)) P.push(`${e.type}.${k}: PII-like value`); }
  return P;
}
// D-HOP-2026-10-29-07 (G-TEL-4): milestone_reached and balanced_tier stay PINNED in v5 (the addendum's "ring-trimmed, not pinned" line is an erratum; spec pin d170eb09 unchanged).
// Retention oracle (T-AC9, HARD): every seeded pinned event survives a forced ring trim, and the trim really happened (the oldest non-pinned marker is gone).
const PINNED_V5 = ['milestone_reached', 'balanced_tier'];
function retentionProblems(seeded, after) { const key = e => `${e.type}|${e.ts}|${e.id}`; const have = new Set(after.map(key)); const P = [];
  for (const e of seeded.filter(e => PINNED_V5.includes(e.type))) if (!have.has(key(e))) P.push(`${e.type} ${e.id} lost in ring trim (must be pinned, D-HOP-2026-10-29-07)`);
  const marker = seeded.find(e => e.id === '__trim_marker'); if (marker && have.has(key(marker))) P.push('ring trim did not happen (oldest non-pinned marker still present): retention not exercised');
  return P; }
// Checker self-test (negative + positive controls on synthetic events, no browser). Runs every time; HARD. One negative per rule.
{ const env = { ts: 1, sid: 'abc123', fgMs: 1 }; const T = (o) => schemaProblems({ ...env, ...o }); const R = {};
  const NS = { type: 'save_recovery_notice_shown', notice: 'M1', source: 'bak', store: 'ls' }, MR = { type: 'milestone_reached', id: 'hens:10', track: 'hens', level: 10, mult: 1.25 }, BT = { type: 'balanced_tier', id: 'balanced:2', tier: 2, min_level: 10 };
  const cases = [
    ['G-TEL-3 negative: offline_grant{awayS} FAILS', { type: 'offline_grant', eggs: 5, awayS: 7200 }, /awayS/], ['G-TEL-3 negative: offline_grant{secondsAway, awayS} FAILS', { type: 'offline_grant', eggs: 5, secondsAway: 7200, awayS: 7200 }, /forbidden field awayS/],
    ['G-TEL-3 positive: offline_grant{secondsAway} passes', { type: 'offline_grant', eggs: 5, secondsAway: 7200 }, null],
    ['G-TEL-1 positive: notice_shown {notice,source,store}', NS, null], ['G-TEL-1 positive: notice_dismissed with variant + null source/store', { ...NS, type: 'save_recovery_notice_dismissed', notice: 'M2', source: null, variant: 'age', store: null }, null],
    ['G-TEL-1 negative: notice extra field FAILS', { ...NS, level: 12 }, /outside the closed list/], ['G-TEL-1 negative: notice free-text enum FAILS', { ...NS, notice: 'Your save was restored' }, /not in enum/],
    ['G-TEL-1 negative: notice missing store FAILS', { type: NS.type, notice: 'M1', source: 'bak' }, /required store/],
    ['G-TEL-2 positive: milestone_reached hens:10', MR, null], ['G-TEL-2 positive: milestone_reached grade:20 egg_value', { ...MR, id: 'grade:20', track: 'egg_value', level: 20, mult: 1.5 }, null], ['G-TEL-2 positive: balanced_tier balanced:2', BT, null],
    ['G-TEL-2 negative: milestone id not in enum FAILS', { ...MR, id: 'hens:11', level: 11 }, /not in milestone enum/], ['G-TEL-2 negative: milestone id free text FAILS', { ...MR, id: 'Big Coop!' }, /not in milestone enum/],
    ['G-TEL-2 negative: milestone extra field FAILS', { ...MR, label: 'hens' }, /outside the closed list/], ['G-TEL-2 negative: milestone track mismatch FAILS', { ...MR, track: 'egg_value' }, /does not match/],
    ['G-TEL-2 negative: milestone level mismatch FAILS', { ...MR, level: 20 }, /level 20 does not match/], ['G-TEL-2 negative: milestone missing mult FAILS', { type: MR.type, id: MR.id, track: MR.track, level: MR.level }, /required mult/],
    ['G-TEL-2 negative: balanced_tier extra field FAILS', { ...BT, mult: 1.15 }, /outside the closed list/], ['G-TEL-2 negative: balanced_tier id not enum FAILS', { ...BT, id: 'balanced:9', tier: 9 }, /not in milestone enum/],
    ['G-TEL-2 negative: balanced_tier hens id FAILS', { ...BT, id: 'hens:10', tier: 10 }, /not balanced/],
    ['negative: unlisted event FAILS the allowlist', { type: 'not_a_real_event' }, /not in allowlist/] ];
  { const seed = [{ type: 'milestone_reached', ts: 1, id: 'hens:10' }, { type: 'balanced_tier', ts: 2, id: 'balanced:1' }, { type: 'tap', ts: 3, id: '__trim_marker' }];
    const kept = [seed[0], seed[1], { type: 'tap', ts: 9 }], lostM = [seed[1], { type: 'tap', ts: 9 }], lostB = [seed[0], { type: 'tap', ts: 9 }], noTrim = [...seed];
    const chk = (n, after, re) => { const p = retentionProblems(seed, after); R[n] = p; ck(`SELFTEST ${n}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); };
    chk('G-TEL-4 positive: both pinned events kept after trim', kept, null);
    chk('G-TEL-4 negative: milestone_reached ring-trimmed (lost) FAILS', lostM, /milestone_reached hens:10 lost/);
    chk('G-TEL-4 negative: balanced_tier ring-trimmed (lost) FAILS', lostB, /balanced_tier balanced:1 lost/);
    chk('G-TEL-4 negative: no trim happened FAILS (not exercised)', noTrim, /did not happen/); }
  for (const [name, ev, re] of cases) { const p = T(ev); R[name] = p; ckV(`SELFTEST ${name}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); }
  // Shipped-schema self-tests (3f582db): one positive per family + one negative per rule. HARD under --schema shipped.
  if (!V062) { const E = { ts: 1000, sessionMs: 5 }; const S = o => shippedProblems({ ...E, ...o });
    const MR2 = { type: 'milestone_reached', id: 'hens:10', track: 'hens', level: 10, mult: 1.25 };
    const sc = [
      ['S positive: session_start {install_id, build}', { type: 'session_start', install_id: '0b7c3f0e-1111-4222-8333-944445555666', build: 'm4.1+3f582db' }, null],
      ['S positive: tap {count, eggs}', { type: 'tap', count: 3, eggs: 3 }, null], ['S positive: session_end (no payload)', { type: 'session_end' }, null],
      ['S positive: upgrade with track', { type: 'upgrade', upgrade: 'eggValue', newLevel: 2, cost: 100, coinsBefore: 150, track: 'egg_value' }, null],
      ['S positive: worker_summary dynamic keys', { type: 'worker_summary', windowMs: 60000, wage_coop_hand_cents: 5, coop_hand_eggs: 9 }, null],
      ['S positive: save_corrupt bak restore', { type: 'save_corrupt', reason: 'parse', had_backup: true, restored_from_backup: true, build: 'm4.1+3f582db', recovered_from: 'bak', store: 'ls', tried: [{ source: 'bak', result: 'valid' }, { source: 'idb', result: 'absent' }], restored_version: 6, migrated: false }, null],
      ['S positive: milestone_reached (closed validator)', MR2, null], ['S positive: offline_grant {secondsAway, eggs}', { type: 'offline_grant', secondsAway: 7200, eggs: 5 }, null],
      ['S negative: unlisted event FAILS', { type: 'not_a_real_event' }, /not in shipped allowlist/],
      ['S negative: extra field FAILS (closed list)', { type: 'tap', count: 1, eggs: 1, empty: false }, /outside the closed list/],
      ['S negative: missing required FAILS', { type: 'session_start', build: 'm4.1+3f582db' }, /required install_id missing/],
      ['S negative: enum violation FAILS', { type: 'upgrade', upgrade: 'luck', newLevel: 2, cost: 1, coinsBefore: 1 }, /not in enum/],
      ['S negative: type violation FAILS', { type: 'customer_served', id: 1, N: 2, partial: 'no' }, /partial="no" not b/],
      ['S negative: v0.6.2 sid in envelope FAILS (drift)', { type: 'session_end', sid: 'abc123' }, /sid present/],
      ['S negative: sessionMs missing FAILS', { type: 'session_end', sessionMs: undefined }, /sessionMs/],
      ['S negative: ts non-integer FAILS', { type: 'session_end', ts: 1.5 }, /ts 1.5 not integer/],
      FLAGS.has('streak') ? ['S positive: M5 event with its flag on (build balance.json) passes', { type: 'streak_started', farm_level: 3, collection_level: 2 }, null]
        : ['S negative: M5 event with flag off FAILS', { type: 'streak_started', farm_level: 3, collection_level: 2 }, /flag streak off/],
      ...(FLAGS.has('golden') ? [] : [['S negative: golden event with golden off FAILS', { type: 'frenzy_started', mult: 2, duration_s: 30, farm_level: 9, grader_tier: 0 }, /flag golden off/]]),
      ['S negative: worker_summary unknown key FAILS', { type: 'worker_summary', windowMs: 1, wage_boss_cents: 2 }, /outside the closed list/],
      ['S negative: offline_grant awayS FAILS (G-TEL-3)', { type: 'offline_grant', secondsAway: 1, eggs: 1, awayS: 1 }, /awayS/],
      ['S negative: save_corrupt bad tried entry FAILS', { type: 'save_corrupt', reason: 'parse', had_backup: true, restored_from_backup: true, build: 'b', recovered_from: 'bak', store: 'ls', tried: [{ source: 'cloud', result: 'valid' }], migrated: false }, /tried entry/],
      ['S negative: sell by market_hand FAILS (summed, never tracked)', { type: 'sell', id: 1, k: 1, N: 1, price: 1, value: 1, by: 'market_hand' }, /by="market_hand" not in enum/],
      ['S negative: milestone id not in enum FAILS', { ...MR2, id: 'hens:11', level: 11 }, /not in milestone enum/],
      ['S negative: PII-like string FAILS', { type: 'save_failed', reason: 'a@b.co' }, /PII-like/],
      ['S negative: free text > 64 FAILS', { type: 'goal_tap', target: 'x'.repeat(65), state: 'ready' }, /free text/] ];
    for (const [name, ev, re] of sc) { const p = S(ev); R[name] = p; ck(`SELFTEST ${name}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); }
    ck('SELFTEST sales_stall resolved_by enum == sales-stopped-spec L249 (14, incl. chip_manage)', JSON.stringify(STALL.resolved_by) === JSON.stringify(RESOLVED_BY_SPEC_L249), { short: STALL.resolved_by });
    if (FLAGS.has('salesStopped')) { const SS = { type: 'sales_stall', phase: 'resolved', stall_id: 3, cause: 'mh_asleep', farm_level: 6, queue_len: 2, sellable_eggs: 0, coop_eggs: 10, mh_state: 'asleep', ch_state: 'working', focus_s_since_last_sale: 12, session_s: 300, resolved_by: 'chip_manage', time_to_resolve_s: 4, chip_tapped: true };
      // the sales_stall closed validator itself (used by --schema v062; sales_stall is not in the shipped 3f582db allowlist)
      for (const [name, ev, re] of [['V positive: sales_stall resolved_by chip_manage (spec L249)', SS, null], ['V negative: sales_stall resolved_by not in enum FAILS', { ...SS, resolved_by: 'chip_boss' }, /resolved needs resolved_by enum/]]) { const v = CLOSED.sales_stall.v(ev); const p = v ? [v] : []; R[name] = p; ck(`SELFTEST ${name}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); } }
    const U = (n, c) => ({ type: 'upgrade', upgrade: 'hens', newLevel: n, cost: 100, coinsBefore: c });
    const s5 = [['S-AC5 positive: 1 purchase, 1 upgrade event', 1, [U(13, 150)], null], ['S-AC5 positive: 2 purchases, 2 upgrade events', 2, [U(13, 150), U(14, 120)], null],
      ['S-AC5 negative: 2 purchases, 1 upgrade event FAILS (counts differ)', 2, [U(13, 150)], /upgrade events 1 != harness purchases 2/],
      ['S-AC5 negative: 1 purchase, 2 upgrade events FAILS (counts differ)', 1, [U(13, 150), U(14, 120)], /upgrade events 2 != harness purchases 1/],
      ['S-AC5 negative: 0 purchases, 0 events FAILS (not exercised)', 0, [], /not exercised/],
      ['S-AC5 negative: coinsBefore < cost FAILS', 1, [U(13, 50)], /coinsBefore 50 < cost 100/]];
    for (const [name, b, u, re] of s5) { const p = sAc5Problems(b, u); R[name] = p; ck(`SELFTEST ${name}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); } }
  // v5 self-tests (2026-10-30, HoQ C-1/C-3/Q-TEL-3/Q-TEL-4), run in every mode
  { const ST = (name, p, re) => { R[name] = p; ck(`SELFTEST ${name}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); };
    const sh = { phase: 'shown', stall_id: 1 }, rs = { phase: 'resolved', stall_id: 1 };
    ST('TS7 pairing positive: 1 shown + 1 resolved', ts7Pairing([sh, rs]), null);
    ST('TS7 pairing negative: 2 resolved for 1 shown FAILS', ts7Pairing([sh, rs, rs]), /2 resolved/);
    ST('TS7 pairing negative: no shown FAILS', ts7Pairing([rs]), /no shown/);
    ST('TS7 pairing negative: reuse_count FAILS', ts7Pairing([sh, { ...rs, reuse_count: 1 }]), /reuse_count/);
    ST('row24 ring positive: {v:0.6.2, events}', ringProblems({ v: '0.6.2', events: [] }), null);
    ST('row24 ring negative: bare array FAILS', ringProblems([]), /bare array/);
    ST('row24 ring negative: v 0.6.1 FAILS', ringProblems({ v: '0.6.1', events: [] }), /ring.v/);
    ST('row24 ring negative: no v FAILS', ringProblems({ events: [] }), /ring.v/);
    ST('G-8 export header positive: schema_version 0.6.2', exportHeaderProblems({ exportedAt: 1, schema_version: '0.6.2', events: [] }), null);
    ST('G-8 export header negative: schema_version missing FAILS', exportHeaderProblems({ exportedAt: 1, events: [] }), /schema_version/);
    const good = { type: 'session_end', ts: 1, sid: 'abc123', fgMs: 1 };
    ST('T-AC9 legacy:true event is skipped (not validated)', tAc9Problems({ type: 'not_a_real_event', ts: 1, sessionMs: 5, legacy: true }), null);
    ST('T-AC9 non-legacy invalid event FAILS', tAc9Problems({ type: 'not_a_real_event', ts: 1, sid: 'abc123', fgMs: 1 }), /not in allowlist/);
    ST('T-AC9 legacy:false invalid event FAILS (only true skips)', tAc9Problems({ type: 'not_a_real_event', ts: 1, legacy: false }), /not in allowlist/);
    ST('C-3 manage_used FAILS (refill_used only, no alias)', schemaProblems({ ...good, type: 'manage_used' }), /C-3/);
    if (!V062) ST('Q-TEL-3 sales_stall on a pre-v0.6.2 (shipped) build FAILS (HoQ: intended with salesStopped=1)', shippedProblems({ type: 'sales_stall', ts: 1000, sessionMs: 5, phase: 'shown', stall_id: 1 }), /not in shipped allowlist: sales_stall/); }
  // errata rev 13 PINNED self-tests (TASK saves-qa/rev12-tel): one positive + negatives per rule, HARD in every mode
  { const ST = (name, p, re) => { R[name] = p; ck(`SELFTEST REV13 ${name}`, re ? p.some(x => re.test(x)) : p.length === 0, { short: p }); };
    const E = { ts: 1, sid: 'abc123', fgMs: 1 }, ev = o => ({ ...E, ...o });
    const on = ev({ type: 'rest_toggled', worker: 'market_hand', on: true, energy_pct: 40, state: 'active', cause: 'manual', farm: 9, mood: 'tired', unpaid: false, ability_active: false, golden_on_screen: false, frenzy_active: false });
    const off = ev({ type: 'rest_toggled', worker: 'market_hand', on: false, energy_pct: 60, state: 'paused', cause: 'manual', paused_duration_s: 12.5 });
    const se = o => ev({ type: 'session_end', ...o }), wp = ev({ type: 'worker_paused', worker: 'market_hand' }), wr = ev({ type: 'worker_resumed', worker: 'market_hand', cause: 'manual' });
    ST('C-2 positive: rc2Refill=1 on:true -> on:false pair, session_end without paused totals', c2Problems([on, off, se({})], true, true), null);
    ST('C-2 positive: rc2Refill=1 worker still paused at unload (open on:true) is OK', c2Problems([on, se({})], true, true), null);
    ST('C-2 negative: rc2Refill=1 session_end.paused_worker_s FAILS', c2Problems([on, off, se({ paused_worker_s: 12 })], true, true), /paused_worker_s with rc2Refill=1/);
    ST('C-2 negative: rc2Refill=1 session_end.all_paused_s FAILS', c2Problems([se({ all_paused_s: 0 })], true, true), /all_paused_s with rc2Refill=1/);
    ST('C-2 negative: rc2Refill=1 worker_paused FAILS (exclusive emission)', c2Problems([wp, se({})], true, true), /worker_paused with rc2Refill=1/);
    ST('C-2 negative: rc2Refill=1 on:false without on:true FAILS (unpaired)', c2Problems([off, se({})], true, true), /without a preceding on:true/);
    ST('C-2 negative: rc2Refill=1 two on:true for one worker FAILS (unpaired)', c2Problems([on, on, se({})], true, true), /already paused/);
    ST('C-2 negative: rc2Refill=1 on:true without H-1 fields FAILS', c2Problems([{ ...on, golden_on_screen: undefined, frenzy_active: undefined, mood: undefined }].map(e => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined))), true, true), /lacks mood,golden_on_screen,frenzy_active/);
    ST('C-2 negative: rc2Refill=1 on:false without paused_duration_s FAILS', c2Problems([on, { ...off, paused_duration_s: undefined }], true, true), /paused_duration_s undefined not a number/);
    ST('C-2 positive: rc2Refill=0 pause=1 worker_paused/resumed + session_end paused totals', c2Problems([wp, wr, se({ paused_worker_s: 12, all_paused_s: 0 })], false, true), null);
    ST('C-2 negative: rc2Refill=0 rest_toggled FAILS (exclusive emission)', c2Problems([on, off, se({ paused_worker_s: 1, all_paused_s: 0 })], false, true), /rest_toggled with rc2Refill=0/);
    ST('C-2 negative: rc2Refill=0 pause=1 session_end without all_paused_s FAILS', c2Problems([se({ paused_worker_s: 1 })], false, true), /all_paused_s undefined missing/);
    ST('C-2 negative: rc2Refill=0 worker_resumed cause auto_full FAILS', c2Problems([wp, { ...wr, cause: 'auto_full' }, se({ paused_worker_s: 1, all_paused_s: 0 })], false, true), /auto_full/);
    ST('C-2 negative (HoQ 14:56): rc2Refill=1 session_end with BOTH paused totals FAILS (absent, exclusive emission L176)', c2Problems([on, off, se({ paused_worker_s: 12, all_paused_s: 3 })], true, true), /paused_worker_s,all_paused_s with rc2Refill=1/);
    ST('C-2 UNVERIFIED: rc2Refill=0 pause=0 session_end with paused totals is NOT a FAIL (c2Problems empty)', c2Problems([se({ paused_worker_s: 0, all_paused_s: 0 })], false, false), null);
    ST('C-2 UNVERIFIED: rc2Refill=0 pause=0 is reported UNVERIFIED (pending PMC rev 14)', c2Unverified([se({ paused_worker_s: 0, all_paused_s: 0 })], false, false), /UNVERIFIED/);
    ST('C-2 UNVERIFIED: rc2Refill=0 pause=0 with totals absent also UNVERIFIED, not FAIL', [...c2Problems([se({})], false, false), ...c2Unverified([se({})], false, false).map(x => /absent, all_paused_s absent -> UNVERIFIED/.test(x) ? '' : x).filter(Boolean)], null);
    ST('C-2 UNVERIFIED: no UNVERIFIED note for rc2Refill=1 or pause=1', [...c2Unverified([se({})], true, true), ...c2Unverified([se({})], false, true)], null);
    const zg = n => Array.from({ length: n }, (_, i) => ev({ type: 'zero_gain_purchase', key: 'HENS', farm: 12, level: i, meaningful_eta_s: 20.5 }));
    ST('ZG cap positive: 50 emitted + session_end.zero_gain_purchase_dropped 7', zgCapProblems([...zg(50), se({ zero_gain_purchase_dropped: 7 })], 50, true), null);
    ST('ZG cap positive: 3 emitted + dropped 0', zgCapProblems([...zg(3), se({ zero_gain_purchase_dropped: 0 })], 50, true), null);
    ST('ZG cap negative: 51 emitted FAILS (> cap 50)', zgCapProblems([...zg(51), se({ zero_gain_purchase_dropped: 0 })], 50, true), /51 zero_gain_purchase > cap 50/);
    ST('ZG cap negative: capped marker FAILS (no marker)', zgCapProblems([...zg(50), ev({ type: 'zero_gain_purchase', capped: true, events: 50 }), se({ zero_gain_purchase_dropped: 1 })], 50, true), /no marker/);
    ST('ZG cap negative: dropped missing with bestBuyV2=1 FAILS', zgCapProblems([...zg(2), se({})], 50, true), /zero_gain_purchase_dropped undefined not int/);
    ST('ZG cap negative: dropped 2 while only 3 < 50 emitted FAILS', zgCapProblems([...zg(3), se({ zero_gain_purchase_dropped: 2 })], 50, true), /only 3 < cap 50/);
    ST('ZG cap negative: dropped -1 FAILS', zgCapProblems([se({ zero_gain_purchase_dropped: -1 })], 50, true), /not int >= 0/);
    ST('ZG cap negative: zero_gain_purchase with bestBuyV2=0 FAILS', zgCapProblems([...zg(1), se({})], 50, false), /bestBuyV2=0/);
    ST('ZG cap: cap is read from the build balance telemetry.bbv2.zero_gain_purchase_cap (40 -> 41 FAILS)', zgCapProblems([...zg(41), se({ zero_gain_purchase_dropped: 0 })], 40, true), /41 zero_gain_purchase > cap 40/);
    const ab = n => Array.from({ length: n }, () => ev({ type: 'ability_blocked', worker: 'hawker', reason: 'cooldown', count: 2 })), mk = o => ev({ type: 'ability_blocked', capped: true, events: 50, ...o });
    ST('events==50 positive: 50 ability_blocked + marker {capped:true, events:50}', abCapProblems([...ab(50), mk({})]), null);
    ST('events==50 positive: 10 ability_blocked, no marker', abCapProblems(ab(10)), null);
    ST('events==50 negative: marker events 51 FAILS', abCapProblems([...ab(50), mk({ events: 51 })]), /events 51 != 50/);
    ST('events==50 negative: marker carries worker FAILS', abCapProblems([...ab(50), mk({ worker: 'hawker' })]), /marker carries worker/);
    ST('events==50 negative: marker uses episodes FAILS', abCapProblems([...ab(50), mk({ events: undefined, episodes: 50 })]), /episodes/);
    ST('events==50 negative: 49 before the marker FAILS', abCapProblems([...ab(49), mk({})]), /49 ability_blocked before/);
    ST('events==50 negative: ability_blocked after the marker FAILS', abCapProblems([...ab(50), mk({}), ...ab(1)]), /after the capped marker/);
    ST('events==50 negative: 51 ability_blocked, no marker FAILS', abCapProblems(ab(51)), /51 ability_blocked > 50/);
    const dz = o => ev({ type: 'dead_zone', farm: 12, s: 30, reason: 'none_affordable', ...o });
    ST('dead_zone positive: farm 12, s 30.0, none_affordable', deadZoneProblems(dz({}), 30), null); ST('dead_zone positive: open:true flush, farm 29, s 181.4', deadZoneProblems(dz({ open: true, farm: 29, s: 181.4 }), 30), null);
    for (const [n, o, re] of [['reason cap', { reason: 'cap' }, /none_affordable/], ['reason max', { reason: 'max' }, /none_affordable/], ['farm 30', { farm: 30 }, /farm 30/], ['farm 9', { farm: 9 }, /farm 9/],
      ['s 29.9 < dead_zone_min_s', { s: 29.9 }, /s 29.9/], ['s 30.25 (2 dp)', { s: 30.25 }, /s 30.25/], ['open:false', { open: false }, /open false/], ['extra field cap', { cap: 1 }, /field cap outside/]]) ST(`dead_zone negative: ${n} FAILS`, deadZoneProblems(dz(o), 30), re);
    ST('dead_zone: min s read from the build balance (min 60: s 45 FAILS)', deadZoneProblems(dz({ s: 45 }), 60), /not 1-dp >= 60/);
    ST('dead_zone pinned-set: errata rev 13 V-3 lists dead_zone (checker set == errata)', PINNED_SET_REV13.includes('dead_zone') && !RING_REV13.includes('dead_zone') ? [] : ['dead_zone not pinned'], null);
    const f6 = { surface: 'hud_chip', loss_per_s: 125, loss_share: 0.183, n_tired: 1, n_asleep: 1, n_paused: 0 }, ft = o => ev({ type: 'fatigue_cue_tapped', ...f6, ...o }), fs = o => ev({ type: 'fatigue_cue_shown', ...f6, suppressed_by_stall: false, ...o });
    ST('C-1 positive: fatigue_cue_tapped with the 6 SS §8 fields', fatigueCueProblems(ft({})), null); ST('C-1 positive: fatigue_cue_shown 6 fields + suppressed_by_stall', fatigueCueProblems(fs({ suppressed_by_stall: true })), null);
    ST('C-1 negative: fatigue_cue_tapped + suppressed_by_stall FAILS (shown only)', fatigueCueProblems(ft({ suppressed_by_stall: false })), /suppressed_by_stall outside the closed list/);
    ST('C-1 negative: tapped {surface, loss_per_s} only (errata rev 1-12 row #3 / schema.ts:171 shape) FAILS', fatigueCueProblems(ev({ type: 'fatigue_cue_tapped', surface: 'banner', loss_per_s: 3 })), /loss_share missing/);
    for (const f of FATIGUE6) ST(`C-1 negative: tapped without ${f} FAILS`, fatigueCueProblems(ft({ [f]: undefined })).length ? fatigueCueProblems(Object.fromEntries(Object.entries(ft({})).filter(([k]) => k !== f))) : ['?'], new RegExp(`required ${f} missing`));
    ST('C-1 negative: shown without suppressed_by_stall FAILS', fatigueCueProblems(Object.fromEntries(Object.entries(fs({})).filter(([k]) => k !== 'suppressed_by_stall'))), /suppressed_by_stall missing/);
    ST('C-1 negative: loss_share 1.5 FAILS', fatigueCueProblems(ft({ loss_share: 1.5 })), /loss_share 1.5/); ST('C-1 negative: loss_share 0.1834 (4 dp) FAILS', fatigueCueProblems(ft({ loss_share: 0.1834 })), /loss_share 0.1834/);
    ST('C-1 negative: n_tired + n_asleep + n_paused = 5 FAILS', fatigueCueProblems(ft({ n_tired: 2, n_asleep: 2, n_paused: 1 })), /> 4/); ST('C-1 negative: surface sub_line FAILS', fatigueCueProblems(ft({ surface: 'sub_line' })), /surface/);
    ST('row #23 positive: no best_buy_suppressed_zero_gain in the log', sg8Problems([ev({ type: 'zero_gain_purchase' }), se({})]), null);
    ST('row #23 negative: one best_buy_suppressed_zero_gain FAILS (not built in v5, rev 13 L82)', sg8Problems([ev({ type: 'best_buy_suppressed_zero_gain', key: 'HENS', farm: 12, level: 3 })]), /any emission is a defect/);
    const BB = { telemetry: { bbv2: { ...BBV2_SPEC } }, m4: { enabled: 1, flags: {} } };
    ST('bbv2 keys positive: top-level telemetry.bbv2 {5, 60, 30, 50}', bbv2KeyProblems(BB, 'key,level,cost'), null);
    ST('bbv2 keys negative: block missing FAILS', bbv2KeyProblems({ telemetry: { ring_size: 5000 } }), /block missing/);
    ST('bbv2 keys negative: zero_gain_purchase_cap 40 FAILS', bbv2KeyProblems({ telemetry: { bbv2: { ...BBV2_SPEC, zero_gain_purchase_cap: 40 } } }), /zero_gain_purchase_cap = 40/);
    ST('bbv2 keys negative: dead_zone_min_s missing FAILS', bbv2KeyProblems({ telemetry: { bbv2: { ...BBV2_SPEC, dead_zone_min_s: undefined } } }), /dead_zone_min_s = undefined/);
    ST('bbv2 keys negative: unknown key FAILS', bbv2KeyProblems({ telemetry: { bbv2: { ...BBV2_SPEC, shown_max: 1 } } }), /shown_max not in errata/);
    ST('bbv2 keys negative: under m4.telemetry FAILS', bbv2KeyProblems({ ...BB, m4: { telemetry: { bbv2: BBV2_SPEC } } }), /under m4.telemetry/);
    ST('bbv2 keys negative: economy.csv column FAILS', bbv2KeyProblems(BB, 'key,level,zero_gain_purchase_cap'), /economy.csv has a zero_gain_purchase_cap column/);
    const ETXT = (() => { try { return readFileSync(A.errata || path.join(HERE, '../../../product/collection/telemetry-spec-errata-v5.a0e8f6d7.md'), 'utf8'); } catch { return ''; } })();
    const esha = createHash('sha1').update(ETXT).digest('hex'); res.errata = { sha1: esha, pinned: ERRATA_SHA1 };
    ST(`errata file is rev 13 sha1 ${ERRATA_SHA1.slice(0, 8)} (manifest L131 pin)`, esha === ERRATA_SHA1 ? [] : [`errata sha1 ${esha} != ${ERRATA_SHA1}`], null);
    ST('pinned-set positive: checker set == errata rev 13 V-3 block (20 + tip_shown clock_wage)', pinnedSetProblems(ETXT), null);
    ST('pinned-set negative: errata block without dead_zone FAILS', pinnedSetProblems(ETXT.replace(/zero_gain_purchase, dead_zone/, 'zero_gain_purchase')), /dead_zone not in errata V-3/);
    ST('pinned-set negative: errata block with an extra type FAILS', pinnedSetProblems(ETXT.replace(/zero_gain_purchase, dead_zone/, 'zero_gain_purchase, dead_zone, best_buy_shown')), /lists best_buy_shown/);
    ST('rev12 v062 validator: dead_zone / fatigue_cue_tapped closed validators registered when bestBuyV2 / fatigueCue on', [FLAGS.has('bestBuyV2') && !CLOSED.dead_zone && 'dead_zone validator missing', FLAGS.has('fatigueCue') && !CLOSED.fatigue_cue_tapped && 'fatigue validator missing'].filter(Boolean), null); }
  res.triage = {}; writeJSON(path.join(OUT, 'selftest.json'), R); }
if (A.balance) { let hdr = null; if (A['economy-csv']) { try { hdr = readFileSync(A['economy-csv'], 'utf8').split('\n')[0]; } catch { hdr = ''; } }
  const bp = bbv2KeyProblems(BJ, hdr); ck('REV13 telemetry.bbv2.* in the build balance.json top-level telemetry block = {5, 60, 30, 50}, not m4.telemetry, not economy.csv (errata rev 13 L86-92; HARD iff bestBuyV2=1)', bp.length === 0, { short: bp }, FLAGS.has('bestBuyV2')); }
if (A['selftest-only']) { writeJSON(path.join(OUT, `telemetry-selftest.json`), res); console.log(hard ? `SELFTEST: ${hard} FAIL` : 'SELFTEST: OK'); process.exit(hard ? 1 : 0); }
const srv = await serve(path.join(OUT, '.serve'), { 'g.html': A.html }, A.port); const br = await launch(A.engine); res.browser = br.version(); const G = srv.url + 'g.html';
const ctxNew = () => br.newContext({ viewport: { width: 390, height: 844 } });
try {
  // TS1 core session on a seeded p1-B farm (fresh telemetry/install): burst taps, 2 upgrades, end session
  if (want('TS1')) { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS1'); await seedLS(p, { 'eggfarm.save': P1B });
    await p.goto(G); const b = await ids(p); await start(p); await skipOnb(p); await dismissWelcome(p, 1500);
    let clicks = 0; for (let i = 0; i < 20; i++) { await p.locator('#collect').click({ force: true, delay: 0 }); clicks++; }
    await p.waitForTimeout(1500); const pl = await play(p, { taps: 0, buys: 2 }); await p.waitForTimeout(1200);
    const ev = await endAndRead(p, srv.url); res.scenarios.TS1 = { build: b, clicks, play: pl, n: ev.length, types: [...new Set(ev.map(e => e.type))], errors: errs }; writeJSON(path.join(OUT, 'TS1-events.json'), ev);
    if (V062) { const rp = ringProblems(LAST_RING); ck('TS1 row 24: stored ring is {v: \'0.6.2\', events} (D-HOE-19, D-HOP-41)', rp.length === 0, { short: rp }); }
    if (A['expect-build']) ck('TS1-build', b.meta === A['expect-build'] && !b.dirty, { short: b.meta });
    const ss = ev.filter(e => e.type === 'session_start'); const sid = ss[0]?.sid;
    if (!V062) { // shipped T-AC1/3/5/8 equivalents (3f582db): session identity = anchor ts - sessionMs (telemetry.ts:40/:58/:62)
      const lsId = await p.evaluate(() => localStorage.getItem('eggfarm.install_id')).catch(() => null);
      const a0 = ss[0] ? anchor(ss[0]) : null; res.scenarios.TS1.anchor = a0;
      ck('S-AC1 one session_start {install_id = LS eggfarm.install_id, build = expect-build} (game.ts:57)', ss.length === 1 && typeof ss[0].install_id === 'string' && ss[0].install_id.length > 0 && (lsId === null || ss[0].install_id === lsId) && (!A['expect-build'] || ss[0].build === A['expect-build']), { short: ss.map(e => ({ build: e.build, idLen: e.install_id?.length, lsMatch: e.install_id === lsId })) });
      ck('S-AC1 every event carries the same session anchor ts - sessionMs (one load = one session)', a0 !== null && ev.every(e => anchor(e) === a0), { short: { a0, other: ev.filter(e => anchor(e) !== a0).length } });
      ck('S-AC1 no v0.6.2 envelope (sid/fgMs) on any event', ev.every(e => !('sid' in e) && !('fgMs' in e)), { short: ev.filter(e => 'sid' in e || 'fgMs' in e).length }); }
    ckV('T-AC1 one session_start reason=load with required fields', ss.length === 1 && ss[0].reason === 'load' && ss[0].install_id && 'session_index' in ss[0] && 'viewport_w' in ss[0], { short: ss.map(e => Object.keys(e).sort().join(',')) });
    ckV('T-AC1 every event carries the session sid', !!sid && ev.every(e => e.sid === sid), { short: { sid, without: ev.filter(e => e.sid !== sid).length } });
    ckV('T-AC1 no event carries sessionMs', ev.every(e => !('sessionMs' in e)), { short: ev.filter(e => 'sessionMs' in e).length });
    const taps = ev.filter(e => e.type === 'tap'); const sumCount = taps.reduce((a, e) => a + (e.count || 0), 0);
    ck('T-AC3 tap batches: Σ count == clicks, no collect_tap', sumCount === clicks && !ev.some(e => e.type === 'collect_tap'), { short: { sumCount, clicks, tapEvents: taps.length } });
    ckV('T-AC3 tap fields count/eggs/empty/full_at_start', taps.length > 0 && taps.every(e => ['count', 'eggs', 'empty', 'full_at_start'].every(f => f in e)), { short: taps[0] });
    const ups = ev.filter(e => e.type === 'upgrade');
    if (!V062) { ck('S-AC3 tap events are exactly {count, eggs} + envelope, count integer >= 1 (telemetry.ts:62)', taps.length > 0 && taps.every(e => Object.keys(e).sort().join(',') === 'count,eggs,sessionMs,ts,type' && Number.isInteger(e.count) && e.count >= 1), { short: taps[0] });
      { const p5 = sAc5Problems(pl.bought, ups); ck('S-AC5 upgrade events == harness purchases (>= 1 bought), newLevel integer, coinsBefore >= cost (sim/events.ts:9; QA-D-1030-SAVES-RC-2)', p5.length === 0, { short: { bought: pl.bought, upgradeEvents: ups.length, ups: ups.map(e => [e.upgrade, e.newLevel, e.cost, e.coinsBefore]), problems: p5 } }); } }
    ckV('T-AC5 first upgrade is_first_upgrade=true, later false', pl.bought >= 2 && ups[0]?.is_first_upgrade === true && ups.slice(1).every(e => e.is_first_upgrade === false), { short: ups.map(e => [e.upgrade, e.is_first_upgrade]) });
    const se = ev.filter(e => e.type === 'session_end' && e.sid === sid);
    if (!V062) { const a0 = ss[0] ? anchor(ss[0]) : null; const seS = ev.filter(e => e.type === 'session_end');
      ck('S-AC8 exactly one session_end on pagehide, same anchor, no payload, last pinned event (game.ts:302-305, main.ts:145)', seS.length === 1 && anchor(seS[0]) === a0 && Object.keys(seS[0]).sort().join(',') === 'sessionMs,ts,type' && ev.filter(e => e.ts > seS[0].ts && e.type !== 'tap' && e.type !== 'worker_summary').length === 0, { short: seS }); }
    ckV('T-AC8 session_end on pagehide: reason unload, taps_total == Σ tap.count, fg_ms', se.length === 1 && se[0].reason === 'unload' && se[0].taps_total === sumCount && Number.isInteger(se[0].fg_ms), { short: se[0] ?? null });
    if (!V062) ckV('T-AC9 v0.6.2 schema (TS1 log)', ev.flatMap(schemaProblems).length === 0, {});
    const probs = ev.flatMap(evProblems); ck(`T-AC9 schema/allowlist/privacy (TS1 log, ${A.schema})`, probs.length === 0, { problems: [...new Set(probs)], short: [...new Set(probs)].slice(0, 8) });
    ck('TS1 0 page/console errors', errs.length === 0, { short: errs }); await ctx.close(); }
  if (want('TS1') && !V062) { const ctx = await ctxNew(); const p = await ctx.newPage(); await seedLS(p, { 'eggfarm.save': P1B }); await p.goto(G); await start(p); await skipOnb(p);
    const x = await p.evaluate(() => { try { return JSON.parse(window.eggfarmExportTelemetry()); } catch (e) { return { err: String(e) }; } }); const evs = x?.events ?? [];
    ck('S-PRIV export eggfarmExportTelemetry: events present, no install_id anywhere (telemetry.ts:72-80, main.ts:124)', evs.length > 0 && !JSON.stringify(x).includes('install_id'), { short: { n: evs.length, err: x?.err } }); await ctx.close(); }
  // TS2 T-AC2 hidden split, DETERMINISTIC (HoQ ruling 2026-10-29 20:12 (2)): document.hidden/visibilityState stubbed with Object.defineProperty,
  // visibilitychange dispatched (bubbles, as the browser does), Playwright fake clock (Date + performance + timers) advanced explicitly; no real tab hiding.
  // HARD on Chromium always; on Firefox/WebKit HARD when the stub applies, INFO (with the logged reason) only if it cannot be applied. Run twice: sequences must match.
  if (want('TS2')) {
    const runTS2 = async rep => { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, `TS2#${rep}`);
      await p.clock.install({ time: new Date('2026-10-29T12:00:00Z') }); await seedLS(p, { 'eggfarm.save': P1B });
      await p.addInitScript(() => { let h = false; const log = []; window.__visLog = log; let ok = true, why = '';
        try { Object.defineProperty(document, 'hidden', { get: () => h, configurable: true }); Object.defineProperty(document, 'visibilityState', { get: () => h ? 'hidden' : 'visible', configurable: true }); } catch (e) { ok = false; why = String(e); }
        window.__stub = { ok, why }; window.addEventListener('visibilitychange', () => log.push({ hidden: document.hidden, state: document.visibilityState, now: Date.now(), perf: Math.round(performance.now()) }), true);
        window.__setHidden = v => { h = v; document.dispatchEvent(new Event('visibilitychange', { bubbles: true })); }; });
      await p.goto(G); await start(p); await skipOnb(p); await dismissWelcome(p, 1500);
      const stub = await p.evaluate(() => { const before = document.hidden; window.__setHidden(true); const mid = [document.hidden, document.visibilityState]; window.__setHidden(false); return { ...window.__stub, before, mid, after: document.hidden, n: window.__visLog.length }; });
      const hide = async sec => { await p.evaluate(() => window.__setHidden(true)); await p.clock.fastForward(sec * 1000); await p.evaluate(() => window.__setHidden(false)); await p.clock.runFor(500); };
      await hide(30); await hide(61); const vis = await p.evaluate(() => window.__visLog); const ev = await endAndRead(p, srv.url); await ctx.close();
      const stubApplied = stub.ok && stub.before === false && stub.mid[0] === true && stub.mid[1] === 'hidden' && stub.after === false && stub.n === 2;
      const v = vis.slice(2); const clockOk = v.length === 4 && v[1].now - v[0].now >= 30000 && v[1].now - v[0].now < 31000 && v[3].now - v[2].now >= 61000 && v[3].now - v[2].now < 62000;
      const norm = ev.filter(e => /^session_(start|end)$/.test(e.type)).map(e => [e.type, e.reason ?? null, e.session_index ?? null, e.sid ? (e.sid === ev.find(x => x.type === 'session_start')?.sid ? 'sid0' : 'sidN') : null]);
      return { rep, ev, stub, stubApplied, vis, clockOk, norm, errs }; };
    const r1 = await runTS2(1), r2 = await runTS2(2); writeJSON(path.join(OUT, 'TS2-events.json'), r1.ev); writeJSON(path.join(OUT, 'TS2-events-rep2.json'), r2.ev);
    res.scenarios.TS2 = { r1: { stub: r1.stub, vis: r1.vis, norm: r1.norm }, r2: { stub: r2.stub, vis: r2.vis, norm: r2.norm } };
    const stubOk = r1.stubApplied && r2.stubApplied; const isC = A.engine === 'chromium'; const ts2Hard = isC || stubOk;
    const why = stubOk ? '' : `stub not applied on ${A.engine}: ${JSON.stringify(r1.stub)}`; if (!ts2Hard) { res.ts2InfoReason = why; console.log(`INFO T-AC2 downgraded on ${A.engine}: ${why}`); }
    ck('TS2-harness stub applied (document.hidden/visibilityState override + visibilitychange observed)', stubOk, { short: { r1: r1.stub, r2: r2.stub } }, isC);
    ck('TS2-harness controlled clock: hidden spans exactly 30 s and 61 s of fake time', r1.clockOk && r2.clockOk, { short: r1.vis.slice(2).map(x => x.now) }, ts2Hard);
    ck('TS2-harness deterministic: two runs give the same session_start/end sequence', JSON.stringify(r1.norm) === JSON.stringify(r2.norm), { short: { r1: r1.norm, r2: r2.norm } }, ts2Hard);
    const starts = r1.ev.filter(e => e.type === 'session_start'), ends = r1.ev.filter(e => e.type === 'session_end');
    const ok = starts.length === 2 && starts[0].reason === 'load' && starts[1].reason === 'resume' && !!starts[0].sid && starts[1].sid !== starts[0].sid && starts[1].session_index === starts[0].session_index + 1 && ends.filter(e => e.reason === 'hidden').length === 1 && ends.some(e => e.reason === 'hidden' && e.sid === starts[0].sid);
    if (!V062) ck('S-AC2 hidden 30 s and 61 s do NOT split the session (no visibility logic in 3f582db telemetry): one session_start, one session_end at unload, one anchor', starts.length === 1 && ends.length === 1 && r1.ev.every(e => anchor(e) === anchor(starts[0])), { short: { starts: starts.length, ends: ends.length, anchors: [...new Set(r1.ev.map(anchor))].length } }, ts2Hard);
    ckV('T-AC2 hidden 30 s same session; hidden >= 60 s -> session_end{hidden} + session_start{resume, new sid, index+1}', ok, { short: { starts: starts.map(e => [e.reason, e.sid, e.session_index]), ends: ends.map(e => [e.reason, e.sid]) } }, ts2Hard);
    ck('TS2 0 page/console errors', r1.errs.length === 0 && r2.errs.length === 0, { short: [...r1.errs, ...r2.errs] }, ts2Hard); }
  // TS3 save lane: corrupt main + valid .bak -> save_corrupt{recovered_from:'bak'} + notice shown/dismissed (CSR-10, IDB1-6)
  if (want('TS3')) { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS3'); await seedLS(p, { 'eggfarm.save': P1B.slice(0, 200), 'eggfarm.save.bak': P1B });
    await p.goto(G); await start(p); await p.waitForTimeout(800); const shown = await p.locator('.recovery-card').count(); if (await p.locator('#rcGo').count()) await p.locator('#rcGo').click(); await p.waitForTimeout(500);
    const ev = await endAndRead(p, srv.url); writeJSON(path.join(OUT, 'TS3-events.json'), ev);
    const sc = ev.filter(e => e.type === 'save_corrupt'), ns = ev.filter(e => e.type === 'save_recovery_notice_shown'), nd = ev.filter(e => e.type === 'save_recovery_notice_dismissed');
    ck('CSR-10 save_corrupt once: recovered_from bak, store ls, tried[bak valid, idb ...] in order', sc.length === 1 && sc[0].recovered_from === 'bak' && sc[0].store === 'ls' && Array.isArray(sc[0].tried) && sc[0].tried[0]?.source === 'bak' && sc[0].tried[0]?.result === 'valid' && sc[0].tried[1]?.source === 'idb', { short: sc });
    ck('CSR-10 notice_shown + notice_dismissed {notice, source, store} once each', shown === 1 && ns.length === 1 && nd.length === 1 && ns[0].notice === 'M1' && ns[0].source === 'bak' && 'store' in ns[0] && JSON.stringify({ ...nd[0], type: 0, ts: 0, sid: 0, fgMs: 0, sessionMs: 0 }) === JSON.stringify({ ...ns[0], type: 0, ts: 0, sid: 0, fgMs: 0, sessionMs: 0 }), { short: { ns, nd } });
    const probs = ev.flatMap(evProblems); ck('T-AC9 schema (TS3 log)', probs.length === 0, { problems: [...new Set(probs)], short: [...new Set(probs)].slice(0, 6) });
    ck('TS3 0 page/console errors', errs.length === 0, { short: errs }); await ctx.close(); }
  // TS4 IDB1-7: LS main absent, valid IDB main -> save_restore {source:'idb'} exactly once; never save_restored; no save_corrupt
  if (want('TS4')) { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS4'); await p.goto(srv.url + 'blank.txt');
    await p.evaluate(r => new Promise((res, rej) => { const q = indexedDB.open('eggfarm', 1); q.onupgradeneeded = () => q.result.createObjectStore('save'); q.onsuccess = () => { const tx = q.result.transaction('save', 'readwrite'); tx.objectStore('save').put(r, 'main'); tx.oncomplete = () => { q.result.close(); res(); }; }; q.onerror = () => rej(q.error); }), P1B);
    await p.goto(G); await start(p); await p.waitForTimeout(800); const ev = await endAndRead(p, srv.url); writeJSON(path.join(OUT, 'TS4-events.json'), ev);
    const sr = ev.filter(e => e.type === 'save_restore');
    ck('IDB1-7 save_restore{source:idb} once, no save_restored, no save_corrupt', sr.length === 1 && sr[0].source === 'idb' && !ev.some(e => e.type === 'save_restored' || e.type === 'save_corrupt'), { short: sr });
    ck('TS4 0 page/console errors', errs.length === 0, { short: errs }); await ctx.close(); }
  // TS5 CSR-6: corrupt main, nothing else -> save_corrupt{recovered_from:'none'} + M3 notice
  if (want('TS5')) { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS5'); await seedLS(p, { 'eggfarm.save': '{"version":6,"state":' });
    await p.goto(G); await start(p); await p.waitForTimeout(800); if (await p.locator('#rcGo').count()) await p.locator('#rcGo').click(); const ev = await endAndRead(p, srv.url); writeJSON(path.join(OUT, 'TS5-events.json'), ev);
    const sc = ev.filter(e => e.type === 'save_corrupt'), ns = ev.filter(e => e.type === 'save_recovery_notice_shown');
    ck('CSR-6/10 fresh: save_corrupt{recovered_from:none, reason parse} + notice M3', sc.length === 1 && sc[0].recovered_from === 'none' && sc[0].reason === 'parse' && ns[0]?.notice === 'M3', { short: { sc, ns } });
    ck('TS5 0 page/console errors', errs.length === 0, { short: errs }); await ctx.close(); }
  // TS6 offline_grant once on a 2 h return
  if (want('TS6')) { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS6'); const j = JSON.parse(P1B); j.savedAt = Date.now() - 2 * 3600e3; await seedLS(p, { 'eggfarm.save': JSON.stringify(j) });
    await p.goto(G); await start(p); await p.waitForTimeout(800); await dismissWelcome(p, 1500); const ev = await endAndRead(p, srv.url); writeJSON(path.join(OUT, 'TS6-events.json'), ev);
    const og = ev.filter(e => e.type === 'offline_grant'); ck('offline_grant once, eggs > 0, secondsAway present, no awayS (G-TEL-3)', og.length === 1 && og[0].eggs > 0 && Number.isFinite(og[0].secondsAway) && !('awayS' in og[0]), { short: og });
    const probs = og.flatMap(evProblems); ck('offline_grant schema', probs.length === 0, { short: probs });
    ck('TS6 0 page/console errors', errs.length === 0, { short: errs }); await ctx.close(); }
  // TS8 G-TEL-4 pinned retention (HARD): seed LS eggfarm.telemetry with the two pinned events (oldest), a non-pinned marker, then ring_size non-pinned taps;
  // the game's load-time trim must drop the marker and keep both pinned events.
  if (want('TS8')) { const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS8'); const RS = +A['ring-size'];
    const seeded = [{ type: 'milestone_reached', ts: 1000, sessionMs: 0, id: 'hens:10', track: 'hens', level: 10, mult: 1.25 }, { type: 'balanced_tier', ts: 1001, sessionMs: 0, id: 'balanced:1', tier: 1, min_level: 5 },
      { type: 'tap', ts: 1002, sessionMs: 0, count: 1, eggs: 1, id: '__trim_marker' }, ...Array.from({ length: RS }, (_, i) => ({ type: 'tap', ts: 2000 + i, sessionMs: 0, count: 1, eggs: 1 }))];
    await seedLS(p, { 'eggfarm.save': P1B, 'eggfarm.telemetry': JSON.stringify(seeded) }); await p.goto(G); await start(p); await skipOnb(p); await dismissWelcome(p, 1500);
    for (let i = 0; i < 5; i++) await p.locator('#collect').click({ force: true }); await p.waitForTimeout(1500); const after = await endAndRead(p, srv.url);
    const probs = retentionProblems(seeded, after); res.scenarios.TS8 = { ringSize: RS, seeded: seeded.length, after: after.length };
    ck('T-AC9 G-TEL-4 milestone_reached + balanced_tier PINNED: survive a forced ring trim (D-HOP-2026-10-29-07)', probs.length === 0, { short: { probs, ringSize: RS, after: after.length } });
    ck('TS8 0 page/console errors', errs.length === 0, { short: errs }); await ctx.close(); }
  // TS7 SS-19/§8 on build:qa (QA-D-1029-Q9TEL): eggfarmQa.stall.force(cause) renders the chip but must emit NO sales_stall (a sales_stall after force() is a bug).
  // The §8 telemetry checks run on the LIVE path only (real stall via worker.set). cause:'other' is never driven here (HoE's vitest fault fixture only).
  if (want('TS7')) { const hardSS = FLAGS.has('salesStopped');
    if (!A['qa-dir']) ck('TS7 not run: no --qa-dir (build:qa) given', false, { short: 'binds on the RC; the gate passes dist-qa' }, hardSS); // HARD with salesStopped=1 (HoQ Q-TEL-4)
    else { const qs = await serveDir(A['qa-dir'], String(+A.port + 1)); const errs = []; const ctx = await ctxNew(); const p = await ctx.newPage(); watch(p, errs, 'TS7');
      try { await seedLS(p, { 'eggfarm.save': P1B }); await p.goto(qs.url); await start(p); await skipOnb(p); await dismissWelcome(p, 1500);
        const seam = await p.evaluate(() => ({ qa: !!window.eggfarmQa, force: typeof window.eggfarmQa?.stall?.force === 'function', state: typeof window.eggfarmQa?.stall?.state === 'function', worker: typeof window.eggfarmQa?.worker?.set === 'function' }));
        res.scenarios.TS7 = { seam };
        ck('TS7 seam eggfarmQa.stall.force/state + worker.set present on build:qa', seam.force && seam.state && seam.worker, { short: seam }, hardSS);
        if (seam.force) { const forced = []; for (const c of ['mh_asleep', 'mh_paused', 'mh_unpaid', 'no_mh', 'ch_asleep', 'ch_unpaid']) { const r = await p.evaluate(c => { try { window.eggfarmQa.stall.force(c); return 'ok'; } catch (e) { return String(e); } }, c); await p.waitForTimeout(800); forced.push([c, r, await p.evaluate(() => window.eggfarmQa.stall.state?.() ?? null)]); }
          const evF = events(await readLS(p)).filter(e => e.type === 'sales_stall'); res.scenarios.TS7.forced = forced;
          ck('TS7 SS-19/§8: NO sales_stall after stall.force() (6 causes, never other)', evF.length === 0, { short: { forced: forced.map(f => f.slice(0, 2)), sales_stall: evF.length } }, true); }
        if (seam.worker && hardSS) { // live path: Market Hand asleep with sellable eggs and buyers; hold 8 s on focusClock (visible, no menu), then wake -> resolved
          await p.evaluate(() => { const q = window.eggfarmQa; q.set?.basket?.(30); q.set?.queue?.(3); q.worker.set('market_hand', { energy: 0 }); }); await p.waitForTimeout(10500);
          await p.evaluate(() => window.eggfarmQa.worker.set('market_hand', { energy: 100 })); await p.waitForTimeout(2500);
          const ev = await endAndRead(p, qs.url); writeJSON(path.join(OUT, 'TS7-events.json'), ev); const st = ev.filter(e => e.type === 'sales_stall');
          const shown = st.filter(e => e.phase === 'shown'), resd = st.filter(e => e.phase === 'resolved'); const probs = st.flatMap(evProblems);
          ck('TS7 SS-19 live: >= 1 shown, exactly one resolved per shown stall_id, no reuse_count', ts7Pairing(st).length === 0, { short: st.map(e => [e.phase, e.stall_id, e.cause, e.resolved_by]) });
          ck('TS7 §8 schema on the live sales_stall events (closed list + enums)', probs.length === 0, { short: probs });
          ck('TS7 live cause mh_asleep (never other)', shown.length > 0 && shown.every(e => e.cause === 'mh_asleep'), { short: shown.map(e => e.cause) }); }
        else ck('TS7 live path not run (salesStopped flag off or no worker.set)', false, { short: { hardSS, seam } }, hardSS); // HARD with salesStopped=1 (HoQ Q-TEL-4)
        ck('TS7 0 page/console errors', errs.length === 0, { short: errs }, hardSS);
      } finally { await ctx.close(); await qs.stop(); } } }
} finally { await br.close(); await srv.stop(); }
{ const rp = rev12Problems(ALLEV); res.rev12 = { events: ALLEV.length, problems: rp };
  const uv = c2Unverified(ALLEV, FLAGS.has('rc2Refill'), FLAGS.has('pause')); res.unverified = uv; for (const u of [...new Set(uv)]) console.log(`UNVERIFIED C-2 ${u}`);
  ckV(`REV13 C-2 / zero_gain cap / events==50 / dead_zone / C-1 fatigue fields / row #23 none over all captured logs (${ALLEV.length} events; errata rev 13 a0e8f6d7)`, rp.length === 0, { short: [...new Set(rp)].slice(0, 8) }); }
for (const [k, v] of Object.entries(res.triage)) console.log(`TRIAGE-ON-RC ${k} x${v.n} (${v.why})`);
res.hardFail = hard; writeJSON(path.join(OUT, `telemetry-${A.engine}.json`), res); console.log(hard ? `TELEMETRY: ${hard} HARD FAIL` : 'TELEMETRY: OK'); process.exit(hard ? 1 : 0);
