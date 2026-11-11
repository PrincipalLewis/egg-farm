import { findGlobalWrites } from '/tmp/qa-x/pr13c/scripts/release-scan.mjs';
const big = 'f(' + Array(3000).fill('1').join(',') + ')';
const cases = {
 'N1 regex ternary': 'window[/]/.test(s)?"eggfarmA":"b"]=1',
 'N1 block comment': 'window[k /* ] */]=1',
 'N1 line comment': 'window[k // ]\n]=1',
 'N1 regex replace (fixture)': 'window[k.replace(/[\\]]/g,"")]=1;',
 'N1 globalThis regex': 'globalThis[/]/.source]=1',
 'N1 alias regex eggfarm': 'var a=self;a[/]/.test(x)?"eggfarmZ":"q"]=1',
 'N2 >4000 key': `window[${big}]=1`,
 'N2 >4000 key globalThis': `globalThis[${big}]=1`,
 'ctl division in key (benign read)': 'x=window[a/2];',
 'ctl regex no write': 'y=window[/]/.source];',
 'ctl allowed': 'window.eggfarmExportTelemetry=()=>1',
};
for (const [n, js] of Object.entries(cases)) { const h = findGlobalWrites(js).map(x => x.key); console.log(`${h.length ? 'FLAG' : 'pass'} ${n} :: ${JSON.stringify(h)}`); }
