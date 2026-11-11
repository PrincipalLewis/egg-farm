import {readFileSync,writeFileSync} from 'node:fs';
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const tpl=JSON.parse(readFileSync('../gate4-fixtures/pre-v7-F30-C30-732e70e.json','utf8'));
// sanity: template checksum convention
if(sum(JSON.stringify(tpl.state))!==tpl.sum) throw new Error('template sum mismatch');
const mk=(name,F,C)=>{const s={...tpl.state,farmLevel:F,collectionLevel:C,coinsCents:100000000000,hensLevel:0,eggValueLevel:0,celebratedMilestones:[]};
 for(const k of ['tracksV7','v6BackupId','seenTracksExplainer'])delete s[k];const j=JSON.stringify(s);
 writeFileSync(`fixtures/${name}.json`,`{"version":6,"savedAt":1792371600000,"saveSeq":1,"sum":"${sum(j)}","state":${j}}`);};
mk('pre-v7-F5-C15',5,15);mk('pre-v7-F0-C30',0,30);mk('pre-v7-F27-C0',27,0);
