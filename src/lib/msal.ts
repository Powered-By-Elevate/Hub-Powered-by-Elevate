// MSAL configuration for Microsoft 365 SSO + Microsoft Graph access.
//
// The Hub uses a "dual-auth" strategy during rollout: Supabase email/password
// continues to work, and "Sign in with Microsoft" hands off to MSAL → Entra ID,
// then exchanges the returned ID token for a Supabase session via
// supabase.auth.signInWithIdToken({ provider: 'azure', ... }).
//
// The Azure provider must be enabled in the Supabase dashboard (Auth → Providers)
// with the same client ID / tenant ID below for that exchange to succeed.
//
// Tenant + client IDs come from env so prod and dev can diverge if needed.
// They're not secrets — they live in the browser bundle by design (SPA + PKCE).

import { PublicClientApplication, AuthenticationResult } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined;

export const msalConfigured = !!(tenantId && clientId);

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: clientId ?? '',
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : undefined,
    redirectUri: typeof window !== 'undefined' ? window.location.origin + '/' : '/',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
});

let initPromise: Promise<void> | null = null;
export function ensureMsalInitialized(): Promise<void> {
  if (!initPromise) initPromise = msalInstance.initialize();
  return initPromise;
}

// Scopes requested at login. openid/profile/email give us the OIDC id_token
// Supabase verifies; User.Read gives basic Graph profile access for free.
export const LOGIN_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

// Scope packs for Graph features — request incrementally via acquireGraphToken
// so users only consent to what's actually used.
export const GRAPH_SCOPES = {
  calendar: ['Calendars.ReadWrite'],
  mail: ['Mail.Send'],
  directory: ['User.Read.All', 'Group.Read.All'],
  files: ['Files.Read.All', 'Sites.Read.All'],
  meetings: ['OnlineMeetings.ReadWrite'],
};

export async function loginWithMicrosoft(): Promise<AuthenticationResult> {
  if (!msalConfigured) throw new Error('Microsoft sign-in is not configured.');
  await ensureMsalInitialized();
  const result = await msalInstance.loginPopup({
    scopes: LOGIN_SCOPES,
    prompt: 'select_account',
  });
  if (result.account) msalInstance.setActiveAccount(result.account);
  return result;
}

export async function logoutMicrosoft(): Promise<void> {
  await ensureMsalInitialized();
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (account) {
    try { await msalInstance.logoutPopup({ account }); } catch { /* user closed popup */ }
  }
}

// Acquire a Graph access token for the given scopes. Tries silent first
// (MSAL cache / refresh token), falls back to interactive popup if consent
// is needed. Returns null if no MSAL account is signed in.
export async function acquireGraphToken(scopes: string[]): Promise<string | null> {
  if (!msalConfigured) return null;
  await ensureMsalInitialized();
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return null;
  try {
    const result = await msalInstance.acquireTokenSilent({ account, scopes });
    return result.accessToken;
  } catch {
    const result = await msalInstance.acquireTokenPopup({ scopes, account });
    return result.accessToken;
  }
}
