export type ContrastMode = 'standard' | 'high';
export type TextSizeMode = 'standard' | 'large';

const STORAGE_KEY = 'dungeon-veil-accessibility-v1';
export const ACCESSIBILITY_SETTINGS_EVENT = 'dungeon-veil-accessibility-changed';

export type AccessibilitySettings = {
  contrast: ContrastMode;
  textSize: TextSizeMode;
};

const DEFAULT_SETTINGS: AccessibilitySettings = { contrast: 'standard', textSize: 'standard' };

export function loadAccessibilitySettings(): AccessibilitySettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AccessibilitySettings>;
    return {
      contrast: parsed.contrast === 'high' ? 'high' : 'standard',
      textSize: parsed.textSize === 'large' ? 'large' : 'standard',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function applyAccessibilitySettings(settings = loadAccessibilitySettings()): AccessibilitySettings {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.contrast = settings.contrast;
    document.documentElement.dataset.textSize = settings.textSize;
  }
  return settings;
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): AccessibilitySettings {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  applyAccessibilitySettings(settings);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ACCESSIBILITY_SETTINGS_EVENT, { detail: settings }));
  return settings;
}

export function installAccessibilitySettings(): void {
  applyAccessibilitySettings();
  if (typeof window === 'undefined') return;
  window.addEventListener(ACCESSIBILITY_SETTINGS_EVENT, event => {
    const detail = (event as CustomEvent<AccessibilitySettings>).detail;
    if (detail) applyAccessibilitySettings(detail);
  });
}
