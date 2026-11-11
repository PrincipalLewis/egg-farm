#!/usr/bin/env node
// G1-flags-ship-set checker. Ship-set of record = product/v5-ship-set.md rev 2 (D-HOP-2026-10-30-30), D-CEO-20261030-09/-10.
// usage: node g1-ship-set.cjs --balance <rc-balance.json> --shipset <v5-ship-set.md> --shipset-sha <pinned sha256 of the .md>
//          --out <derived.json> [--expected-balance-sha <hex>] [--git <repo> --rc <sha>]   (env EXPECTED_BALANCE_SHA also read)
// exit 0 only if ALL hold; anything else exit 1 (fail closed):
//  - ship-set present, parseable, sha256 == --shipset-sha;  - balance.json sha256 == the expected sha (HoE pins it at the RC cut);
//  - every "Exact config keys" path exists in balance.json with that exact value, every tc_* "Tunables of record" value is a HARD check in BOTH balance.json m4.tc.<name> AND the committed economy CSV column tc_<name>
//    (every row; HoQ amendment 13:12/13:13, tc_streak_cap = 0.27 D-HOP-27);
//  - every balance.json m4.flags key is listed (exact key set);  - the economy CSV sha256 is present (not a placeholder) and, when the
//    CSV PATH comes from the ship-set (recorded next to the sha by HoE) and must be data/economy.csv (the only source: scripts/sync-economy.ts;
//    economy.f1.csv is test-only, HoE via HoQ 13:13). --csv-path / env ECONOMY_CSV is an optional override that must EQUAL the ship-set path.
//    The committed file at the run SHA (--git/--rc) must match the sha. Path or sha missing/placeholder = FAIL closed.
// Telemetry / post-L10 have no flag (HoQ addendum 2026-10-30 13:05 #1, ship-set rev 2 "Not flags"): if listed as a key they are
// reported and excluded, never encoded.
const fs = require('fs'), crypto = require('crypto'), cp = require('child_process');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex'), HEX = /^[0-9a-f]{64}$/;
const errs = [], notes = [];
const die = m => { console.log(m); process.exit(1); };
if (!A.balance || !A.shipset || !A.out) die('usage: --balance F --shipset MD --shipset-sha HEX --out JSON [--expected-balance-sha HEX] [--csv-path data/x.csv] [--git DIR --rc SHA]');
let mdb; try { mdb = fs.readFileSync(A.shipset); } catch (e) { die('ship-set missing: ' + A.shipset + ' (fail closed)'); }
const mdsha = sha(mdb), md = mdb.toString('utf8');
if (!A['shipset-sha'] || !HEX.test(A['shipset-sha'])) errs.push('pinned ship-set sha256 not supplied (fail closed)');
else if (A['shipset-sha'] !== mdsha) errs.push('ship-set sha256 ' + mdsha + ' != pinned ' + A['shipset-sha'] + ' (changed file needs a new HoP decision + re-pin)');
const sec = name => { const L = md.split('\n'); const i = L.findIndex(l => l.startsWith('## ' + name)); if (i < 0) return null; const o = []; for (let j = i + 1; j < L.length && !L[j].startsWith('## '); j++) o.push(L[j]); return o.filter(l => l.startsWith('- ')); };
const exact = sec('Exact config keys'), notFlags = sec('Not flags'), tun = sec('Tunables of record');
if (!exact || !exact.length || !tun) die('ship-set unparseable: missing "Exact config keys" or "Tunables of record" section (fail closed) | sha256 ' + mdsha);
const NOFLAG = /^(m4\.flags\.)?(telemetry|post-?L10|postL10)/i;
const expected = [], excluded = [], CSV_OF_RECORD = 'data/economy.csv';
const kv = l => { const m = l.match(/^- ([A-Za-z0-9_.\-]+) = (-?\d+(?:\.\d+)?)(?=[\s,;]|$)/); return m ? { key: m[1], value: Number(m[2]), raw: l.slice(2) } : null; };
for (const l of exact) { const e = kv(l); if (!e) die('ship-set unparseable line in Exact config keys: ' + l); if (NOFLAG.test(e.key)) { excluded.push(e); continue; } if (!/^m4\./.test(e.key)) die('ship-set key outside m4.*: ' + e.key); expected.push({ ...e, path: e.key }); }
let csvRaw = null, csvSha = null, csvPath = null;
for (const l of tun) { let m; if ((m = l.match(/^- economy CSV:\s*(.*)$/i))) { csvRaw = m[1]; const h = m[1].match(/\b[0-9a-f]{64}\b/); csvSha = h ? h[0] : null; const p = m[1].match(/([\w\-\/.]*\w\.csv)\b/); csvPath = p ? p[1] : null; continue; }
  const e = kv(l); if (!e) die('ship-set unparseable line in Tunables of record: ' + l); if (!/^tc_[a-z0-9_]+$/.test(e.key)) die('ship-set tunable not tc_*: ' + e.key); expected.push({ ...e, path: 'm4.tc.' + e.key.slice(3), tunable: true }); }
if (csvRaw === null) die('ship-set unparseable: no "economy CSV" line (fail closed)');
for (const l of notFlags || []) notes.push('not-a-flag: ' + l.slice(2));
fs.writeFileSync(A.out, JSON.stringify({ source: A.shipset, source_sha256: mdsha, expected, excluded, not_flags: notFlags || [], economy_csv: { raw: csvRaw, sha256: csvSha, path: csvPath } }, null, 1) + '\n');
let bb; try { bb = fs.readFileSync(A.balance); } catch (e) { die('balance.json missing (fail closed)'); }
let b; try { b = JSON.parse(bb); } catch (e) { die('balance.json not JSON (fail closed)'); }
const bsha = sha(bb), want = String(A['expected-balance-sha'] || process.env.EXPECTED_BALANCE_SHA || '').trim().toLowerCase();
if (!want) errs.push('expected balance.json sha256 not supplied (HoE pins it at the RC cut) - fail closed');
else if (!HEX.test(want)) errs.push('expected balance.json sha256 malformed');
else if (want !== bsha) errs.push('balance.json sha256 ' + bsha + ' != expected ' + want);
const get = p => p.split('.').reduce((o, k) => (o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), b);
for (const e of expected) { const v = get(e.path); if (v === undefined) errs.push(e.path + ' missing in balance.json'); else if (v !== e.value) errs.push(e.path + '=' + JSON.stringify(v) + ' != ship-set ' + e.value); }
const f = b && b.m4 && b.m4.flags; if (!f || typeof f !== 'object' || Array.isArray(f)) errs.push('balance m4.flags missing');
else { const L = new Set(expected.filter(e => e.path.startsWith('m4.flags.')).map(e => e.path.slice(9))); const x = Object.keys(f).filter(k => !L.has(k)); if (x.length) errs.push('m4.flags keys not in ship-set: ' + x.join(',')); }
const ov = String(A['csv-path'] || process.env.ECONOMY_CSV || '').trim() || null;
let csvNote = 'economy CSV ' + (csvPath || '<no path>') + ' sha256 ' + (csvSha || 'MISSING'), csvBuf = null;
if (!csvPath) errs.push('economy CSV path missing/placeholder in ship-set ("' + csvRaw + '") - fail closed');
else if (csvPath !== CSV_OF_RECORD) errs.push('ship-set CSV path ' + csvPath + ' != ' + CSV_OF_RECORD + ' (only source; economy.f1.csv is test-only)');
if (ov && ov !== csvPath) errs.push('ECONOMY_CSV override ' + ov + ' != ship-set path ' + (csvPath || '<none>'));
if (!csvSha) errs.push('economy CSV sha256 missing/placeholder in ship-set ("' + csvRaw + '") - fail closed');
if (csvPath) { if (!(A.git && A.rc)) errs.push('economy CSV cannot be read: --git/--rc not given');
  else { try { csvBuf = cp.execFileSync('git', ['-C', A.git, 'show', A.rc + ':' + csvPath], { maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {}
    if (!csvBuf) errs.push('economy CSV ' + csvPath + ' not found at ' + A.rc);
    else { const cs = sha(csvBuf); csvNote = 'economy CSV ' + csvPath + ' sha256 ' + cs + (csvSha ? (cs === csvSha ? ' == ship-set' : ' != ship-set ' + csvSha) : ' (ship-set sha missing)');
      if (csvSha && cs !== csvSha) errs.push('economy CSV ' + csvPath + ' sha256 ' + cs + ' != ship-set ' + csvSha); } } }
const rows = csvBuf ? csvBuf.toString('utf8').trim().split(/\r?\n/).map(l => l.split(',')) : null;
for (const t of expected.filter(e => e.tunable)) { let cv = '<csv unread>';
  if (rows) { const i = rows[0].indexOf(t.key); if (i < 0) { cv = '<no column>'; errs.push('economy CSV has no column ' + t.key); }
    else { const vals = [...new Set(rows.slice(1).map(r => r[i]))]; cv = vals.join('|'); if (vals.length !== 1 || Number(vals[0]) !== t.value || vals[0].trim() === '') errs.push('economy CSV ' + t.key + '=' + cv + ' != ship-set ' + t.value); } }
  else errs.push('economy CSV ' + t.key + ' not checked (CSV not readable) - fail closed');
  notes.push('TUNABLE ' + t.key + ': ship-set ' + t.value + ', balance ' + t.path + '=' + JSON.stringify(get(t.path)) + ', csv ' + t.key + '=' + cv); }
const tail = ' || ship-set sha256 ' + mdsha + '; balance.json sha256 ' + bsha + '; ' + expected.length + ' keys; excluded: ' + (excluded.map(e => e.key).join(',') || 'none') + '; ' + csvNote + (notes.length ? '; ' + notes.join('; ') : '');
if (errs.length) die(errs.join(' | ') + tail);
console.log('ship-set match: ' + expected.map(e => e.path + '=' + e.value).join(',') + tail);
