// Feature detection for a clone: node features.mjs <clone>  -> JSON flags. A missing feature makes its checks N/A, not FAIL.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const R = process.argv[2]; const g = re => { try { execSync(`grep -rqE ${JSON.stringify(re)} src data`, { cwd: R, stdio: 'ignore' }); return true; } catch { return false; } };
const pkg = JSON.parse(fs.readFileSync(R + '/package.json', 'utf8'));
const csvHead = fs.readFileSync(R + '/data/economy.csv', 'utf8').split(/\r?\n/)[0];
console.log(JSON.stringify({
  wageFrac: g('wageFracCents'),                         // save v6 + carried fractional wage cents (save/money)
  exactWage: g('wageFracCents') && g('listedWageCentsPerSec|wagePerSecCents'),
  wageLabel: fs.existsSync(R + '/src/ui/s2-economy-ui.ts') && g('fmtExactRate'),
  ratesTs: fs.existsSync(R + '/src/ui/rates.ts'),
  mhMinWait: g('market_hand_min_wait_s|marketHandMinWait'),
  f1Economy: /market_hand_min_wait_s/.test(csvHead) || fs.existsSync(R + '/data/economy.f1.csv'),
  saveDurability: g('indexedDB') && g('save_restore'),
  servedDwell: g('served_dwell_ms|servedDwellMs'),
  perEggCopy: g('per egg'),
  partialPop: g('partial'),
  checkEconomyCopy: !!pkg.scripts?.['check-economy-copy'],
  saveVersion: (() => { try { const m = fs.readFileSync(R + '/src/save/save.ts', 'utf8').match(/SAVE_VERSION\s*=\s*(\d+)/); return m ? +m[1] : null; } catch { return null; } })(),
}));
