import { readFile } from 'node:fs/promises';

const [card, client, guild, friends] = await Promise.all([
  readFile(new URL('../src/components/PlayerProfileCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/socialProgressOnline.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GuildSocialPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/FriendsPanel.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [card.includes('data-testid="public-player-profile-dialog"') && card.includes('role="dialog"') && card.includes('aria-modal="true"'), 'public profile is not an accessible modal dialog'],
  [card.includes('public-player-profile-close') && card.includes("event.key === 'Escape'"), 'public profile lacks reliable close controls'],
  [card.includes('public-player-profile-loading') && card.includes('public-player-profile-error') && card.includes('public-player-profile-empty'), 'public profile loading, error or missing-profile state is absent'],
  [card.includes('public-player-profile-friend-code') && card.includes('navigator.clipboard'), 'friend code is not exposed as a copyable public field'],
  [card.includes('public-player-profile-progress') && card.includes('public-player-profile-social-stats') && card.includes('public-player-profile-details'), 'public profile progress, social statistics or details are incomplete'],
  [card.includes('public-player-profile-achievements') && card.includes('achievement_keys'), 'public achievements are missing'],
  [client.includes("'get_social_profile_card'") && client.includes('SocialProfileCardData'), 'public profile RPC client is missing'],
  [guild.includes('<PlayerProfileCard') && friends.includes('<PlayerProfileCard'), 'public profiles are not reachable from guilds and friends'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Public player profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Public player profile audit passed: mobile-safe modal, full public progression, social statistics, friend code, achievements and guild/friend entry points are active.');
