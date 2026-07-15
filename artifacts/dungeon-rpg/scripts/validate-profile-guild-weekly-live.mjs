import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const requireText = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};

const profile = read('src/game/playerProfile.ts');
const expansion = read('src/game/profileCosmeticsExpansion.ts');
const weekly = read('src/game/weeklyElite.ts');
const panel = read('src/components/PlayerProfilePanel.tsx');
const guild = read('src/components/GuildSocialPanel.tsx');
const publicProfile = read('src/components/PlayerProfileCard.tsx');
const online = read('src/game/onlineProfileCosmetics.ts');
const session = read('src/components/GameSessionBridge.tsx');
const repair = read('src/game/profileStatsRepair.ts');
const main = read('src/main.tsx');

requireText(panel, "'Visitenkarten'", 'Profile tab must be named Visitenkarten');
requireText(panel, 'WÖCHENTLICHE ELITE-AUFTRÄGE', 'Weekly elite tab is missing');
requireText(panel, 'Elite-Marken', 'Elite marks are missing');
requireText(panel, 'SAMMLUNGSFORTSCHRITT', 'Collection counters are missing');
requireText(weekly, 'target: 400', 'Hard weekly enemy target is missing');
requireText(weekly, 'target: 65', 'Hard weekly room target is missing');
requireText(weekly, 'target: 8', 'Hard weekly boss target is missing');
requireText(weekly, 'ownedRewardIds', 'Weekly cosmetic rewards are not persistent');
requireText(profile + expansion, "id: 'weekly-breaker'", 'Weekly title reward is not equippable');
requireText(profile + expansion, "id: 'rift-seal'", 'Weekly calling card reward is not equippable');
requireText(profile + expansion, "id: 'night-watch'", 'Weekly avatar reward is not equippable');
requireText(profile + expansion, 'myth', 'Mythic cosmetics are missing');
requireText(guild, 'guild-member-profile-strip', 'Guild member avatars are not shown');
requireText(guild, 'setSelectedProfileId(member.user_id)', 'Guild member cards must open profiles');
requireText(guild, 'resolveOnlineTitle', 'Guild members do not show their active title');
requireText(publicProfile, 'resolveOnlineCard', 'Public profile does not show the selected calling card');
requireText(publicProfile, 'resolveOnlineAvatar', 'Public profile does not show the selected avatar');
requireText(online, 'syncOnlineProfileCosmetics', 'Equipped cosmetics are not synced online');
requireText(session, 'Math.abs(Number(number.value))', 'Negative-formatted outgoing damage is still ignored');
requireText(repair, 'ownedEquipment - profile.stats.itemsFound', 'Legacy equipment statistics are not reconciled');
requireText(main, "import './game/profileStatsRepair';", 'Profile statistics repair is not installed');

const cosmeticCount = ((profile + expansion).match(/nameDe:/g) ?? []).length;
if (cosmeticCount < 40) throw new Error(`Expanded cosmetic collection is incomplete: ${cosmeticCount}`);

console.log('Profile, guild member profiles, Visitenkarten, repaired statistics and weekly elite rewards verified.');
