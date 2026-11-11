import sys,re
f,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
s=open(f).read(); n=s.count(old)
if n!=1: sys.exit(f"anchor count {n} in {f}")
open(f,'w').write(s.replace(old,new))
