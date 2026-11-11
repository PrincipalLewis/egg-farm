// Token-level compare (comments + whitespace dropped) of files at two revs, via the TS scanner.
const ts = require(process.cwd() + '/node_modules/typescript');
const { execSync } = require('child_process');
const [a, b, ...files] = process.argv.slice(2);
const toks = src => { const s = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, src); const out = [];
  for (let k = s.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = s.scan()) out.push(s.getTokenText()); return out; };
let bad = 0;
for (const f of files) {
  const A = toks(execSync(`git show ${a}:${f}`).toString()), B = toks(execSync(`git show ${b}:${f}`).toString());
  const same = A.length === B.length && A.every((t, i) => t === B[i]);
  console.log(`${same ? 'CODE-IDENTICAL' : 'CODE-DIFFERS'} ${f} tokens ${a}=${A.length} ${b}=${B.length}`);
  if (!same) bad++;
}
process.exit(bad ? 1 : 0);
