import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/database.types';

// Microsoft SSO availability flag — true when the Azure tenant + client IDs
// are configured for the build. The actual sign-in handshake runs entirely
// inside Supabase Auth via the OAuth code flow, so we don't need MSAL on the
// client.
const msSsoAvailable = !!(import.meta.env.VITE_AZURE_TENANT_ID && import.meta.env.VITE_AZURE_CLIENT_ID);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
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
  const [loading, setLoading] = useState(true);

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => { await loadProfile(session.user.id); })();
      } else {
        setProfile(null);
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: 'openid profile email User.Read',
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
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