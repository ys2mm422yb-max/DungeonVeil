import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [migration, client, messages] = await Promise.all([
  read('../../../supabase/migrations/20260715114000_fix_friend_query_ambiguity.sql'),
  read('../src/game/friendOnline.ts'),
  read('../src/game/friendErrorMessages.ts'),
]);

const checks = [
  [migration.includes('select p.display_name into v_sender_name'), 'sender name lookup must be qualified'],
  [migration.includes("raise exception 'cannot add yourself'"), 'self request guard is missing'],
  [migration.includes("raise exception 'already friends'"), 'friendship guard is missing'],
  [migration.includes("raise exception 'incoming friend request already pending'"), 'incoming request guard is missing'],
  [migration.includes('on conflict (sender_id, receiver_id) do update'), 'old request reuse is missing'],
  [migration.includes('from public.send_friend_request_by_query(p_display_name) as r'), 'legacy RPC wrapper is missing'],
  [client.includes("import { friendErrorMessage } from './friendErrorMessages'"), 'friendly error helper is not imported'],
  [client.includes('throw new Error(friendErrorMessage(reason))'), 'RPC failures are not mapped'],
  [messages.includes('Freundescode gefunden'), 'not-found player copy is missing'],
  [messages.includes('selbst keine Freundschaftsanfrage'), 'self request copy is missing'],
  [messages.includes('bereits eine offene Anfrage'), 'pending request copy is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Friend query audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Friend query audit passed.');
