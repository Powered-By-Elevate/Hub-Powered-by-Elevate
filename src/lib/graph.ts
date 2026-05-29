// Microsoft Graph helpers.
//
// All calls authenticate with the signed-in user's M365 access token, which
// Supabase Auth exposes on the session as `session.provider_token` after a
// successful Microsoft OAuth sign-in. The token lifetime is ~1 hour; once it
// expires, the helpers return null and the UI falls back to non-Graph data.
// (We can wire up provider_refresh_token later if we want longer-lived
// background Graph calls.)
//
// Scope footprint right now: just `User.Read` (basic profile + own photo).
// Broader Graph features (Calendars, Mail, Directory) need scopes added to
// the signInWithOAuth call in AuthContext, which will trigger a user
// re-consent dialog on next sign-in.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function graphFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(GRAPH_BASE + path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface MsProfile {
  displayName: string | null;
  jobTitle: string | null;
  department: string | null;
  mail: string | null;
}

export async function getMyMsProfile(token: string): Promise<MsProfile | null> {
  try {
    const res = await graphFetch(token, '/me?$select=displayName,jobTitle,department,mail,userPrincipalName');
    if (!res.ok) return null;
    const data = await res.json();
    return {
      displayName: data.displayName ?? null,
      jobTitle: data.jobTitle ?? null,
      department: data.department ?? null,
      mail: data.mail ?? data.userPrincipalName ?? null,
    };
  } catch (err) {
    console.error('Graph /me fetch failed:', err);
    return null;
  }
}

// Returns an object URL (blob:) for the signed-in user's M365 profile photo,
// or null if the user has no photo set or the request fails. Caller is
// responsible for revoking the URL on cleanup if needed; the browser
// auto-cleans on tab close.
export async function getMyMsPhotoUrl(token: string): Promise<string | null> {
  try {
    const res = await graphFetch(token, '/me/photo/$value');
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size === 0) return null;
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Graph /me/photo fetch failed:', err);
    return null;
  }
}
