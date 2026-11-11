// Offline-return helper (Saves QA S-OFF method; shared with UI QA for TP1-C2, HoQA ruling Q2). Standalone: node built-ins only, works with any Playwright page.
// savedAt is moved back relative to the PAGE's clock at seed time (so it also works under page.clock). The checksum `sum` covers `state` only, so it stays valid.
import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto'; import path from 'node:path';
const FX = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../fixtures');
export const TP1_C2_BASE = path.join(FX, 'offline/tp1-c2-base.p1-B-mh-hired.save.json');
export const TP1_C2_BASE_SHA256 = '617f3534991811cf8f93da41f808ab6085a8e95be1fbaadad0daec7cd70f9123';
/** Read a pinned fixture; throws if its sha256 differs from the pin. */
export function loadPinned(file = TP1_C2_BASE, sha256 = TP1_C2_BASE_SHA256) { const b = readFileSync(file); const h = createHash('sha256').update(b).digest('hex'); if (h !== sha256) throw new Error(`fixture pin mismatch ${file}: ${h} != ${sha256}`); return b.toString('utf8'); }
/** Return the raw save with savedAt = nowMs - agoS*1000 (state and sum untouched). */
export function movedBack(raw, agoS = 7200, nowMs = Date.now()) { const j = JSON.parse(raw); if (j.version !== 6) throw new Error(`save version ${j.version}, expected 6`); j.savedAt = nowMs - agoS * 1000; return JSON.stringify(j); }
/** One-shot (per tab) seed of LS before any game script runs; savedAt is computed from the page's Date.now(). extra: other LS keys (null = remove). */
export function seedOffline(page, raw, { agoS = 7200, extra = {} } = {}) {
  return page.addInitScript(({ raw, agoS, extra }) => { if (sessionStorage.getItem('__offlineSeeded')) return; const j = JSON.parse(raw); j.savedAt = Date.now() - agoS * 1000;
    localStorage.setItem('eggfarm.save', JSON.stringify(j)); for (const [k, v] of Object.entries(extra)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } sessionStorage.setItem('__offlineSeeded', '1'); }, { raw, agoS, extra });
}
/** The save the game last wrote in this page (string or null). */
export const captureSave = page => page.evaluate(() => localStorage.getItem('eggfarm.save'));
