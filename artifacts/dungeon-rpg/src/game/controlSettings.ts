export type JoystickMode = 'fixed' | 'floating';

const STORAGE_KEY = 'dungeon-veil-control-settings-v1';
export const CONTROL_SETTINGS_EVENT = 'dungeon-veil-control-settings-changed';

export function loadJoystickMode(): JoystickMode {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { joystickMode?: unknown };
    return parsed.joystickMode === 'floating' ? 'floating' : 'fixed';
  } catch {
    return 'fixed';
  }
}

export function saveJoystickMode(joystickMode: JoystickMode): JoystickMode {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ joystickMode })); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONTROL_SETTINGS_EVENT, { detail: { joystickMode } }));
  return joystickMode;
}
