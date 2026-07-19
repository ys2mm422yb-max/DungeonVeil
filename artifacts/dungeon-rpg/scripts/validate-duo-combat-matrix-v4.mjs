#!/usr/bin/env node
import { simulateDuoCombatMatrixV4 } from './duo-combat-matrix-v4.mjs';

const report = simulateDuoCombatMatrixV4();
const assert = (condition, message) => { if (!condition) throw new Error(`Duo matrix V4: ${message}`); };

assert(report.buildCount === 7, 'seven canonical builds required');
assert(report.pairCount === 28, 'all unordered build pairings required');
assert(report.loadoutProfileCount === 5, 'five loadout profiles required');
assert(report.loadoutOrientationCount === 8, 'forward/reverse orientations required');
assert(report.checkpointCount === 11, 'room and boss checkpoints incomplete');
assert(report.scenarioCount === 7392, 'full connected and disconnect matrix required');

for (const row of report.rows) {
  assert(Number.isFinite(row.ttkSeconds) && row.ttkSeconds > 0, 'invalid TTK');
  assert(row.enemyCount <= 12, 'mobile enemy cap exceeded');
  assert(row.supportCount <= 2, 'boss support cap exceeded');
  assert(row.attackCooldownMs.every(value => value >= 125), 'attack cooldown cap violated');
  assert(row.localProjectileLoad <= 35, 'mobile projectile budget exceeded');
  assert(row.mobileControlScore >= 0.27, 'mobile control score below floor');
  if (row.connectivity === 'disconnected') {
    assert(row.disconnectHpFactor === 0.78, 'disconnect HP fallback diverged');
    assert(row.disconnectAttackFactor === 0.92, 'disconnect attack fallback diverged');
  }
}

const maximumFinalBoss = report.rows.find(row =>
  row.pair[0] === 'maximum' && row.pair[1] === 'maximum'
  && row.loadout === 'maximum' && row.chapter === 10 && row.room === 50
  && row.connectivity === 'connected'
);
assert(maximumFinalBoss, 'maximum chapter-10 boss reference missing');
assert(maximumFinalBoss.ttkSeconds >= 45 && maximumFinalBoss.ttkSeconds <= 80, 'maximum chapter-10 boss window diverged');

console.log(JSON.stringify({
  scenarios: report.scenarioCount,
  maximumLocalProjectileLoad: Math.max(...report.rows.map(row => row.localProjectileLoad)),
  minimumMobileControlScore: Math.min(...report.rows.map(row => row.mobileControlScore)),
  maximumFinalBoss,
}, null, 2));
console.log('Duo combat matrix V4 passed: all build pairs, orientations, checkpoints and disconnect survivors remain bounded.');

// This file is intentionally part of the mandatory final audit chain.
