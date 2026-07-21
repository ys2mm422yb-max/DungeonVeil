import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const mailbox = read('src/components/MailboxPanel.tsx');
const mailboxClient = read('src/game/guildMailboxOnline.ts');
const migration = read('../../supabase/migrations/20260721135000_mailbox_delete_rpc.sql');
const equipment = read('src/components/screens/VeilChamberScreenV4.tsx');
const profileEquipment = read('src/components/ProfileEquipmentLoadout.tsx');
const optionalState = read('src/game/optionalEquipmentState.ts');
const cloudSync = read('src/game/cloudAccountSyncRuntime.ts');
const saveBundle = read('src/game/persistentSaveBundle.ts');
const runPlayer = read('src/components/kaykitPlayer3D.ts');
const menuPlayer = read('src/components/kaykitVillagePlayer3D.ts');
const loot = read('src/components/kaykitLoot3D.ts');
const menu = read('src/components/screens/MainMenuScreen.tsx');
const profile = read('src/components/PlayerProfilePanel.tsx');

assert.match(mailbox, /mailbox-delete-completed/);
assert.match(mailbox, /canDeleteMessage/);
assert.match(mailbox, /message\.actioned_at/);
assert.match(mailbox, /message\.read_at/);
assert.match(mailboxClient, /rpc\/delete_mailbox_messages/);
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

assert.match(menu, /main-menu-resource-popover/);
assert.match(menu, /top-\[max\(76px/);
assert.match(profile, /grid-cols-5/);
assert.match(profile, /aria-label=\{item\.full\}/);

console.log('Guild, mailbox, optional equipment, profile, loot and cloud UX contracts passed.');
