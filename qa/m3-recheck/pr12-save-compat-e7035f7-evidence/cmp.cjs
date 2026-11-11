const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.argv[2])),b=JSON.parse(fs.readFileSync(process.argv[3]));
for(const k of Object.keys(a)){const bn=s=>s.split('/').pop();const y=Object.entries(b).find(([kk])=>bn(kk)===bn(k))[1],x=a[k],n=k.split('/').pop();
 if(x.err||y.err){console.log(n,'ERR',x.err,'|',y.err);continue;}
 const eq=['w1','w2','bak'].map(f=>x[f]===y[f]?'=':'DIFF');
 const m4=['saveSeq','hensLevel','eggValueLevel','celebratedMilestones'].filter(f=>[y.w1,y.w2,y.bak].some(s=>s&&s.includes('"'+f+'"')));
 console.log(n.padEnd(40),'w1',eq[0],'w2',eq[1],'bak',eq[2],'inputIdentical',x.identicalInput,'/',y.identicalInput,'m4keys',m4.join(',')||'-');}
