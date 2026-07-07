import React from 'react';
import { GameState } from '../game/engine';
import { Language } from '../i18n/translations';

export interface GamePausePanelProps {
  gameState: GameState;
  language: Language;
  paused: string;
  resume: string;
  settings: string;
  classNameText: string;
  onResume: () => void;
  onSave: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
  onLanguage: (language: Language) => void;
}

export function GamePausePanel(_props: GamePausePanelProps) {
  return null;
}
