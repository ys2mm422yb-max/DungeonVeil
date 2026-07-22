import { createRoot } from 'react-dom/client';

import './game/portalExitPolicy';
import './game/profileCosmeticsExpansion';
import './game/onlinePresenceRuntime';
import App from './App';
import { GlobalLoadingLayer } from './components/GlobalLoadingLayer';
import { MainMenuVisualQa } from './components/MainMenuVisualQa';
import { ProfileLayoutQa } from './components/ProfileLayoutQa';
import { RuntimeDuoEvidenceQa } from './components/RuntimeDuoEvidenceQa';
import { SpectatorPerformanceQa } from './components/SpectatorPerformanceQa';
import { TransientUiVisualQa } from './components/TransientUiVisualQa';
import { TutorialVisualQa } from './components/TutorialVisualQa';
import { UnlockPresentationLayer } from './components/UnlockPresentationLayer';
import { WorldBossVisualQa } from './components/WorldBossVisualQa';
import { installAccessibilitySettings } from './game/accessibilitySettings';
import { installCloudAccountSyncRuntime } from './game/cloudAccountSyncRuntime';
import { installControlSettings } from './game/controlSettings';
import { installDailyQuestRotationRuntime } from './game/dailyQuestRotationRuntime';
import { installEmailConfirmationRedirect } from './game/emailConfirmationRedirect';
import { installPortraitOrientationRuntime } from './game/portraitOrientationRuntime';
import { installPostCombatHazardGuard } from './game/postCombatHazardGuard';
import { repairLegacyProfileStats } from './game/profileStatsRepair';
import { installProfileStorageIntegrity } from './game/profileStorageIntegrity';
import { installRoomReadyFailureGuard } from './game/roomReadyFailureGuard';
import { installRunRendererRecovery } from './game/runRendererRecovery';
import { installRuntimeEvidenceBridge } from './game/runtimeEvidenceBridge';
import { startVersionGuard } from './game/versionGuard';
import { LanguageProvider } from './i18n/LanguageContext';

import './index.css';
import './guild-mobile.css';
import './readability.css';

installRoomReadyFailureGuard();
installAccessibilitySettings();
installControlSettings();
installDailyQuestRotationRuntime();
installProfileStorageIntegrity();
installPortraitOrientationRuntime();
installPostCombatHazardGuard();
repairLegacyProfileStats();
installCloudAccountSyncRuntime();
installEmailConfirmationRedirect();
installRunRendererRecovery();
installRuntimeEvidenceBridge();

const qaMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qa') : null;
if (qaMode === 'states') localStorage.setItem('dungeon-veil-language', 'de');
if (!qaMode) startVersionGuard();
const qaView = qaMode === 'worldboss'
  ? <WorldBossVisualQa />
  : qaMode === 'runtime-duo'
    ? <RuntimeDuoEvidenceQa />
    : qaMode === 'spectator'
      ? <SpectatorPerformanceQa />
      : qaMode === 'profiles'
        ? <ProfileLayoutQa />
        : qaMode === 'tutorial'
          ? <TutorialVisualQa />
          : qaMode === 'states'
            ? <TransientUiVisualQa />
            : qaMode === 'menu'
              ? <MainMenuVisualQa />
              : null;
const appView = qaView
  ? <LanguageProvider>{qaView}</LanguageProvider>
  : <><App /><GlobalLoadingLayer /><UnlockPresentationLayer /></>;
createRoot(document.getElementById('root')!).render(appView);
