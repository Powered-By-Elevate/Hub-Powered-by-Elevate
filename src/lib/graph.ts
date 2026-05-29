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

// Module-level cache so we don't re-fetch the same user's photo every time
// the avatar mounts (lists, navigation, etc.). Keyed by lower-cased email.
// Cached values: blob: URL string, null (no photo / failed), or in-flight
// Promise<...> that callers can await without firing a duplicate request.
const userPhotoCache = new Map<string, string | null | Promise<string | null>>();

// Returns a blob: URL for the user with the given email's M365 profile photo,
// or null if the user has no photo or access is denied. Requires User.Read.All
// for arbitrary users. Falls back to userPrincipalName lookup which is what
// most M365 tenants use for the email-style identifier.
export async function getUserMsPhotoUrlByEmail(token: string, email: string): Promise<string | null> {
  const key = email.toLowerCase();
  const cached = userPhotoCache.get(key);
  if (cached !== undefined) return cached instanceof Promise ? cached : cached;
  const promise = (async (): Promise<string | null> => {
    try {
      const res = await graphFetch(token, `/users/${encodeURIComponent(email)}/photo/$value`);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size === 0) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  })();
  userPhotoCache.set(key, promise);
  const result = await promise;
  userPhotoCache.set(key, result);
  return result;
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

export interface MsTenantUser {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string | null;
  jobTitle: string | null;
  department: string | null;
  mobilePhone: string | null;
  businessPhone: string | null;
  accountEnabled: boolean;
  /** Manager email pulled via $expand=manager. Null if the user has no manager set in Entra. */
  managerEmail: string | null;
  /** Manager display name from Entra, for nicer UI copy. */
  managerName: string | null;
}

// Lists all users in the signed-in user's Microsoft tenant including each
// user's manager (single email per user). Paginates transparently via
// @odata.nextLink. Requires User.Read.All scope.
export async function listTenantUsers(token: string): Promise<MsTenantUser[]> {
  const out: MsTenantUser[] = [];
  // $expand=manager returns a nested manager object for each user. We can't
  // use $select on the outer entity AND $expand=manager without restricting
  // the manager projection too, so we restrict via the nested form.
  let url: string | null =
    `${GRAPH_BASE}/users` +
    `?$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone,businessPhones,accountEnabled` +
    `&$expand=manager($select=id,displayName,mail,userPrincipalName)` +
    `&$top=500`;
  try {
    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Graph /users failed:', res.status, await res.text());
        return out;
      }
      const data = await res.json();
      for (const u of data.value ?? []) {
        const manager = u.manager ?? null;
        out.push({
          id: u.id,
          displayName: u.displayName ?? null,
          mail: u.mail ?? null,
          userPrincipalName: u.userPrincipalName ?? null,
          jobTitle: u.jobTitle ?? null,
          department: u.department ?? null,
          mobilePhone: u.mobilePhone ?? null,
          businessPhone: (u.businessPhones && u.businessPhones[0]) ?? null,
          accountEnabled: u.accountEnabled !== false,
          managerEmail: (manager?.mail ?? manager?.userPrincipalName ?? null)?.toLowerCase() ?? null,
          managerName: manager?.displayName ?? null,
        });
      }
      url = data['@odata.nextLink'] ?? null;
    }
  } catch (err) {
    console.error('Graph /users error:', err);
  }
  return out;
}

// Sends an email from the signed-in user's mailbox via Graph /me/sendMail.
// Returns true on success. Caller is responsible for surfacing errors to the
// user — we log to console here.
export async function sendMail(
  token: string,
  args: { to: string | string[]; subject: string; body: string; isHtml?: boolean },
): Promise<boolean> {
  try {
    const toAddresses = (Array.isArray(args.to) ? args.to : [args.to])
      .filter(Boolean)
      .map(addr => ({ emailAddress: { address: addr } }));
    const res = await graphFetch(token, '/me/sendMail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: args.subject,
          body: {
            contentType: args.isHtml ? 'HTML' : 'Text',
            content: args.body,
          },
          toRecipients: toAddresses,
        },
        saveToSentItems: true,
      }),
    });
    if (!res.ok) {
      console.error('Graph /me/sendMail failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Graph /me/sendMail error:', err);
    return false;
  }
}

// Creates a Microsoft Teams meeting for the signed-in user. Used to attach a
// Teams link to a Hub check-in / review at scheduling time. Returns the join
// URL string, or null if the call fails.
export async function createOnlineMeeting(
  token: string,
  args: { subject: string; startDateTime: string; endDateTime: string },
): Promise<string | null> {
  try {
    const res = await graphFetch(token, '/me/onlineMeetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.error('Graph /me/onlineMeetings failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.joinWebUrl ?? data.joinUrl ?? null;
  } catch (err) {
    console.error('Graph /me/onlineMeetings error:', err);
    return null;
  }
}
