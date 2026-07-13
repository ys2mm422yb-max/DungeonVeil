import { createRoot } from 'react-dom/client';

import App from './App';
import { TutorialVisualQa } from './components/TutorialVisualQa';
import { WorldBossVisualQa } from './components/WorldBossVisualQa';
import { startVersionGuard } from './game/versionGuard';

import './index.css';

const qaMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qa') : null;
if (!qaMode) startVersionGuard();
const qaView = qaMode === 'worldboss' ? <WorldBossVisualQa /> : qaMode === 'tutorial' ? <TutorialVisualQa /> : <App />;
createRoot(document.getElementById('root')!).render(qaView);
