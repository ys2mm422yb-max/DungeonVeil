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
const runPlayer = read('src/components/kaykitPlayer3D.ts');
const menuPlayer = read('src/components/kaykitVillagePlayer3D.ts');
const loot = read('src/components/kaykitLoot3D.ts');
const menu = read('src/components/screens/MainMenuScreen.tsx');
const profile = read('src/components/PlayerProfilePanel.tsx');

assert.match(mailbox, /mailbox-delete-completed/);
assert.match(mailbox, /canDeleteMessage/);
assert.match(mailboxClient, /rpc\/delete_mailbox_messages/);
assert.match(migration, /mail\.user_id = v_user/);
assert.match(migration, /mail\.kind in \('guild_invite', 'friend_request', 'reward'\)/);
assert.match(migration, /grant execute on function public\.delete_mailbox_messages\(uuid\[\]\) to authenticated/);

assert.match(optionalState, /quiver: true/);
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

console.log('Guild, mailbox, optional equipment, profile and loot UX contracts passed.');
