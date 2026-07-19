import { createRoot } from 'react-dom/client';

import './game/portalExitPolicy';
import './game/profileCosmeticsExpansion';
import './game/onlinePresenceRuntime';
import App from './App';
import { GlobalLoadingLayer } from './components/GlobalLoadingLayer';
import { MainMenuVisualQa } from './components/MainMenuVisualQa';
import { ProfileLayoutQa } from './components/ProfileLayoutQa';
import { SpectatorPerformanceQa } from './components/SpectatorPerformanceQa';
import { TutorialVisualQa } from './components/TutorialVisualQa';
import { UnlockPresentationLayer } from './components/UnlockPresentationLayer';
import { WorldBossVisualQa } from './components/WorldBossVisualQa';
import { installAccessibilitySettings } from './game/accessibilitySettings';
import { installCloudAccountSyncRuntime } from './game/cloudAccountSyncRuntime';
import { installControlSettings } from './game/controlSettings';
import { installDailyQuestRotationRuntime } from './game/dailyQuestRotationRuntime';
import { installEmailConfirmationRedirect } from './game/emailConfirmationRedirect';
import { installPortraitOrientationRuntime } from './game/portraitOrientationRuntime';
import { repairLegacyProfileStats } from './game/profileStatsRepair';
import { installProfileStorageIntegrity } from './game/profileStorageIntegrity';
import { startVersionGuard } from './game/versionGuard';

import './index.css';
import './guild-mobile.css';
import './readability.css';

installAccessibilitySettings();
installControlSettings();
installDailyQuestRotationRuntime();
installProfileStorageIntegrity();
installPortraitOrientationRuntime();
repairLegacyProfileStats();
installCloudAccountSyncRuntime();
installEmailConfirmationRedirect();

const qaMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qa') : null;
if (!qaMode) startVersionGuard();
const qaView = qaMode === 'worldboss'
  ? <WorldBossVisualQa />
  : qaMode === 'spectator'
    ? <SpectatorPerformanceQa />
    : qaMode === 'profiles'
      ? <ProfileLayoutQa />
      : qaMode === 'tutorial'
        ? <TutorialVisualQa />
        : qaMode === 'menu'
          ? <MainMenuVisualQa />
          : null;
const appView = qaView ?? <><App /><GlobalLoadingLayer /><UnlockPresentationLayer /></>;
createRoot(document.getElementById('root')!).render(appView);
