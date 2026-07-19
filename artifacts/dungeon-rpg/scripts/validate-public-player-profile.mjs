import { readFile } from 'node:fs/promises';

const [card, loadout, profileEquipment, client, equipment, guild, friends, qa, main, config, browserTest] = await Promise.all([
  readFile(new URL('../src/components/PlayerProfileCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProfileEquipmentLoadout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/profileEquipment.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/socialProgressOnline.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentRedesign.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GuildSocialPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/FriendsPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProfileLayoutQa.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../playwright.regression.config.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/profile-layout.spec.mjs', import.meta.url), 'utf8'),
]);

const previewInstances = (loadout.match(/<KayKitEquipmentPreview\b/g) ?? []).length;
const checks = [
  [card.includes('data-testid="public-player-profile-dialog"') && card.includes('role="dialog"') && card.includes('aria-modal="true"'), 'public profile is not an accessible modal dialog'],
  [card.includes('public-player-profile-close') && card.includes("event.key === 'Escape'"), 'public profile lacks reliable close controls'],
  [card.includes('public-player-profile-loading') && card.includes('public-player-profile-error') && card.includes('public-player-profile-empty'), 'public profile loading, error or missing-profile state is absent'],
  [card.includes('public-player-profile-friend-code') && card.includes('navigator.clipboard'), 'friend code is not exposed as a copyable public field'],
  [card.includes('data-testid="public-player-profile-tablet-columns"') && card.includes('max-w-6xl') && card.includes('md:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]'), 'public profile still renders as a narrow phone column on tablets'],
  [card.includes('public-player-profile-best-progress') && card.includes('public-player-profile-career-stats') && card.includes('public-player-profile-details') && !card.includes('public-player-profile-progress'), 'meaningful public best progress, career statistics or details are incomplete'],
  [card.includes('rooms_cleared') && card.includes('bosses_defeated') && card.includes('quests_completed') && card.includes('play_time_ms'), 'career profile is missing important lifetime statistics'],
  [card.includes('public-player-profile-cosmetics') && card.includes('rarityLabel') && card.includes('public-player-profile-worldboss'), 'equipped cosmetics or secondary world-boss summary is missing'],
  [card.includes('public-player-profile-achievements') && card.includes('achievement_keys'), 'public achievements are missing'],
  [card.includes('<ProfileEquipmentLoadout items={activeEquipment}') && card.includes('testId="public-player-profile-equipment"'), 'public profile does not use the centralized current equipment loadout'],
  [loadout.includes('ACTIVE_EQUIPMENT_SLOTS.map') && loadout.includes('data-equipped') && loadout.includes("de ? 'Leer' : 'Empty'"), 'public equipment cards are not generated from the canonical active slot list with explicit empty slots'],
  [loadout.includes('profileEquipmentPrimaryBonus') && loadout.includes('profileEquipmentRarityLabel') && loadout.includes('profileEquipmentSlotLabel') && previewInstances === 1, 'public equipment lacks a single controlled real-item detail renderer, level, rarity or current main bonus'],
  [!card.toLowerCase().includes('talisman') && !loadout.toLowerCase().includes('talisman'), 'retired Talisman UI remains in the public profile'],
  [equipment.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']"), 'canonical active equipment slots are no longer bow, quiver and armor'],
  [profileEquipment.includes('normalizeProfileEquipmentItems') && profileEquipment.includes('ACTIVE_EQUIPMENT_SLOTS.includes') && profileEquipment.includes('candidate.slot !== definition.slot'), 'legacy public loadouts are not normalized through the central active equipment definition'],
  [profileEquipment.includes('currentProfileEquipmentFromMeta') && profileEquipment.includes('activeOwnedEquipmentCount'), 'own and public profiles do not share central current-equipment helpers'],
  [client.includes('currentProfileEquipmentFromMeta(loadMetaProgression())') && client.includes('equipped_items: normalizeProfileEquipmentItems(profile.equipped_items)'), 'public profile reads or writes can still expose legacy slots'],
  [client.includes("'get_social_profile_card'") && client.includes('SocialProfileCardData') && client.includes('highest_chapter'), 'public career profile RPC client is missing'],
  [qa.includes('data-contract="profile-tablet-current-equipment-v1"') && qa.includes("slot: 'talisman'") && qa.includes('normalizeProfileEquipmentItems'), 'deterministic legacy-Talisman profile QA is missing'],
  [main.includes("qaMode === 'profiles'") && main.includes('<ProfileLayoutQa />'), 'profile QA route is not wired into the current build'],
  [config.includes('profile-layout') && browserTest.includes('data-legacy-talisman-filtered') && browserTest.includes('assertNoHorizontalOverflow') && browserTest.includes("project.name.includes('ipad')"), 'four-device responsive profile regression is incomplete'],
  [browserTest.includes("toHaveCount(0)") && browserTest.includes('/Talisman/i') && browserTest.includes("page.locator('canvas')") && browserTest.includes('toHaveCount(1'), 'browser regression does not protect Talisman removal and the single-renderer budget'],
  [guild.includes('<PlayerProfileCard') && friends.includes('<PlayerProfileCard'), 'public profiles are not reachable from guilds and friends'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Public player profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Public player profile audit passed: responsive friend profiles share central three-slot normalization and one real-item detail renderer, hide legacy Talisman data and are protected across four devices.');
