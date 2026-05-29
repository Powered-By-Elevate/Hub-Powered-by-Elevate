import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureMsalInitialized, msalInstance, msalConfigured } from './lib/msal';

async function boot() {
  // MSAL must finish initializing and process any redirect response BEFORE
  // React renders. Otherwise a popup window briefly renders the LoginPage,
  // which can lead to nested popup errors if the user clicks again.
  if (msalConfigured) {
    try {
      await ensureMsalInitialized();
      await msalInstance.handleRedirectPromise();
    } catch (err) {
      // Don't block the app if MSAL bootstrapping fails; users can still use
      // email/password sign-in.
      console.error('MSAL bootstrap failed:', err);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

boot();

// Unregister any existing service worker to prevent stale cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
