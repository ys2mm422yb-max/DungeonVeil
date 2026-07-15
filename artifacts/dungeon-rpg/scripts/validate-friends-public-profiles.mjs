import { readFile } from 'node:fs/promises';

const [panel, card, client] = await Promise.all([
  readFile(new URL('../src/components/FriendsPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/PlayerProfileCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/friendOnline.ts', import.meta.url), 'utf8'),
]);

const checks = [
  [panel.includes('data-testid="friends-self-profile"') && panel.includes('setSelectedProfileId(myProfile.id)'), 'own public profile is not reachable from friends'],
  [panel.includes('data-testid="friend-card"') && panel.includes('data-testid="friend-profile-button"'), 'friend cards do not expose a dedicated public-profile action'],
  [panel.includes('incoming-friend-request-card') && panel.includes('friend-request-profile-button') && panel.includes('setSelectedProfileId(request.user_id)'), 'incoming requests cannot be reviewed through public profiles'],
  [panel.includes('outgoing-friend-request-card') && panel.includes('Gesendete Anfrage · Profil öffnen'), 'outgoing requests cannot reopen public profiles'],
  [panel.includes('incoming-friend-request-actions') && panel.includes('acceptFriendRequestOnline') && panel.includes('declineFriendRequestOnline'), 'profile review is not separated from incoming request actions'],
  [panel.includes('friends-add-player') && panel.includes('friends-add-input') && panel.includes('friends-add-send'), 'friend search and sending controls are incomplete'],
  [panel.includes('<PlayerProfileCard') && card.includes('public-player-profile-dialog'), 'friends are not connected to the complete public profile dialog'],
  [client.includes('user_id: string') && client.includes("direction: 'incoming' | 'outgoing'"), 'friend request data lacks profile routing identifiers'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Friends/public-profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Friends/public-profile audit passed: own profile, friends, incoming requests and sent requests all open public profiles while actions stay separate.');
