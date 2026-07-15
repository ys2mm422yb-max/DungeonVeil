import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const requireText = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};

const profile = read('src/game/playerProfile.ts');
const weekly = read('src/game/weeklyElite.ts');
const panel = read('src/components/PlayerProfilePanel.tsx');
const guild = read('src/components/GuildSocialPanel.tsx');
const publicProfile = read('src/components/PlayerProfileCard.tsx');

requireText(panel, "'Visitenkarten'", 'Profile tab must be named Visitenkarten');
requireText(panel, 'WÖCHENTLICHE ELITE-AUFTRÄGE', 'Weekly elite tab is missing');
requireText(panel, 'Elite-Marken', 'Elite marks are missing');
requireText(weekly, "target: 400", 'Hard weekly enemy target is missing');
requireText(weekly, "target: 65", 'Hard weekly room target is missing');
requireText(weekly, "target: 8", 'Hard weekly boss target is missing');
requireText(profile, "id: 'weekly-breaker'", 'Weekly title reward is not equippable');
requireText(profile, "id: 'rift-seal'", 'Weekly calling card reward is not equippable');
requireText(profile, "id: 'night-watch'", 'Weekly avatar reward is not equippable');
requireText(profile, "rarity: 'mythic'", 'Mythic cosmetics are missing');
requireText(guild, 'guild-member-profile-strip', 'Guild member avatars are not shown');
requireText(guild, 'setSelectedProfileId(member.user_id)', 'Guild member cards must open profiles');
requireText(publicProfile, 'profile.avatar_key', 'Public profile does not show the selected avatar');

const titleCount = (profile.match(/id: '[^']+'.*nameDe:/g) ?? []).length;
if (titleCount < 30) throw new Error(`Expanded cosmetic collection is incomplete: ${titleCount}`);

console.log('Profile, guild member profiles, Visitenkarten and weekly elite rewards verified.');
