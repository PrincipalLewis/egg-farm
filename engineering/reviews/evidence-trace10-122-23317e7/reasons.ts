// prints the INVALID reasons for every self-test (c) variant (reviewer script, not part of the PR)
import { synthSide, refooter } from '../tests/trace10/synth';
import { compareSides, type SideData } from '../tests/trace10/compare';
const pair = () => [synthSide({ side: 'before' }), synthSide({ side: 'after' })] as const;
const withStream = (d: SideData, id: any, t: string | undefined): SideData => ({ ...d, streams: { ...d.streams, [id]: t } });
const withManifest = (d: SideData, f: (m: any) => void): SideData => { const m = structuredClone(d.manifest) as any; f(m); return { ...d, manifest: m }; };
const dropFooter = (t: string) => t.slice(0, -1).split('\n').slice(0, -1).join('\n') + '\n';
const V: [string, (a: SideData) => SideData][] = [
  ['delete s4', a => withStream(a, 's4', undefined)],
  ['drop the footer of s2', a => withStream(a, 's2', dropFooter(a.streams.s2!))],
  ['truncate s1 mid-file', a => withStream(a, 's1', a.streams.s1!.slice(0, Math.floor(a.streams.s1!.length / 2)))],
  ['truncate s1 at a line boundary', a => withStream(a, 's1', a.streams.s1!.split('\n').slice(0, 40).join('\n') + '\n')],
  ['footer count off by one', a => { const ls = a.streams.s3!.slice(0, -1).split('\n'); const f = JSON.parse(ls.pop()!); f[2]++; return withStream(a, 's3', [...ls, JSON.stringify(f)].join('\n') + '\n'); }],
  ['footer body hash wrong', a => withStream(a, 's3', a.streams.s3!.replace(/"[0-9a-f]{64}"\]\n$/, `"${'0'.repeat(64)}"]\n`))],
  ['one seed missing from s3', a => withStream(a, 's3', refooter(a.streams.s3!, b => b.filter(l => JSON.parse(l)[1] !== 2)))],
  ['manifest missing cfg.ship_tc_streak_cap', a => withManifest(a, m => { delete m.cfg.ship_tc_streak_cap; })],
  ['empty stream', a => withStream(a, 's2', '')],
  ['runtime.node = v24', a => withManifest(a, m => { m.runtime.node = 'v24.1.0'; })],
  ['src_flags_on non-empty', a => withManifest(a, m => { m.cfg.src_flags_on = ['golden']; })],
  ['card sha1 not of record', a => withManifest(a, m => { m.inputs.card_sha1 = '7891bfbc' + '0'.repeat(32); })],
  ['contract hash wrong', a => withManifest(a, m => { m.inputs.contract_sha256 = '0'.repeat(64); })],
  ['harness hashes differ', a => withManifest(a, m => { m.harness.files['tests/bot-m5.ts'] = 'f'.repeat(64); })],
  ['side label wrong', a => withManifest(a, m => { m.side = 'before'; })],
  ['seed missing from per_seed', a => withManifest(a, m => { m.per_seed = m.per_seed.filter((x: any) => x.seed !== 3); })],
  ['extra manifest key', a => withManifest(a, m => { m.exclusions = ['s4']; })],
];
for (const [n, f] of V) { const [b, a] = pair(); const v = compareSides(b, f(a)); console.log(`${n} | ${v.verdict} exit ${v.exit} | ${v.invalid.join(' ; ')}`); }
// tie-break probe: same-tick divergence in s2 and s3 -> which stream is reported?
{ const [b, a0] = pair(); const mut = (t: string, tick: number) => refooter(t, body => body.map(l => { const r = JSON.parse(l); if (r[1] === 1 && r[2] === tick) { r[r.length - 1] = 'MUT'; } return JSON.stringify(r) + '\n'; }));
  const a = { ...a0, streams: { ...a0.streams, s3: mut(a0.streams.s3!, 12), s2: mut(a0.streams.s2!, 12) } };
  const v = compareSides(b, a); console.log('TIE tick12 s2+s3 ->', JSON.stringify({ stream: v.first_divergences[0]?.stream, tick: v.first_divergences[0]?.tick }));
  const a2 = { ...a0, streams: { ...a0.streams, s4: mut(a0.streams.s4!, 5), s2: mut(a0.streams.s2!, 30) } };
  const v2 = compareSides(b, a2); console.log('EARLIEST s2@30 vs s4@5 ->', JSON.stringify({ stream: v2.first_divergences[0]?.stream, tick: v2.first_divergences[0]?.tick })); }
