export type FriendErrorLanguage = 'de' | 'en';

function preferredLanguage(): FriendErrorLanguage {
  try {
    const stored = localStorage.getItem('dungeon-veil-language');
    if (stored === 'de' || stored === 'en') return stored;
  } catch {}
  if (typeof navigator !== 'undefined' && /^de\b/i.test(navigator.language)) return 'de';
  return 'en';
}

export function friendErrorMessage(reason: unknown, language: FriendErrorLanguage = preferredLanguage()): string {
  const de = language === 'de';
  const raw = reason instanceof Error ? reason.message : String(reason ?? '');
  const message = raw.toLowerCase();

  if (/authentication required|nicht angemeldet|sitzung abgelaufen/.test(message)) {
    return de ? 'Bitte melde dich erneut bei Online & Cloud an.' : 'Please sign in to Online & Cloud again.';
  }
  if (/query too short|spielername eingeben/.test(message)) {
    return de ? 'Gib mindestens zwei Zeichen oder einen vollständigen Freundescode ein.' : 'Enter at least two characters or a complete friend code.';
  }
  if (/player not found|spieler nicht gefunden/.test(message)) {
    return de ? 'Kein Spieler mit diesem Namen oder Freundescode gefunden.' : 'No player found with that name or friend code.';
  }
  if (/cannot add yourself|nicht selbst hinzufügen|selbst hinzufügen/.test(message)) {
    return de ? 'Du kannst dir selbst keine Freundschaftsanfrage senden.' : 'You cannot send a friend request to yourself.';
  }
  if (/already friends|bereits freunde/.test(message)) {
    return de ? 'Ihr seid bereits miteinander befreundet.' : 'You are already friends.';
  }
  if (/incoming friend request already pending|hat dir bereits eine anfrage/.test(message)) {
    return de ? 'Diese Person hat dir bereits eine Anfrage geschickt. Öffne den Tab „Anfragen“.' : 'This player already sent you a request. Open the Requests tab.';
  }
  if (/friend request already pending|request already pending|anfrage wurde bereits|bereits gesendet|duplicate key|unique constraint/.test(message)) {
    return de ? 'Für diesen Spieler besteht bereits eine offene Anfrage.' : 'A request for this player is already pending.';
  }
  if (/failed to fetch|network|load failed|timeout|offline/.test(message)) {
    return de ? 'Der Online-Dienst ist gerade nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.' : 'The online service is currently unavailable. Check your connection and try again.';
  }

  return de ? 'Die Freundesaktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.' : 'The friend action could not be completed. Please try again.';
}
