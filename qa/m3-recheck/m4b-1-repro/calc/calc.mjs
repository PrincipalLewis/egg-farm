// ../../../../../../tmp/qa-live-246de09/src/config/balance.json
var balance_default = {
  _source: "economy params GENERATED from data/economy.csv (copied from product/economy.csv) by scripts/sync-economy.ts (verified on every row); edit the CSV, not these blocks",
  tickHz: 10,
  save: {
    autosaveIntervalS: 5,
    lsHeadroomFactor: 2,
    lsHeadroomMarginBytes: 65536,
    migrationAttemptsCap: 3
  },
  feel: {
    tap_combine_window_ms: 250,
    max_flying_eggs: 5,
    queue_full_cue_min_gap_ms: 3e3,
    egg_flight_ms: 500,
    served_dwell_ms: 1500
  },
  telemetry: {
    ring_size: 5e3,
    flush_interval_s: 5,
    tap_batch_ms: 1e3,
    worker_summary_s: 60
  },
  workers: {
    _note: "M2 Workers v1.1 (product/workers/m2-proposal.md \xA710) GENERATED from data/economy.csv (copied from product/economy.csv); wages in $ per Farm level per minute.",
    energy: {
      start_pct: 100,
      drain_s_per_pct: 9,
      tired_below_pct: 30,
      yawn_at_pct: 50,
      manage_cooldown_s: 30,
      manage_all_min_workers: 3,
      unpaid_resume_wage_min: 1,
      manage_prompt_threshold: 0.5
    },
    market_hand: {
      unlock_farm: 3,
      hire_cost: 40,
      wage_per_farm_per_min: 0.25,
      every_s: 1,
      tired_every_s: 3
    },
    coop_hand: {
      unlock_farm: 7,
      hire_cost: 150,
      wage_per_farm_per_min: 0.5,
      every_s: 2,
      tired_every_s: 4
    },
    hawker: {
      unlock_farm: 8,
      hire_cost: 800,
      demand_mult: 1.25,
      tired_demand_mult: 1.1
    },
    grader: {
      tiers: [
        {
          farm: 18,
          mult: 1.5,
          cost: 5538
        },
        {
          farm: 19,
          mult: 2,
          cost: 9100
        },
        {
          farm: 21,
          mult: 2.5,
          cost: 20330
        },
        {
          farm: 22,
          mult: 3,
          cost: 28294
        },
        {
          farm: 24,
          mult: 4,
          cost: 51567
        }
      ],
      tier_cost_share_of_farm_cost: 0.5,
      tired_bonus_share: 0.5,
      asleep_bonus_share: 0.15
    },
    tips: {
      coop_hand_tip_full_s: 10,
      coop_hand_tip_min_farm: 7
    }
  },
  maxLevel: 30,
  collection: {
    baseCost: 10,
    costGrowth: 1.6,
    eggsPerTapBase: 5,
    eggsPerTapPerLevel: 5,
    pricePercentPerLevel: 0.12
  },
  farm: {
    baseCost: 100,
    costGrowth: 1.35,
    hensBase: 5,
    hensPerLevel: 5,
    eggsPerHenPerSec: 0.2,
    coopCapacityBase: 50,
    coopCapacityPerLevel: 50,
    eggPriceCentsBase: 100,
    eggPriceCentsPerLevel: 5,
    customerIntervalBaseS: 5,
    customerIntervalDecay: 0.95,
    customerIntervalMinS: 1.5,
    demandLoFactor: 0.8,
    demandHiFactor: 1.6,
    eggsPerSecL0: 1.5,
    costTable: [
      100,
      135,
      182,
      246,
      332,
      448,
      560,
      700,
      875,
      1094,
      1368,
      1710,
      2138,
      2672,
      3340,
      4844,
      7024,
      10185,
      11076,
      18201,
      31050,
      40660,
      56589,
      68756,
      72194,
      97461,
      131573,
      177624,
      239792,
      323719,
      624316
    ]
  },
  customers: {
    customer_patience_s: 30,
    first_customer_s: 10,
    queue_max_base: 6,
    queue_max_cap: 10,
    queue_max_step_levels: 5
  },
  offline: {
    offlineCapSeconds: 7200,
    offlineRateMultiplier: 0.25,
    offlineMinSeconds: 60,
    hiddenSimMaxSeconds: 60
  },
  m4: {
    enabled: 1,
    hens: {
      costs: [
        20,
        21,
        24,
        35,
        51,
        73,
        103,
        146,
        205,
        285,
        409,
        586,
        838,
        1090,
        1417,
        1842,
        2395,
        3114,
        4048,
        5262,
        6841,
        8894,
        11562,
        15031,
        19540,
        25403,
        33023,
        42931,
        55810,
        72553,
        94319
      ],
      capOverFarm: 3
    },
    offline: {
      eggsPerSec: [
        0.38,
        0.5,
        0.75,
        1,
        1.25,
        1.5,
        1.75,
        2,
        2.25,
        2.5,
        2.75,
        3,
        3.25,
        3.5,
        3.75,
        4,
        4.25,
        4.5,
        4.75,
        5,
        5.25,
        5.5,
        5.75,
        6,
        6.25,
        6.5,
        6.75,
        7,
        7.25,
        7.5,
        7.75
      ],
      maxEggs2h: [
        2700,
        3600,
        5400,
        7200,
        9e3,
        10800,
        12600,
        14400,
        16200,
        18e3,
        19800,
        21600,
        23400,
        25200,
        27e3,
        28800,
        30600,
        32400,
        34200,
        36e3,
        37800,
        39600,
        41400,
        43200,
        45e3,
        46800,
        48600,
        50400,
        52200,
        54e3,
        55800
      ]
    },
    eggValue: {
      costs: [
        20,
        22,
        33,
        50,
        75,
        109,
        159,
        229,
        328,
        468,
        685,
        1003,
        1470,
        1955,
        2601,
        3459,
        4601,
        6119,
        8138,
        10824,
        14397,
        19148,
        25466,
        30484,
        31534,
        41940,
        55780,
        74187,
        98670,
        131231,
        249339
      ],
      capOverFarm: 3,
      baseStep: 0.05,
      levelBonus: 0.12
    },
    milestones: {
      hens: [
        {
          level: 10,
          coopMult: 1.25,
          offlineMult: 1.25
        },
        {
          level: 20,
          coopMult: 1.5,
          offlineMult: 1.5
        },
        {
          level: 30,
          coopMult: 2,
          offlineMult: 2
        }
      ],
      grades: [
        {
          level: 5,
          mult: 1.1,
          minFarm: 0
        },
        {
          level: 10,
          mult: 1.25,
          minFarm: 0
        },
        {
          level: 20,
          mult: 1.5,
          minFarm: 15
        }
      ],
      balanced: [
        {
          level: 5,
          mult: 1.1
        },
        {
          level: 10,
          mult: 1.15
        },
        {
          level: 15,
          mult: 1.2
        },
        {
          level: 20,
          mult: 1.25
        },
        {
          level: 25,
          mult: 1.3
        }
      ]
    },
    tc: {
      ability_cd_s: 300,
      ability_s: 30,
      ability_w1_price_mult: 1.15,
      ability_w2_lay_mult: 1.15,
      ability_w3_price_mult: 1.15,
      ability_w4_tier_add: 0.5,
      complete_bonus_share: 0.05,
      egg_cash_s: 45,
      egg_despawn_s: 30,
      egg_eggs_as_cash_from_farm: 20,
      egg_eggs_s: 60,
      egg_gap_max_s: 300,
      egg_gap_min_s: 120,
      egg_unlock_farm: 8,
      egg_w_cash: 0.45,
      egg_w_eggs: 0.2,
      egg_w_frenzy: 0.35,
      focus_premium: 0.1,
      frenzy_all_sales: 1,
      frenzy_price_mult: 2,
      frenzy_s: 30,
      leave_penalty_share: 0.05,
      streak_cap: 0.4,
      streak_decay_per_s: 0.03,
      streak_hold_s: 3,
      streak_max_taps_per_s: 1,
      streak_per_tap: 0.01
    }
  }
};

// ../../../../../../tmp/qa-live-246de09/src/config/formulas.ts
var roundHalfUp = (x, dp) => {
  const m = 10 ** dp;
  return Math.round(Number((x * m).toPrecision(12))) / m;
};
var clampL = (L, p) => Math.max(0, Math.min(L, p.maxLevel));
function validateCostGrowthSegments(segs, where = "farm.costGrowthSegments") {
  if (segs === void 0) return;
  if (!Array.isArray(segs)) throw new Error(`balance.${where} must be an array`);
  const ok = (x) => typeof x === "number" && Number.isFinite(x);
  segs.forEach((s, i) => {
    if (!s || !ok(s.from) || !ok(s.to) || !ok(s.growth)) throw new Error(`balance.${where}[${i}] needs numeric from, to, growth`);
    if (!Number.isInteger(s.from) || !Number.isInteger(s.to)) throw new Error(`balance.${where}[${i}] from/to must be integers`);
    if (s.from < 1) throw new Error(`balance.${where}[${i}] from must be >= 1`);
    if (s.from > s.to) throw new Error(`balance.${where}[${i}] from must be <= to`);
    if (!(s.growth > 0)) throw new Error(`balance.${where}[${i}] growth must be > 0`);
  });
  const sorted = [...segs].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].from <= sorted[i - 1].to)
    throw new Error(`balance.${where}: segments ${sorted[i - 1].from}-${sorted[i - 1].to} and ${sorted[i].from}-${sorted[i].to} overlap`);
}
function validateCostTable(t, maxLevel, where = "farm.costTable") {
  if (t === void 0) return;
  if (!Array.isArray(t)) throw new Error(`balance.${where} must be an array`);
  if (t.length !== maxLevel + 1) throw new Error(`balance.${where} must have maxLevel+1 = ${maxLevel + 1} entries, got ${t.length}`);
  t.forEach((v, i) => {
    if (!Number.isSafeInteger(v) || v <= 0) throw new Error(`balance.${where}[${i}] must be a positive integer`);
  });
}
var farmPriceCents = (F, p) => p.farm.eggPriceCentsBase + p.farm.eggPriceCentsPerLevel * clampL(F, p);
var eggPriceCents = (F, C, p) => Math.round(roundHalfUp(farmPriceCents(F, p) / 100 * (1 + p.collection.pricePercentPerLevel * clampL(C, p)), 2) * 100);
var customerIntervalS = (F, p) => Math.max(p.farm.customerIntervalMinS, roundHalfUp(p.farm.customerIntervalBaseS * p.farm.customerIntervalDecay ** clampL(F, p), 2));
var hensCap = (F, p) => Math.min(p.maxLevel, F + p.m4.hens.capOverFarm);
var eggValueCap = (F, p) => Math.min(p.maxLevel, F + p.m4.eggValue.capOverFarm);
var best = (xs, L, ok = () => true) => xs.filter((x) => L >= x.level && ok(x)).pop();
var gradeMult = (V, F, p) => best(p.m4.milestones.grades, V, (g) => F >= g.minFarm)?.mult ?? 1;
var balancedMult = (F, H, V, p) => best(p.m4.milestones.balanced, Math.min(F, H, V))?.mult ?? 1;
var trackPriceCents = (F, H, V, p) => {
  const v = clampL(V, p), e = p.m4.eggValue;
  return Math.round(Number((100 * (1 + e.baseStep * v) * (1 + e.levelBonus * v) * gradeMult(v, F, p) * balancedMult(F, H, v, p)).toPrecision(12)));
};

// ../../../../../../tmp/qa-live-246de09/src/config/balance.ts
function check(o, path) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith("_") || path === "" && k === "sim_test" || path === ".farm" && (k === "costGrowthSegments" || k === "costTable")) continue;
    if (v && typeof v === "object") check(v, `${path}.${k}`);
    else if (v === void 0 || typeof v !== "number" || !isFinite(v) || v < 0) throw new Error(`balance${path}.${k} invalid`);
  }
}
var pos = (b, path) => {
  const v = path.split(".").reduce((o, k) => o?.[k], b);
  if (!(typeof v === "number" && v > 0)) throw new Error(`balance.${path} must be > 0`);
  return v;
};
var int = (b, path) => {
  const v = pos(b, path);
  if (!Number.isInteger(v)) throw new Error(`balance.${path} must be an integer`);
};
function validateBalance(b, prod = !!import.meta.env?.PROD) {
  if (b.sim_test && prod) throw new Error("balance.sim_test hooks are test-only and not allowed in production builds");
  check(b, "");
  if (b.sim_test?.demand_scale !== void 0 && !(b.sim_test.demand_scale > 0)) throw new Error("balance.sim_test.demand_scale must be > 0");
  for (const p of ["tickHz", "maxLevel", "feel.max_flying_eggs", "telemetry.ring_size"]) int(b, p);
  for (const p of ["feel.tap_combine_window_ms", "feel.queue_full_cue_min_gap_ms", "feel.egg_flight_ms", "feel.served_dwell_ms", "save.autosaveIntervalS", "offline.offlineCapSeconds", "telemetry.flush_interval_s", "telemetry.tap_batch_ms", "customers.first_customer_s"]) pos(b, p);
  if (b.offline.offlineRateMultiplier > 1) throw new Error("balance.offline.offlineRateMultiplier must be <= 1");
  if (b.save.autosaveIntervalS > 5) throw new Error("balance.save.autosaveIntervalS must be <= 5 (AC8)");
  for (const p of ["collection.baseCost", "farm.baseCost", "farm.eggsPerHenPerSec", "farm.customerIntervalMinS", "farm.customerIntervalBaseS", "customers.customer_patience_s"]) pos(b, p);
  for (const p of ["customers.queue_max_base", "customers.queue_max_cap", "customers.queue_max_step_levels"]) int(b, p);
  validateCostGrowthSegments(b.farm.costGrowthSegments);
  validateCostTable(b.farm.costTable, b.maxLevel);
  for (const [i, t] of b.workers.grader.tiers.entries()) if (t.cost !== void 0 && !(Number.isSafeInteger(t.cost) && t.cost > 0)) throw new Error(`balance.workers.grader.tiers[${i}].cost must be a positive integer`);
  if (b.collection.costGrowth < 1 || b.farm.costGrowth < 1) throw new Error("balance cost growth must be >= 1");
  if (!(b.farm.customerIntervalDecay > 0 && b.farm.customerIntervalDecay <= 1)) throw new Error("balance.farm.customerIntervalDecay must be in (0,1]");
  if (!(b.farm.demandLoFactor > 0 && b.farm.demandHiFactor >= b.farm.demandLoFactor)) throw new Error("balance.farm demand factors: 0 < lo <= hi");
  if (b.customers.queue_max_cap < b.customers.queue_max_base) throw new Error("balance.customers.queue_max_cap < queue_max_base");
  for (const p of [
    "workers.energy.drain_s_per_pct",
    "workers.energy.tired_below_pct",
    "workers.energy.manage_cooldown_s",
    "workers.energy.start_pct",
    "workers.market_hand.every_s",
    "workers.market_hand.tired_every_s",
    "workers.coop_hand.every_s",
    "workers.coop_hand.tired_every_s",
    "workers.energy.yawn_at_pct",
    "workers.energy.manage_all_min_workers",
    "workers.energy.unpaid_resume_wage_min",
    "workers.market_hand.hire_cost",
    "workers.coop_hand.hire_cost",
    "workers.hawker.hire_cost",
    "workers.grader.tier_cost_share_of_farm_cost",
    "workers.tips.coop_hand_tip_full_s"
  ]) pos(b, p);
  const W = b.workers;
  if (W.energy.tired_below_pct > 100 || W.energy.start_pct > 100) throw new Error("balance.workers.energy pct must be <= 100");
  if (W.hawker.demand_mult < W.hawker.tired_demand_mult || W.hawker.tired_demand_mult < 1) throw new Error("balance.workers.hawker: 1 <= tired_demand_mult <= demand_mult");
  if (!W.grader.tiers.length || W.grader.tiers.some((t, i, a) => t.mult <= 1 || i > 0 && (t.farm <= a[i - 1].farm || t.mult <= a[i - 1].mult)))
    throw new Error("balance.workers.grader.tiers: farm and mult must increase, mult > 1");
  for (const k of ["tired_bonus_share", "asleep_bonus_share"]) if (W.grader[k] > 1) throw new Error(`balance.workers.grader.${k} must be <= 1`);
  return b;
}
var balance = validateBalance(balance_default);

// ../../../../../../tmp/qa-live-246de09/src/sim/migrate-v7.ts
function priceMatchedV(F, H, targetCents, b) {
  for (let v = 0; v <= b.maxLevel; v++) if (trackPriceCents(F, H, v, b) >= targetCents) return v;
  return null;
}

// calc.ts
var mx = balance.maxLevel;
var cof = balance.m4.eggValue.capOverFarm;
var total = 0;
var over = 0;
var worst = { gap: 0, F: 0, C: 0, V: 0 };
var rows = [];
for (let F = 0; F <= mx; F++) for (let C = 0; C <= mx; C++) {
  const V = Math.min(priceMatchedV(F, F, eggPriceCents(F, C, balance), balance) ?? mx, mx);
  total++;
  if (V >= eggValueCap(F, balance) && V < mx) {
    const shown = F + 1, real = V - cof + 1;
    if (real > shown) {
      over++;
      const gap = real - shown;
      if (gap > worst.gap) worst = { gap, F, C, V };
    }
  }
  if (F === 5 && C === 15 || F === 0 && C === 30 || F === 27 && C === 0) rows.push(`F${F} C${C} -> V${V} cap ${eggValueCap(F, balance)} shown L${F + 1} real L${V - cof + 1}`);
}
console.log(rows.join("\n"));
console.log(`capOverFarm=${cof} max=${mx}; saves F,C in 0..${mx}: ${total}; V>F+3 (text wrong): ${over}; worst`, worst);
var byC = {};
for (const C of [0, 5, 10, 15, 20, 25, 30]) {
  byC[C] = [];
  for (let F = 0; F <= mx; F += 5) {
    const V = Math.min(priceMatchedV(F, F, eggPriceCents(F, C, balance), balance) ?? mx, mx);
    byC[C].push(`F${F}:V${V}`);
  }
}
console.log(byC);
for (let F = 25; F <= 30; F++) console.log(`F${F} interval ${customerIntervalS(F, balance)}s -> ${customerIntervalS(F + 1, balance)}s; hensCap ${hensCap(F, balance)} -> ${hensCap(F + 1, balance)}`);
