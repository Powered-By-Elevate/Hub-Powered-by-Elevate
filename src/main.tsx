import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/fx.css';
import { initFx } from './lib/fx';
import { Toaster } from './components/shared/Toaster';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);

// Motion + micro-interaction engine (ripple, card glow). No-ops under
// prefers-reduced-motion. Safe to call once at startup.
initFx();

// Unregister any existing service worker to prevent stale cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
