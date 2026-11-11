import { migrate } from '/tmp/efs/rc1/src/save/save.ts'; import { balance as b } from '/tmp/efs/rc1/src/config/balance.ts'; import fs from 'node:fs';
const D = '/workspace/egg-farm-studio/qa/m3-fixtures/saves/';
for (const f of fs.readdirSync(D)) { let r; try { const m = migrate(JSON.parse(fs.readFileSync(D + f, 'utf8')), b); r = `OK v${m.version} F${m.state.farmLevel} workers=${Object.keys(m.state.workers).length}`; } catch (e: any) { r = 'THROWS ' + e.message.slice(0, 50); } console.log(f, r); }
