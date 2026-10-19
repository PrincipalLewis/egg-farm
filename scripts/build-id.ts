import { execSync } from 'node:child_process';
/** M41-10: the ONE release-prefix constant. The build id is `<BUILD_PREFIX>+<short hash>[+dirty]`; vite.config.ts injects it
 *  (__BUILD__, __BUILD_PREFIX__), check-release-build asserts it, and CI/release-asset read it from this line. Bump per release. */
export const BUILD_PREFIX = 'm4.1';
/** `<prefix>+<short hash>`, plus `+dirty` when the working tree has uncommitted (incl. untracked, non-ignored) changes. */
export function formatBuildId(short: string | null, dirty: boolean, prefix = BUILD_PREFIX): string {
  const base = short && /^[0-9a-f]{7,}$/.test(short) ? `${prefix}+${short}` : `${prefix}+unknown`;
  return dirty ? `${base}+dirty` : base;
}
/** PT1-9: Vite's own temp config bundle (vite.config.ts.timestamp-*.mjs) never counts as a change. */
export const IGNORED_DIRTY = /(^|\/)vite\.config\.[cm]?[jt]s\.timestamp-[^/]*$/;
export const isDirty = (porcelain: string) => porcelain.split('\n').map(l => l.slice(3).trim().replace(/^"|"$/g, '')).filter(f => f && !IGNORED_DIRTY.test(f)).length > 0;
export function gitBuildId(cwd?: string): string {
  try {
    const short = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd }).trim();
    const dirty = isDirty(execSync('git status --porcelain', { encoding: 'utf8', cwd }));
    return formatBuildId(short, dirty);
  } catch { return formatBuildId(null, false); }
}
