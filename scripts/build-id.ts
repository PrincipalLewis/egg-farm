import { execSync } from 'node:child_process';
export const BUILD_PREFIX = 'm3-rc0';
/** `<prefix>+<short hash>`, plus `+dirty` when the working tree has uncommitted (incl. untracked, non-ignored) changes. */
export function formatBuildId(short: string | null, dirty: boolean, prefix = BUILD_PREFIX): string {
  const base = short && /^[0-9a-f]{7,}$/.test(short) ? `${prefix}+${short}` : `${prefix}+unknown`;
  return dirty ? `${base}+dirty` : base;
}
export function gitBuildId(cwd?: string): string {
  try {
    const short = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8', cwd }).trim() !== '';
    return formatBuildId(short, dirty);
  } catch { return formatBuildId(null, false); }
}
