import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AppProvider } from './store.js';
import App from './App.js';
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register("/Lifetracker/" + 'sw.js')
            .then((registration) => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker)
                    return;
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
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(HashRouter, { children: _jsx(AppProvider, { children: _jsx(App, {}) }) }) }));
