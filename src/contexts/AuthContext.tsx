import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/database.types';
import { getMyMsProfile, getMyMsPhotoUrl, type MsProfile } from '../lib/graph';

// Microsoft SSO availability flag — true when the Azure tenant + client IDs
// are configured for the build. The actual sign-in handshake runs entirely
// inside Supabase Auth via the OAuth code flow, so we don't need MSAL on the
// client.
const msSsoAvailable = !!(import.meta.env.VITE_AZURE_TENANT_ID && import.meta.env.VITE_AZURE_CLIENT_ID);

// Persisted Microsoft access token storage.
//
// Supabase by design does NOT persist OAuth provider tokens to localStorage on
// session refresh — they're stripped from the stored session for security.
// That means after any page refresh, `session.provider_token` comes back null
// and every Graph-dependent feature (photos, Teams meeting creation, directory
// sync, mail send, etc.) silently breaks until the user signs out and back in.
//
// We persist provider_token + provider_refresh_token ourselves on initial
// receipt, and re-hydrate them onto the session object the rest of the app
// reads. The token still expires after ~1 hour on Microsoft's side, but it
// survives refreshes within that hour, which covers the typical HR session.
const MS_TOKEN_KEY = 'hub:ms-provider-token';
const MS_REFRESH_TOKEN_KEY = 'hub:ms-provider-refresh-token';

function persistMsTokens(session: Session | null): void {
  if (session?.provider_token) {
    try { localStorage.setItem(MS_TOKEN_KEY, session.provider_token); } catch { /* quota / private mode */ }
  }
  if (session?.provider_refresh_token) {
    try { localStorage.setItem(MS_REFRESH_TOKEN_KEY, session.provider_refresh_token); } catch { /* ignore */ }
  }
}

function clearMsTokens(): void {
  try {
    localStorage.removeItem(MS_TOKEN_KEY);
    localStorage.removeItem(MS_REFRESH_TOKEN_KEY);
  } catch { /* ignore */ }
}

// Returns the session with provider_token / provider_refresh_token hydrated
// from localStorage if Supabase dropped them on a refresh.
function hydrateMsTokens(session: Session | null): Session | null {
  if (!session) return session;
  if (session.provider_token) return session; // already populated, nothing to do
  let token: string | null = null;
  let refresh: string | null = null;
  try {
    token = localStorage.getItem(MS_TOKEN_KEY);
    refresh = localStorage.getItem(MS_REFRESH_TOKEN_KEY);
  } catch { /* ignore */ }
  if (!token) return session;
  return { ...session, provider_token: token, provider_refresh_token: refresh ?? session.provider_refresh_token };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** Microsoft profile data fetched from Graph for the signed-in user (display name, job title, etc.). */
  msProfile: MsProfile | null;
  /** Object URL for the signed-in user's M365 profile photo, or null. */
  msPhotoUrl: string | null;
  loading: boolean;
  msSsoAvailable: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithMicrosoft: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [msProfile, setMsProfile] = useState<MsProfile | null>(null);
  const [msPhotoUrl, setMsPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fire-and-forget Graph fetch for display name + photo whenever the user
  // signs in via Microsoft. Tokens come from session.provider_token; if it's
  // missing (e.g. email/password sign-in) we silently skip.
  async function syncMsProfile(token: string | null | undefined) {
    if (!token) { setMsProfile(null); setMsPhotoUrl(null); return; }
    const [prof, photo] = await Promise.all([
      getMyMsProfile(token),
      getMyMsPhotoUrl(token),
    ]);
    setMsProfile(prof);
    setMsPhotoUrl(prev => {
      if (prev && prev !== photo) URL.revokeObjectURL(prev);
      return photo;
    });
  }

  async function loadProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfile(null);
    }
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  useEffect(() => {
    let mounted = true;

    // Hard 5-second timeout: if auth hasn't resolved by then, force loading to false
    // This prevents the app from hanging on a white screen if Supabase is slow or
    // the session is corrupted. The app will fall through to the login page.
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check timed out after 5s — forcing app to render');
        setLoading(false);
      }
    }, 5000);

    (async () => {
      try {
        const { data: { session: rawSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = hydrateMsTokens(rawSession);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
          syncMsProfile(session.provider_token);
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        // If something goes wrong, clear the broken session so user can re-login
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, rawSession) => {
      if (!mounted) return;
      // Stash fresh provider tokens on every sign-in so they survive future
      // page refreshes; hydrate from storage when Supabase hands us a session
      // without them (e.g. silent refresh).
      if (event === 'SIGNED_OUT') {
        clearMsTokens();
      } else if (rawSession) {
        persistMsTokens(rawSession);
      }
      const session = hydrateMsTokens(rawSession);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => { await loadProfile(session.user.id); })();
        syncMsProfile(session.provider_token);
      } else {
        setProfile(null);
        setMsProfile(null);
        setMsPhotoUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signInWithMicrosoft(): Promise<{ error: string | null }> {
    if (!msSsoAvailable) return { error: 'Microsoft sign-in is not configured for this environment.' };
    // Hand the entire OAuth handshake to Supabase. It will redirect the
    // browser to Microsoft, handle the callback at its own URL, then redirect
    // back to redirectTo with the Supabase session in the URL hash that
    // supabase-js auto-detects on load.
    // Request the full Graph scope set up front so we only prompt the user
    // for consent once. Covers everything the Hub uses today (profile + photo)
    // plus the features in active development (calendar pull, Teams meeting
    // creation for check-ins, mail send for notifications, directory sync).
    const scopes = [
      'openid', 'profile', 'email',
      'User.Read',
      'User.Read.All',           // directory sync
      'Calendars.ReadWrite',     // pull + create calendar events
      'OnlineMeetings.ReadWrite',// auto-create Teams meetings for check-ins
      'Mail.Send',               // outbound HR notifications
    ].join(' ');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    clearMsTokens();
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, msProfile, msPhotoUrl, loading,
      msSsoAvailable,
      signIn, signInWithMicrosoft, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}