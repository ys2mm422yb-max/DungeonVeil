import { markSettingsActivity } from './settingsPersistence';

export type JoystickMode = 'fixed' | 'floating';

const STORAGE_KEY = 'dungeon-veil-control-settings-v1';
const SETTINGS_VERSION = 2;
export const CONTROL_SETTINGS_EVENT = 'dungeon-veil-control-settings-changed';

type StoredControlSettings = {
  version: number;
  joystickMode: JoystickMode;
  updatedAt: number;
};

function writeJoystickMode(joystickMode: JoystickMode, markActivity: boolean): JoystickMode {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SETTINGS_VERSION, joystickMode, updatedAt: Date.now() } satisfies StoredControlSettings));
  } catch {}
  if (markActivity) markSettingsActivity();
  return joystickMode;
}

export function loadJoystickMode(): JoystickMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<StoredControlSettings> : null;
    if (!parsed) return writeJoystickMode('fixed', true);
    const joystickMode = parsed.joystickMode === 'floating' ? 'floating' : 'fixed';
    if (parsed.version !== SETTINGS_VERSION) return writeJoystickMode(joystickMode, true);
    return joystickMode;
  } catch {
    return writeJoystickMode('fixed', true);
  }
}

export function saveJoystickMode(joystickMode: JoystickMode): JoystickMode {
  const normalized = joystickMode === 'floating' ? 'floating' : 'fixed';
  writeJoystickMode(normalized, true);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONTROL_SETTINGS_EVENT, { detail: { joystickMode: normalized } }));
  return normalized;
}

export function installControlSettings(): void {
  loadJoystickMode();
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    const joystickMode = loadJoystickMode();
    window.dispatchEvent(new CustomEvent(CONTROL_SETTINGS_EVENT, { detail: { joystickMode } }));
  });
}
