// bot-m5 B: first divergence between two m5px jsonl files (REF PORT): prints JSON (null = byte-identical). Exit 0 identical, 1 different, 2 usage.
import { readFileSync, existsSync } from 'node:fs';
import { firstDivergence } from '../tests/bot-m5';
const [ref, port] = process.argv.slice(2);
if (!ref || !port || !existsSync(ref) || !existsSync(port)) { console.error('usage: bot-m5-diverge.ts REF.jsonl PORT.jsonl'); process.exit(2); }
const d = firstDivergence(readFileSync(ref, 'utf8'), readFileSync(port, 'utf8'));
console.log(JSON.stringify(d)); process.exit(d ? 1 : 0);
