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
  /** Event attendees (lower-cased emails + display names), for matching. */
  attendees: { email: string; name: string | null }[];
}

const CAL_SELECT = 'id,subject,start,end,location,isAllDay,onlineMeeting,webLink,attendees';

interface RawMsEvent {
  id: string;
  subject?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  location?: { displayName?: string };
  isAllDay?: boolean;
  onlineMeeting?: { joinUrl?: string };
  webLink?: string;
  attendees?: { emailAddress?: { address?: string; name?: string } }[];
}

function mapMsEvent(ev: RawMsEvent): MsCalendarEvent {
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
    attendees: (ev.attendees ?? [])
      .map(at => ({ email: (at.emailAddress?.address ?? '').toLowerCase(), name: at.emailAddress?.name ?? null }))
      .filter(a => a.email),
  };
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
      `&$select=${CAL_SELECT}` +
      `&$orderby=start/dateTime` +
      `&$top=200`;
    const res = await graphFetch(token, path, { headers: { Prefer: 'outlook.timezone="UTC"' } });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.value ?? []) as RawMsEvent[]).map(mapMsEvent).filter(i => i.date);
  } catch (err) {
    console.error('Graph /me/calendarView fetch failed:', err);
    return [];
  }
}

export type CalendarAccess = 'ok' | 'forbidden' | 'not-found' | 'error';

// Returns another user's calendar events using the SIGNED-IN user's delegated
// token (/users/{email}/calendarView). This works for any calendar the
// signed-in user can already see — their own delegate access plus whatever the
// tenant's Microsoft 365 calendar-sharing settings expose. Returns a structured
// result so the UI can tell "no access / not shared" apart from "no events".
export async function getUserCalendarEvents(
  token: string,
  userEmail: string,
  fromIso: string,
  toIso: string,
): Promise<{ events: MsCalendarEvent[]; access: CalendarAccess }> {
  try {
    const path =
      `/users/${encodeURIComponent(userEmail)}/calendarView` +
      `?startDateTime=${encodeURIComponent(fromIso)}` +
      `&endDateTime=${encodeURIComponent(toIso)}` +
      `&$select=${CAL_SELECT}` +
      `&$orderby=start/dateTime` +
      `&$top=200`;
    const res = await graphFetch(token, path, { headers: { Prefer: 'outlook.timezone="UTC"' } });
    if (!res.ok) {
      const access: CalendarAccess = res.status === 403 ? 'forbidden' : res.status === 404 ? 'not-found' : 'error';
      return { events: [], access };
    }
    const data = await res.json();
    return { events: ((data.value ?? []) as RawMsEvent[]).map(mapMsEvent).filter(i => i.date), access: 'ok' };
  } catch (err) {
    console.error('Graph /users/{email}/calendarView fetch failed:', err);
    return { events: [], access: 'error' };
  }
}

interface RawSchedule {
  scheduleItems?: {
    status?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
    subject?: string;
    location?: string;
  }[];
}

// Free/busy fallback. /me/calendar/getSchedule returns busy / tentative / OOF
// blocks for any mailbox in the org using the signed-in user's delegated token.
// It relies on the tenant's default free/busy sharing (on for everyone in most
// Microsoft 365 orgs), so it still works when the full calendar isn't shared.
// Subjects and locations come through only when the org's sharing level
// includes them (LimitedDetails / FullDetails); otherwise items read as "Busy".
export async function getUserSchedule(
  token: string,
  userEmail: string,
  fromIso: string,
  toIso: string,
): Promise<{ events: MsCalendarEvent[]; access: CalendarAccess; hasDetail: boolean }> {
  try {
    const body = {
      schedules: [userEmail],
      startTime: { dateTime: fromIso.replace('Z', ''), timeZone: 'UTC' },
      endTime: { dateTime: toIso.replace('Z', ''), timeZone: 'UTC' },
      availabilityViewInterval: 60,
    };
    const res = await graphFetch(token, '/me/calendar/getSchedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { events: [], access: res.status === 403 ? 'forbidden' : 'error', hasDetail: false };
    }
    const data = await res.json();
    const sched = ((data.value ?? []) as RawSchedule[])[0];
    const statusLabel: Record<string, string> = {
      busy: 'Busy', tentative: 'Tentative', oof: 'Out of office', workingElsewhere: 'Working elsewhere',
    };
    let hasDetail = false;
    const events: MsCalendarEvent[] = (sched?.scheduleItems ?? [])
      .filter(it => (it.status ?? 'busy') !== 'free')
      .map((it, idx) => {
        const startIso = it.start?.dateTime ?? '';
        const local = new Date(startIso + (startIso.endsWith('Z') ? '' : 'Z'));
        const date = isNaN(local.getTime())
          ? ''
          : `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        if (it.subject) hasDetail = true;
        return {
          id: `fb-${idx}-${startIso}`,
          subject: it.subject ?? statusLabel[it.status ?? 'busy'] ?? 'Busy',
          start: startIso,
          end: it.end?.dateTime ?? '',
          date,
          location: it.location ?? null,
          isAllDay: false,
          joinUrl: null,
          webLink: null,
          attendees: [],
        };
      })
      .filter(e => e.date);
    return { events, access: 'ok', hasDetail };
  } catch (err) {
    console.error('Graph /me/calendar/getSchedule fetch failed:', err);
    return { events: [], access: 'error', hasDetail: false };
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

// Fetches a single tenant user by their email / UPN, including their manager.
// Used for the "Refresh from M365" button on the per-employee page when HR
// wants to pull fresh data for one person without running a full directory
// sync. Returns null on 404 or any failure.
export async function getTenantUserByEmail(token: string, email: string): Promise<MsTenantUser | null> {
  try {
    const path =
      `/users/${encodeURIComponent(email)}` +
      `?$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone,businessPhones,accountEnabled` +
      `&$expand=manager($select=id,displayName,mail,userPrincipalName)`;
    const res = await graphFetch(token, path);
    if (!res.ok) return null;
    const u = await res.json();
    const manager = u.manager ?? null;
    return {
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
    };
  } catch (err) {
    console.error('Graph /users/{email} error:', err);
    return null;
  }
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

// Creates a calendar event on the signed-in user's calendar with a Teams
// meeting attached AND sends invites to the supplied attendee emails. This
// is the right API for HR scheduling a check-in: the meeting lands on both
// HR's calendar AND the employee's, and the join URL is generated by Teams
// automatically. Returns the join URL on success, null on failure.
//
// For a meeting that should NOT send invites (just a join link), pass an
// empty attendees array.
export async function createEventWithTeamsMeeting(
  token: string,
  args: {
    subject: string;
    startDateTime: string;
    endDateTime: string;
    /**
     * IANA timezone the wall-clock start/end times are expressed in (e.g.
     * "America/Chicago"). Defaults to the browser's local timezone so a
     * check-in HR types as 11:00 AM lands at 11:00 AM on the invite — NOT
     * 11:00 UTC, which would show as 6:00 AM Central.
     */
    timeZone?: string;
    attendees?: { email: string; name?: string }[];
    /** Plain-text body shown in the calendar event description. */
    body?: string;
  },
): Promise<{ joinUrl: string | null; eventId: string | null } | null> {
  try {
    // Interpret the supplied wall-clock times in the browser's local timezone
    // by default. Microsoft Graph accepts IANA names (e.g. "America/Chicago")
    // in the event body, and localizes the invite for every recipient. Falling
    // back to 'UTC' here was the cause of meetings landing ~5–6 hours early.
    const localTz = typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;
    const tz = args.timeZone ?? localTz ?? 'UTC';
    const attendees = (args.attendees ?? []).map(a => ({
      type: 'required',
      emailAddress: { address: a.email, ...(a.name ? { name: a.name } : {}) },
    }));
    const res = await graphFetch(token, '/me/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: args.subject,
        start: { dateTime: args.startDateTime, timeZone: tz },
        end: { dateTime: args.endDateTime, timeZone: tz },
        attendees,
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
        body: args.body
          ? { contentType: 'Text', content: args.body }
          : undefined,
      }),
    });
    if (!res.ok) {
      console.error('Graph /me/events failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      joinUrl: data.onlineMeeting?.joinUrl ?? data.onlineMeetingUrl ?? null,
      // Outlook event id — stored so we can cancel the invite later if the
      // check-in/review is deleted from the Hub.
      eventId: data.id ?? null,
    };
  } catch (err) {
    console.error('Graph /me/events error:', err);
    return null;
  }
}

// Cancels (deletes) a calendar event on the signed-in user's calendar by its
// Outlook event id. Microsoft automatically sends cancellation notices to the
// attendees. Returns true on success; treats 404 (already gone) as success so
// callers can delete the Hub record without worrying about a stale id.
export async function deleteCalendarEvent(token: string, eventId: string): Promise<boolean> {
  try {
    const res = await graphFetch(token, `/me/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
    if (res.ok || res.status === 404) return true;
    console.error('Graph delete /me/events failed:', res.status, await res.text());
    return false;
  } catch (err) {
    console.error('Graph delete /me/events error:', err);
    return false;
  }
}

// Creates a bare Microsoft Teams meeting (no calendar invite, no attendees).
// Kept for the rare case where HR wants a link without scheduling.
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
