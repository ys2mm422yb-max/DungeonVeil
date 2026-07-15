import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [expansion, weekly, panel, guild, publicProfile, online, session, repair, main] = await Promise.all([
  read('../src/game/profileCosmeticsExpansion.ts'),
  read('../src/game/weeklyElite.ts'),
  read('../src/components/PlayerProfilePanel.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/PlayerProfileCard.tsx'),
  read('../src/game/onlineProfileCosmetics.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/game/profileStatsRepair.ts'),
  read('../src/main.tsx'),
]);

const checks = [
  [(expansion.match(/nameDe:/g) ?? []).length >= 30, 'profile expansion does not add enough titles, calling cards and avatars'],
  [expansion.includes("id: 'weekly-breaker'") && expansion.includes("id: 'rift-seal'") && expansion.includes("id: 'night-watch'"), 'weekly cosmetic rewards are not wired into the collection'],
  [weekly.includes('weeklyEliteQuests') && weekly.includes('target: 400') && weekly.includes('target: 65') && weekly.includes('target: 8'), 'weekly elite contracts are missing or too easy'],
  [weekly.includes('ownedRewardIds') && weekly.includes('eliteMarks') && weekly.includes('mondayKey'), 'weekly rewards are not persistent across resets'],
  [panel.includes("'Visitenkarten'") && panel.includes("'elite'") && panel.includes('SAMMLUNGSFORTSCHRITT'), 'profile navigation, calling-card naming or collection progress is incomplete'],
  [panel.includes('claimWeeklyEliteQuest') && panel.includes('Drei schwere Prüfungen'), 'weekly elite contract UI is missing'],
  [panel.includes('syncOnlineProfileCosmetics'), 'equipped profile cosmetics are not synced online'],
  [online.includes("body: JSON.stringify({ avatar_key: encodeOnlineProfileCosmetics(profile) })"), 'online cosmetic sync does not reuse the protected profile field'],
  [guild.includes('guild-member-profile-strip') && guild.includes('resolveOnlineAvatar') && guild.includes('setSelectedProfileId(member.user_id)'), 'guild members do not show cosmetics or open public profiles'],
  [publicProfile.includes('resolveOnlineCard') && publicProfile.includes('resolveOnlineTitle') && publicProfile.includes('resolveOnlineAvatar'), 'public profiles do not show equipped cosmetics'],
  [session.includes("number.id.startsWith('dmg-')") && session.includes("number.id.startsWith('burn-')") && session.includes('Math.abs(Number(number.value))'), 'outgoing damage statistics still ignore negative-formatted damage numbers'],
  [repair.includes('ownedEquipment - profile.stats.itemsFound') && main.includes("import './game/profileStatsRepair';"), 'legacy equipment statistics are not reconciled'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Profile/guild/weekly rewards audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Profile/guild/weekly rewards audit passed: expanded collections, hard weekly contracts, public guild profiles, online cosmetic sync and repaired statistics are active.');
