// node flagsoff-compare.mjs <candidate.jsonl> <baseline-458f74c.jsonl>  -> row verdicts; exit 1 on any FAIL
import fs from 'node:fs';
const rd = p => fs.readFileSync(p, 'utf8').trim().split('\n').map(JSON.parse);
const [c, base] = process.argv.slice(2).map(rd); let fail = 0; const out = [];
const bs = Object.fromEntries(base.filter(r => r.kind === 'save').map(r => [r.fixture, r]));
const saves = c.filter(r => r.kind === 'save');
const exp1 = saves.find(r => r.committed);
const sameState = r => bs[r.fixture] && !r.error && r.fixed.stateSha256 === bs[r.fixture].fixed.stateSha256 && r.fixed.fileSha256 === bs[r.fixture].fixed.fileSha256 && r.game.stateSha256 === bs[r.fixture].game.stateSha256;
for (const r of c.filter(r => r.kind === 'flag')) {
  const s1 = r.off, s2 = r.validateBalance === 'ok', s3 = !!exp1 && sameState(exp1) && exp1.game.stateEqInput;
  const ok = s1 && s2 && s3; if (!ok) fail++;
  out.push(`FO ${r.flag.padEnd(12)} | shipped ${String(r.shipped).padEnd(6)} off ${s1 ? 'PASS' : 'FAIL'} | validateBalance ${s2 ? 'PASS' : 'FAIL ' + r.validateBalance} | state vs 458f74c (exp1 tracksV7: Game ${exp1 && bs[exp1.fixture] && exp1.game.stateSha256 === bs[exp1.fixture].game.stateSha256 ? '=' : '≠'}, fixed ${exp1 && bs[exp1.fixture] && exp1.fixed.stateSha256 === bs[exp1.fixture].fixed.stateSha256 ? '=' : '≠'}, =input ${exp1?.game.stateEqInput}) ${s3 ? 'PASS' : 'FAIL'} | ${ok ? 'PASS' : 'FAIL'}`);
}
for (const r of saves) out.push(`info ${r.fixture.padEnd(46)} committed=${r.committed} fixed-file ${bs[r.fixture]?.fixed.fileSha256 === r.fixed?.fileSha256 ? '=' : '≠'} fixed-state ${bs[r.fixture]?.fixed.stateSha256 === r.fixed?.stateSha256 ? '=' : '≠'} game-state ${bs[r.fixture]?.game.stateSha256 === r.game?.stateSha256 ? '=' : '≠'} (vs 458f74c)`);
console.log(out.join('\n')); console.log(`VERDICT ${fail ? 'FAIL' : 'PASS'} (${fail} failing rows)`); process.exit(fail ? 1 : 0);
