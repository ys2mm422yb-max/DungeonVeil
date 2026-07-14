import { createRoot } from 'react-dom/client';

import './game/portalExitPolicy';
import App from './App';
import { MainMenuVisualQa } from './components/MainMenuVisualQa';
import { TutorialVisualQa } from './components/TutorialVisualQa';
import { WorldBossVisualQa } from './components/WorldBossVisualQa';
import { startVersionGuard } from './game/versionGuard';

import './index.css';

const qaMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qa') : null;
if (!qaMode) startVersionGuard();
const qaView = qaMode === 'worldboss'
  ? <WorldBossVisualQa />
  : qaMode === 'tutorial'
    ? <TutorialVisualQa />
    : qaMode === 'menu'
      ? <MainMenuVisualQa />
      : <App />;
createRoot(document.getElementById('root')!).render(qaView);
