// node manifest.mjs <outdir>   env: SHA, PUSHED(1/0), PR, BRANCH, REV
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
const OUT=process.argv[2],SHA=process.env.SHA;const shots=[];
for(const e of ['chromium','firefox','webkit']){const f=`${OUT}/entries-${e}.jsonl`;if(existsSync(f))for(const l of readFileSync(f,'utf8').split('\n').filter(Boolean))shots.push(JSON.parse(l));}
const missing=shots.filter(s=>!existsSync(`${OUT}/${s.file}`)).map(s=>s.file);
const pngs=['chromium','firefox','webkit'].flatMap(e=>existsSync(`${OUT}/${e}`)?readdirSync(`${OUT}/${e}`).filter(f=>f.endsWith('.png')).map(f=>`${e}/${f}`):[]);
const orphans=pngs.filter(f=>!shots.some(s=>s.file===f));
const labelOk=shots.filter(s=>s.state.includes('build label')).length>0;
const m={pr:+(process.env.PR||41),branch:process.env.BRANCH||null,sha:SHA,pushed:process.env.PUSHED==='1',build_label_checked:labelOk&&process.env.LABEL_EYEBALLED==='1',rev:+(process.env.REV||1),
 author:'QA Engineer, UI/Layout & Gameplay Verification',created:new Date().toISOString(),
 notes:'build label = Settings ".version" (asserted == m3-rc1-pre+<sha7> in every Settings shot) and runtime meta[name=build-id] asserted before every state; dd52bfd has no HUD label. asserted_tab/asserted_panel per shot.',shots};
writeFileSync(`${OUT}/manifest.json`,JSON.stringify(m,null,1));
console.log(`shots=${shots.length} missing=${missing.length} orphans=${orphans.length} label_checked=${m.build_label_checked}`);if(missing.length||orphans.length){console.log({missing,orphans});process.exit(1);}
