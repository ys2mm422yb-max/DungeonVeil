import { readFile } from 'node:fs/promises';

const [badge, menu] = await Promise.all([
  readFile(new URL('../src/components/ProfileBadge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
]);

const legacyLogoSeparation = menu.includes('<ProfileBadge') && menu.includes('header className="mt-12');
const referenceLogoSeparation = menu.includes('<ProfileBadge')
  && ((menu.includes('header className="mt-[100px]') && menu.includes('sm:mt-20'))
    || (menu.includes('header className="mt-[78px]') && menu.includes('sm:mt-[70px]')))
  && menu.includes('DUNGEON VEIL');

const checks = [
  [badge.includes('w-[min(43vw,160px)]') && badge.includes('h-[44px]') && badge.includes('h-7 w-7'), 'profile badge does not use the tighter 160px/44px mobile layout'],
  [badge.includes('top-[max(10px,calc(env(safe-area-inset-top)+4px))]'), 'profile badge safe-area position is incorrect'],
  [badge.includes('rounded-[13px]') && badge.includes('px-1.5 py-1'), 'profile badge spacing does not match the restrained layout'],
  [badge.includes('text-[8.5px]') && badge.includes('text-[5px]'), 'profile badge typography is not compact enough for the mobile composition'],
  [badge.includes('backdrop-blur-xl') && badge.includes('borderColor: `${card.border}9c`'), 'profile badge has lost its restrained translucent treatment'],
  [referenceLogoSeparation || legacyLogoSeparation, 'main menu profile integration is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Compact profile badge audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Compact profile badge audit passed: the tighter top-left profile card remains separated from the mobile logo composition.');
