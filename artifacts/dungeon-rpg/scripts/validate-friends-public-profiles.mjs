import { readFile } from 'node:fs/promises';

const [panel, card, loadout, profileEquipment, client, identity] = await Promise.all([
  readFile(new URL('../src/components/FriendsPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/PlayerProfileCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ProfileEquipmentLoadout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/profileEquipment.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/friendOnline.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/SocialIdentityCard.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [panel.includes('data-testid="friends-self-profile"') && panel.includes('setSelectedProfileId(myProfile.id)'), 'own public profile is not reachable from friends'],
  [panel.includes('data-testid="friend-card"') && panel.includes('data-testid="friend-profile-button"'), 'friend cards do not expose a dedicated public-profile action'],
  [panel.includes('incoming-friend-request-card') && panel.includes('<SocialIdentityCard') && panel.includes('setSelectedProfileId(request.user_id)'), 'incoming requests cannot be reviewed through cosmetic public-profile cards'],
  [panel.includes('outgoing-friend-request-card') && panel.includes('Gesendete Anfrage · Profil öffnen'), 'outgoing requests cannot reopen public profiles'],
  [panel.includes('incoming-friend-request-actions') && panel.includes('acceptFriendRequestOnline') && panel.includes('declineFriendRequestOnline'), 'profile review is not separated from incoming request actions'],
  [panel.includes('friends-add-player') && panel.includes('friends-add-input') && panel.includes('friends-add-send'), 'friend search and sending controls are incomplete'],
  [panel.includes('<PlayerProfileCard') && card.includes('public-player-profile-dialog'), 'friends are not connected to the complete public profile dialog'],
  [card.includes('public-player-profile-tablet-columns') && card.includes('<ProfileEquipmentLoadout') && card.includes('testId="public-player-profile-equipment"'), 'friend profiles do not use the responsive tablet layout and centralized current equipment detail'],
  [profileEquipment.includes('normalizeProfileEquipmentItems') && loadout.includes('ACTIVE_EQUIPMENT_SLOTS.map') && !card.toLowerCase().includes('talisman') && !loadout.toLowerCase().includes('talisman'), 'friend profiles can still expose retired equipment slots'],
  [loadout.includes('<KayKitEquipmentPreview') && (loadout.match(/<KayKitEquipmentPreview\b/g) ?? []).length === 1, 'friend profile equipment creates more than one controlled item renderer'],
  [panel.includes('friend-spectate-button') && panel.includes('<SpectatorScreen') && !panel.includes('inviteGuildMember'), 'live friend viewing is missing or guild invitation remains in friend cards'],
  [identity.includes('resolveOnlineAvatar') && identity.includes('resolveOnlineTitle') && identity.includes('resolveOnlineCard'), 'social cards do not show equipped cosmetics'],
  [client.includes('user_id: string') && client.includes("direction: 'incoming' | 'outgoing'") && client.includes('activity_state'), 'friend request or activity data lacks profile routing identifiers'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Friends/public-profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Friends/public-profile audit passed: friend and request cards open responsive centralized current-loadout profiles, legacy slots stay hidden, actions remain separate and active runs can be watched.');
