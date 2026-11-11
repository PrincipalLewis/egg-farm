import { readFileSync, readdirSync } from 'node:fs';
const rows={};for(const f of readdirSync('.').filter(f=>/^results-.*\.jsonl$/.test(f))){const sha=f==='results-chromium.jsonl'?'dd52bfd':f.split('-')[1];
 for(const l of readFileSync(f,'utf8').trim().split('\n')){const r=JSON.parse(l);const k=`${r.case}|${sha}|${r.engine}|${r.size||''}`;(rows[k]??=[]).push(r.error?'ERR':`${r.levels}/${r.coinDelta}`);}}
console.log('| case | build | engine | size | tries: levels/coin delta |\n|---|---|---|---|---|');
for(const k of Object.keys(rows).sort())console.log('| '+k.split('|').join(' | ')+' | '+rows[k].join(', ')+' |');
