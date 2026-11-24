import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/press-start-2p/cyrillic-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/cyrillic-400.css';
import './styles.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Dev-only debug handles: let tooling render individual sprites for inspection.
if (import.meta.env.DEV) {
  void import('./game/sprites').then((m) => {
    (window as unknown as Record<string, unknown>).__sprites = m;
  });
  void import('./game/content').then((m) => {
    (window as unknown as Record<string, unknown>).__content = m;
  });
}
