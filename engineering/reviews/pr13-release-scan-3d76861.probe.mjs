import {findGlobalWrites as g, findExternalRefs as e} from '/tmp/r13/scripts/release-scan.mjs';
const G={
 'window[k]=':'var k="eggfarmDbg";window[k]=1',
 'globalThis[`x`]':'globalThis[`eggfarmX`]=1',
 'assign var':'Object.assign(window,{eggfarmDbg:1})',
 'Reflect.set':'Reflect.set(window,"eggfarmDbg",1)',
 'defProp alias':'const h=window;Object.defineProperty(h,"eggfarmDbg",{value:1})',
 'top':'top.eggfarmDbg=1','parent':'parent.eggfarmDbg=1','frames':'frames.eggfarmDbg=1',
 'alias nonEgg':'var h=window;h.dbg=1',
 'alias computed var':'var h=window;var k="eggfarm"+"Dbg";h[k]=1',
 'alias chain':'var a=globalThis,b=1;a.eggfarmX=1',
 'alias comma':'let b=1,a=window;a["x"]=1',
 'self in fn':'(function(w){w.eggfarmDbg=1})(window)',
 '(0,window).x':'(0,window).eggfarmDbg=1',
 'window?.':'window . eggfarmDbg=1',
 'var global':'var eggfarmDbg=1',
 'nested bracket':'window[a[0]]=1',
 'compound':'window.eggfarmDbg||={}',
 'alias via ||':'var h=typeof window<"u"?window:globalThis;h.eggfarmX=1',
 'Function':'Function("return this")().eggfarmX=1',
};
for (const [n,s] of Object.entries(G)) console.log((g(s).length?'CAUGHT':'MISSED').padEnd(7),n);
const E={
 srcset:'<img srcset="https://cdn.x/a.png 1x">', cssurl:'a{background:url(https://cdn.x/a.png)}',
 'import css':'@import "https://fonts.googleapis.com/css";', link:'<link rel="preload" href="https://cdn.x/f.woff2">',
 'link unquoted':'<link href=//cdn.x/f>', 'fetch concat':'fetch("https://"+h)','fetch var':'const u="https://evil.x/t";fetch(u)',
 'XHR':'x.open("GET","https://evil.x")','img.src':'i.src="https://evil.x/p.gif"','location':'location.href="https://x"',
 'srcmap':'//# sourceMappingURL=data:application/json;base64,AAA','srcmap ext':'//# sourceMappingURL=https://x/a.map',
 'meta refresh':'<meta http-equiv="refresh" content="0;url=https://x">','window.open':'window.open("https://x")',
 'iframe':'<iframe src="https://x">','object data':'<object data="https://x">','ws':'new WebSocket("wss://x")',
 'fetch obj':'fetch(new URL("https://x"))','fetch template':'fetch(`https://${h}/t`)',
};
for (const [n,s] of Object.entries(E)) console.log((e(s).length?'CAUGHT':'MISSED').padEnd(7),n);
