// trace10 OUT-dir writer: OUT/<side>/<prof>/{manifest.json, s1..s4} and OUT/<side>/MANIFEST.sha256 (sha256sum format, §8).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { STREAMS, STREAM_FILE } from './record';
import { sha256 } from './encode';
import { walk, type SideData } from './compare';

export function writeProfile(sideDir: string, prof: string, d: SideData, extra: Record<string, string> = {}) {
  const dir = join(sideDir, prof); mkdirSync(dir, { recursive: true });
  for (const id of STREAMS) if (d.streams[id] !== undefined) writeFileSync(join(dir, STREAM_FILE[id]), d.streams[id]!);
  for (const [f, t] of Object.entries(extra)) writeFileSync(join(dir, f), t);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(d.manifest, null, 1) + '\n');
}
/** (Re)write OUT/<side>/MANIFEST.sha256 over every other file under the side dir; checkable with `sha256sum -c`. */
export function writeManifestSha(sideDir: string) {
  const rows = walk(sideDir).map(f => relative(sideDir, f)).filter(r => r !== 'MANIFEST.sha256').map(r => `${sha256(readFileSync(join(sideDir, r)))}  ${r}`);
  writeFileSync(join(sideDir, 'MANIFEST.sha256'), rows.join('\n') + '\n');
}
