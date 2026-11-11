// Runtime config diff: tests/helpers/breeds-on.ts vs shipped balance.json.
// cwd must be the scratch repo. Does not write balance.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { breedsOnBalance, breedsOffBalance } from './tests/helpers/breeds-on.ts';
import { balance } from './src/config/balance.ts';

const out = process.env.OUT || 'helper-diff.json';
const file = JSON.parse(readFileSync('src/config/balance.json', 'utf8'));
const orig = JSON.parse(JSON.stringify(balance));
const on = breedsOnBalance(balance);
const off = breedsOffBalance(balance);

function flatten(o, p = '', acc = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const k of Object.keys(o)) flatten(o[k], p ? p + '.' + k : k, acc);
  } else acc[p] = o;
  return acc;
}
const a = flatten(orig), b = flatten(on), c = flatten(file);
const diffsOn = [];
for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
  if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffsOn.push({ path: k, shipped: a[k], breedsOn: b[k] });
}
const diffsOff = [];
for (const k of new Set([...Object.keys(a), ...Object.keys(flatten(off))])) {
  const fv = flatten(off)[k];
  if (JSON.stringify(a[k]) !== JSON.stringify(fv)) diffsOff.push({ path: k, shipped: a[k], breedsOff: fv });
}
const result = {
  module_m4_flags: orig.m4?.flags,
  file_m4_flags: file.m4?.flags,
  file_breeds: file.m4?.flags?.breeds,
  module_breeds: orig.m4?.flags?.breeds,
  on_breeds: on.m4?.flags?.breeds,
  off_breeds: off.m4?.flags?.breeds,
  diffs_breedsOn_vs_shipped_module: diffsOn,
  diffs_breedsOff_vs_shipped_module: diffsOff,
  file_equals_module: JSON.stringify(file.m4?.flags) === JSON.stringify(orig.m4?.flags),
  only_breeds_changed: diffsOn.length === 1 && diffsOn[0].path === 'm4.flags.breeds' && diffsOn[0].shipped === 0 && diffsOn[0].breedsOn === 1,
  file_still_zero: file.m4?.flags?.breeds === 0,
};
writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.only_breeds_changed || !result.file_still_zero) process.exit(1);
