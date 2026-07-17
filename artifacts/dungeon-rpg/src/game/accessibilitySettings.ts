import { markSettingsActivity } from './settingsPersistence';

export type ContrastMode = 'standard' | 'high';
export type TextSizeMode = 'standard';

const STORAGE_KEY = 'dungeon-veil-accessibility-v1';
const SETTINGS_VERSION = 3;
export const ACCESSIBILITY_SETTINGS_EVENT = 'dungeon-veil-accessibility-changed';

export type AccessibilitySettings = {
  contrast: ContrastMode;
  textSize: TextSizeMode;
};

type StoredAccessibilitySettings = AccessibilitySettings & {
  version: number;
  updatedAt: number;
};

const DEFAULT_SETTINGS: AccessibilitySettings = { contrast: 'high', textSize: 'standard' };

function writeStoredSettings(settings: AccessibilitySettings, markActivity: boolean): AccessibilitySettings {
  const updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, version: SETTINGS_VERSION, updatedAt } satisfies StoredAccessibilitySettings));
  } catch {}
  if (markActivity) markSettingsActivity();
  return settings;
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<StoredAccessibilitySettings> : null;
    if (!parsed) return writeStoredSettings({ ...DEFAULT_SETTINGS }, true);
    const settings: AccessibilitySettings = {
      contrast: parsed.contrast === 'standard' ? 'standard' : 'high',
      textSize: 'standard',
    };
    if (parsed.version !== SETTINGS_VERSION || parsed.contrast !== settings.contrast || parsed.textSize !== 'standard') writeStoredSettings(settings, true);
    return settings;
  } catch {
    return writeStoredSettings({ ...DEFAULT_SETTINGS }, true);
  }
}

export function applyAccessibilitySettings(settings = loadAccessibilitySettings()): AccessibilitySettings {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.contrast = settings.contrast;
    document.documentElement.dataset.textSize = 'standard';
  }
  return settings;
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): AccessibilitySettings {
  const normalized: AccessibilitySettings = {
    contrast: settings.contrast === 'standard' ? 'standard' : 'high',
    textSize: 'standard',
  };
  writeStoredSettings(normalized, true);
  applyAccessibilitySettings(normalized);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ACCESSIBILITY_SETTINGS_EVENT, { detail: normalized }));
  return normalized;
}

export function installAccessibilitySettings(): void {
  applyAccessibilitySettings();
  if (typeof window === 'undefined') return;
  window.addEventListener(ACCESSIBILITY_SETTINGS_EVENT, event => {
    const detail = (event as CustomEvent<AccessibilitySettings>).detail;
    if (detail) applyAccessibilitySettings(detail);
  });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) applyAccessibilitySettings(loadAccessibilitySettings());
  });
}
