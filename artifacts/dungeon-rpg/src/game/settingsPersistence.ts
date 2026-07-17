const PROFILE_STORAGE_KEY = 'dungeon-veil-player-profile-v1';
const SETTINGS_ACTIVITY_KEY = 'dungeon-veil-settings-activity-v1';

export const SETTINGS_PERSISTENCE_EVENT = 'dungeon-veil-settings-persistence-changed';

export function markSettingsActivity(): number {
  const updatedAt = Date.now();
  try {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (rawProfile) {
      const profile = JSON.parse(rawProfile) as Record<string, unknown>;
      if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
        profile.updatedAt = updatedAt;
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      }
    }
    localStorage.setItem(SETTINGS_ACTIVITY_KEY, JSON.stringify({ version: 1, updatedAt }));
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SETTINGS_PERSISTENCE_EVENT, { detail: { updatedAt } }));
  return updatedAt;
}
