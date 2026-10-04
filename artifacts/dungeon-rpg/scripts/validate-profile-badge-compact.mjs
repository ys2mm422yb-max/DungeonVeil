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
  [badge.includes('w-[min(43vw,160px)]') && badge.includes('h-[60px]') && badge.includes('h-9 w-9'), 'profile badge does not align to the shared 160px/60px top-HUD row'],
  [badge.includes('top-[max(10px,calc(env(safe-area-inset-top)+4px))]'), 'profile badge safe-area position is incorrect'],
  [badge.includes('rounded-[15px]') && badge.includes('px-2 py-1.5'), 'profile badge spacing does not match the aligned top-HUD layout'],
  [badge.includes('text-[9px]') && badge.includes('text-[5.5px]'), 'profile badge typography is not legible within the mobile top-HUD composition'],
  [!badge.includes('backdrop-blur') && badge.includes('borderColor: `${card.border}9c`'), 'profile badge must keep its card identity without WebKit backdrop rasterization blur'],
  [referenceLogoSeparation || legacyLogoSeparation, 'main menu profile integration is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Compact profile badge audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Compact profile badge audit passed: the tighter top-left profile card remains separated from the mobile logo composition.');
