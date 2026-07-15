import { readFile } from 'node:fs/promises';

const [policy, runtime, main, friends, guild] = await Promise.all([
  readFile(new URL('../src/game/onlinePresence.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/onlinePresenceRuntime.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/FriendsPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GuildPanelMobile.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [policy.includes('ONLINE_PRESENCE_WINDOW_MS = 5 * 60 * 1000') && policy.includes('isPresenceOnline') && policy.includes('formatPresence'), 'shared five-minute presence policy is missing'],
  [policy.includes('publishOnlinePresence') && policy.includes('last_active_at: new Date().toISOString()'), 'active sessions do not publish a heartbeat'],
  [runtime.includes('ONLINE_PRESENCE_TICK_MS') && runtime.includes('ONLINE_PRESENCE_POLL_MS') && runtime.includes("document.visibilityState === 'visible'"), 'presence does not tick, poll and resume on visibility'],
  [main.includes("import './game/onlinePresenceRuntime';"), 'presence runtime is not installed at startup'],
  [runtime.includes('FRIENDS_EVENT') && friends.includes('window.addEventListener(FRIENDS_EVENT'), 'friend presence is not refreshed automatically'],
  [guild.includes('loadPresenceByUserIds') && guild.includes('ONLINE_PRESENCE_REFRESH_EVENT') && guild.includes('ONLINE_PRESENCE_TICK_EVENT'), 'guild presence does not load or refresh automatically'],
  [guild.includes('data-testid="guild-member-presence"') && guild.includes('data-testid="guild-presence-summary"'), 'guild member presence or online summary is missing'],
  [friends.includes('const ONLINE_WINDOW_MS = 5 * 60 * 1000') && friends.includes('formatLastSeen'), 'friend presence threshold or readable last-seen copy is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Online presence audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Online presence audit passed: active heartbeat, five-minute online window, automatic friend refresh and live guild presence are active.');
