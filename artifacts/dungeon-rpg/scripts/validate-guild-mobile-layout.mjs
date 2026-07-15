import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, panel, social, invite, mobileCss] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/GuildInviteLinkCard.tsx'),
  read('../src/guild-mobile.css'),
]);

const checks = [
  [!menu.includes("import { GuildInviteLinkCard }") && !menu.includes('<GuildInviteLinkCard language={language} /><GuildSocialPanel'), 'separate invite card still sits above the guild panel'],
  [menu.includes("<GuildSocialPanel language={language} onClose={() => setOverlay(null)}"), 'guild overlay does not own a fixed close callback'],
  [panel.includes('data-testid="guild-close-button"') && panel.includes('onClick={onClose}') && panel.includes('absolute right-0 top-0 z-30'), 'fixed guild close control is missing'],
  [panel.includes('data-testid="guild-invite-tab"') && panel.includes('<GuildInviteLinkCard language={language} />'), 'link sharing is not isolated inside the Invite tab'],
  [panel.includes("tabButton('chat', 'Chat')") && panel.includes('<GuildChatPanel guildId={membership.guild.id}'), 'member guild chat tab is missing'],
  [social.includes('guild-member-profile-strip') && social.includes('setSelectedProfileId(member.user_id)') && !social.includes('absolute right-14 top-3'), 'guild member profiles are not inline or a floating profile control can still overlap the close button'],
  [mobileCss.includes("[data-testid='guild-social-panel']") && mobileCss.includes('height: auto !important;'), 'guild social shell is not content-adaptive'],
  [mobileCss.includes('max-height: calc(100dvh') && mobileCss.includes('env(safe-area-inset-top)') && mobileCss.includes('env(safe-area-inset-bottom)'), 'mobile guild shell does not respect viewport safe areas'],
  [mobileCss.includes("[data-testid='guild-panel-shell']") && mobileCss.includes('min-height: 0 !important;') && mobileCss.includes('max-height: min(70dvh, 620px) !important;'), 'guild panel still forces an oversized minimum height'],
  [mobileCss.includes("[data-testid='guild-member-profile-strip']") && mobileCss.includes('overflow-x: auto;'), 'member profile content can escape the guild frame'],
  [mobileCss.includes('overflow-x: hidden;') && !mobileCss.includes('height: 100dvh;'), 'horizontal overflow or the legacy full-viewport guild height remains'],
  [!invite.includes('border-sky-300') && !invite.includes('bg-sky-400') && invite.includes('border-amber-300'), 'obsolete blue invitation styling remains'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Guild mobile layout audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Guild mobile layout audit passed: the window adapts to content, stays inside safe areas and contains every guild surface.');
