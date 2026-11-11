import net from 'node:net';
const { serveOwn } = await import('/tmp/qa-pr27/scripts/serve-own.mjs');
const hold = p => new Promise(r => { const s = net.createServer(); s.listen(p, '127.0.0.1', () => r(s)); s.on('error', () => r(null)); });
// occupy the old fixed defaults (5100+engine length: 5106 webkit, 5107 firefox, 5108 chromium)
const held = (await Promise.all([5106, 5107, 5108].map(hold))).filter(Boolean); console.log('holding', held.map(s => s.address().port));
const ports = [];
for (let i = 0; i < 3; i++) { const s = await serveOwn('dist'); ports.push(s.port); const ok = (await (await fetch(s.url)).text()).includes('/assets/'); console.log(`default call ${i}: port ${s.port} ownBuild=${ok}`); s.stop(); }
console.log('none is 4173:', !ports.includes(4173), 'none is an old default:', !ports.some(p => [5106, 5107, 5108].includes(p)));
// explicit PORT that is taken must fail closed, not move silently
try { const s = await serveOwn('dist', 5108); console.log('explicit taken port: UNEXPECTED success', s.port); s.stop(); } catch (e) { console.log('explicit taken port 5108: throws ->', e.message.slice(0, 120)); }
held.forEach(s => s.close()); process.exit(0);
