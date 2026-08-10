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
import { installCompanionLiveBoundsRuntime } from './game/companionLiveBoundsRuntime';
import { installControlSettings } from './game/controlSettings';
import { installControlledKayKitRuntime } from './game/controlledKayKitRuntime';
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
import './equipment-polish.css';
import './equipment-mobile-detail.css';
import './tablet-layout.css';

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const qaMode = searchParams?.get('qa') ?? null;
const visualQaMode = searchParams?.get('visualQa') ?? null;

installRoomReadyFailureGuard();
installAccessibilitySettings();
installControlSettings();
installControlledKayKitRuntime();
installDailyQuestRotationRuntime();
installProfileStorageIntegrity();
installPortraitOrientationRuntime();
installPostCombatHazardGuard();
repairLegacyProfileStats();
if (!visualQaMode) installCloudAccountSyncRuntime();
installEmailConfirmationRedirect();
installRunRendererRecovery();
installRuntimeEvidenceBridge();
installCompanionLiveBoundsRuntime();

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
