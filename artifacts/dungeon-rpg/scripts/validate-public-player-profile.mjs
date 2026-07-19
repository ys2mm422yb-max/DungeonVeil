import { readFile } from 'node:fs/promises';

const [card, client, guild, friends, equipment] = await Promise.all([
  readFile(new URL('../src/components/PlayerProfileCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/socialProgressOnline.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GuildSocialPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/FriendsPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentRedesign.ts', import.meta.url), 'utf8'),
]);

const previewInstances = (card.match(/<KayKitEquipmentPreview\b/g) ?? []).length;
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
  [card.includes('ACTIVE_EQUIPMENT_SLOTS.map') && card.includes('public-equipment-slot-bow') === false && card.includes('public-equipment-slot-${slot}') && card.includes('Leerer Slot'), 'public equipment cards are not generated from the canonical active slot list with explicit empty slots'],
  [card.includes('data-testid="public-equipment-detail"') && card.includes('activeEquipmentLevelStats') && card.includes('equipmentBonusSummary') && previewInstances === 1, 'public equipment lacks a single controlled real-item detail renderer or current main bonus'],
  [!card.toLowerCase().includes('talisman'), 'retired Talisman UI remains in the public profile'],
  [equipment.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']"), 'canonical active equipment slots are no longer bow, quiver and armor'],
  [client.includes('normalizePublicEquipmentItems') && client.includes('ACTIVE_EQUIPMENT_SLOTS.flatMap') && client.includes('isActiveEquipmentId') && client.includes('ACTIVE_EQUIPMENT[id].slot !== slot'), 'legacy public loadouts are not normalized through the central active equipment definition'],
  [client.includes('equipped_items: normalizePublicEquipmentItems(profile.equipped_items)') && client.includes('const equippedItems = normalizePublicEquipmentItems'), 'public profile reads or writes can still expose legacy slots'],
  [client.includes("'get_social_profile_card'") && client.includes('SocialProfileCardData') && client.includes('highest_chapter'), 'public career profile RPC client is missing'],
  [guild.includes('<PlayerProfileCard') && friends.includes('<PlayerProfileCard'), 'public profiles are not reachable from guilds and friends'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Public player profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Public player profile audit passed: responsive friend profiles use one real-item detail renderer, current three-slot loadouts, safe legacy filtering, best progress, career stats and social entry points.');
