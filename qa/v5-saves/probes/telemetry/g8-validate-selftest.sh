#!/usr/bin/env bash
# Self-test of g8-validate-c1.mjs (C-1 a/b/c + dead_zone; errata rev 13 a0e8f6d7 PINNED) on throw-away git fixtures in /tmp + the real rc/v5 tip (read-only git archive).
set -u; D=$(cd "$(dirname "$0")" && pwd); G=/workspace/egg-farm-studio/game; T=$(mktemp -d /tmp/g8v.XXXX); P=0; F=0
ck(){ local n=$1 want=$2 re=$3; shift 3; out=$(node $D/g8-validate-c1.mjs "$@" 2>&1); rc=$?; if [ $rc = $want ] && { [ -z "$re" ] || echo "$out" | grep -q -- "$re"; }; then P=$((P+1)); echo "ok   $n (rc=$rc) $(echo "$out" | tail -1)"; else F=$((F+1)); echo "FAIL $n (rc=$rc want $want, expect '$re') $out"; fi; }
git -C $T init -q r; mkdir -p $T/r/src/telemetry $T/r/src/config
gen(){ local v=$1 sum="if ((e.n_tired as number) + (e.n_asleep as number) + (e.n_paused as number) > 4) errs.push('n sum > 4');" tf="F6" dzr="['none_affordable']"
  [ $v = nosum ] && sum=""; [ $v = two ] && tf="{ surface: F6.surface, loss_per_s: F6.loss_per_s }"; [ $v = sbs ] && tf="{ ...F6, suppressed_by_stall: { kind: 'bool', optional: true } }"; [ $v = dzcap ] && dzr="['none_affordable', 'cap']"; local zgx="key: { kind: 'enum', values: ['HENS', 'VALUE', 'COLL'] }, farm: { kind: 'count' }, level: { kind: 'count' }, meaningful_eta_s: { kind: 'float', min: 0, step: 0.1 }"
  [ $v = zgmarker ] && zgx="$zgx, capped: { kind: 'bool', optional: true }, events: { kind: 'count', optional: true }"
  echo '{"telemetry":{"bbv2":{"dead_zone_min_s":30}}}' > $T/r/src/config/balance.json
  cat > $T/r/src/telemetry/schema.ts <<TS
// fixture schema.ts ($v)
import balance from '../config/balance.json';
export const TELEMETRY_SCHEMA_VERSION = '0.6.2';
export interface TEvent { type: string; [k: string]: unknown }
type FieldSpec = { kind: 'enum' | 'int' | 'count' | 'float' | 'bool'; values?: readonly unknown[]; min?: number; max?: number; step?: number; optional?: boolean };
const F6: Record<string, FieldSpec> = { surface: { kind: 'enum', values: ['hud_chip', 'banner', 'bubble'] }, loss_per_s: { kind: 'count' }, loss_share: { kind: 'float', min: 0, max: 1, step: 0.001 },
  n_tired: { kind: 'int', min: 0, max: 4 }, n_asleep: { kind: 'int', min: 0, max: 4 }, n_paused: { kind: 'int', min: 0, max: 4 } };
const DZMIN = (balance as { telemetry: { bbv2: { dead_zone_min_s: number } } }).telemetry.bbv2.dead_zone_min_s;
export const EVENT_SCHEMA: Record<string, { pinned: boolean; fields: Record<string, FieldSpec> }> = {
  fatigue_cue_tapped: { pinned: true, fields: $tf },
  fatigue_cue_shown: { pinned: true, fields: { ...F6, suppressed_by_stall: { kind: 'bool' } } },
  dead_zone: { pinned: true, fields: { farm: { kind: 'int', min: 10, max: 29 }, s: { kind: 'float', min: DZMIN, step: 0.1 }, reason: { kind: 'enum', values: $dzr }, open: { kind: 'enum', values: [true], optional: true } } },
  zero_gain_purchase: { pinned: true, fields: { $zgx } } };
export const EVENT_TYPES = Object.keys(EVENT_SCHEMA);
const ok = (f: FieldSpec, v: unknown): boolean => f.kind === 'enum' ? (f.values ?? []).includes(v) : f.kind === 'bool' ? typeof v === 'boolean'
  : typeof v === 'number' && Number.isFinite(v) && (f.kind === 'float' || Number.isInteger(v)) && (f.min === undefined || v >= f.min) && (f.max === undefined || v <= f.max) && (f.kind !== 'count' || v >= 0);
export function validateEvent(e: TEvent): string[] { const sp = EVENT_SCHEMA[e.type]; if (!sp) return ['unknown type']; const errs: string[] = [];
  for (const [k, f] of Object.entries(sp.fields)) { if (!(k in e)) { if (!f.optional) errs.push(k + ' missing'); continue; } if (!ok(f, e[k])) errs.push(k + ' bad'); }
  for (const k of Object.keys(e)) if (!['type', 'ts', 'sid', 'fgMs'].includes(k) && !(k in sp.fields)) errs.push(k + ' unknown');
  if (e.type === 'fatigue_cue_tapped' || e.type === 'fatigue_cue_shown') { $sum }
  return errs; }
export function isPinned(e: TEvent): boolean { return !!EVENT_SCHEMA[e.type]?.pinned; }
TS
  git -C $T/r add -A; git -C $T/r -c user.email=q@x -c user.name=q commit -qm $v --allow-empty; git -C $T/r rev-parse HEAD; }
OK=$(gen ok); ck "positive: six fields, sum <= 4, no suppressed_by_stall on tapped, dead_zone pinned none_affordable" 0 "G8V: PASS" --git $T/r --rc $OK
R=$(gen nosum); ck "negative (new FAIL fixture): no n_tired+n_asleep+n_paused <= 4 check -> sum 5 accepted FAILS G8V-C1b only" 1 "G8V: FAIL (1) G8V-C1b\$" --git $T/r --rc $R
R=$(gen two); ck "negative: tapped = {surface, loss_per_s} (schema.ts:171 shape) FAILS G8V-C1a" 1 "FAIL G8V-C1a" --git $T/r --rc $R
R=$(gen sbs); ck "negative: tapped accepts suppressed_by_stall FAILS G8V-C1c only" 1 "G8V: FAIL (1) G8V-C1c\$" --git $T/r --rc $R
R=$(gen dzcap); ck "negative: dead_zone reason=cap accepted (not single-value none_affordable, L105) FAILS G8V-DZ only" 1 "G8V: FAIL (1) G8V-DZ\$" --git $T/r --rc $R
R=$(gen zgmarker); ck "negative: zero_gain_purchase accepts a capped marker FAILS G8V-ZG only" 1 "G8V: FAIL (1) G8V-ZG\$" --git $T/r --rc $R
git -C $T/r rm -q src/telemetry/schema.ts; git -C $T/r -c user.email=q@x -c user.name=q commit -qm rm; RM=$(git -C $T/r rev-parse HEAD); ck "negative: schema.ts absent FAILS G8V-0" 1 "G8V: FAIL (1) G8V-0\$" --git $T/r --rc $RM
ck "real rc/v5 tip 65a7443: FAIL closed (schema.ts not on rc/v5; expected until the schema.ts PR lands)" 1 "FAIL G8V-0" --git $G --rc 65a7443951b1967abb20cdd640a6b22ab1c7e1e3
echo "RESULT pass=$P fail=$F"; rm -rf $T; [ $F = 0 ]
