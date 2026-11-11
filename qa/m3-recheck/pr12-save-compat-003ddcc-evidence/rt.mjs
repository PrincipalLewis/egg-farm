// usage: vite-node rt.mjs <root> <out.json> <fixtures...>  — load+save each fixture at fixed now with live balance (flag off)
const [root, out, ...fx] = process.argv.slice(2);
const fs = await import('node:fs');
const S = await import(root + '/src/save/save.ts');
const { balance } = await import(root + '/src/config/balance.ts');
const b = balance.m4 ? { ...balance, m4: { ...balance.m4, enabled: 0 } } : balance;
const mk = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), m }; };
const res = {}; const NOW = 1790000000000;
for (const f of fx) {
  const raw = fs.readFileSync(f, 'utf8').trim();
  const kv = mk({ [S.SAVE_KEY]: raw });
  try { const file = S.load(kv, b); if (!file) { res[f] = { err: 'load-null' }; continue; }
    const w1 = S.save(kv, file.state, NOW, b, true);
    const f2 = S.load(kv, b); const w2 = S.save(kv, f2.state, NOW + 1000, b, true);
    res[f] = { w1, w2, bak: kv.getItem(S.SAVE_KEY + '.bak'), identicalInput: w1 === raw };
  } catch (e) { res[f] = { err: String(e) }; }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
