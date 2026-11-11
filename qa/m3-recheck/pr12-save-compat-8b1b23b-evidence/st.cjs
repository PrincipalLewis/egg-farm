const fs=require('fs');const r=JSON.parse(fs.readFileSync('rt-8b1b23b.json'));
for(const [k,v] of Object.entries(r)){if(v.err)continue;const inp=fs.readFileSync(k,'utf8').trim();const si=inp.slice(inp.indexOf('"state":')),so=v.w1.slice(v.w1.indexOf('"state":'));
const I=JSON.parse(inp).state,O=JSON.parse(v.w1).state;const lost=Object.keys(I).filter(x=>!(x in O)),chg=Object.keys(I).filter(x=>x in O&&JSON.stringify(I[x])!==JSON.stringify(O[x]));
const hdr=v.w1.slice(0,v.w1.indexOf(',"sum"'));
console.log(k.split('/').pop().padEnd(32),'stateBytesIdentical',si===so,'lost',lost.join(',')||'-','changed',chg.join(',')||'-','| hdr',hdr);}
