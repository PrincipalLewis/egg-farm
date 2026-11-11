// vite-node save-migrations.ts <clone>: qa/m3-fixtures/saves through the clone's migrate(); v4/v5 -> SAVE_VERSION (+wageFracCents {} when v6); corrupt-* must throw/reject.
import fs from 'node:fs';
const R = process.argv[2]; const sv = await import(R + '/src/save/save.ts'); const { balance: b } = await import(R + '/src/config/balance.ts');
const D = '/workspace/egg-farm-studio/qa/m3-fixtures/saves/'; let n = 0, f = 0; const V = sv.SAVE_VERSION;
const ok = (t: string, p: boolean, i?: any) => { n++; if (!p) f++; console.log(`${p ? 'PASS' : 'FAIL'} ${t} — ${JSON.stringify(i)}`); };
for (const file of fs.readdirSync(D).filter(x => x.endsWith('.json')).sort()) {
  const raw = fs.readFileSync(D + file, 'utf8'); let src: any = null; try { src = JSON.parse(raw); } catch {}
  let m: any = null, err = ''; try { m = sv.migrate(JSON.parse(raw), b); } catch (e: any) { err = String(e.message ?? e).slice(0, 60); }
  if (file.startsWith('corrupt')) { let rej = !!err || !m?.state; if (!rej && sv.loadSafe) { try { const r = sv.loadSafe(raw, b); rej = !r || r.ok === false || !!r.error; } catch { rej = true; } }
    ok(`${file} rejected (throws or loadSafe rejects)`, rej, err || 'migrated'); continue; }
  const s = m?.state, s0 = src?.state ?? {};
  const kept = s && s.farmLevel === s0.farmLevel && s.collectionLevel === s0.collectionLevel && (s.coinsCents === s0.coinsCents || s0.coinsCents === undefined);
  ok(`${file} v${src?.version} -> v${m?.version} (want v${V}) money/levels kept${V >= 6 ? ', wageFracCents present' : ''}`, !err && m?.version === V && kept && (V < 6 || (s.wageFracCents !== undefined && typeof s.wageFracCents === 'object')), { err, F: s?.farmLevel, C: s?.collectionLevel, coins: s?.coinsCents, frac: s?.wageFracCents });
}
console.log(`SUMMARY ${n - f}/${n} (save version ${V}${V < 6 ? '; v6/wageFracCents N/A at this SHA' : ''})`); process.exit(f ? 1 : 0);
