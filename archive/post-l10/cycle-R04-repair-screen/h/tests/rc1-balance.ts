// rc1 economy (origin/main data/economy.csv @ 4aadcbf, frozen copy). This branch's data/economy.csv is Economy's
// f1-m4cols merge (HoP 15:29, branch only), so tests that gate the rc1 economy / main parity use this balance.
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance } from '../scripts/sync-economy';
import { balance, validateBalance, type Balance } from '../src/config/balance';
export const RC1_CSV = new URL('./fixtures/economy.rc1.csv', import.meta.url);
export const rc1Balance: Balance = validateBalance(buildBalance(parseEconomyCsv(readFileSync(RC1_CSV, 'utf8')), balance) as Balance);
