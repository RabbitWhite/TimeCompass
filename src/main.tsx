import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AppProvider } from './store';
import App from './App';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            // New SW installed and waiting to take over
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('sw-update-ready'));
              // Tell the waiting SW it is safe to activate
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter>
  </StrictMode>,
);
