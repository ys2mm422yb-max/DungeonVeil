import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const focused = [
  './validate-coop-solo-balance-isolation.mjs',
  './validate-coop-lobby-foundation.mjs',
  './validate-coop-realtime-presence.mjs',
  './validate-coop-host-enemy-state.mjs',
  './validate-coop-downed-revive.mjs',
  './validate-coop-duo-balance-rewards.mjs',
  './validate-coop-shared-boss-loot.mjs',
  './validate-coop-run-persistence.mjs',
];
const [packageSource, ...sources] = await Promise.all([read('../package.json'), ...focused.map(read)]);
const scripts = JSON.parse(packageSource).scripts ?? {};
const byPath = new Map(focused.map((entry, index) => [entry, sources[index]]));
const duo = byPath.get('./validate-coop-duo-balance-rewards.mjs') ?? '';
const loot = byPath.get('./validate-coop-shared-boss-loot.mjs') ?? '';
const persistence = byPath.get('./validate-coop-run-persistence.mjs') ?? '';
const suites = ['audit:final', 'audit:economy', 'audit:coop-realtime', 'audit:coop-life', 'audit:coop-balance', 'audit:social', 'audit:rooms', 'audit:sync'];

const checks = [
  [focused.every(path => (byPath.get(path)?.length ?? 0) > 400), 'focused Duo audit missing'],
  [focused.every(path => /(assert\s*\(|process\.exit\(1\)|throw new Error)/.test(byPath.get(path) ?? '')), 'focused Duo audit does not fail closed'],
  [(byPath.get('./validate-coop-solo-balance-isolation.mjs') ?? '').toLowerCase().includes('solo'), 'Solo isolation coverage missing'],
  [(byPath.get('./validate-coop-lobby-foundation.mjs') ?? '').toLowerCase().includes('lobby'), 'lobby coverage missing'],
  [(byPath.get('./validate-coop-realtime-presence.mjs') ?? '').toLowerCase().includes('presence'), 'presence coverage missing'],
  [(byPath.get('./validate-coop-host-enemy-state.mjs') ?? '').toLowerCase().includes('host'), 'host authority coverage missing'],
  [(byPath.get('./validate-coop-downed-revive.mjs') ?? '').toLowerCase().includes('revive'), 'revive coverage missing'],
  [duo.includes('normalHp: 1.72') && duo.includes('mobileEnemyCap: 12') && duo.includes('server-authoritative 1.25 currency rewards'), 'V4 Duo balance or rewards coverage missing'],
  [duo.includes('applyDuoDisconnectFallback') && duo.includes('disconnectHpFactor: 0.78'), 'disconnect fallback coverage missing'],
  [loot.includes('consolation_dust = 60') && loot.includes('server-authoritative item selection'), 'shared boss loot coverage missing'],
  [persistence.includes('COOP_CHECKPOINT_MS = 5_000') && persistence.includes('authoritative_room_clear') && persistence.includes('run_attempt'), 'persistence or retry isolation coverage missing'],
  [scripts['audit:coop-final'] === 'node scripts/validate-coop-final-integration.mjs', 'dedicated final Duo command missing'],
  [suites.every(name => typeof scripts[name] === 'string' && scripts[name].includes('validate-coop-final-integration.mjs')), 'final Duo audit not routed through all suites'],
];
const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}
console.log('Complete Duo V4 integration audit passed.');
