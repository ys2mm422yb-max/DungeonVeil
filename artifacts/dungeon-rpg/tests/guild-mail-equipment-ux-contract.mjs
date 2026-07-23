import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const mailbox = read('src/components/MailboxPanel.tsx');
const mailboxClient = read('src/game/guildMailboxOnline.ts');
const migration = read('../../supabase/migrations/20260721135000_mailbox_delete_rpc.sql');
const equipment = read('src/components/screens/VeilChamberScreenV4.tsx');
const equipmentPreview = read('src/components/KayKitEquipmentPreview.tsx');
const equipmentPolish = read('src/equipment-polish.css');
const tabletLayout = read('src/tablet-layout.css');
const entry = read('src/main.tsx');
const profileEquipment = read('src/components/ProfileEquipmentLoadout.tsx');
const optionalState = read('src/game/optionalEquipmentState.ts');
const cloudSync = read('src/game/cloudAccountSyncRuntime.ts');
const saveBundle = read('src/game/persistentSaveBundle.ts');
const runPlayer = read('src/components/kaykitPlayer3D.ts');
const menuPlayer = read('src/components/kaykitVillagePlayer3D.ts');
const loot = read('src/components/kaykitLoot3D.ts');
const menu = read('src/components/screens/MainMenuScreen.tsx');
const profile = read('src/components/PlayerProfilePanel.tsx');
const autopilotSpec = read('tests/autopilot-product-journeys.spec.mjs');
const outsideGuildSpec = read('tests/autopilot-outside-guild.spec.mjs');
const visualSpec = read('tests/guild-mail-equipment-visual.spec.mjs');
const resourceSpec = read('tests/mobile-resource-upgrade.spec.mjs');
const regressionConfig = read('playwright.regression.config.mjs');
const autopilotWorkflow = read('../../.github/workflows/product-autopilot-qa.yml');

assert.match(mailbox, /mailbox-delete-completed/);
assert.match(mailbox, /canDeleteMessage/);
assert.match(mailbox, /message\.actioned_at/);
assert.match(mailbox, /message\.read_at/);
assert.match(mailboxClient, /rpc\/delete_mailbox_messages/);
assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /v_user uuid := auth\.uid\(\)/);
assert.match(migration, /mail\.user_id = v_user/);
assert.match(migration, /mail\.actioned_at is not null/);
assert.match(migration, /mail\.read_at is not null/);
assert.match(migration, /mail\.kind in \('system', 'notice'\)/);
assert.match(migration, /coalesce\(mail\.payload ->> 'kind', ''\) <> 'coop_invite'/);
assert.match(migration, /revoke all on function public\.delete_mailbox_messages\(uuid\[\]\) from public, anon/);
assert.match(migration, /grant execute on function public\.delete_mailbox_messages\(uuid\[\]\) to authenticated/);

assert.match(optionalState, /quiver: true/);
assert.match(optionalState, /updatedAt: Date\.now\(\)/);
assert.match(cloudSync, /OPTIONAL_EQUIPMENT_EVENT/);
assert.match(cloudSync, /COMPANION_COLLECTION_EVENT/);
assert.match(saveBundle, /dungeon-veil-optional-equipment-v1/);
assert.match(saveBundle, /dungeon-veil-companion-collection-v5/);
assert.match(saveBundle, /number\(optionalEquipment\.updatedAt\)/);
assert.match(saveBundle, /number\(companions\.updatedAt\)/);
assert.match(equipment, /equipment-unequip-button/);
assert.match(equipment, /RELIKT ABLEGEN/);
assert.match(equipment, /CompanionManagementPanel/);
assert.match(runPlayer, /isOptionalEquipmentSlotEquipped\('quiver'\)/);
assert.match(menuPlayer, /isOptionalEquipmentSlotEquipped\('quiver'\)/);
assert.match(profileEquipment, /EquipmentArtwork/);

assert.doesNotMatch(loot, /cdn\.jsdelivr\.net/);
assert.match(loot, /usesActualEquipmentModel = true/);
assert.match(loot, /equipment-model-/);
assert.doesNotMatch(equipmentPreview, /cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/);
assert.match(equipmentPreview, /assets\/vendor\/three\/build\/three\.module\.js/);
assert.match(equipmentPreview, /data-three-runtime="local-pinned"/);
assert.match(equipmentPolish, /overflow-wrap: anywhere/);

assert.match(menu, /main-menu-shop-panel/);
assert.match(menu, /main-menu-options-panel/);
assert.match(menu, /main-menu-settings-button/);
assert.match(menu, /main-menu-top-overlay-backdrop/);
assert.match(menu, /top-\[max\(76px/);
assert.doesNotMatch(menu, /main-menu-resource-popover/);
assert.match(menu, /const FILLED_MAILBOX_QA_STATE = Object\.freeze/);
assert.match(menu, /qaState=\{qaMode \? FILLED_MAILBOX_QA_STATE : undefined\}/);
assert.doesNotMatch(menu, /qaState=\{qaMode \? \{ signedIn: true, messages: FILLED_MAILBOX_QA \}/);
assert.match(profile, /grid-cols-5/);
assert.match(profile, /aria-label=\{item\.full\}/);
assert.match(entry, /import '\.\/equipment-polish\.css';/);
assert.match(entry, /import '\.\/equipment-mobile-detail\.css';/);
assert.match(entry, /import '\.\/tablet-layout\.css';/);
assert.match(tabletLayout, /min-width: 768px/);
assert.match(tabletLayout, /guild-social-panel/);
assert.match(tabletLayout, /mailbox-panel/);
assert.match(tabletLayout, /max-width: min\(42rem, calc\(100vw - 3rem\)\)/);

for (const marker of [
  'signed-out hub, solo run and duo entry remain functional',
  'equipment, relic and companion upgrades and optional slots persist',
  'signed-in guild, mailbox and duo controls are reviewable',
  'external runtime request',
  'solo-run-started',
  'companion-upgraded',
]) assert.match(autopilotSpec, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
for (const marker of [
  'signed-in player outside a guild sees creation, mailbox and duo controls',
  'signed-in-outside-guild',
  'signed-in-empty-mailbox',
  'signed-in-outside-guild-duo',
  'external runtime request',
]) assert.match(outsideGuildSpec, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
for (const marker of [
  'filled guild, mailbox, shop and options views are functional and reviewable',
  'profile cosmetics and optional equipment can be inspected and unequipped',
  'visual-shop-gold',
  'visual-shop-dust',
  'visual-options-menu',
  'visual-mailbox-filled',
  'visual-guild-members-filled',
  'visual-profile-refined-overview',
  'visual-equipment-quiver-unequipped',
]) assert.match(visualSpec, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
for (const marker of [
  "getByTestId('main-menu-gold-button').tap()",
  "getByTestId('main-menu-dust-button').tap()",
  "getByTestId('main-menu-settings-button').tap()",
  "getByTestId('main-menu-profile-badge').tap()",
  'main-menu-shop-panel',
  'main-menu-options-panel',
  'Shop schließen',
  'Optionsmenü schließen',
]) assert.match(resourceSpec, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const marker of [
  'Product Autopilot QA',
  'product-contracts',
  'automatic-product-journeys',
  'Build GitHub Pages output once',
  'dungeon-veil-product-build-${{ github.sha }}',
  'actions/download-artifact@v4',
  'tests/autopilot-product-journeys.spec.mjs',
  'tests/autopilot-outside-guild.spec.mjs',
  'tests/guild-mail-equipment-visual.spec.mjs',
  'tests/mobile-resource-upgrade.spec.mjs',
  'product-autopilot-evidence-${{ matrix.project }}',
  'product-autopilot-failure-${{ matrix.project }}',
  'fix/mobile-telegraphs-room-21-50-balance',
]) assert.match(autopilotWorkflow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const supportedProjects = ['iphone-webkit', 'android-chromium', 'ipad-portrait-webkit', 'android-tablet-chromium'];
const workflowProjects = [...autopilotWorkflow.matchAll(/- project:\s*([^\s]+)/g)].map(match => match[1]);
const configProjects = [...regressionConfig.matchAll(/name:\s*'([^']+)'/g)].map(match => match[1]);
assert.deepEqual(workflowProjects, supportedProjects);
assert.deepEqual(configProjects, supportedProjects);
assert.match(regressionConfig, /retries: 0/);
assert.doesNotMatch(regressionConfig, /desktop-chromium|ipad-landscape-webkit/);
assert.doesNotMatch(autopilotWorkflow, /desktop-chromium|ipad-landscape-webkit/);
assert.doesNotMatch(autopilotWorkflow, /enable_auto_merge|auto-merge|issues: write|pull-requests: write/);
assert.match(autopilotWorkflow, /permissions:\s*\n\s*contents: read/);

console.log('Guild, mailbox, isolated Shop and Options, optional equipment, profile, local Three runtime, outside-guild, tablet layout and zero-retry portrait-mobile QA contracts passed.');
