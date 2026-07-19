import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');

const auditPaths = [
  './validate-coop-solo-balance-isolation.mjs',
  './validate-coop-lobby-foundation.mjs',
  './validate-coop-realtime-presence.mjs',
  './validate-coop-host-enemy-state.mjs',
  './validate-coop-downed-revive.mjs',
  './validate-coop-duo-balance-rewards.mjs',
  './validate-coop-shared-boss-loot.mjs',
  './validate-coop-run-persistence.mjs',
];

const [packageSource, ...auditSources] = await Promise.all([
  read('../package.json'),
  ...auditPaths.map(read),
]);

const packageJson = JSON.parse(packageSource);
const scripts = packageJson.scripts ?? {};
const auditByPath = new Map(auditPaths.map((auditPath, index) => [auditPath, auditSources[index]]));
const finalAuditName = 'validate-coop-final-integration.mjs';
const routedSuites = [
  'audit:final',
  'audit:economy',
  'audit:coop-realtime',
  'audit:coop-life',
  'audit:coop-balance',
  'audit:social',
  'audit:rooms',
  'audit:sync',
];

const checks = [
  [auditPaths.every(auditPath => (auditByPath.get(auditPath)?.length ?? 0) > 400), 'One or more focused Duo audits are missing or unexpectedly empty'],
  [auditPaths.every(auditPath => /(assert\s*\(|process\.exit\(1\)|throw new Error)/.test(auditByPath.get(auditPath) ?? '')), 'One or more focused Duo audits no longer fail closed'],
  [(auditByPath.get('./validate-coop-solo-balance-isolation.mjs') ?? '').toLowerCase().includes('solo'), 'Solo isolation coverage is missing'],
  [(auditByPath.get('./validate-coop-lobby-foundation.mjs') ?? '').toLowerCase().includes('lobby'), 'Lobby create, join, ready or start coverage is missing'],
  [(auditByPath.get('./validate-coop-realtime-presence.mjs') ?? '').toLowerCase().includes('presence'), 'Realtime presence coverage is missing'],
  [(auditByPath.get('./validate-coop-host-enemy-state.mjs') ?? '').toLowerCase().includes('host'), 'Host-authoritative enemy coverage is missing'],
  [(auditByPath.get('./validate-coop-downed-revive.mjs') ?? '').toLowerCase().includes('revive'), 'Downed, revive or team-death coverage is missing'],
  [(auditByPath.get('./validate-coop-duo-balance-rewards.mjs') ?? '').includes('DUO_MOBILE_ENEMY_CAP = 12') && (auditByPath.get('./validate-coop-duo-balance-rewards.mjs') ?? '').includes('server-authoritative 1.25 currency rewards'), 'Duo balance, mobile cap or server reward coverage is missing'],
  [(auditByPath.get('./validate-coop-shared-boss-loot.mjs') ?? '').includes('consolation_dust = 60') && (auditByPath.get('./validate-coop-shared-boss-loot.mjs') ?? '').includes('server-authoritative item selection'), 'Shared boss loot winner or 60-dust coverage is missing'],
  [(auditByPath.get('./validate-coop-run-persistence.mjs') ?? '').includes('COOP_CHECKPOINT_MS = 5_000') && (auditByPath.get('./validate-coop-run-persistence.mjs') ?? '').includes('authoritative_room_clear') && (auditByPath.get('./validate-coop-run-persistence.mjs') ?? '').includes('run_attempt'), 'Checkpoint, rejoin, reward idempotency or retry isolation coverage is missing'],
  [scripts['audit:coop-final'] === `node scripts/${finalAuditName}`, 'Dedicated final Duo audit command is missing'],
  [routedSuites.every(suite => typeof scripts[suite] === 'string' && scripts[suite].includes(finalAuditName)), 'The final Duo integration audit is not routed through every required regression suite'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

console.log('Complete Duo integration coverage is wired from lobby and host authority through revive, balance, shared boss loot, persistence, retry, abort and unchanged Solo routing.');
