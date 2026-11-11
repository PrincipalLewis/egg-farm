// SD6-3 fix: pure check for a migrated save, taken BEFORE any sim tick (no wage charged yet).
// expected = fixture state, version 6, wageFracCents = fixture's own frac or {} (save.ts v5->v6 adds {}).
export const pick = s => ({ coins: s.coinsCents, farm: s.farmLevel, coll: s.collectionLevel, workers: JSON.stringify(Object.fromEntries(Object.entries(s.workers ?? {}).map(([k, w]) => [k, { e: Math.round(w.energy), u: !!w.unpaid }]))) });
export function checkMigrated(fx, snap) {
  // fx: fixture file {version,state}; snap: {version, state, wageEvents} read with the sim frozen
  const a = pick(fx.state), b = pick(snap.state), wk = fx.version < 5 ? '{}' : a.workers;
  const expFrac = JSON.stringify(fx.state.wageFracCents ?? {}), gotFrac = JSON.stringify(snap.state.wageFracCents ?? null);
  const why = [];
  if (snap.version !== 6) why.push(`version ${snap.version}`);
  if ((snap.wageEvents ?? 0) !== 0) why.push(`snapshot not pre-tick: ${snap.wageEvents} wage cents already charged`);
  if (a.coins !== b.coins) why.push(`coins ${a.coins}->${b.coins}`);
  if (gotFrac !== expFrac) why.push(`wageFracCents ${gotFrac} != ${expFrac}`);
  if (a.farm !== b.farm || a.coll !== b.coll) why.push('levels changed');
  if (b.workers !== wk) why.push('workers changed');
  return { pass: why.length === 0, why, from: a, to: b, frac: gotFrac };
}
