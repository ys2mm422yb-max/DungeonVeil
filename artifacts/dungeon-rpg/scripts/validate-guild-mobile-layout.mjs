import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, panel, social, invite] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/GuildInviteLinkCard.tsx'),
]);

const checks = [
  [!menu.includes("import { GuildInviteLinkCard }") && !menu.includes('<GuildInviteLinkCard language={language} /><GuildSocialPanel'), 'separate invite card still sits above the guild panel'],
  [menu.includes("<GuildSocialPanel language={language} onClose={() => setOverlay(null)}"), 'guild overlay does not own a fixed close callback'],
  [panel.includes('data-testid="guild-close-button"') && panel.includes('onClick={onClose}') && panel.includes('absolute right-0 top-0 z-30'), 'fixed guild close control is missing'],
  [panel.includes('data-testid="guild-invite-tab"') && panel.includes('<GuildInviteLinkCard language={language} />'), 'link sharing is not isolated inside the Invite tab'],
  [social.includes('absolute right-14 top-3'), 'profile control can overlap the fixed close button'],
  [!invite.includes('border-sky-300') && !invite.includes('bg-sky-400') && invite.includes('border-amber-300'), 'obsolete blue invitation styling remains'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Guild mobile layout audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Guild mobile layout audit passed: close control stays visible and invitations live only in the Invite tab.');
