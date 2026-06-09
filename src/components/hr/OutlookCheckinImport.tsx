import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { getMyCalendarEvents, type MsCalendarEvent } from '../../lib/graph';
import { formatTime12h } from '../shared/utils';

interface Props {
  employees: Employee[];
  onImported: () => void;
}

interface ImportRow {
  event: MsCalendarEvent;
  employee: Employee | null;
  matchedBy: 'email' | 'name' | null;
  date: string;        // YYYY-MM-DD (local)
  time: string;        // HH:MM (local)
  quarter: string;     // Q1..Q4
  year: number;
  alreadyExists: boolean;
  selected: boolean;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function localTime(startIso: string): string {
  const d = new Date(startIso.endsWith('Z') ? startIso : startIso + 'Z');
  if (isNaN(d.getTime())) return '10:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function quarterFor(dateStr: string): { quarter: string; year: number } {
  const [y, m] = dateStr.split('-').map(Number);
  return { quarter: `Q${Math.floor(((m || 1) - 1) / 3) + 1}`, year: y || new Date().getFullYear() };
}

export function OutlookCheckinImport({ employees, onImported }: Props) {
  const { session, profile } = useAuth();
  const msTokenAvailable = !!session?.provider_token;

  const today = new Date();
  const [fromDate, setFromDate] = useState(fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate, setToDate] = useState(fmtDate(new Date(today.getFullYear(), today.getMonth() + 4, 0)));
  const [titleMatch, setTitleMatch] = useState('Quarterly Development Check In');

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  async function fetchEvents() {
    if (!session?.provider_token) { setError('No Microsoft session — sign out and back in with "Sign in with Microsoft" first.'); return; }
    if (!fromDate || !toDate) { setError('Pick a date range.'); return; }
    setLoading(true); setError(''); setResultMsg(''); setRows(null);

    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    const events = await getMyCalendarEvents(session.provider_token, from.toISOString(), to.toISOString());

    const needle = titleMatch.trim().toLowerCase();
    const matchingEvents = events.filter(e => !e.isAllDay && (needle === '' || e.subject.toLowerCase().includes(needle)));

    const hrEmail = (profile?.email ?? session.user?.email ?? '').toLowerCase();
    const empByEmail = new Map(employees.filter(e => e.email).map(e => [e.email.toLowerCase(), e]));

    const built: ImportRow[] = matchingEvents.map(ev => {
      // 1) Prefer matching an attendee email (not HR's own) to an employee.
      let employee: Employee | null = null;
      let matchedBy: 'email' | 'name' | null = null;
      for (const at of ev.attendees) {
        if (!at.email || at.email === hrEmail) continue;
        const emp = empByEmail.get(at.email);
        if (emp) { employee = emp; matchedBy = 'email'; break; }
      }
      // 2) Fall back to the name after the last " - " in the title.
      if (!employee) {
        const idx = ev.subject.lastIndexOf(' - ');
        if (idx >= 0) {
          const nm = ev.subject.slice(idx + 3).trim().toLowerCase();
          const emp = employees.find(e => e.name.toLowerCase() === nm);
          if (emp) { employee = emp; matchedBy = 'name'; }
        }
      }
      const { quarter, year } = quarterFor(ev.date);
      return {
        event: ev,
        employee,
        matchedBy,
        date: ev.date,
        time: localTime(ev.start),
        quarter,
        year,
        alreadyExists: false,
        selected: false,
      };
    });

    // Dedupe against existing quarterly check-ins (employee + quarter + year).
    const empIds = [...new Set(built.filter(r => r.employee).map(r => r.employee!.id))];
    if (empIds.length > 0) {
      const { data: existing } = await supabase
        .from('quarterly_checkins').select('employee_id, quarter, year').in('employee_id', empIds);
      const existsKey = new Set((existing ?? []).map(e => `${e.employee_id}|${e.quarter}|${e.year}`));
      for (const r of built) {
        if (r.employee && existsKey.has(`${r.employee.id}|${r.quarter}|${r.year}`)) r.alreadyExists = true;
      }
    }
    // Default-select matched, not-yet-existing rows.
    for (const r of built) r.selected = !!r.employee && !r.alreadyExists;

    // Sort: importable first, then by date.
    built.sort((a, b) => {
      const aImp = a.employee && !a.alreadyExists ? 0 : 1;
      const bImp = b.employee && !b.alreadyExists ? 0 : 1;
      if (aImp !== bImp) return aImp - bImp;
      return a.date.localeCompare(b.date);
    });

    setLoading(false);
    setRows(built);
    if (built.length === 0) {
      setError(`No calendar events found matching "${titleMatch}" in that date range.`);
    }
  }

  function toggleRow(i: number) {
    setRows(rs => rs ? rs.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r) : rs);
  }

  async function importSelected() {
    if (!rows) return;
    const toImport = rows.filter(r => r.selected && r.employee && !r.alreadyExists);
    if (toImport.length === 0) return;
    setImporting(true); setError(''); setResultMsg('');

    const inserts = toImport.map(r => ({
      employee_id: r.employee!.id,
      quarter: r.quarter,
      year: r.year,
      scheduled_at: r.date,
      scheduled_time: r.time,
      status: 'pending' as const,
      teams_join_url: r.event.joinUrl,
      teams_event_id: r.event.id,
    }));

    const { error: err } = await supabase.from('quarterly_checkins').insert(inserts);
    setImporting(false);
    if (err) { setError(`Import failed: ${err.message}`); return; }

    setResultMsg(`Imported ${inserts.length} quarterly check-in${inserts.length === 1 ? '' : 's'} from your Outlook calendar.`);
    setRows(rs => rs ? rs.map(r => (r.selected && r.employee && !r.alreadyExists) ? { ...r, alreadyExists: true, selected: false } : r) : rs);
    onImported();
  }

  const importable = rows ? rows.filter(r => r.employee && !r.alreadyExists) : [];
  const selectedCount = rows ? rows.filter(r => r.selected && r.employee && !r.alreadyExists).length : 0;
  const matchedCount = rows ? rows.filter(r => r.employee).length : 0;
  const unmatched = rows ? rows.filter(r => !r.employee) : [];

  return (
    <div className="card">
      <div className="card-header">
        <h3>Import Quarterly Check-ins from Outlook</h3>
      </div>
      <div style={{ padding: '0 1.25rem 1rem' }}>
        <p style={{ fontSize: 13, color: '#6B6860', margin: '6px 0 14px' }}>
          Pull the quarterly development check-ins employees booked through your scheduling link straight off your Outlook calendar and create them as tracked Hub check-ins — at each person's self-selected time. Matched to employees by the attendee's email (falling back to the name in the meeting title). Already-imported check-ins are skipped.
        </p>

        {!msTokenAvailable && (
          <div className="error-msg" style={{ marginBottom: 14 }}>
            Microsoft sign-in required. Sign out and back in using "Sign in with Microsoft" to authorize calendar access.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 240, flex: 1 }}>
            <label>Meeting title contains</label>
            <input type="text" value={titleMatch} onChange={e => setTitleMatch(e.target.value)} placeholder="Quarterly Development Check In" />
          </div>
          <button className="btn-primary" onClick={fetchEvents} disabled={!msTokenAvailable || loading}>
            {loading ? 'Fetching…' : rows ? 'Refresh from Outlook' : 'Fetch from Outlook'}
          </button>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
        {resultMsg && <div className="modal-success-box" style={{ marginBottom: 12 }}>{resultMsg}</div>}

        {rows && rows.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: '#6B6860', marginBottom: 10 }}>
              <strong>{rows.length}</strong> matching event{rows.length === 1 ? '' : 's'} · <strong>{importable.length}</strong> ready to import · <strong>{matchedCount}</strong> matched to an employee
            </div>
            {unmatched.length > 0 && (
              <div className="modal-info-box" style={{ marginBottom: 12 }}>
                {unmatched.length} event{unmatched.length === 1 ? '' : 's'} couldn't be matched to an employee (the booking email isn't on any Hub profile, or the name didn't match). They're listed below and left unchecked — fix the employee's email or add the check-in manually.
              </div>
            )}

            <div style={{ maxHeight: 460, overflow: 'auto', border: '1px solid #E5E3DC', borderRadius: 6 }}>
              <table style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8F7F4', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 30 }}></th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Quarter</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const canImport = !!r.employee && !r.alreadyExists;
                    return (
                      <tr key={r.event.id}>
                        <td>
                          <input type="checkbox" checked={r.selected && canImport} disabled={!canImport} onChange={() => toggleRow(i)} />
                        </td>
                        <td>
                          <div className="emp-name">{r.employee?.name ?? <em style={{ color: '#9B9890' }}>{r.event.subject}</em>}</div>
                          {r.employee && r.matchedBy === 'name' && (
                            <div style={{ fontSize: 10, color: '#B45309' }}>matched by name — verify</div>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{formatTime12h(r.time)}</td>
                        <td style={{ fontSize: 12 }}>{r.quarter} {r.year}</td>
                        <td>
                          {!r.employee ? (
                            <span className="badge b-muted">No match</span>
                          ) : r.alreadyExists ? (
                            <span className="badge b-muted">In Hub</span>
                          ) : (
                            <span className="badge b-navy">New</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn-primary" onClick={importSelected} disabled={importing || selectedCount === 0}>
                {importing ? 'Importing…' : `Import ${selectedCount} selected`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
