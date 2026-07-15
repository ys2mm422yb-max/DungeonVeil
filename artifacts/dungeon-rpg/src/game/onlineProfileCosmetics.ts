import {
  PROFILE_AVATARS,
  PROFILE_CARDS,
  PROFILE_TITLES,
  type PlayerProfileProgress,
  type ProfileAvatarDefinition,
  type ProfileCardDefinition,
  type ProfileTitleDefinition,
} from './playerProfile';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

const PREFIX = 'dv2';

export type OnlineProfileCosmetics = {
  avatarId: string;
  titleId: string;
  cardId: string;
};

export function encodeOnlineProfileCosmetics(profile: PlayerProfileProgress): string {
  return [PREFIX, profile.selectedAvatar, profile.selectedTitle, profile.selectedCard].map(encodeURIComponent).join(':');
}

export function parseOnlineProfileCosmetics(value: string | null | undefined): OnlineProfileCosmetics {
  if (typeof value === 'string' && value.startsWith(`${PREFIX}:`)) {
    const [, avatarId, titleId, cardId] = value.split(':').map(part => decodeURIComponent(part || ''));
    return {
      avatarId: avatarId || 'ranger',
      titleId: titleId || 'veil-initiate',
      cardId: cardId || 'ash',
    };
  }
  return {
    avatarId: typeof value === 'string' && value.trim() ? value.trim() : 'ranger',
    titleId: 'veil-initiate',
    cardId: 'ash',
  };
}

export function resolveOnlineAvatar(value: string | null | undefined): ProfileAvatarDefinition {
  const cosmetics = parseOnlineProfileCosmetics(value);
  return PROFILE_AVATARS.find(item => item.id === cosmetics.avatarId) ?? PROFILE_AVATARS[0];
}

export function resolveOnlineTitle(value: string | null | undefined): ProfileTitleDefinition {
  const cosmetics = parseOnlineProfileCosmetics(value);
  return PROFILE_TITLES.find(item => item.id === cosmetics.titleId) ?? PROFILE_TITLES[0];
}

export function resolveOnlineCard(value: string | null | undefined): ProfileCardDefinition {
  const cosmetics = parseOnlineProfileCosmetics(value);
  return PROFILE_CARDS.find(item => item.id === cosmetics.cardId) ?? PROFILE_CARDS[0];
}

export async function syncOnlineProfileCosmetics(profile: PlayerProfileProgress): Promise<boolean> {
  const session = currentOnlineSession();
  if (!session) return false;
  await authenticatedSupabaseRest(`profiles?id=eq.${encodeURIComponent(session.user.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ avatar_key: encodeOnlineProfileCosmetics(profile) }),
  });
  return true;
}
