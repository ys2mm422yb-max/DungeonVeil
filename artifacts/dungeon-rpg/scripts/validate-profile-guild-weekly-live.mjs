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
const guildPanel = read('src/components/GuildPanelMobile.tsx');
const publicProfile = read('src/components/PlayerProfileCard.tsx');
const online = read('src/game/onlineProfileCosmetics.ts');
const session = read('src/components/GameSessionBridge.tsx');
const repair = read('src/game/profileStatsRepair.ts');
const main = read('src/main.tsx');

requireText(panel, "'Visitenkarten'", 'Profile tab must be named Visitenkarten');
requireText(panel, 'WÖCHENTLICHE ELITE-AUFTRÄGE', 'Weekly elite tab is missing');
requireText(panel, 'Elite-Marken', 'Elite marks are missing');
requireText(panel, 'unlockedTitles', 'Collection progress counters are missing');
requireText(panel, 'PROFILE_TITLES.length', 'Title collection total is missing');
requireText(panel, 'PROFILE_CARDS.length', 'Calling-card collection total is missing');
requireText(panel, 'PROFILE_AVATARS.length', 'Avatar collection total is missing');
requireText(weekly, 'target: 400', 'Hard weekly enemy target is missing');
requireText(weekly, 'target: 65', 'Hard weekly room target is missing');
requireText(weekly, 'target: 8', 'Hard weekly boss target is missing');
requireText(weekly, 'ownedRewardIds', 'Weekly cosmetic rewards are not persistent');
requireText(profile + expansion, "id: 'weekly-breaker'", 'Weekly title reward is not equippable');
requireText(profile + expansion, "id: 'rift-seal'", 'Weekly calling card reward is not equippable');
requireText(profile + expansion, "id: 'night-watch'", 'Weekly avatar reward is not equippable');
requireText(profile + expansion, 'myth', 'Mythic cosmetics are missing');
requireText(guildPanel, 'data-testid="guild-members-tab"', 'Guild members are not contained in the Members tab');
requireText(guildPanel, 'data-testid="guild-member-profile-button"', 'Guild member cards do not expose a profile action');
requireText(guild, 'onOpenMemberProfile={setSelectedProfileId}', 'Guild member cards do not open public profiles');
if (guild.includes('guild-member-profile-strip')) throw new Error('Obsolete external guild profile strip is still rendered');
requireText(publicProfile, 'resolveOnlineCard', 'Public profile does not show the selected calling card');
requireText(publicProfile, 'resolveOnlineAvatar', 'Public profile does not show the selected avatar');
requireText(publicProfile, 'resolveOnlineTitle', 'Public profile does not show the selected title');
requireText(online, 'syncOnlineProfileCosmetics', 'Equipped cosmetics are not synced online');
requireText(session, 'Math.abs(Number(number.value))', 'Negative-formatted outgoing damage is still ignored');
requireText(repair, 'ownedEquipment - profile.stats.itemsFound', 'Legacy equipment statistics are not reconciled');
requireText(main, "import './game/profileStatsRepair';", 'Profile statistics repair is not installed');

const cosmeticCount = ((profile + expansion).match(/nameDe:/g) ?? []).length;
if (cosmeticCount < 38) throw new Error(`Expanded cosmetic collection is incomplete: ${cosmeticCount}`);

console.log('Profile, guild member profiles in the Members tab, Visitenkarten, repaired statistics and weekly elite rewards verified.');