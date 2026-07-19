#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/game/equipmentRedesign.ts'), 'utf8');
const migrationSource = fs.readFileSync(path.join(root, 'src/game/metaMigrationV4.ts'), 'utf8');
const storeSource = fs.readFileSync(path.join(root, 'src/game/metaStoreV4.ts'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(`Equipment migration V4 audit failed: ${message}`);
}

const ids = [...source.matchAll(/'([a-z-]+)':\s*'([a-z-]+)'/g)];
const replacements = Object.fromEntries(ids.map(([, from, to]) => [from, to]));
const active = new Set(['ash-bow', 'ember-bow', 'veil-bow', 'warden-bow', 'ranger-quiver', 'black-quiver', 'warden-quiver', 'ranger-cloak', 'ash-armor', 'warden-armor']);
const legacyCosts = {
  1: { gold: 2000, dust: 75, copies: 1 },
  2: { gold: 6000, dust: 250, copies: 2 },
  3: { gold: 15000, dust: 700, copies: 3 },
  4: { gold: 35000, dust: 1800, copies: 5 },
};

function safeProgress(value) {
  if (typeof value === 'number' && value > 0) return { level: Math.max(1, Math.min(5, Math.floor(value))), copies: 0 };
  if (!value || typeof value !== 'object') return null;
  const level = Math.max(0, Math.floor(Number(value.level) || 0));
  if (!level) return null;
  return { level: Math.max(1, Math.min(5, level)), copies: Math.max(0, Math.floor(Number(value.copies) || 0)) };
}
function invested(level) {
  const total = { gold: 0, dust: 0, copies: 0 };
  for (let current = 1; current < level; current++) {
    const cost = legacyCosts[current];
    total.gold += cost.gold; total.dust += cost.dust; total.copies += cost.copies;
  }
  return total;
}
function migrate(parsed = {}) {
  if (parsed.version === 4) return structuredClone(parsed);
  const owned = {};
  const cosmetics = new Set();
  const compensation = { gold: 0, dust: 0, copies: 0 };
  for (const [id, raw] of Object.entries(parsed.owned ?? {})) {
    const progress = safeProgress(raw);
    const replacement = replacements[id];
    if (!progress || !replacement) continue;
    cosmetics.add(id);
    const refund = active.has(id) ? { gold: 0, dust: 0, copies: 0 } : invested(progress.level);
    const prior = owned[replacement] ?? { level: 1, copies: 0 };
    owned[replacement] = {
      level: Math.max(prior.level, progress.level),
      copies: prior.copies + progress.copies + refund.copies,
    };
    compensation.gold += refund.gold;
    compensation.dust += refund.dust;
    compensation.copies += refund.copies;
  }
  owned['ash-bow'] ??= { level: 1, copies: 0 };
  owned['ranger-quiver'] ??= { level: 1, copies: 0 };
  owned['ranger-cloak'] ??= { level: 1, copies: 0 };
  const pick = (slot, fallback) => {
    const raw = parsed.equipped?.[slot];
    return replacements[raw] ?? fallback;
  };
  return {
    version: 4,
    rank: Math.max(1, Math.floor(Number(parsed.rank) || 1)),
    xp: Math.max(0, Number(parsed.xp) || 0),
    gold: Math.max(0, Number(parsed.gold) || 0) + compensation.gold,
    dust: Math.max(0, Number(parsed.dust) || 0) + compensation.dust,
    owned,
    equipped: { bow: pick('bow', 'ash-bow'), quiver: pick('quiver', 'ranger-quiver'), talisman: parsed.equipped?.talisman ?? 'veil-key', armor: pick('armor', 'ranger-cloak') },
    cosmeticUnlocks: [...cosmetics],
    migrationCompensation: compensation,
    rewardLedger: Array.isArray(parsed.rewardLedger) ? [...parsed.rewardLedger] : [],
    currentRunId: typeof parsed.currentRunId === 'string' ? parsed.currentRunId : '',
  };
}

assert(Object.keys(replacements).length === 26, `expected all 26 legacy IDs, found ${Object.keys(replacements).length}`);
assert([...active].every(id => replacements[id] === id), 'active items must map to themselves');
assert(migrationSource.includes("parsed?.version === 4") || storeSource.includes("parsed?.version === 4"), 'already-migrated guard missing');
assert(migrationSource.includes('migrationCompensation'), 'migration receipt/compensation missing');
assert(storeSource.includes('saveMetaProgression(result)'), 'migrated local state is not persisted');

const fixtures = {
  newPlayer: {},
  starters: { owned: { 'ash-bow': 1, 'ranger-quiver': 1, 'ranger-cloak': 1 }, equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' } },
  midProgress: { rank: 8, gold: 4200, dust: 380, owned: { 'hunter-bow': { level: 3, copies: 2 }, 'frost-quiver': { level: 2, copies: 1 }, 'ash-armor': { level: 2, copies: 0 } }, equipped: { bow: 'hunter-bow', quiver: 'frost-quiver', armor: 'ash-armor' } },
  maxItems: { owned: { 'depth-armor': { level: 5, copies: 7 }, 'frost-bow': { level: 5, copies: 4 }, 'ritual-shard': { level: 5, copies: 3 } }, equipped: { bow: 'frost-bow', talisman: 'ritual-shard', armor: 'depth-armor' } },
  oldTalisman: { owned: { 'veil-key': { level: 4, copies: 2 } }, equipped: { talisman: 'veil-key' } },
  manyMarksReference: { owned: { 'rune-quiver': { level: 4, copies: 12 } }, rewardLedger: ['run:1:10', 'run:1:20'] },
  damaged: { rank: -4, gold: 'bad', dust: null, owned: { 'frost-armor': { level: 999, copies: -8 }, unknown: { level: 5 } }, equipped: { bow: 'unknown', armor: 'frost-armor' } },
};

for (const [name, fixture] of Object.entries(fixtures)) {
  const result = migrate(fixture);
  assert(result.version === 4, `${name}: wrong version`);
  assert(result.owned['ash-bow'] && result.owned['ranger-quiver'] && result.owned['ranger-cloak'], `${name}: starters missing`);
  assert(Object.keys(result.owned).every(id => active.has(id)), `${name}: inactive gameplay item survived`);
  assert(result.cosmeticUnlocks.every(id => replacements[id]), `${name}: unknown cosmetic unlock`);
  const second = migrate(result);
  assert(JSON.stringify(second) === JSON.stringify(result), `${name}: migration is not idempotent`);
}

const mid = migrate(fixtures.midProgress);
assert(mid.equipped.bow === 'ash-bow' && mid.equipped.quiver === 'black-quiver', 'equipped legacy replacements incorrect');
assert(mid.cosmeticUnlocks.includes('hunter-bow') && mid.cosmeticUnlocks.includes('frost-quiver'), 'legacy skins not unlocked');
assert(mid.migrationCompensation.gold > 0 && mid.migrationCompensation.dust > 0, 'invested resources not compensated');

const max = migrate(fixtures.maxItems);
assert(max.owned['warden-armor'].level === 5 && max.owned['ember-bow'].level === 5, 'level-5 progress not transferred');
assert(max.owned['warden-quiver'].copies > 3, 'legacy invested copies not compensated');

const localNewer = { ...mid, rewardLedger: ['local-newer'], currentRunId: 'local' };
const cloudNewer = { ...max, rewardLedger: ['cloud-newer'], currentRunId: 'cloud' };
assert(migrate(localNewer).currentRunId === 'local', 'local-newer V4 state changed');
assert(migrate(cloudNewer).currentRunId === 'cloud', 'cloud-newer V4 state changed');

console.log(JSON.stringify({ fixtures: Object.keys(fixtures), replacementCount: Object.keys(replacements).length }, null, 2));
console.log('Equipment migration V4 fixtures passed.');
