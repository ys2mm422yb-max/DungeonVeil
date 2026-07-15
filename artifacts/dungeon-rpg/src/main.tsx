import { createRoot } from 'react-dom/client';

import './game/portalExitPolicy';
import './game/onlinePresenceRuntime';
import App from './App';
import { GlobalLoadingLayer } from './components/GlobalLoadingLayer';
import { MainMenuVisualQa } from './components/MainMenuVisualQa';
import { TutorialVisualQa } from './components/TutorialVisualQa';
import { UnlockPresentationLayer } from './components/UnlockPresentationLayer';
import { WorldBossVisualQa } from './components/WorldBossVisualQa';
import { installEmailConfirmationRedirect } from './game/emailConfirmationRedirect';
import { startVersionGuard } from './game/versionGuard';

import './index.css';
import './guild-mobile.css';

installEmailConfirmationRedirect();

const qaMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qa') : null;
if (!qaMode) startVersionGuard();
const qaView = qaMode === 'worldboss'
  ? <WorldBossVisualQa />
  : qaMode === 'tutorial'
    ? <TutorialVisualQa />
    : qaMode === 'menu'
      ? <MainMenuVisualQa />
      : null;
const appView = qaView ?? <><App /><GlobalLoadingLayer /><UnlockPresentationLayer /></>;
createRoot(document.getElementById('root')!).render(appView);
