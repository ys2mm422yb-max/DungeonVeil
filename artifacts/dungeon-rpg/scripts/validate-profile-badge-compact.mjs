import { readFile } from 'node:fs/promises';

const [badge, menu] = await Promise.all([
  readFile(new URL('../src/components/ProfileBadge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [badge.includes('max-w-[210px]') && badge.includes('h-9 w-9'), 'profile badge is not compact enough'],
  [badge.includes('top-[max(8px,calc(env(safe-area-inset-top)+2px))]'), 'profile badge is still positioned too low'],
  [badge.includes('rounded-xl') && badge.includes('px-2 py-1.5'), 'profile badge spacing is still too bulky'],
  [menu.includes('<ProfileBadge') && menu.includes('header className="mt-12'), 'main menu profile integration is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Compact profile badge audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Compact profile badge audit passed: the top-left profile card is smaller, higher and separated from the logo.');
