import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export const FRIENDS_EVENT = 'dungeon-veil-friends-changed';

export type OnlineFriend = {
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  friends_since: string;
};

export type OnlineFriendRequest = {
  request_id: string;
  direction: 'incoming' | 'outgoing';
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  created_at: string;
};

export type SentFriendRequest = {
  request_id: string;
  user_id: string;
  display_name: string;
  avatar_key: string | null;
};

function emitFriendsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FRIENDS_EVENT));
  window.dispatchEvent(new Event('dungeon-veil-mailbox-changed'));
}

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!currentOnlineSession()) throw new Error('Nicht angemeldet');
  return authenticatedSupabaseRest<T>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listFriendsOnline(): Promise<OnlineFriend[]> {
  if (!currentOnlineSession()) return [];
  return rpc<OnlineFriend[]>('list_friends');
}

export async function listFriendRequestsOnline(): Promise<OnlineFriendRequest[]> {
  if (!currentOnlineSession()) return [];
  return rpc<OnlineFriendRequest[]>('list_friend_requests');
}

export async function sendFriendRequestOnline(displayName: string): Promise<SentFriendRequest> {
  const rows = await rpc<SentFriendRequest[]>('send_friend_request', { p_display_name: displayName.trim() });
  if (!rows[0]) throw new Error('Freundschaftsanfrage konnte nicht gesendet werden');
  emitFriendsChanged();
  return rows[0];
}

export async function acceptFriendRequestOnline(requestId: string): Promise<string> {
  const friendId = await rpc<string>('accept_friend_request', { p_request_id: requestId });
  emitFriendsChanged();
  return friendId;
}

export async function declineFriendRequestOnline(requestId: string): Promise<void> {
  await rpc<null>('decline_friend_request', { p_request_id: requestId });
  emitFriendsChanged();
}

export async function cancelFriendRequestOnline(requestId: string): Promise<void> {
  await rpc<null>('cancel_friend_request', { p_request_id: requestId });
  emitFriendsChanged();
}

export async function removeFriendOnline(friendId: string): Promise<void> {
  await rpc<null>('remove_friend', { p_friend_id: friendId });
  emitFriendsChanged();
}
