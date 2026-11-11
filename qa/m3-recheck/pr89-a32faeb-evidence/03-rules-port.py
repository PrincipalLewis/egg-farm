import re,os,sys
R=[('shell-kill',r'(^|[^A-Za-z0-9_.$-])(/(usr/)?bin/)?s?kill(\s|[\'"`]|$)'),('kill-assigned',r'=\s*[\'"`]?s?kill\b'),
('loginctl-kill',r'\bkill-session\b|\bkill-user\b|\bloginctl\s+kill'),('kill-tools',r'\b(pidof|pgrep|pkill|killall|fuser|snice|start-stop-daemon)\b'),
('timeout-cmd',r'(^|[\s;|&(`\'"])timeout\s+(-[-a-zA-Z]|\d)'),('ps',r'(^|[\s;|&(`\'"])ps\s+(-[a-zA-Z]+|[auxwo]{2,})\b'),
('proc-enum',r'/proc/(\[|\*|\$)|\bls\s+/proc\b|/cmdline\b'),('proc-readdir',r'\b(readdir|readdirSync|opendir|opendirSync|listdir|scandir|walk|glob|globSync)\s*\(\s*[\'"`]/proc'),
('js-kill-call',r'\.\s*kill\s*\('),('js-kill-index',r'\[\s*[\'"`]kill[\'"`]\s*\]'),('js-kill-destructure',r'\{[^}]*\bkill\b[^}]*\}\s*=\s*process\b'),
('exec-kill',r'\b(exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(\s*[\'"`]\s*(/(usr/)?bin/)?s?kill\b'),
('py-signal',r'\bkillpg\b|\bpthread_kill\b|\.terminate\s*\(|\bsend_signal\s*\(|\bos\.kill\b'),('detach',r'\bnohup\b|\bsetsid\b|\bdisown\b|\bdetached\s*:\s*true\b')]
R=[(i,re.compile(p,re.M)) for i,p in R]
def hits(l):
  n=l.replace('""','').replace("''",'')
  return [i for i,r in R if r.search(l) or r.search(n)]
for d in sys.argv[1:]:
  miss=0;tot=0
  for f in sorted(os.listdir(d)):
    if not f.endswith('.fixture'):continue
    t=open(os.path.join(d,f)).read().strip();h=hits(t);tot+=1;miss+=not h
    print(f"{d.split('/')[-1]}/{f}\t{','.join(h) or 'MISSED'}\t{t[:110]}")
  print(f"## {d}: caught {tot-miss}/{tot}")
