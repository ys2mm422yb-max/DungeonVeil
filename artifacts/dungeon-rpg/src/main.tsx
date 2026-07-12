import { createRoot } from 'react-dom/client';

import App from './App';
import { startVersionGuard } from './game/versionGuard';

import './index.css';

startVersionGuard();
createRoot(document.getElementById('root')!).render(<App />);
