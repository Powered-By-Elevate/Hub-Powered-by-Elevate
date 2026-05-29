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

export interface MsCalendarEvent {
  id: string;
  subject: string;
  /** ISO timestamp in UTC. */
  start: string;
  /** ISO timestamp in UTC. */
  end: string;
  /** YYYY-MM-DD derived from start (in the user's local timezone). */
  date: string;
  location: string | null;
  isAllDay: boolean;
  /** Online meeting / Teams join link, if the event has one. */
  joinUrl: string | null;
  /** Outlook web link to the event. */
  webLink: string | null;
}

// Returns the signed-in user's calendar events between two dates. Uses
// /me/calendarView so recurring meetings are expanded into individual
// occurrences.
export async function getMyCalendarEvents(
  token: string,
  fromIso: string,
  toIso: string,
): Promise<MsCalendarEvent[]> {
  try {
    const path =
      `/me/calendarView` +
      `?startDateTime=${encodeURIComponent(fromIso)}` +
      `&endDateTime=${encodeURIComponent(toIso)}` +
      `&$select=id,subject,start,end,location,isAllDay,onlineMeeting,webLink` +
      `&$orderby=start/dateTime` +
      `&$top=200`;
    const res = await graphFetch(token, path, {
      headers: {
        // Tell Graph to return start/end times in the user's preferred TZ if
        // we knew it, but UTC is the simplest cross-environment choice and we
        // localize in the renderer anyway.
        Prefer: 'outlook.timezone="UTC"',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: MsCalendarEvent[] = (data.value ?? []).map((ev: {
      id: string;
      subject?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
      location?: { displayName?: string };
      isAllDay?: boolean;
      onlineMeeting?: { joinUrl?: string };
      webLink?: string;
    }) => {
      const startIso = ev.start?.dateTime ?? '';
      const startLocal = new Date(startIso + (startIso.endsWith('Z') ? '' : 'Z'));
      const date = isNaN(startLocal.getTime())
        ? ''
        : `${startLocal.getFullYear()}-${String(startLocal.getMonth() + 1).padStart(2, '0')}-${String(startLocal.getDate()).padStart(2, '0')}`;
      return {
        id: ev.id,
        subject: ev.subject ?? '(no title)',
        start: startIso,
        end: ev.end?.dateTime ?? '',
        date,
        location: ev.location?.displayName ?? null,
        isAllDay: !!ev.isAllDay,
        joinUrl: ev.onlineMeeting?.joinUrl ?? null,
        webLink: ev.webLink ?? null,
      };
    });
    return items.filter(i => i.date);
  } catch (err) {
    console.error('Graph /me/calendarView fetch failed:', err);
    return [];
  }
}
