import { useState, useEffect } from 'react';
import { Employee, QuarterlyCheckin, AnnualReview, LifecycleCheckin } from '../../lib/database.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTime12h } from '../shared/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getMyCalendarEvents, type MsCalendarEvent } from '../../lib/graph';

interface Props {
  employees: Employee[];
  checkins: QuarterlyCheckin[];
  reviews: AnnualReview[];
  lifecycleCheckins: LifecycleCheckin[];
  onViewEmployee: (id: string) => void;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
function fmtShort(d: Date): string { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HRSchedule({ employees, checkins, reviews, lifecycleCheckins, onViewEmployee }: Props) {
  const { session } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [outlookEvents, setOutlookEvents] = useState<MsCalendarEvent[]>([]);

  const today = fmtDate(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtShort(weekDays[0])} — ${fmtShort(weekDays[6])}, ${weekDays[0].getFullYear()}`;
  const weekStartIso = weekDays[0].toISOString().split('T')[0];
  const weekEndIso = weekDays[6].toISOString().split('T')[0];

  // Pull HR's own Outlook events for the visible week. Uses session.provider_token
  // (the Microsoft access token Supabase exposes after SSO). Falls back silently
  // for non-SSO sessions.
  useEffect(() => {
    const token = session?.provider_token;
    if (!token) { setOutlookEvents([]); return; }
    const from = new Date(weekDays[0]); from.setHours(0, 0, 0, 0);
    const to = new Date(weekDays[6]); to.setHours(23, 59, 59, 999);
    let cancelled = false;
    getMyCalendarEvents(token, from.toISOString(), to.toISOString())
      .then(evs => { if (!cancelled) setOutlookEvents(evs); });
    return () => { cancelled = true; };
  }, [session?.provider_token, weekStart]);

  function outlookForDay(dateStr: string): MsCalendarEvent[] {
    return outlookEvents
      .filter(ev => ev.date === dateStr)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  function fmtOutlookTime(ev: MsCalendarEvent): string {
    if (ev.isAllDay) return 'All day';
    const d = new Date(ev.start.endsWith('Z') ? ev.start : ev.start + 'Z');
    return formatTime12h(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  }

  function empName(id: string | null): string {
    if (!id) return 'Unknown';
    return employees.find(e => e.id === id)?.name ?? 'Unknown';
  }

  // ── Hub events for the week ────────────────────────────────────────────────
  const inWeek = (iso: string | null | undefined) => !!iso && iso >= weekStartIso && iso <= weekEndIso;

  const weekCheckins = [
    ...checkins.filter(c => c.status !== 'completed' && inWeek(c.scheduled_at)).map(c => ({
      id: c.id, employee_id: c.employee_id, date: c.scheduled_at, label: `${c.quarter} ${c.year} Check-in`, kind: 'quarterly' as const,
    })),
    ...lifecycleCheckins.filter(l => l.status !== 'completed' && l.status !== 'skipped' && inWeek(l.scheduled_at)).map(l => ({
      id: l.id, employee_id: l.employee_id, date: l.scheduled_at, label: `Day ${l.milestone_day} Check-in`, kind: 'lifecycle' as const,
    })),
    ...reviews.filter(r => r.status !== 'completed' && r.scheduled_at && inWeek(r.scheduled_at)).map(r => ({
      id: r.id, employee_id: r.employee_id, date: r.scheduled_at!, label: `${r.review_year} Annual Review`, kind: 'review' as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const upcomingStarts = employees
    .filter(e => !e.archived && e.start_date && e.start_date >= today)
    .filter(e => {
      const startDate = new Date(e.start_date + 'T12:00:00');
      const diffDays = Math.round((startDate.getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000);
      return diffDays >= 0 && diffDays <= 14;
    })
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''));

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Schedule</h1>
          <p>Your Outlook calendar plus this week's HR events</p>
        </div>
      </div>

      <div className="content">
        {/* Week view */}
        <div className="card mb2">
          <div className="card-header">
            <h3>Week View</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-ghost sm" style={{ padding: '4px 8px' }} onClick={() => setWeekStart(w => addDays(w, -7))}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1916', minWidth: 190, textAlign: 'center' }}>{weekLabel}</span>
              <button className="btn-ghost sm" style={{ padding: '4px 8px' }} onClick={() => setWeekStart(w => addDays(w, 7))}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="week-grid-desktop">
            {weekDays.map((day, i) => {
              const ds = fmtDate(day);
              const isToday = ds === today;
              const outlook = outlookForDay(ds);
              const dayCheckins = weekCheckins.filter(c => c.date === ds);
              return (
                <div key={ds} style={{
                  borderRight: i < 6 ? '1px solid #F2F1ED' : 'none',
                  minHeight: 120,
                }}>
                  <div style={{
                    padding: '8px 10px 6px', borderBottom: '1px solid #F2F1ED',
                    background: isToday ? '#EEF4FF' : 'none',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9890', letterSpacing: 0.4 }}>{DAY_NAMES[i]}</div>
                    <div style={{ fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? '#1B3F6E' : '#1A1916', marginTop: 2 }}>{day.getDate()}</div>
                    {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1B3F6E', marginTop: 3 }} />}
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    {dayCheckins.length === 0 && outlook.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#C5C3BB', fontStyle: 'italic', padding: '4px 0' }}>No events</div>
                    ) : (
                      <>
                        {dayCheckins.map(c => (
                          <button
                            key={c.id}
                            onClick={() => onViewEmployee(c.employee_id)}
                            style={{
                              all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
                              fontSize: 11, padding: '4px 6px', borderRadius: 5, marginBottom: 4,
                              background: '#E8EFF8', borderLeft: '3px solid #1B3F6E',
                            }}
                            title="Click to open employee detail"
                          >
                            <div style={{ fontWeight: 600, color: '#1A1916', lineHeight: 1.3 }}>{c.label}</div>
                            <div style={{ color: '#9B9890', marginTop: 1 }}>{empName(c.employee_id)}</div>
                          </button>
                        ))}
                        {outlook.map(ev => (
                          <div key={ev.id} style={{
                            fontSize: 11, padding: '4px 6px', borderRadius: 5, marginBottom: 4,
                            background: '#FDF6E3', borderLeft: '3px solid #B45309',
                          }} title={ev.location ? `Outlook · ${ev.location}` : 'Outlook'}>
                            <div style={{ fontWeight: 600, color: '#1A1916', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span aria-hidden="true" style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: '#B45309', color: '#fff', fontWeight: 700, letterSpacing: 0.3 }}>O</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.subject}</span>
                            </div>
                            <div style={{ color: '#9B9890', marginTop: 1 }}>{fmtOutlookTime(ev)}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* This week's check-ins (full list with details) */}
        <div className="card mb2">
          <div className="card-header"><h3>Check-ins {weekLabel}</h3></div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            {weekCheckins.length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                <p style={{ fontSize: 13, color: '#9B9890' }}>No check-ins scheduled this week.</p>
              </div>
            ) : weekCheckins.map(c => (
              <div key={`${c.kind}-${c.id}`} className="sched-item" style={{ cursor: 'pointer' }} onClick={() => onViewEmployee(c.employee_id)}>
                <div className="sched-dot" style={{ background: '#1B3F6E' }} />
                <div className="sched-time">{new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div>
                  <div className="sched-title">{c.label}</div>
                  <div className="sched-sub">{empName(c.employee_id)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming employee starts (next 14 days) */}
        <div className="card">
          <div className="card-header"><h3>Upcoming Starts (next 14 days)</h3></div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            {upcomingStarts.length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                <p style={{ fontSize: 13, color: '#9B9890' }}>No new hires starting in the next two weeks.</p>
              </div>
            ) : upcomingStarts.map(e => (
              <div key={e.id} className="sched-item" style={{ cursor: 'pointer' }} onClick={() => onViewEmployee(e.id)}>
                <div className="sched-dot" style={{ background: '#2D9A60' }} />
                <div className="sched-time">{e.start_date ? new Date(e.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}</div>
                <div>
                  <div className="sched-title">{e.name}</div>
                  <div className="sched-sub">{e.role ?? ''}{e.department ? ` · ${e.department}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
