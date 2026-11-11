// Pure helpers for rc1-guard-save-qa-m4.mjs (no browser). Dry-run: node m4-guard-lib.mjs --selftest
import crypto from 'node:crypto';
export const KEYS = { save: 'eggfarm.save', bak: 'eggfarm.save.bak', v6b: 'eggfarm.save.v6_backup', ui: 'eggfarm.ui', lease: 'eggfarm.lease' };
// Same FNV-1a as game/src/save/save.ts checksum(); sum covers the state JSON.
export function checksum(t) { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
export const serialize = (version, savedAt, state) => { const st = JSON.stringify(state); return `{"version":${version},"savedAt":${savedAt},"sum":"${checksum(st)}","state":${st}}`; };
export const sha = s => crypto.createHash('sha256').update(s).digest('hex');
/** v5 fixture -> v6-shaped (only version bump; v6 field set beyond v5 is unknown locally — prefer a real v6 fixture via V6_FIXTURE). */
export function toV6(raw, savedAt) { const d = JSON.parse(raw); return serialize(6, savedAt ?? d.savedAt, d.state); }
/** v7 per m4-design §3: + hensLevel, eggValueLevel, celebratedMilestones, migrationRefundCents, seenTracksExplainer. Deliberately NOT price-matched (fixture only tests refusal / byte identity). */
export function toV7(v6raw, { savedAt, eggValueLevel = 3, refund = 0 } = {}) { const d = JSON.parse(v6raw), s = { ...d.state };
  s.hensLevel = s.farmLevel; s.eggValueLevel = eggValueLevel; s.celebratedMilestones = ['farm:10']; s.migrationRefundCents = refund; s.seenTracksExplainer = true;
  return serialize(7, savedAt ?? d.savedAt + 1, s); }
/** v6 with tracksV7 marker as written by m4/m4a-tracks-v2 @3351d6c. Marker SHAPE IS ASSUMED (not in design doc): override with MARKER_JSON. */
export function markV6(v6raw, marker) { const d = JSON.parse(v6raw); const m = marker ?? { hensLevel: d.state.farmLevel, eggValueLevel: 2, migrationRefundCents: 0, refunded: true };
  return serialize(6, d.savedAt, { ...d.state, tracksV7: m }); }
/** Extract the exact byte substring of a top-level state field (for byte-untouched marker checks). */
export function fieldBytes(raw, field = 'tracksV7') { const i = raw.indexOf(`"${field}":`); if (i < 0) return null; let j = i + field.length + 3, depth = 0, inS = false;
  for (let k = j; k < raw.length; k++) { const c = raw[k]; if (inS) { if (c === '\\') k++; else if (c === '"') inS = false; continue; }
    if (c === '"') inS = true; else if (c === '{' || c === '[') depth++; else if (c === '}' || c === ']') { if (depth === 0) return raw.slice(j, k); depth--; if (depth === 0) return raw.slice(j, k + 1); } else if (c === ',' && depth === 0) return raw.slice(j, k); }
  return null; }
/** Snapshot diff: {ls:{k:v}, idb:{db/store/key: string}}. Returns list of differences (empty = byte-identical). */
export function diffSnap(a, b) { const out = []; for (const part of ['ls', 'idb']) { const A = a[part] ?? {}, B = b[part] ?? {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (A[k] !== B[k]) out.push({ part, key: k, before: A[k] === undefined ? '<absent>' : `${A[k].length}B sha ${sha(A[k]).slice(0, 12)}`, after: B[k] === undefined ? '<absent>' : `${B[k].length}B sha ${sha(B[k]).slice(0, 12)}` }); }
  return out; }
/** HoQA rulings 2026-10-16 (ZW strictness):
 * - Writes allowed ONLY to eggfarm.lease, eggfarm.tab, eggfarm.telemetry* (LS) and IDB stores named *telemetry*. Everything else: zero writes + byte-identical.
 * - eggfarm.install_id: may be CREATED only if absent; changing or deleting an existing value = FAIL.
 * - ZW-5 checks OBJECTS not field names: an allowed write FAILS only if it holds a serialized save object (version+savedAt+state block)
 *   or a copy of the save / .bak contents. Snapshot fields (farm_level, coinsBefore, ...) in telemetry are fine. */
export const isAllowedLS = k => k === 'eggfarm.lease' || k === 'eggfarm.tab' || /^eggfarm\.telemetry/.test(k ?? '');
export const isAllowedIDB = store => /telemetry/i.test(store ?? '');
export const isAllowedKey = k => k.includes('/') ? isAllowedIDB(k.split('/')[1]) : isAllowedLS(k);
/** install_id rule on a snapshot pair: returns null if OK, else reason. */
export function installIdCheck(before, after, k = 'eggfarm.install_id') { const b = before.ls?.[k], a = after.ls?.[k];
  if (b === undefined) return null; if (a === undefined) return 'install_id deleted'; return a === b ? null : 'install_id changed'; }
export const strictDiff = (a, b) => diffSnap(a, b).filter(d => !isAllowedKey(d.key) && !(d.key === 'eggfarm.install_id' && d.before === '<absent>'));
/** Does a string contain a serialized save object (anywhere, incl. nested / JSON-in-string) or a copy of given save bytes? */
export function holdsSave(v, copies = []) { if (typeof v !== 'string' || !v) return false;
  for (const c of copies) if (c && c.length > 16 && (v.includes(c) || v.includes(JSON.stringify(c).slice(1, -1)))) return 'copy';
  const isSave = o => o && typeof o === 'object' && !Array.isArray(o) && 'version' in o && 'savedAt' in o && o.state && typeof o.state === 'object';
  const walk = (o, d = 0) => { if (d > 8 || o == null) return false; if (typeof o === 'string') { if (o.length > 20 && /^[\[{]/.test(o.trim())) { try { return walk(JSON.parse(o), d + 1); } catch { return false; } } return false; }
    if (typeof o !== 'object') return false; if (isSave(o)) return true; return Object.values(o).some(x => walk(x, d + 1)); };
  try { return walk(JSON.parse(v)) ? 'save-object' : false; } catch { return false; } }
/** Classify spy log [{op,key,store?,value}]. copies = [save bytes, .bak bytes, v6_backup bytes]. installBefore = existing install_id or undefined. */
export function classifyWrites(ws, copies = [], installBefore) { const bad = [], leak = [], allowed = [];
  for (const w of ws) { let ok;
    if (w.op.startsWith('ls.')) ok = w.op !== 'ls.clear' && (isAllowedLS(w.key) || (w.key === 'eggfarm.install_id' && w.op === 'ls.set' && installBefore === undefined));
    else ok = isAllowedIDB(w.store);
    const v = { ...w, value: w.value?.slice(0, 300) };
    if (!ok) bad.push(v); else { allowed.push(v); const h = holdsSave(w.value, copies); if (h) leak.push({ ...v, why: h }); } }
  return { bad, leak, allowed }; }
/** Idempotency check for marked v6 -> v7 migration. m1 = state after 1st migrate, m2 = after reload + 2nd migrate. */
export function idemCheck(src, m1, m2) { const r = [];
  if (m1.coinsCents !== m2.coinsCents) r.push(`coins changed on 2nd migrate ${m1.coinsCents}->${m2.coinsCents}`);
  if ((m1.migrationRefundCents ?? 0) !== (m2.migrationRefundCents ?? 0)) r.push(`refund changed on 2nd migrate ${m1.migrationRefundCents}->${m2.migrationRefundCents}`);
  for (const f of ['hensLevel', 'eggValueLevel', 'farmLevel', 'collectionLevel']) if (m1[f] !== m2[f]) r.push(`${f} ${m1[f]}->${m2[f]}`);
  const mk = src.tracksV7; if (mk?.refunded && (m1.migrationRefundCents ?? 0) > (mk.migrationRefundCents ?? 0)) r.push(`second refund: marker already refunded ${mk.migrationRefundCents}, got ${m1.migrationRefundCents}`);
  return r; }

if (process.argv[2] === '--selftest') { const assert = (await import('node:assert/strict')).default;
  const v6 = serialize(6, 1000, { coinsCents: 500, farmLevel: 4, collectionLevel: 2 }); const d6 = JSON.parse(v6); assert.equal(d6.sum, checksum(JSON.stringify(d6.state)));
  const v7 = toV7(v6); const d7 = JSON.parse(v7); assert.equal(d7.version, 7); assert.equal(d7.state.hensLevel, 4); assert.equal(d7.sum, checksum(JSON.stringify(d7.state)));
  const mk = markV6(v6); assert.equal(fieldBytes(mk), '{"hensLevel":4,"eggValueLevel":2,"migrationRefundCents":0,"refunded":true}');
  assert.equal(fieldBytes('{"a":1,"tracksV7":[1,"]",{}],"b":2}'), '[1,"]",{}]'); assert.equal(fieldBytes('{"tracksV7":5,"x":1}'), '5');
  const s1 = { ls: { a: 'x', b: 'y' }, idb: { 'eggfarm/save/main': 'z' } }; assert.deepEqual(diffSnap(s1, structuredClone(s1)), []);
  assert.equal(diffSnap(s1, { ls: { a: 'x' }, idb: s1.idb }).length, 1); assert.equal(diffSnap(s1, { ls: { a: 'x ', b: 'y' }, idb: s1.idb })[0].key, 'a');
  assert.deepEqual(idemCheck({ tracksV7: { refunded: true, migrationRefundCents: 0 } }, { coinsCents: 9, migrationRefundCents: 0 }, { coinsCents: 9, migrationRefundCents: 0 }), []);
  assert.equal(idemCheck({ tracksV7: { refunded: true, migrationRefundCents: 0 } }, { coinsCents: 19, migrationRefundCents: 10 }, { coinsCents: 29, migrationRefundCents: 20 }).length, 3);
  // rulings 2026-10-16
  assert.equal(strictDiff({ ls: { 'eggfarm.lease': 'a', 'eggfarm.tab': 't', 'eggfarm.ui': 'u' }, idb: {} }, { ls: { 'eggfarm.lease': 'b', 'eggfarm.tab': 't2', 'eggfarm.ui': 'u2' }, idb: {} }).map(d => d.key).join(), 'eggfarm.ui');
  assert.equal(strictDiff({ ls: {}, idb: {} }, { ls: { 'eggfarm.install_id': 'n' }, idb: {} }).length, 0); // created when absent: OK
  assert.equal(strictDiff({ ls: { 'eggfarm.install_id': 'o' }, idb: {} }, { ls: { 'eggfarm.install_id': 'n' }, idb: {} }).length, 1);
  assert.equal(installIdCheck({ ls: {} }, { ls: { 'eggfarm.install_id': 'n' } }), null); assert.equal(installIdCheck({ ls: { 'eggfarm.install_id': 'o' } }, { ls: {} }), 'install_id deleted');
  assert.equal(installIdCheck({ ls: { 'eggfarm.install_id': 'o' } }, { ls: { 'eggfarm.install_id': 'n' } }), 'install_id changed'); assert.equal(installIdCheck({ ls: { 'eggfarm.install_id': 'o' } }, { ls: { 'eggfarm.install_id': 'o' } }), null);
  const sv = serialize(7, 5, { coinsCents: 1, farmLevel: 2 });
  assert.equal(holdsSave('[{"name":"session_start","farm_level":3,"coinsBefore":9,"savedAt":1}]'), false); // snapshot fields OK
  assert.equal(holdsSave(JSON.stringify([{ name: 'x', save: JSON.parse(sv) }])), 'save-object'); assert.equal(holdsSave(JSON.stringify({ blob: sv })), 'save-object'); // nested + JSON-in-string
  assert.equal(holdsSave('{"id":"abc","t":1}', [sv]), false); assert.equal(holdsSave('{"x":"' + 'p' + sv.slice(0, 0) + '"}', [sv]), false);
  assert.equal(holdsSave(JSON.stringify({ raw: sv }), [sv]), 'copy'); assert.equal(holdsSave('pre' + sv, [sv]), 'copy');
  const cw = classifyWrites([{ op: 'ls.set', key: 'eggfarm.lease', value: '{"id":"x","t":1}' }, { op: 'ls.set', key: 'eggfarm.tab', value: JSON.stringify({ s: JSON.parse(sv) }) }, { op: 'ls.set', key: 'eggfarm.telemetry', value: '[{"name":"x","farm_level":5,"coinsBefore":5}]' },
    { op: 'ls.set', key: 'eggfarm.save.bak', value: '{}' }, { op: 'idb.put', store: 'save', key: 'main', value: '' }, { op: 'ls.clear', key: null }, { op: 'ls.set', key: 'eggfarm.install_id', value: 'n' }, { op: 'ls.rm', key: 'eggfarm.install_id' }], [sv], undefined);
  assert.equal(cw.bad.length, 4); assert.equal(cw.leak.length, 1); assert.equal(cw.leak[0].key, 'eggfarm.tab'); assert.equal(cw.allowed.length, 4);
  assert.equal(classifyWrites([{ op: 'ls.set', key: 'eggfarm.install_id', value: 'n' }], [], 'old').bad.length, 1); // existing id overwritten
  console.log('selftest OK'); }
