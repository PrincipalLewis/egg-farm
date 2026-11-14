// UI QA #89 F3: rule-21 source check. Every form in UI QA's harness negative-fixture list (36 forms, plus the JS forms
// the #89 report names) is a rule here. Shared by tests/rule21-source.test.ts; the rules are data, nothing runs them.
export type Rule = { id: string; re: RegExp };
export const RULES: Rule[] = [
  // shell kill words: kill -9, kill -TERM -$g, kill -- -$g, /bin/kill, command/env/builtin kill, xargs kill, 'kill 0', kill %1, skill
  { id: 'shell-kill', re: /(^|[^A-Za-z0-9_.$-])(\/(usr\/)?bin\/)?s?kill(\s|['"`]|$)/ },
  { id: 'kill-assigned', re: /=\s*['"`]?s?kill\b/ },                                   // K=kill (after "" removal: K=ki""ll)
  { id: 'loginctl-kill', re: /\bkill-session\b|\bkill-user\b|\bloginctl\s+kill/ },
  { id: 'kill-tools', re: /\b(pidof|pgrep|pkill|killall|fuser|snice|start-stop-daemon)\b/ },
  { id: 'timeout-cmd', re: /(^|[\s;|&(`'"])timeout\s+(-[-a-zA-Z]|\d)/ },                  // timeout 10m, --signal, -k
  { id: 'ps', re: /(^|[\s;|&(`'"])ps\s+(-[a-zA-Z]+|[auxwo]{2,})\b/ },              // ps aux, ps axo, ps -ef
  { id: 'proc-enum', re: /\/proc\/(\[|\*|\$)|\bls\s+\/proc\b|\/cmdline\b/ },
  { id: 'proc-readdir', re: /\b(readdir|readdirSync|opendir|opendirSync|listdir|scandir|walk|glob|globSync)\s*\(\s*['"`]\/proc/ },
  { id: 'js-kill-call', re: /\.\s*kill\s*\(/ },                                         // process.kill(, process.kill (, child.kill(
  { id: 'js-kill-index', re: /\[\s*['"`]kill['"`]\s*\]/ },                               // process['kill']
  { id: 'js-kill-destructure', re: /\{[^}]*\bkill\b[^}]*\}\s*=\s*process\b/ },          // const { kill } = process
  { id: 'exec-kill', re: /\b(exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(\s*['"`]\s*(\/(usr\/)?bin\/)?s?kill\b/ },
  { id: 'py-signal', re: /\bkillpg\b|\bpthread_kill\b|\.terminate\s*\(|\bsend_signal\s*\(|\bos\.kill\b/ },
  { id: 'detach', re: /\bnohup\b|\bsetsid\b|\bdisown\b|\bdetached\s*:\s*true\b/ },
];
/** Rules that hit `line` (also checked with empty-string concatenations removed, so ki""ll reads as kill). */
export const hits = (line: string) => { const n = line.replace(/""|''/g, ''); return RULES.filter(r => r.re.test(line) || r.re.test(n)).map(r => r.id); };
/** The ONLY allowed hits: lines of scripts/recorded-pid.mjs that carry this marker. */
export const GUARD_MARK = '// rule-21 guarded site';
