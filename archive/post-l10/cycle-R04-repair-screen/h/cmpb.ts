import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
const mk = (p: string) => buildBalance(parseEconomyCsv(readFileSync(p, 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as any;
const a = mk('../../../product/economy.csv'), c = mk('../t3-splice.csv');
const flat = (o: any, p = ''): [string, any][] => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? flat(v, p + k + '.') : [[p + k, JSON.stringify(v)]]);
const A = new Map(flat(a)), C = new Map(flat(c));
for (const [k, v] of A) if (C.get(k) !== v) console.log(k, String(v).slice(0, 150), '=>', String(C.get(k)).slice(0, 150));
