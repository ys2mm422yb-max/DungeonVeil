import { readFile } from 'node:fs/promises';

const [badge, menu] = await Promise.all([
  readFile(new URL('../src/components/ProfileBadge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
]);

const legacyLogoSeparation = menu.includes('<ProfileBadge') && menu.includes('header className="mt-12');
const referenceLogoSeparation = menu.includes('<ProfileBadge')
  && menu.includes('header className="mt-[112px]')
  && menu.includes('sm:mt-24')
  && menu.includes('DUNGEON VEIL');

const checks = [
  [badge.includes('w-[min(47vw,184px)]') && badge.includes('h-[52px]') && badge.includes('h-9 w-9'), 'profile badge is not compact enough'],
  [badge.includes('top-[max(10px,calc(env(safe-area-inset-top)+4px))]'), 'profile badge safe-area position is incorrect'],
  [badge.includes('rounded-[15px]') && badge.includes('px-2 py-1.5'), 'profile badge spacing is still too bulky'],
  [badge.includes('text-[9px]') && badge.includes('text-[5.5px]'), 'profile badge typography is not compact'],
  [legacyLogoSeparation || referenceLogoSeparation, 'main menu profile integration is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Compact profile badge audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Compact profile badge audit passed: the top-left profile card uses the final 184px/52px layout and remains separated from the logo.');
