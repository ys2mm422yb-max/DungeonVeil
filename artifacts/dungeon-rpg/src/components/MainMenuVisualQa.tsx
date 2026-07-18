import React, { useEffect } from 'react';
import { LanguageProvider, useLanguage } from '../i18n/LanguageContext';
import { MainMenuScreen } from './screens/MainMenuScreen';

function MenuQaContent() {
  const { setLanguage } = useLanguage();
  useEffect(() => { setLanguage('de'); }, [setLanguage]);

  return <MainMenuScreen
    saveData={null}
    onNewGame={() => {}}
    onContinue={() => {}}
    onStartCoop={() => {}}
    onVeilChamber={() => {}}
    onCodex={() => {}}
    onSettings={() => {}}
    onCredits={() => {}}
  />;
}

export function MainMenuVisualQa() {
  return <LanguageProvider><MenuQaContent /></LanguageProvider>;
}
