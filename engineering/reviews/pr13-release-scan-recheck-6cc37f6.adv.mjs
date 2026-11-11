import {findGlobalWrites as g} from '/tmp/r13b/scripts/release-scan.mjs';
const T={
 'regex ]':'window[/]/.test(s)?"eggfarmA":"b"]=1',
 'regex [ before':'window[/[/.source+"x"]=1',
 'comment ]':'window[k /* ] */]=1',
 'line comment ]':'window[k // ]\n]=1',
 'string ]':'window["eggfarm]"]=1',
 'template ${]}':'window[`eggfarm${a["]"]}`]=1',
 'unbalanced regex before real write':'x=/[/;window.eggfarmZ=1',
 'unclosed str early':'var s="\\\\";window["eggfarmQ"]=1',
 'far close >4000':'window[f('+'1,'.repeat(2500)+'1)]=1',
 'decoy unbalanced then real':'window[/[/]; window["eggfarmR"]=1',
};
for (const [n,s] of Object.entries(T)){const t=Date.now();const r=g(s);console.log((r.length?'CAUGHT':'MISSED').padEnd(7),n,JSON.stringify(r.map(x=>x.key)),Date.now()-t+'ms');}
// perf
const big='window['.repeat(20000)+'"x"'+']'.repeat(20000)+'=1';let t=Date.now();g(big);console.log('nested 20k',Date.now()-t,'ms');
const big2=('window[a]+'.repeat(200000));t=Date.now();g(big2);console.log('200k opens',Date.now()-t,'ms');
const big3=('window["'.repeat(50000));t=Date.now();g(big3);console.log('unterminated strings',Date.now()-t,'ms');
