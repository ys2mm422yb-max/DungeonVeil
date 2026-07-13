import { createRoot } from 'react-dom/client';

import App from './App';
import { WorldBossVisualQa } from './components/WorldBossVisualQa';
import { startVersionGuard } from './game/versionGuard';

import './index.css';

const qaMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qa') : null;
if (!qaMode) startVersionGuard();
createRoot(document.getElementById('root')!).render(qaMode === 'worldboss' ? <WorldBossVisualQa /> : <App />);
