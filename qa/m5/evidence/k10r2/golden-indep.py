import math
M=0xFFFFFFFF
def imul(a,b): return ((a&M)*(b&M))&M
def mb(seed):
    a=(seed*2654435761+99)&M
    def r():
        nonlocal a
        a=(a+0x6D2B79F5)&M
        t=imul(a^(a>>15),1|a)
        t=((t+imul(t^(t>>7),61|t))&M)^t
        return ((t^(t>>14))&M)/4294967296
    return r
med=lambda x: sorted(x)[math.ceil(len(x)/2)-1]
a=[0,1,2,3,4]; b=[1,2,4,4,10]; r=mb(1); boot=[]
for _ in range(4000):
    ix=[math.floor(r()*5) for _ in a]; boot.append(med([b[i] for i in ix])-med([a[i] for i in ix]))
s=0.0
for x in boot: s+=x
m=s/4000
v=0.0
for x in boot: v+=(x-m)**2
print(repr(math.sqrt(v/4000)))
