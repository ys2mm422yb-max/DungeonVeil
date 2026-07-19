import { readFile } from 'node:fs/promises';

const paths = {
  retention: '../src/game/runRetention.ts',
  currency: '../src/game/metaCurrency.ts',
  economy: '../src/game/equipmentUpgradeEconomy.ts',
  inventory: '../src/components/screens/VeilChamberScreenV4.tsx',
  quests: '../src/components/DailyQuestPanel.tsx',
  relics: '../src/game/veilRelics.ts',
  bundle: '../src/game/persistentSaveBundle.ts',
  worldBossReward: '../src/game/worldBossRewardLocal.ts',
  worldBossMigration: '../../../supabase/migrations/20260713033000_add_social_profiles_worldboss_rewards.sql',
  expansion: '../src/game/profileCosmeticsExpansion.ts',
  portrait: '../src/components/ProfileAvatarPortrait.tsx',
  badge: '../src/components/ProfileBadge.tsx',
  profile: '../src/components/PlayerProfilePanel.tsx',
  social: '../src/components/SocialIdentityCard.tsx',
  publicProfile: '../src/components/PlayerProfileCard.tsx',
};

const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(new URL(path, import.meta.url), 'utf8')]));
const files = Object.fromEntries(entries);
const baseAvatarIds = ['ranger', 'ember', 'frost', 'warden', 'sigil', 'veil', 'ash-mask', 'demon-eye', 'rune-bow', 'worldboss-seal', 'night-watch', 'arcane-eye'];
const expandedAvatarIds = ['frost-skull', 'sentinel-helm', 'veil-crystal', 'boss-crown', 'void-phoenix'];
const avatarIds = [...baseAvatarIds, ...expandedAvatarIds];

const checks = [
  [files.retention.includes('currencyVersion: 2'), 'retention profile has no versioned currency migration'],
  [files.retention.includes("if (parsed.currencyVersion !== 2)") && files.retention.includes('migrateLegacySigilsToDust(legacySigils)'), 'legacy sigils are not migrated 1:1 into dust'],
  [files.retention.indexOf('localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))') < files.retention.indexOf('migrateLegacySigilsToDust(legacySigils)'), 'migration does not persist its marker before granting dust'],
  [files.currency.includes('meta.dust += value') && files.currency.includes('saveMetaProgression(meta)'), 'shared dust grant does not persist into meta progression'],
  [files.bundle.includes('number(meta.dust) * 100') && files.bundle.includes('number(retention.sigils) * 100'), 'old sigils and migrated dust do not carry equal cloud conflict weight'],
  [!files.retention.includes('profile.sigils +=') && !files.retention.includes('Schleier-Siegel'), 'run rewards still grant or name Veil Sigils'],
  [!files.quests.includes('profile.sigils') && !files.quests.includes("'Siegel'") && !files.quests.includes("'Sigils'"), 'quest board still exposes the removed sigil wallet'],
  [files.quests.includes('loadMetaProgression().dust') && files.quests.includes("'Schleierstaub'") && files.quests.includes("'Veil Dust'"), 'quest board does not display Veil Dust'],
  [files.retention.includes('grantMetaDust(task.reward)') && files.retention.includes('grantMetaDust(huntReward)') && files.retention.includes('grantMetaDust(dustReward)'), 'daily, hunt or relic rewards do not all grant dust'],
  [files.worldBossMigration.includes('v_dust integer') && files.worldBossMigration.includes("'dust', v_dust") && files.worldBossReward.includes('meta.dust += dust'), 'world-boss rewards are not connected to Veil Dust'],
  [files.relics.includes('30 % mehr Schleierstaub') && files.relics.includes('30% more Veil Dust'), 'Night Hunt relic does not describe the redesigned dust bonus'],
  [files.economy.includes('dust: 120') && files.economy.includes('dust: 4200') && files.economy.includes('dust: 7200') && files.economy.includes('dust: 12500'), 'equipment upgrades do not contain the V4 rarity-based dust costs'],
  [files.inventory.includes('data-testid="equipment-upgrade-costs"') && files.inventory.includes('grid-cols-3'), 'inventory does not visibly separate all three upgrade resources'],
  [expandedAvatarIds.every(id => files.expansion.includes(`id: '${id}'`)), 'expanded cosmetic collection contains an unaccounted avatar'],
  [avatarIds.every(id => files.portrait.includes(`${id}:`) || files.portrait.includes(`'${id}':`)), 'portrait theme map does not cover every base and expanded avatar id'],
  [files.portrait.includes('THEMES[avatarId] ?? THEMES.ranger'), 'future or malformed avatar ids have no safe portrait fallback'],
  [files.portrait.includes('<svg') && files.portrait.includes('ProfileAvatarPortrait'), 'avatars are not rendered as reusable vector portraits'],
  [files.badge.includes('<ProfileAvatarPortrait'), 'main-menu profile badge still uses an emoji avatar'],
  [files.profile.includes('<ProfileAvatarPortrait') && files.profile.match(/<ProfileAvatarPortrait/g)?.length >= 2, 'own profile header and avatar collection do not both use portraits'],
  [files.social.includes('<ProfileAvatarPortrait'), 'friend and guild identity cards still use emoji avatars'],
  [files.publicProfile.includes('<ProfileAvatarPortrait'), 'public friend profile still uses an emoji avatar'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Dust/avatar overhaul audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Dust/avatar overhaul audit passed: migration preserves cloud weight, all rewards feed Veil Dust, V4 upgrades consume three resources and all 17 profile avatars use safe vector portraits.');
