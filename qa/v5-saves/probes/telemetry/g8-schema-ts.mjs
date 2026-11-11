#!/usr/bin/env node
// G-8 / TEL-AC11 probe (manifest row 11, lane S). FINAL hard checks (HoQ C-1: D-HOP-2026-10-30-41 closes F-6 for the HoE variant).
// Contract D-HOE-20261030-20 (engineering/decisions.md "schema.ts contract") + D-HOE-20261030-19 F-6/F-10:
//   src/telemetry/schema.ts exports TELEMETRY_SCHEMA_VERSION = '0.6.2'; EVENT_SCHEMA (Record<type,{pinned: bool|(e)=>bool; fields: Record<name,FieldSpec>}>,
//   FieldSpec kind enum|int|count|bucket|bool, no free text); EVENT_TYPES = Object.keys(EVENT_SCHEMA); validateEvent(e): string[]; isPinned(e) event-based.
//   Envelope {type, ts, sid, fgMs}. Stored ring {v, events}; export header schema_version; pre-0.6.2 ring events tagged legacy:true.
// D-HOE-20261030-25 (eng. decisions sha1 e0a359a8 L443-462) N-2 FieldSpec additions: float{min?,max?,step?}; str{pattern} (pattern required, no free text);
//   arr{of: FieldSpec, maxLen}; per-field optional?/nullable? (both off by default: absent and null fail); capped marker as its own variant
//   {capped: bool, <counterKey>: count} with counterKey events (ability_blocked) / episodes (coop_full) (D-HOE-23 (a)); dynamicFields [{keyPattern: RegExp
//   built from the code worker ids market_hand|coop_hand|hawker|grader, spec}], unknown keys fail. N-8 ability_used.combo bool (always present with
//   abilities=1, D-HOP-42). N-1 / D-HOE-24: stall_id + prev_stall_id int >= 1 (supersedes the enum wording at eng. decisions L380, D-HOE-18; errata rev 5
//   row 1 already says int >= 1). session_end.ability_blocked_taps int count, min 0, all blocked taps (D-HOE-23 (b)).
// Errata of record: rev 7 (product/collection/telemetry-spec-errata-v5.md sha1 fd7d5921, 13:56 CET, pinned per D-HOE-28; rev 5 cea3d717 superseded; rev 8 pending HoQ).
//   The rev-5 items checked here hold unchanged in rev 7 (ability_blocked_taps L119 "int >= 0, all blocked taps incl. post-cap"; marker key events / episodes;
//   stall_id int >= 1, now cited to D-HOE-24 in rev 7 row 4); rev 7 adds combo (row 10, N-8), the N-2 kinds in its G-8 row, and "events is always 50"
//   (a marker VALUE, runtime: not statically checkable here, belongs to the gate T marker check). schema.ts is built against whichever errata rev is pinned
//   in engineering/v5-rc-manifest.md when its PR starts; re-pin this probe if that rev changes a checked item.
//   The runtime meaning of optional/nullable (absent/null rejected by validateEvent) is the gate T half; this probe checks the declarations statically.
// Errata rev 13 PINNED (product/collection/telemetry-spec-errata-v5.md sha1 a0e8f6d7085939756021856c25429a55d8a8d847, frozen copy
//   telemetry-spec-errata-v5.a0e8f6d7.md; HoE pin engineering/v5-rc-manifest.md L131, replaces rev 12 0cfe168a / rev 7 fd7d5921). Added (TASK saves-qa/rev12-tel):
//   G8-20 worst-case pinned-size test in src/** or tests/** *.test.ts (2026-11-05: repo keeps tests in tests/) includes dead_zone (V-3 L160 'incl. dead_zone at its 1-per-30-s worst case', 200 KB).
//   G8-21 pinned set = V-3 L143-151 (20 types incl. dead_zone + zero_gain_purchase pinned; the 5 ring types of L154 not pinned).
//   G8-22 C-1 RULED (D-PMM-2026-10-30-TAPFIELDS; sales-stopped-spec cfff3817 errata note 3 L868 + §8 L290-294): fatigue_cue_tapped declares
//         surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused and NOT suppressed_by_stall; fatigue_cue_shown declares the 6 + suppressed_by_stall.
//         Rev 13 row #3 (L62) lists all six (rev 1-12 listed only `surface, loss_per_s`).
//   G8-23 dead_zone (row #22) pinned, reason only 'none_affordable' (no cap/max, PMFU BB10); zero_gain_purchase (row #21) pinned with NO capped
//         marker variant ("over the cap nothing is emitted, no marker"; overflow = session_end.zero_gain_purchase_dropped, declared).
// Static and read-only (`git show` / `git grep` at the RC SHA; no checkout, no browser). TEL-AC11 static half: every `.track('<type>'` call site in src/
// is in EVENT_SCHEMA; with --events <exported json> also every exported type. The runtime half (each emitted event passes validateEvent) is the gate
// T step under --schema v062. usage: node g8-schema-ts.mjs --git <repo> --rc <sha> [--events export.json]. exit 0 = PASS, 1 = FAIL (expected until row 11 lands).
import { execFileSync } from 'node:child_process'; import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parseArgs } from 'node:util';
const { values: A } = parseArgs({ options: { git: { type: 'string' }, rc: { type: 'string' }, spec: { type: 'string' }, events: { type: 'string' } } });
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SPEC = A.spec || path.join(HERE, '../../spec/telemetry-v062.schema.json');
const RESOLVED_BY_L249 = ['chip_refill', 'chip_sell_all', 'chip_collect', 'chip_manage', 'refill_elsewhere', 'sell_elsewhere', 'collect_elsewhere', 'auto_resume', 'queue_empty', 'basket_empty', 'paused', 'focus_lost', 'cause_changed', 'none']; // sales-stopped-spec L249
const KINDS = ['enum', 'int', 'count', 'bucket', 'bool', 'float', 'str', 'arr']; // + float/str/arr per D-HOE-25 N-2
const WORKER_IDS = ['market_hand', 'coop_hand', 'hawker', 'grader']; // code worker ids (income.ts:86 at e77fc5c; D-HOE-19 wire ids = code ids)
const FLOAT_KEYS = ['kind', 'min', 'max', 'step', 'optional', 'nullable'];
if (!A.git || !A.rc) { console.error('need --git --rc'); process.exit(2); }
const show = f => { try { return execFileSync('git', ['-C', A.git, 'show', `${A.rc}:${f}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8'); } catch { return null; } };
const sch = JSON.parse(readFileSync(SPEC, 'utf8')), names = Object.keys(sch.events || {}).sort();
const P = [], out = (id, ok, why) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${why ? ': ' + why : ''}`); if (!ok) P.push(id.split(' ')[0]); };
const src = show('src/telemetry/schema.ts'), tel = show('src/telemetry/telemetry.ts') || '';
out('G8-1 src/telemetry/schema.ts exists at the RC SHA', !!src, src ? '' : `absent at ${A.rc} (row 11 not landed)`);
const s = src || '';
const declared = new Set([...s.matchAll(/(?:['"`]([A-Za-z0-9_]+)['"`]|\b([a-z][a-z0-9_]*))\s*:\s*\{/g)].map(m => m[1] || m[2])); // object keys of the form  name: {  /  'name': {
const lits = new Set([...s.matchAll(/['"`]([A-Za-z0-9_:<>=\-]+)['"`]/g)].map(m => m[1]));
out("G8-2 export const TELEMETRY_SCHEMA_VERSION = '0.6.2'", /export\s+const\s+TELEMETRY_SCHEMA_VERSION\s*(?::\s*[\w'"]+\s*)?=\s*['"]0\.6\.2['"]/.test(s));
out('G8-3 export const EVENT_SCHEMA', /export\s+const\s+EVENT_SCHEMA\b/.test(s));
out('G8-4 export const EVENT_TYPES = Object.keys(EVENT_SCHEMA)', /export\s+const\s+EVENT_TYPES\b[^=]*=\s*Object\.keys\(\s*EVENT_SCHEMA\s*\)/.test(s));
out('G8-5 export validateEvent(e) -> string[]', /export\s+(?:function\s+validateEvent\s*\(\s*\w+[^)]*\)\s*:\s*string\[\]|const\s+validateEvent\s*=\s*\(\s*\w+[^)]*\)\s*:\s*string\[\])/.test(s));
const ip = s.match(/export\s+(?:function\s+isPinned\s*\(\s*(\w+)\s*(?::\s*([\w<>\[\]]+))?|const\s+isPinned\s*=\s*\(\s*(\w+)\s*(?::\s*([\w<>\[\]]+))?)/);
out('G8-6 export isPinned(e) event-based (not isPinned(type: string), F-10)', !!ip && (ip[2] || ip[4] || '') !== 'string' && (ip[1] || ip[3]) !== 'type', ip ? ip[0] : 'not exported');
const kinds = [...s.matchAll(/kind\s*:\s*['"](\w+)['"]/g)].map(m => m[1]), badK = [...new Set(kinds.filter(k => !KINDS.includes(k)))];
out('G8-7 FieldSpec kinds only enum|int|count|bucket|bool|float|str|arr (no free text; D-HOE-25 N-2)', !!src && kinds.length > 0 && badK.length === 0, src ? (kinds.length ? (badK.length ? 'bad: ' + badK.join(',') : '') : 'no kind: entries') : 'no file');
// ---- helpers for the N-2 structure checks (comments stripped; braces balanced, quoted strings skipped) ----
const sc = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
const skipStr = (t, i) => { const q = t[i]; for (i++; i < t.length && t[i] !== q; i++) if (t[i] === '\\') i++; return i; };
const closeOf = (t, i) => { let d = 0; for (; i < t.length; i++) { const c = t[i]; if (c === "'" || c === '"' || c === '`') { i = skipStr(t, i); continue; } if (c === '{' || c === '[') d++; else if (c === '}' || c === ']') { d--; if (d === 0) return i; } } return -1; };
const openOf = (t, i) => { let d = 0; for (; i >= 0; i--) { const c = t[i]; if (c === '}' || c === ']') d++; else if (c === '{' || c === '[') { if (d === 0) return c === '{' ? i : -1; d--; } } return -1; };
const enclosing = (t, i) => { const o = openOf(t, i); if (o < 0) return ''; const c = closeOf(t, o); return c < 0 ? '' : t.slice(o, c + 1); };
const topKeys = obj => { const ks = []; let d = 0; for (let i = 0; i < obj.length; i++) { const c = obj[i]; if (c === "'" || c === '"' || c === '`') { i = skipStr(obj, i); continue; } if (c === '{' || c === '[' || c === '(') { d++; continue; } if (c === '}' || c === ']' || c === ')') { d--; continue; }
  if (d === 1) { const m = obj.slice(i).match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*\??\s*:/); if (m && /[{,\s]/.test(obj[i - 1] || '')) { ks.push(m[1]); i += m[0].length - 1; } } } return ks; };
const esIdx = sc.search(/export\s+const\s+EVENT_SCHEMA\b/), esOpen = esIdx < 0 ? -1 : sc.indexOf('{', sc.indexOf('=', esIdx)), esText = esOpen < 0 ? '' : sc.slice(esOpen, closeOf(sc, esOpen) + 1);
const eventBlock = name => { const re = new RegExp(`(?:^|[{,\\s])['"]?${name}['"]?\\s*:\\s*\\{`, 'g'); let m; while ((m = re.exec(esText))) { const o = esText.indexOf('{', m.index + m[0].length - 1); if (openOf(esText, m.index + 1) === 0) return esText.slice(o, closeOf(esText, o) + 1); } return ''; };
const fieldSpecs = (t, name) => [...t.matchAll(new RegExp(`(?:^|[{,\\s])['"]?${name}['"]?\\s*\\??\\s*:\\s*\\{`, 'g'))].map(m => { const o = t.indexOf('{', m.index + m[0].length - 1); return t.slice(o, closeOf(t, o) + 1); });
const kindOf = o => (o.match(/^\{[^{}]*?kind\s*:\s*['"](\w+)['"]/) || o.match(/kind\s*:\s*['"](\w+)['"]/) || [])[1];
const numKey = (o, k) => { const m = o.match(new RegExp(`(?:[{,\\s])${k}\\s*:\\s*(-?[\\d.]+(?:e-?\\d+)?)`)); return m ? Number(m[1]) : undefined; };
const specsOfKind = k => [...sc.matchAll(new RegExp(`kind\\s*:\\s*['"]${k}['"]`, 'g'))].map(m => enclosing(sc, m.index));
// G8-7f float {min?, max?, step?}: no other keys; numeric step > 0
const fl = specsOfKind('float'), flBad = fl.filter(o => { const ks = topKeys(o).filter(k => !FLOAT_KEYS.includes(k)); const st = numKey(o, 'step'); return ks.length || (st !== undefined && !(st > 0)) || (/(?:[{,\s])step\s*:/.test(o) && st === undefined && !/step\s*:\s*[A-Za-z_$]/.test(o)); });
out('G8-7f float FieldSpec keys only {kind,min?,max?,step?,optional?,nullable?}, step > 0 (N-2)', !!src && flBad.length === 0, src ? (flBad.length ? 'bad: ' + flBad.map(o => o.replace(/\s+/g, ' ')).join(' | ') : `${fl.length} float spec(s)`) : 'no file');
// G8-7s str {pattern}: pattern required (regex literal or string), no free text
const st = specsOfKind('str'), stBad = st.filter(o => !/(?:[{,\s])pattern\s*:\s*(?:\/.+\/[a-z]*|['"`][^'"`]+['"`]|new\s+RegExp\(|[A-Za-z_$][\w$]*)/.test(o));
out('G8-7s str FieldSpec carries a pattern (no free-text str; N-2)', !!src && stBad.length === 0, src ? (stBad.length ? 'no pattern: ' + stBad.map(o => o.replace(/\s+/g, ' ')).join(' | ') : `${st.length} str spec(s)`) : 'no file');
// G8-7a arr {of: FieldSpec, maxLen}: both required, maxLen int >= 1
const ar = specsOfKind('arr'), arBad = ar.filter(o => { const ml = numKey(o, 'maxLen'); return !/(?:[{,\s])of\s*:\s*\{[^]*kind\s*:/.test(o) || !(Number.isInteger(ml) && ml >= 1 || /maxLen\s*:\s*[A-Z_][A-Z0-9_]*\b/.test(o)); });
out('G8-7a arr FieldSpec has of: FieldSpec and maxLen int >= 1 (N-2)', !!src && arBad.length === 0, src ? (arBad.length ? 'bad: ' + arBad.map(o => o.replace(/\s+/g, ' ')).join(' | ') : `${ar.length} arr spec(s)`) : 'no file');
// G8-14 optional?/nullable?: declared on the FieldSpec type, boolean literals only, read by the validator (off by default => absent/null fail)
const optVals = [...esText.matchAll(/(?:[{,\s])(optional|nullable)\s*:\s*([^,}\s]+)/g)].filter(m => !/^(true|false)$/.test(m[2]));
const optType = /optional\?\s*:/.test(s) && /nullable\?\s*:/.test(s), optRead = /\.optional\b|\[\s*['"]optional['"]\s*\]/.test(sc) && /\.nullable\b|\[\s*['"]nullable['"]\s*\]/.test(sc);
out('G8-14 FieldSpec optional?/nullable? declared, boolean literals only, read by validateEvent (default off: absent + null fail; N-2)', !!src && optType && optRead && optVals.length === 0,
  src ? [optType ? '' : 'FieldSpec type lacks optional?:/nullable?:', optRead ? '' : 'validator never reads .optional/.nullable', optVals.length ? 'non-boolean: ' + optVals.map(m => m[1] + ':' + m[2]).join(',') : ''].filter(Boolean).join('; ') : 'no file');
// G8-15 capped marker variant per family: ability_blocked {capped: bool, events: count}; coop_full {capped: bool, episodes: count}; never the other key
const capOk = (ev, key, other) => { const b = eventBlock(ev); const cb = fieldSpecs(b, 'capped').some(o => kindOf(o) === 'bool'), kc = fieldSpecs(b, key).some(o => kindOf(o) === 'count'), wrong = fieldSpecs(b, other).length > 0; return { ok: !!b && cb && kc && !wrong, why: !b ? `${ev} not declared` : [cb ? '' : `${ev} capped not bool`, kc ? '' : `${ev} ${key} not count`, wrong ? `${ev} uses ${other}` : ''].filter(Boolean).join(', ') }; };
const cA = capOk('ability_blocked', 'events', 'episodes'), cC = capOk('coop_full', 'episodes', 'events');
out('G8-15 capped marker variants: ability_blocked {capped:bool, events:count}, coop_full {capped:bool, episodes:count} (N-2, D-HOE-23 (a))', !!src && cA.ok && cC.ok, src ? [cA.why, cC.why].filter(Boolean).join('; ') : 'no file');
// G8-16 dynamicFields [{keyPattern, spec}]: keyPattern anchored and built from the code worker ids, no wildcard; validator reads dynamicFields (unknown keys fail)
const dyn = [...sc.matchAll(/dynamicFields\s*:\s*\[/g)].map(m => { const o = sc.indexOf('[', m.index); return sc.slice(o, closeOf(sc, o) + 1); });
const kps = dyn.flatMap(d => [...d.matchAll(/keyPattern\s*:\s*/g)].map(m => { const r = d.slice(m.index + m[0].length); let dd = 0, i = 0; for (; i < r.length; i++) { const c = r[i]; if (c === "'" || c === '"' || c === '`') { i = skipStr(r, i); continue; } if ('([{'.includes(c)) dd++; else if (')]}'.includes(c)) { if (dd === 0) break; dd--; } else if (c === ',' && dd === 0) break; } return r.slice(0, i).trim(); }));
const idList = name => { const m = s.match(new RegExp(`const\\s+${name}\\b[^=]*=\\s*\\[([^\\]]*)\\]`)); if (m) return [...m[1].matchAll(/['"](\w+)['"]/g)].map(x => x[1]);
  const im = s.match(new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`)); if (!im) return null; const f = path.posix.normalize(path.posix.join('src/telemetry', im[1])); const t = show(f + '.ts') || show(f + '/index.ts') || '';
  const em = t.match(new RegExp(`export\\s+const\\s+${name}\\b[^=]*=\\s*\\[([^\\]]*)\\]`)); return em ? [...em[1].matchAll(/['"](\w+)['"]/g)].map(x => x[1]) : null; };
const sameIds = l => !!l && l.length === WORKER_IDS.length && WORKER_IDS.every(w => l.includes(w));
const kpBad = kps.map(k => { const wild = /\\w|\.\*|\.\+|\[a-z|\[\^|\\S/.test(k), anch = /\^/.test(k) && /\$/.test(k);
  const lit = k.match(/^\/(.+)\/[a-z]*$/); let ids = null; if (lit) { const alts = (lit[1].match(/\(\??:?([\w|]+)\)/) || [])[1]; ids = alts ? alts.split('|') : null; }
  else { const refs = [...k.matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)].map(m => m[1]); for (const r of refs) { const l = idList(r); if (l) { ids = l; break; } } }
  const why = [anch ? '' : 'not anchored ^...$', wild ? 'wildcard' : '', sameIds(ids) ? '' : `ids ${ids ? ids.join('|') : 'not resolved'} != ${WORKER_IDS.join('|')}`].filter(Boolean).join(', '); return why ? `${k}: ${why}` : ''; }).filter(Boolean);
const dynRead = /\.dynamicFields\b/.test(sc);
out('G8-16 dynamicFields keyPattern from the code worker ids (market_hand|coop_hand|hawker|grader), anchored, no wildcard; validator reads dynamicFields (unknown keys fail; N-2)', !!src && kps.length > 0 && kpBad.length === 0 && dynRead,
  src ? (kps.length ? [kpBad.join(' | '), dynRead ? '' : 'validator never reads .dynamicFields'].filter(Boolean).join('; ') : 'no dynamicFields keyPattern') : 'no file');
// G8-17 ability_used.combo bool, always present (not optional/nullable) (N-8, D-HOP-42)
const cmb = fieldSpecs(eventBlock('ability_used'), 'combo');
out('G8-17 ability_used.combo is kind bool, not optional/nullable (N-8)', !!src && cmb.length > 0 && cmb.every(o => kindOf(o) === 'bool' && !/(optional|nullable)\s*:\s*true/.test(o)), src ? (cmb.length ? cmb.map(o => o.replace(/\s+/g, ' ')).join(' | ') : 'ability_used.combo not declared') : 'no file');
// G8-18 stall_id / prev_stall_id int >= 1 everywhere (N-1, D-HOE-24; replaces the D-HOE-18 L380 enum wording)
const sids = [...fieldSpecs(esText, 'stall_id'), ...fieldSpecs(esText, 'prev_stall_id')], sidBad = sids.filter(o => kindOf(o) !== 'int' || numKey(o, 'min') !== 1);
out('G8-18 stall_id/prev_stall_id kind int, min 1, on every event (incl. sales_stall; N-1 / D-HOE-24, not an enum)', !!src && fieldSpecs(eventBlock('sales_stall'), 'stall_id').length > 0 && sidBad.length === 0,
  src ? (sidBad.length ? 'bad: ' + sidBad.map(o => o.replace(/\s+/g, ' ')).join(' | ') : (fieldSpecs(eventBlock('sales_stall'), 'stall_id').length ? `${sids.length} spec(s)` : 'sales_stall.stall_id not declared')) : 'no file');
// G8-19 session_end.ability_blocked_taps int count, min 0 (errata rev 5 L119, D-HOE-23 (b))
const abt = fieldSpecs(eventBlock('session_end'), 'ability_blocked_taps');
out('G8-19 session_end.ability_blocked_taps int|count, min 0 if stated (all blocked taps incl. post-cap; errata rev 5 = rev 7 L119)', !!src && abt.length === 1 && ['int', 'count'].includes(kindOf(abt[0])) && [undefined, 0].includes(numKey(abt[0], 'min')),
  src ? (abt.length ? abt[0].replace(/\s+/g, ' ') : 'not declared in session_end') : 'no file');
// ---- errata rev 13 (G8-20..23) ----
const PINNED_REV13 = ['sales_stall', 'fatigue_cue_shown', 'fatigue_cue_tapped', 'shift_sheet_opened', 'refill_used', 'rest_toggled', 'first_worker_hired', 'autorefill_toggled',
  'abilities_unlocked', 'ability_used', 'ability_ended', 'ability_blocked', 'worker_paused', 'worker_resumed', 'hatch_started', 'flock_complete', 'milestone_reached', 'balanced_tier',
  'zero_gain_purchase', 'dead_zone']; // V-3 L145-151 (+ tip_shown clock_wage predicate, L152)
const RING_REV13 = ['breed_revealed', 'breed_slotted', 'best_buy_shown', 'best_buy_followed', 'best_buy_suppressed_zero_gain']; // V-3 L154
const FATIGUE6 = ['surface', 'loss_per_s', 'loss_share', 'n_tired', 'n_asleep', 'n_paused']; // SS cfff3817 §8 L290-294, note 3 L868
const constObj = name => { const m = sc.match(new RegExp(`const\\s+${name}\\b[^=]*=\\s*\\{`)); if (!m) return ''; const o = sc.indexOf('{', m.index + m[0].length - 1); return sc.slice(o, closeOf(sc, o) + 1); };
const objKeys = obj => { const ks = topKeys(obj); for (const sp of obj.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) ks.push(...objKeys(constObj(sp[1]))); return ks; };
const fieldsOf = ev => { const b = eventBlock(ev); if (!b) return null; const m = b.match(/(?:[{,\s])fields\s*:\s*/); if (!m) return { b, keys: [] }; const r = b.slice(m.index + m[0].length);
  let obj = ''; if (r[0] === '{') obj = r.slice(0, closeOf(r, 0) + 1); else { const id = (r.match(/^([A-Za-z_$][\w$]*)/) || [])[1]; obj = id ? constObj(id) : ''; } return { b, obj, keys: objKeys(obj) }; };
const pinnedOf = ev => { const b = eventBlock(ev); if (!b) return undefined; const m = b.match(/(?:[{,\s])pinned\s*:\s*(true|false)\b/); return m ? m[1] === 'true' : (/(?:[{,\s])pinned\s*:/.test(b) ? 'fn' : false); };
let tests = []; try { tests = execFileSync('git', ['-C', A.git, 'ls-tree', '-r', '--name-only', A.rc, '--', 'src', 'tests'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(f => /\.test\.ts$/.test(f)); } catch {}
const wc = tests.filter(f => { const t = show(f) || ''; return /worst/i.test(t) && /dead_zone/.test(t) && /(200\s*\*\s*1024|204800|200_?000|200\s*KB)/i.test(t); });
out('G8-20 worst-case pinned-size test (src/**|tests/** *.test.ts: "worst" + dead_zone + the 200 KB cap) includes dead_zone (errata rev 13 V-3 L160)', !!src && wc.length > 0, src ? (wc.length ? wc.join(',') : `no such test among ${tests.length} test file(s)`) : 'no file');
const pinBad = [...PINNED_REV13.filter(n => pinnedOf(n) !== true).map(n => `${n}:${pinnedOf(n) === undefined ? 'undeclared' : 'not pinned:true'}`), ...RING_REV13.filter(n => pinnedOf(n) === true).map(n => `${n}:pinned (ring per V-3 L154)`)];
out('G8-21 pinned set == errata rev 13 V-3 (20 types incl. dead_zone, zero_gain_purchase; 5 ring types not pinned)', !!src && pinBad.length === 0, src ? pinBad.join(', ') : 'no file');
const ft = fieldsOf('fatigue_cue_tapped'), fs = fieldsOf('fatigue_cue_shown');
const c1why = [!ft ? 'fatigue_cue_tapped not declared' : FATIGUE6.filter(f => !ft.keys.includes(f)).map(f => `tapped lacks ${f}`).join(','), ft && ft.keys.includes('suppressed_by_stall') ? 'tapped declares suppressed_by_stall (shown only)' : '',
  !fs ? 'fatigue_cue_shown not declared' : [...FATIGUE6, 'suppressed_by_stall'].filter(f => !fs.keys.includes(f)).map(f => `shown lacks ${f}`).join(',')].filter(Boolean).join('; ');
out('G8-22 C-1: fatigue_cue_tapped declares surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused, not suppressed_by_stall; shown = the 6 + suppressed_by_stall (SS cfff3817 note 3)', !!src && !c1why, src ? c1why : 'no file');
const valOf = (obj, key) => { const m = obj.match(new RegExp(`(?:[{,\\s])${key}\\s*\\??\\s*:\\s*`)); if (!m) return ''; const r = obj.slice(m.index + m[0].length); let d = 0, i = 0;
  for (; i < r.length; i++) { const c = r[i]; if (c === "'" || c === '"' || c === '`') { i = skipStr(r, i); continue; } if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) { if (d === 0) break; d--; } else if (c === ',' && d === 0) break; } return r.slice(0, i); };
const dz = fieldsOf('dead_zone'), dzr = dz ? valOf(dz.obj, 'reason') : '', zgb = eventBlock('zero_gain_purchase');
const dzWhy = [!dz ? 'dead_zone not declared' : '', dz && !/['"]none_affordable['"]/.test(dzr) ? 'dead_zone.reason lacks none_affordable' : '', dz && /['"](cap|max)['"]/.test(dzr) ? `dead_zone.reason allows cap/max (${dzr.trim()})` : '',
  !zgb ? 'zero_gain_purchase not declared' : '', zgb && /(?:[{,\s])(capped|marker)\s*:/.test(zgb) ? 'zero_gain_purchase has a capped marker variant (rev 13 row #21: no marker)' : '',
  fieldSpecs(eventBlock('session_end'), 'zero_gain_purchase_dropped').length || /zero_gain_purchase_dropped\s*\??\s*:/.test(fieldsOf('session_end')?.obj || '') ? '' : 'session_end.zero_gain_purchase_dropped not declared'].filter(Boolean).join('; ');
out("G8-23 dead_zone reason only 'none_affordable'; zero_gain_purchase no capped marker; session_end.zero_gain_purchase_dropped declared (rev 13 rows #21/#22)", !!src && !dzWhy, src ? dzWhy : 'no file');
const miss = names.filter(n => !declared.has(n));
out(`G8-8 EVENT_SCHEMA declares every type of the frozen v0.6.2 spec (${names.length})`, !!src && miss.length === 0, src ? (miss.length ? 'missing: ' + miss.join(',') : '') : 'no file');
out('G8-9 envelope sid + fgMs named in schema.ts', !!src && ['sid', 'fgMs'].every(f => lits.has(f) || declared.has(f) || new RegExp('\\b' + f + '\\b').test(s)));
const rb = RESOLVED_BY_L249.filter(v => !lits.has(v));
out('G8-10 sales_stall resolved_by: all 14 values of sales-stopped-spec L249 (incl. chip_manage)', !!src && declared.has('sales_stall') && rb.length === 0, src ? (rb.length ? 'missing: ' + rb.join(',') : declared.has('sales_stall') ? '' : 'sales_stall not declared') : 'no file');
out('G8-11 no manage_used event type (HoQ C-3: refill_used only, no alias)', !!src && !declared.has('manage_used') && declared.has('refill_used'), src ? '' : 'no file');
out('G8-12 row 24 ring: telemetry.ts writes {v: TELEMETRY_SCHEMA_VERSION, events} and tags legacy:true', /TELEMETRY_SCHEMA_VERSION/.test(tel) && /\bv\s*:\s*TELEMETRY_SCHEMA_VERSION\b/.test(tel) && /legacy\s*:\s*true/.test(tel));
out('G8-13 export header carries schema_version: TELEMETRY_SCHEMA_VERSION', /schema_version\s*:\s*TELEMETRY_SCHEMA_VERSION\b/.test(tel));
let srcTracked = []; try { srcTracked = [...new Set([...execFileSync('git', ['-C', A.git, 'grep', '-h', '-o', '-E', "\\.track\\(\\s*['\"][a-z_]+['\"]", A.rc, '--', 'src'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().matchAll(/['"]([a-z_]+)['"]/g)].map(m => m[1]))].sort(); } catch {}
const untr = srcTracked.filter(t => !declared.has(t));
out(`TEL-AC11a every .track('<type>') call site in src (${srcTracked.length}) is in EVENT_SCHEMA`, !!src && untr.length === 0, src ? (untr.length ? 'not in schema: ' + untr.join(',') : '') : 'no file');
if (A.events) { let ex = []; try { const j = JSON.parse(readFileSync(A.events, 'utf8')); ex = [...new Set((Array.isArray(j) ? j : j.events || []).map(e => e && e.type))]; } catch { ex = ['<unreadable>']; }
  const u = ex.filter(t => !declared.has(t)); out(`TEL-AC11b every exported event type (${ex.length}) is in EVENT_SCHEMA`, !!src && u.length === 0, u.length ? 'not in schema: ' + u.join(',') : ''); }
console.log(P.length ? `G8: FAIL (${P.length}) ${P.join(' ')}` : 'G8: PASS'); process.exit(P.length ? 1 : 0);
