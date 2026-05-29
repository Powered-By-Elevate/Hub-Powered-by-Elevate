import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureMsalInitialized, msalInstance, msalConfigured } from './lib/msal';
import { supabase } from './lib/supabase';

async function boot() {
  // If we're returning from a Microsoft loginRedirect, MSAL needs to process
  // the response in the URL hash BEFORE React renders. We then immediately
  // exchange the resulting ID token for a Supabase session so AuthContext's
  // onAuthStateChange picks it up on first render.
  if (msalConfigured) {
    try {
      await ensureMsalInitialized();
      const response = await msalInstance.handleRedirectPromise();
      if (response?.account) {
        msalInstance.setActiveAccount(response.account);
      }
      if (response?.idToken) {
        // Microsoft's id_token contains the nonce MSAL sent in the auth
        // request. Supabase requires us to forward that nonce so it can
        // verify the token wasn't replayed.
        const nonce = (response.idTokenClaims as { nonce?: string } | undefined)?.nonce;
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'azure',
          token: response.idToken,
          nonce,
        });
        if (error) console.error('Supabase signInWithIdToken failed:', error);
      }
    } catch (err) {
      // Don't block the app if MSAL bootstrapping fails — users can still use
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
