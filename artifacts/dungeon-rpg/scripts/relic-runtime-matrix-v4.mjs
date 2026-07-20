export const RELIC_RUNTIME_MATRIX_VERSION = 'equipment-v4-s1';

const CONTEXTS = Object.freeze([
  'solo-normal', 'solo-elite', 'solo-boss', 'worldboss-attempt', 'duo-host', 'duo-guest', 'companion-owner',
]);
const RELICS = Object.freeze([
  'ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core',
]);

function contract(relicId) {
  switch (relicId) {
    case 'ash-eye': return { extraHuntsPerChapter: 1, combatMultiplier: 1 };
    case 'marked-claw': return { killInterval: 7, durationMs: 2500, attackSpeedBonus: 0.14, attackSpeedCap: 1.75 };
    case 'night-hunt-sigil': return { huntDustMultiplier: 1.5, combatMultiplier: 1 };
    case 'veil-heart': return { lethalPreventionsPerRun: 1, restoredHealthFraction: 0.25 };
    case 'broken-guardian-crown': return { attackPerStack: 0.03, stackCap: 4, maximumAttackMultiplier: 1.12 };
    case 'depth-rune-shard': return { runeDamageFactorBeforeArmor: 0.82 };
    case 'world-core': return { activationsPerRun: 1, attackMultiplier: 1.04, maximumHealthMultiplier: 1.07 };
    default: throw new Error('Unknown relic: ' + relicId);
  }
}

export function buildRelicRuntimeMatrixV4() {
  return CONTEXTS.flatMap(context => RELICS.map(relicId => ({
    context, relicId, ...contract(relicId),
    applicationsPerOwner: 1, sharedDuoApplications: 0, companionInherited: false, resumeReapplications: 0,
  })));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  console.log(JSON.stringify({ version: RELIC_RUNTIME_MATRIX_VERSION, rows: buildRelicRuntimeMatrixV4().length, contexts: CONTEXTS, relics: RELICS }, null, 2));
}
