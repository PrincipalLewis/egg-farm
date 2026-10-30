// VER-1 argument parsing, flag overrides and output hygiene for `npm run verify`. Pure helpers (tests/verify.test.ts).
import { homedir, hostname, userInfo } from 'node:os';
import type { Balance } from '../../src/config/balance';
import { PROFILES, type Profile } from './sim';

export const USAGE = 'usage: npm run verify -- --hours N [--seed S] [--profile idle|m5x-casual] [--flags k=v,...] [--out dir]';
export interface Opts { hours: number; seed: number; profile: Profile; flags: Record<string, number>; out: string | null; skipBuild: boolean; noShot: boolean }
export class UsageError extends Error {}
/** S1 (CCR on #73): the --out value as written, read leniently so it is known even when parseArgs throws (last --out wins,
 *  like parseArgs). null when absent or when its value is missing / another option. */
export function outArg(argv: string[]): string | null {
  let out: string | null = null;
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--out') { const x = argv[i + 1]; if (x !== undefined && !x.startsWith('--')) { out = x; i++; } }
  return out;
}

export function parseArgs(argv: string[]): Opts {
  const a = argv.filter(x => x !== '--'), o: Opts = { hours: NaN, seed: 1, profile: 'idle', flags: {}, out: null, skipBuild: false, noShot: false };
  let seenFlags = false;
  for (let i = 0; i < a.length; i++) {
    const k = a[i], v = () => { const x = a[++i]; if (x === undefined || x.startsWith('--')) throw new UsageError(`${k} needs a value`); return x; };
    if (k === '--hours') o.hours = Number(v());
    else if (k === '--seed') o.seed = Number(v());
    else if (k === '--profile') o.profile = v() as Profile;
    else if (k === '--flags') { // CCR N-b on #73: a repeated --flags was silently last-wins; now a usage error
      if (seenFlags) throw new UsageError('--flags given more than once (put every override in one --flags k=v,...)');
      seenFlags = true; o.flags = parseFlags(v());
    }
    else if (k === '--out') o.out = v();
    else if (k === '--skip-build') o.skipBuild = true; // dev/test only: reuse dist-html/ (recorded in verify.json as build.skipped)
    else if (k === '--no-shot') o.noShot = true; // dev/test only: no browser step (recorded; the run then FAILS the label check)
    else throw new UsageError(`unknown argument ${k}`);
  }
  if (!(o.hours > 0 && o.hours <= 24 * 30)) throw new UsageError('--hours must be a number in (0, 720]');
  if (!Number.isSafeInteger(o.seed) || o.seed < 0) throw new UsageError('--seed must be a non-negative integer');
  if (!PROFILES.includes(o.profile)) throw new UsageError(`--profile must be one of ${PROFILES.join('|')}`);
  return o;
}
export function parseFlags(s: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const kv of s.split(',').map(x => x.trim()).filter(Boolean)) {
    const m = /^([A-Za-z0-9_.]+)=(-?\d+(?:\.\d+)?|true|false)$/.exec(kv); if (!m) throw new UsageError(`bad flag ${JSON.stringify(kv)} (want key=number)`);
    if (Object.prototype.hasOwnProperty.call(out, m[1])) throw new UsageError(`flag ${m[1]} given more than once in --flags`); // CCR N-b on #73: no silent last-wins
    out[m[1]] = m[2] === 'true' ? 1 : m[2] === 'false' ? 0 : Number(m[2]);
  }
  return out;
}
/** The balance.json feature flags verify knows about: m4.enabled and every numeric m4.flags.* entry (none on main today). */
export function flagsOf(b: Balance): Record<string, number> {
  const f: Record<string, number> = {}, m4 = (b as any).m4;
  if (m4 && typeof m4.enabled === 'number') f['m4.enabled'] = m4.enabled;
  if (m4?.flags && typeof m4.flags === 'object') for (const [k, v] of Object.entries(m4.flags)) if (typeof v === 'number') f[`m4.flags.${k}`] = v;
  return f;
}
/** A copy of `b` with the overrides applied. Unknown keys are a usage error (no silent typos). */
export function withFlags(b: Balance, over: Record<string, number>): Balance {
  const known = flagsOf(b); const c: any = structuredClone(b);
  for (const [k, v] of Object.entries(over)) {
    if (!(k in known)) throw new UsageError(`unknown flag ${k} (known: ${Object.keys(known).join(', ') || 'none'})`);
    if (k.startsWith('m4.flags.') && v !== 0 && v !== 1) throw new UsageError(`${k} must be 0 or 1 (got ${v})`); // CCR N-2 #82, as validateM5
    const p = k.split('.'); let o = c; for (const x of p.slice(0, -1)) o = o[x]; o[p[p.length - 1]] = v;
  }
  return c as Balance;
}
/** Public repo: rewrite the repo root to '.' and the home dir to '~' (whole path strings only), and a user or host name
 *  only where it sits in a path or URL: /home/<user>/, /Users/<user>/, C:\\Users\\<user>\\, //<host>, @<host>. Never bare words:
 *  CCR m2 on #71, a host named "working" turned "state":"working" into "<host>". `env` is for tests. */
export function sanitize(text: string, repoRoot: string, env: { home?: string; user?: string; host?: string } = {}): string {
  let user = env.user; if (user === undefined) { try { user = userInfo().username; } catch { user = ''; } }
  const home = env.home ?? homedir(), host = env.host ?? hostname();
  for (const [a, b] of [[repoRoot.replace(/[\\/]+$/, ''), '.'], [home.replace(/[\\/]+$/, ''), '~']] as const)
    if (a.length > 1 && /[\\/]/.test(a)) text = text.split(a).join(b);
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (user) text = text.replace(new RegExp(`(/home/|/Users/|[A-Za-z]:(?:\\\\)+Users(?:\\\\)+)${esc(user)}(?=[/\\\\"'\\s]|$)`, 'g'), '$1<user>');
  if (host) text = text.replace(new RegExp(`(//|@)${esc(host)}(?=[:/"'\\s]|$)`, 'g'), '$1<host>');
  return text;
}
/** Anything that looks like a token, an absolute home/workspace path or an e-mail address. Must be [] before writing. */
export function leaks(text: string): string[] {
  const re = [/gh[pousr]_[A-Za-z0-9]{20,}/g, /github_pat_[A-Za-z0-9_]{20,}/g, /GITHUB_TOKEN/g,
    /(?<![A-Za-z0-9._-])\/(?:home|Users|root|workspace|tmp|var|opt|private|mnt|srv|etc)\/[^\s"']*/g, // CCR n2: + /tmp /var /opt ...
    /(?<![A-Za-z0-9])[A-Za-z]:(?:\\{1,2}|\/)[^\s"']*/g, // Windows drive paths (C:\Users\..., D:/...), raw or JSON-escaped
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, /Bearer\s+[A-Za-z0-9._-]+/g];
  return re.flatMap(r => text.match(r) ?? []);
}
