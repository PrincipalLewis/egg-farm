// vite-node fmt-edges.ts (run from worktree root). Prints every case; FAIL rows are expectation mismatches.
const M = await import(process.cwd() + '/src/ui/format.ts');
const { fmtCount, fmtMoney, fmtMoneyShort } = M as any;
const cases: [string, any, any, string][] = [
  ['fmtMoneyShort', 345_000_000, '$3.5M', 'half-up $3.45M'], ['fmtMoneyShort', 344_999_999, '$3.4M', 'just below half'],
  ['fmtMoney', 345_000_000, '$3.45M', 'fmtMoney 2dp under 10M'], ['fmtCount', 3_450_000, '3.45M', ''],
  ['fmtCount', 999_950, '1M', '999.95K rolls up'], ['fmtCount', 999_949, '999.9K', ''], ['fmtCount', 999_999, '1M', '999,999'],
  ['fmtMoneyShort', 99_995_000, '$1M', '$999.95K rolls up'], ['fmtMoneyShort', 99_994_999, '$999.9K', ''], ['fmtMoneyShort', 99_999_900, '$1M', '$999,999'],
  ['fmtMoney', 99_999_900, '$1M', '$999,999'], ['fmtMoney', 999_999, '$9,999.99', ''], ['fmtMoney', 999_999.6, '$10K', 'whole cents first'],
  ['fmtCount', 9_995_000, '10M', 'FMT-1'], ['fmtCount', 1e15, '1,000T', '1e15'], ['fmtMoneyShort', 1e17, '$1,000T', '$1e15'], ['fmtMoney', 1e17, '$1,000T', '$1e15'],
  ['fmtCount', 999_950e9, '1,000T?', 'B->T rollup 999.95B'], ['fmtCount', 18_120_000_000_0 / 1, '181.2B', 'Sell 181.2B'], ['fmtMoneyShort', 18_120_000_000_00, '$18.1B', ''],
  ['fmtCount', 0, '0', ''], ['fmtMoney', 0, '$0.00', ''], ['fmtMoneyShort', 0, '$0.00', ''],
  ['fmtCount', -5, '-5', 'neg'], ['fmtCount', -12_345, '-12.3K?', 'neg big'], ['fmtMoney', -150, '-$1.50?', 'neg'], ['fmtMoney', -2_000_000, '-$20K?', 'neg big'], ['fmtMoneyShort', -2_000_000, '-$20K?', 'neg big'],
  ['fmtCount', NaN, '—', ''], ['fmtMoney', NaN, '—', ''], ['fmtMoneyShort', NaN, '—', ''], ['fmtMoney', Infinity, '—', ''], ['fmtCount', -Infinity, '—', ''],
];
let f = 0;
for (const [fn, x, want, note] of cases) { let got: string; try { got = (M as any)[fn](x); } catch (e: any) { got = 'THROW ' + e.message; }
  const soft = String(want).endsWith('?'); const pass = got === String(want).replace(/\?$/, '');
  if (!pass && !soft) f++; console.log(`${pass ? 'PASS' : soft ? 'INFO' : 'FAIL'}\t${fn}(${x})\tgot=${got}\twant=${want}\t${note}`); }
console.log('hard-fails=' + f);
