import { findGlobalWrites } from '/tmp/qa-pr27p/scripts/release-scan.mjs';
const big = 'f(' + Array(3000).fill('1').join(',') + ')';
const cases = {
 'N1 regex ternary': 'window[/]/.test(s)?"eggfarmA":"b"]=1', 'N1 block comment': 'window[k /* ] */]=1', 'L-3 line comment': 'window[k // ]\n]=1',
 'L-3 line comment, string key': 'window["eggfarmX" // ]\n]=1', 'L-3 block comment, string key': 'window["eggfarm"/* ] */+"Dbg"]=1',
 'L-3 unterminated line comment': 'window[k // ]', 'L-3 unterminated block comment': 'window[k /* ]=1',
 'N1 regex replace': 'window[k.replace(/[\\]]/g,"")]=1;', 'N1 globalThis regex': 'globalThis[/]/.source]=1', 'N1 alias regex': 'var a=self;a[/]/.test(x)?"eggfarmZ":"q"]=1',
 'N2 >4000 key': `window[${big}]=1`, 'N2 >4000 globalThis': `globalThis[${big}]=1`,
 'computed window["eggfarm"+"Dbg"]': 'window["eggfarm"+"Dbg"]=1', 'computed alias h=window;h["eggfarm"+"Dbg"]': 'var h=window;h["eggfarm"+"Dbg"]=1',
 'computed alias h=globalThis;h["eggfarm"+"Dbg"]': 'const h=globalThis;h["eggfarm"+"Dbg"]={}', 'computed alias minified (7d52952 gap) h=self;h["eggfarm"+"Dbg"]': 'let h=self;h["eggfarm"+"Dbg"]=x',
 'computed alias, no decl (h param)': '(function(h){h["eggfarm"+"Dbg"]=1})(window)', 'computed alias Object.assign(window,…)': 'Object.assign(window,{["eggfarm"+"Dbg"]:1})',
 'ctl division in key': 'x=window[a/2];', 'ctl regex read': 'y=window[/]/.source];', 'ctl allowed': 'window.eggfarmExportTelemetry=()=>1', 'ctl comment in non-global bracket': 'o[k // x\n]=1',
};
for (const [n, js] of Object.entries(cases)) { let h; try { h = findGlobalWrites(js).map(x => x.key); } catch (e) { h = ['THROW ' + e.message]; } console.log(`${h.length ? 'FLAG' : 'pass'}\t${n}\t${JSON.stringify(h)}`); }
