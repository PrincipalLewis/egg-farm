#!/usr/bin/env bash
# Self-test of g8-schema-ts.mjs (D-HOE-20 contract, FINAL per HoQ C-1; + D-HOE-20261030-25 N-2/N-8/N-1 and errata rev 5 ability_blocked_taps;
# + errata rev 13 a0e8f6d7 PINNED (manifest L131): G8-20 worst-case size test incl. dead_zone, G8-21 pinned set, G8-22 C-1 fatigue_cue_tapped 6 fields, G8-23 dead_zone/zero_gain_purchase)
# on throw-away git fixtures in /tmp + the real rc/v5 SHAs (read-only git show).
set -u; D=$(cd "$(dirname "$0")" && pwd); G=/workspace/egg-farm-studio/game; T=$(mktemp -d /tmp/g8.XXXX); P=0; F=0
ck(){ local n=$1 want=$2 re=$3; shift 3; out=$(node $D/g8-schema-ts.mjs "$@" 2>&1); rc=$?; if [ $rc = $want ] && { [ -z "$re" ] || echo "$out" | grep -q -- "$re"; }; then P=$((P+1)); echo "ok   $n (rc=$rc) $(echo "$out" | tail -1)"; else F=$((F+1)); echo "FAIL $n (rc=$rc want $want, expect '$re') $out"; fi; }
git -C $T init -q r; mkdir -p $T/r/src/telemetry $T/r/src/ui $T/r/src/sim
PINS="sales_stall fatigue_cue_shown fatigue_cue_tapped shift_sheet_opened refill_used rest_toggled first_worker_hired autorefill_toggled abilities_unlocked ability_used ability_ended ability_blocked worker_paused worker_resumed hatch_started flock_complete milestone_reached balanced_tier zero_gain_purchase dead_zone"
EXTRA="sales_stall refill_used ability_used fatigue_cue_shown fatigue_cue_tapped shift_sheet_opened rest_toggled first_worker_hired autorefill_toggled zero_gain_purchase dead_zone best_buy_shown best_buy_followed best_buy_suppressed_zero_gain"
names=$(node -e 'console.log(Object.keys(require(process.argv[1]).events).join(" "))' $D/../../spec/telemetry-v062.schema.json)
# entry <event> <variant>: EVENT_SCHEMA entry; special events carry the D-HOE-25 N-2 shapes, each negative variant breaks exactly one rule
entry(){ local n=$1 v=$2; case $n in
  ability_blocked) local ck=events cb=bool; [ $v = capswap ] && ck=episodes; [ $v = capnobool ] && cb=count
    echo "  ability_blocked: { pinned: true, fields: { worker: { kind: 'enum', values: WORKER_IDS }, count: { kind: 'count' } }, marker: { capped: { kind: '$cb' }, $ck: { kind: 'count' } } },";;
  coop_full) local ck=episodes; [ $v = coopevents ] && ck=events
    echo "  coop_full: { pinned: true, fields: { phase: { kind: 'enum', values: ['start','end'] } }, marker: { capped: { kind: 'bool' }, $ck: { kind: 'count' } } },";;
  session_end) local fl="asleep_s: { kind: 'float', min: 0, step: 0.1 }," ab="ability_blocked_taps: { kind: 'int', min: 0 },"
    [ $v = floatbad ] && fl="asleep_s: { kind: 'float', min: 0, step: 0.1, len: 3 },"; [ $v = floatstep0 ] && fl="asleep_s: { kind: 'float', step: 0 },"
    [ $v = floatfull ] && fl="asleep_s: { kind: 'float', min: 0, max: 86400, step: 0.1, optional: true },"
    [ $v = abtmiss ] && ab=""; [ $v = abtfloat ] && ab="ability_blocked_taps: { kind: 'float', min: 0 },"; [ $v = abtmin1 ] && ab="ability_blocked_taps: { kind: 'int', min: 1 },"
    local zd="zero_gain_purchase_dropped: { kind: 'int', min: 0 },"; [ $v = zgdropmiss ] && zd=""
    echo "  session_end: { pinned: true, fields: { farm_level: { kind: 'int' }, $fl $ab $zd } },";;
  fatigue_cue_tapped) if [ $v = c1ident ]; then echo "  fatigue_cue_tapped: { pinned: true, fields: FCF },"; else local f6="$F6"; [ $v = c1two ] && f6="surface: { kind: 'enum', values: ['hud_chip','banner','bubble'] }, loss_per_s: { kind: 'count' },"
    [ $v = c1sbs ] && f6="$F6 suppressed_by_stall: { kind: 'bool' },"; echo "  fatigue_cue_tapped: { pinned: true, fields: { $f6 } },"; fi;;
  fatigue_cue_shown) if [ $v = c1ident ]; then echo "  fatigue_cue_shown: { pinned: true, fields: { ...FCF, suppressed_by_stall: { kind: 'bool' } } },"; else local sb="suppressed_by_stall: { kind: 'bool' },"; [ $v = c1shown ] && sb=""
    echo "  fatigue_cue_shown: { pinned: true, fields: { $F6 $sb } },"; fi;;
  dead_zone) local rs="['none_affordable']"; [ $v = dzcap ] && rs="['none_affordable','cap','max']"; local pn=true; [ $v = pindz ] && pn=false
    echo "  dead_zone: { pinned: $pn, fields: { farm: { kind: 'int', min: 10, max: 29 }, s: { kind: 'float', min: 30, step: 0.1 }, reason: { kind: 'enum', values: $rs }, open: { kind: 'bool', optional: true } } },";;
  zero_gain_purchase) local mk=""; [ $v = zgmarker ] && mk="marker: { capped: { kind: 'bool' }, events: { kind: 'count' } },"
    echo "  zero_gain_purchase: { pinned: true, fields: { key: { kind: 'enum', values: ['HENS','VALUE','COLL'] }, farm: { kind: 'count' }, level: { kind: 'count' }, meaningful_eta_s: { kind: 'float', min: 0, step: 0.1 } }, $mk },";;
  worker_summary) local kp="new RegExp('^wage_(' + WORKER_IDS.join('|') + ')_asleep_cents\$')"
    [ $v = dynlit ] && kp="/^wage_(market_hand|coop_hand|hawker|grader)_asleep_cents\$/"; [ $v = dynwild ] && kp="/^wage_\\\\w+_asleep_cents\$/"
    [ $v = dynmiss ] && kp="/^wage_(market_hand|coop_hand|hawker)_asleep_cents\$/"; [ $v = dynunanch ] && kp="/wage_(market_hand|coop_hand|hawker|grader)_asleep_cents/"
    [ $v = dynextra ] && kp="/^wage_(market_hand|coop_hand|hawker|grader|bogus)_asleep_cents\$/"
    if [ $v = nodyn ]; then echo "  worker_summary: { pinned: false, fields: { farm_level: { kind: 'int' } } },"
    else echo "  worker_summary: { pinned: false, fields: { farm_level: { kind: 'int' } }, dynamicFields: [{ keyPattern: $kp, spec: { kind: 'count' } }] },"; fi;;
  breed_slotted) local lo="loadout: { kind: 'str', pattern: /^P\\dA\\dB\\d\$/ },"; [ $v = strnopat ] && lo="loadout: { kind: 'str' },"; [ $v = strstr ] && lo="loadout: { kind: 'str', pattern: '^P\\\\dA\\\\dB\\\\d\$' },"
    local ps="prev_slot: { kind: 'int', min: 0, max: 2, nullable: true },"; [ $v = optbad ] && ps="prev_slot: { kind: 'int', min: 0, max: 2, nullable: 'yes' },"
    echo "  breed_slotted: { pinned: false, fields: { $lo $ps } },";;
  save_migrated) local bs="backup_stores: { kind: 'arr', of: { kind: 'enum', values: ['ls','idb'] }, maxLen: 2 },"
    [ $v = arrnomax ] && bs="backup_stores: { kind: 'arr', of: { kind: 'enum', values: ['ls','idb'] } },"; [ $v = arrnoof ] && bs="backup_stores: { kind: 'arr', maxLen: 2 },"
    [ $v = arrmax0 ] && bs="backup_stores: { kind: 'arr', of: { kind: 'enum', values: ['ls'] }, maxLen: 0 },"
    echo "  save_migrated: { pinned: true, fields: { farm_level: { kind: 'int' }, $bs reason: { kind: 'enum', values: ['invalid_root','invalid_values'], optional: true } } },";;
  sales_stall) local si="stall_id: { kind: 'int', min: 1 }," pv="prev_stall_id: { kind: 'int', min: 1, optional: true },"
    [ $v = stallenum ] && si="stall_id: { kind: 'enum', values: ['s1','s2'] },"; [ $v = stallmin0 ] && si="stall_id: { kind: 'int', min: 0 },"; [ $v = prevcount ] && pv="prev_stall_id: { kind: 'count', optional: true },"
    [ $v = stallmiss ] && si=""
    echo "  sales_stall: { pinned: true, fields: { farm_level: { kind: 'int' }, $si $pv } },";;
  refill_used) local rs="stall_id: { kind: 'int', min: 1, optional: true },"; [ $v = rustallenum ] && rs="stall_id: { kind: 'enum', values: ['a'] },"
    echo "  refill_used: { pinned: true, fields: { farm_level: { kind: 'int' }, $rs } },";;
  ability_used) local cb="combo: { kind: 'bool' },"; [ $v = combonum ] && cb="combo: { kind: 'int' },"; [ $v = comboopt ] && cb="combo: { kind: 'bool', optional: true },"; [ $v = combomiss ] && cb=""
    echo "  ability_used: { pinned: true, fields: { farm_level: { kind: 'int' }, $cb } },";;
  *) local pn=false; case " $PINS " in *" $n "*) pn=true;; esac; [ $v = pinring ] && [ $n = best_buy_shown ] && pn=true; [ $v = pinms ] && [ $n = milestone_reached ] && pn=false
    echo "  $n: { pinned: $pn, fields: { farm_level: { kind: 'int' } } },";; esac; }
F6="surface: { kind: 'enum', values: ['hud_chip','banner','bubble'] }, loss_per_s: { kind: 'count' }, loss_share: { kind: 'float', min: 0, max: 1, step: 0.001 }, n_tired: { kind: 'int', min: 0, max: 4 }, n_asleep: { kind: 'int', min: 0, max: 4 }, n_paused: { kind: 'int', min: 0, max: 4 },"
gen(){ # $1 = variant
  { echo "// fixture schema.ts ($1)"; [ "$1" = ver061 ] && echo "export const TELEMETRY_SCHEMA_VERSION = '0.6.1';" || echo "export const TELEMETRY_SCHEMA_VERSION = '0.6.2';"
    if [ "$1" = wimport ]; then echo "import { WORKER_IDS } from '../sim/workers';"; else echo "const WORKER_IDS = ['market_hand', 'coop_hand', 'hawker', 'grader'] as const;"; fi
    [ "$1" = nooptype ] && echo "export type FieldSpec = { kind: string; values?: readonly string[] };" || echo "export type FieldSpec = { kind: string; values?: readonly string[]; optional?: true; nullable?: true };"
    [ "$1" = c1ident ] && echo "const FCF: Readonly<Record<string, FieldSpec>> = { $F6 };"
    echo "export const EVENT_SCHEMA = {"; for n in $(echo $names $EXTRA | tr ' ' '\n' | awk '!s[$0]++'); do [ "$1" = noev ] && [ "$n" = session_start ] && continue; entry $n "$1"; done
    [ "$1" = alias ] && echo "  manage_used: { pinned: false, fields: {} },"
    [ "$1" = text ] && echo "  x_text: { pinned: false, fields: { note: { kind: 'text' } } },"
    echo "  // resolved_by: { kind: 'enum', values: ['chip_refill','chip_sell_all','chip_collect',$( [ "$1" = nocm ] || echo "'chip_manage',")'refill_elsewhere','sell_elsewhere','collect_elsewhere','auto_resume','queue_empty','basket_empty','paused','focus_lost','cause_changed','none'] }"
    echo "};"; echo "// envelope: type, ts, 'sid', 'fgMs'"
    [ "$1" = notypes ] || echo "export const EVENT_TYPES = Object.keys(EVENT_SCHEMA);"
    [ "$1" = nooptread ] && echo "export function validateEvent(e: TEvent): string[] { const sp = EVENT_SCHEMA[e.type]; return sp && sp.dynamicFields ? [] : []; }" \
      || echo "export function validateEvent(e: TEvent): string[] { const sp = EVENT_SCHEMA[e.type]; const errs: string[] = []; for (const [k, f] of Object.entries(sp?.fields ?? {})) { if (!(k in e) && !f.optional) errs.push(k); if (e[k] === null && !f.nullable) errs.push(k); } for (const k of Object.keys(e)) if (!(k in (sp?.fields ?? {})) && !(sp?.dynamicFields ?? []).some(d => d.keyPattern.test(k))) errs.push(k); return errs; }"
    [ "$1" = pintype ] && echo "export function isPinned(type: string): boolean { return false; }" || echo "export function isPinned(e: TEvent): boolean { return !!EVENT_SCHEMA[e.type]?.pinned; }"
  } > $T/r/src/telemetry/schema.ts
  echo "export const WORKER_IDS = ['market_hand', 'coop_hand', 'hawker', 'grader'] as const;" > $T/r/src/sim/workers.ts
  { echo "import { TELEMETRY_SCHEMA_VERSION } from './schema';"; [ "$1" = noring ] || echo "const ring = { v: TELEMETRY_SCHEMA_VERSION, events: buf }; const old = (arr) => arr.map(e => ({ ...e, legacy: true }));"
    [ "$1" = nohdr ] || echo "export const exp = () => ({ exportedAt: 1, schema_version: TELEMETRY_SCHEMA_VERSION, events: [] });"; } > $T/r/src/telemetry/telemetry.ts
  rm -f $T/r/src/telemetry/schema.test.ts; if [ "$1" != wcnofile ]; then { echo "// worst-case pinned session (errata rev 13 V-3 L160): 200 * 1024 bytes cap"; echo "it('worst case pinned store <= 200 KB', () => { const ev = [$( [ "$1" = wcmiss ] || echo "{ type: 'dead_zone' }," ) { type: 'zero_gain_purchase' }]; expect(size(ev)).toBeLessThanOrEqual(200 * 1024); });"; } > $T/r/src/telemetry/schema.test.ts; fi
  { echo "t.track('session_start', {});"; [ "$1" = strayev ] && echo "t.track('stray_event', {});"; } > $T/r/src/ui/x.ts
  git -C $T/r add -A; git -C $T/r -c user.email=q@x -c user.name=q commit -qm $1 --allow-empty; git -C $T/r rev-parse HEAD; }
OK=$(gen ok); ck "positive: contract-conformant fixture (all 8 kinds, optional/nullable, capped variants, dynamicFields, combo, stall_id, ability_blocked_taps)" 0 "G8: PASS" --git $T/r --rc $OK
echo '[{"type":"session_start"},{"type":"refill_used"}]' > $T/ev.json; ck "positive: TEL-AC11b exported types all in schema" 0 "G8: PASS" --git $T/r --rc $OK --events $T/ev.json
echo '{"schema_version":"0.6.2","events":[{"type":"manage_used"}]}' > $T/ev2.json; ck "negative: TEL-AC11b exported manage_used FAILS" 1 "TEL-AC11b" --git $T/r --rc $OK --events $T/ev2.json
for v in floatfull strstr dynlit wimport c1ident; do R=$(gen $v); ck "positive: $v PASSES" 0 "G8: PASS" --git $T/r --rc $R; done
for v in "ver061:G8-2" "notypes:G8-4" "pintype:G8-6" "text:G8-7" "noev:G8-8" "nocm:G8-10" "alias:G8-11" "noring:G8-12" "nohdr:G8-13" "strayev:TEL-AC11a" \
  "floatbad:G8-7f" "floatstep0:G8-7f" "strnopat:G8-7s" "arrnomax:G8-7a" "arrnoof:G8-7a" "arrmax0:G8-7a" \
  "optbad:G8-14" "nooptype:G8-14" "nooptread:G8-14" "capswap:G8-15" "capnobool:G8-15" "coopevents:G8-15" \
  "nodyn:G8-16" "dynwild:G8-16" "dynmiss:G8-16" "dynunanch:G8-16" "dynextra:G8-16" "combonum:G8-17" "comboopt:G8-17" "combomiss:G8-17" \
  "stallenum:G8-18" "stallmin0:G8-18" "prevcount:G8-18" "stallmiss:G8-18" "rustallenum:G8-18" "abtmiss:G8-19" "abtfloat:G8-19" "abtmin1:G8-19" \
  "wcnofile:G8-20" "wcmiss:G8-20" "pinring:G8-21" "pindz:G8-21" "pinms:G8-21" "c1two:G8-22" "c1sbs:G8-22" "c1shown:G8-22" "dzcap:G8-23" "zgmarker:G8-23" "zgdropmiss:G8-23"; do
  n=${v%%:*}; id=${v#*:}; R=$(gen $n); want="FAIL (1) $id\$"; [ $n = noev ] && want="FAIL (2) G8-8 TEL-AC11a\$"; ck "negative: $n FAILS on $id (only)" 1 "$want" --git $T/r --rc $R; done
git -C $T/r rm -q src/telemetry/schema.ts; git -C $T/r -c user.email=q@x -c user.name=q commit -qm rm; RM=$(git -C $T/r rev-parse HEAD); ck "negative: schema.ts absent FAILS" 1 "FAIL G8-1" --git $T/r --rc $RM
ck "real rc/v5 3f582db: FAIL closed expected (row 11 / schema.ts not landed)" 1 "FAIL G8-1" --git $G --rc 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec
ck "real rc/v5 e77fc5c: FAIL closed (HoQ: correct)" 1 "FAIL G8-1" --git $G --rc e77fc5c
ck "real rc/v5 tip 65a7443 (origin/rc/v5, #95): FAIL closed (schema.ts not on rc/v5)" 1 "FAIL G8-1" --git $G --rc 65a7443951b1967abb20cdd640a6b22ab1c7e1e3
echo "RESULT pass=$P fail=$F"; rm -rf $T; [ $F = 0 ]
