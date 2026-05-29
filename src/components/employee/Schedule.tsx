import { useState, useEffect } from 'react';
import { Employee, Schedule, QuarterlyCheckin, AnnualReview } from '../../lib/database.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatScheduleTime, scheduleSortKey, formatTime12h } from '../shared/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getMyCalendarEvents, type MsCalendarEvent } from '../../lib/graph';

interface Props {
  employee: Employee;
  schedules: Schedule[];
  checkins: QuarterlyCheckin[];
  reviews: AnnualReview[];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function checkinStatusColor(status: string) {
  if (status === 'overdue') return '#DC2626';
  if (status === 'completed') return '#2D9A60';
  return '#1B3F6E';
}

export function EmpSchedule({ employee, schedules, checkins, reviews }: Props) {
  const { session } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [mobileDay, setMobileDay] = useState<string>(() => fmtDate(new Date()));
  const [outlookEvents, setOutlookEvents] = useState<MsCalendarEvent[]>([]);

  const today = fmtDate(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtShort(weekDays[0])} — ${fmtShort(weekDays[6])}, ${weekDays[0].getFullYear()}`;

  // Pull Outlook events for the visible week whenever it changes (and we
  // have a Microsoft access token from SSO). Falls back silently if the
  // token is missing or expired.
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

  // Day 1 schedule items (no date attached)
  const day1Items = schedules.filter(s => !s.schedule_date);

  // Date-based schedule items
  const datedItems = schedules.filter(s => !!s.schedule_date);

  function itemsForDay(dateStr: string): Schedule[] {
    return datedItems
      .filter(s => s.schedule_date === dateStr)
      .sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)));
  }

  const upcomingCheckins = checkins
    .filter(c => c.status !== 'completed')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const upcomingReviews = reviews
    .filter(r => r.status !== 'completed')
    .sort((a, b) => a.review_year - b.review_year);

  const hasUpcoming = upcomingCheckins.length > 0 || upcomingReviews.length > 0;

  const mobileDayItems = itemsForDay(mobileDay);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Schedule</h1>
          <p>Weekly view and upcoming check-ins</p>
        </div>
      </div>
      <div className="content">

        {/* Week view card */}
        <div id="emp-schedule-week" className="card mb2">
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

          {/* Desktop: 7-column grid */}
          <div className="week-grid-desktop">
            {weekDays.map((day, i) => {
              const ds = fmtDate(day);
              const isToday = ds === today;
              const items = itemsForDay(ds);
              return (
                <div key={ds} style={{
                  borderRight: i < 6 ? '1px solid #F2F1ED' : 'none',
                  minHeight: 120,
                }}>
                  <div style={{
                    padding: '8px 10px 6px',
                    borderBottom: '1px solid #F2F1ED',
                    background: isToday ? '#EEF4FF' : 'none',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9890', letterSpacing: 0.4 }}>{DAY_NAMES[i]}</div>
                    <div style={{
                      fontSize: 15, fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#1B3F6E' : '#1A1916',
                      marginTop: 2,
                    }}>
                      {day.getDate()}
                    </div>
                    {isToday && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1B3F6E', marginTop: 3 }} />
                    )}
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    {items.length === 0 && outlookForDay(ds).length === 0 ? (
                      <div style={{ fontSize: 11, color: '#C5C3BB', fontStyle: 'italic', padding: '4px 0' }}>No events</div>
                    ) : (
                      <>
                        {items.map(ev => (
                          <div key={ev.id} style={{
                            fontSize: 11, padding: '4px 6px', borderRadius: 5, marginBottom: 4,
                            background: ev.color ? ev.color + '22' : '#E8EFF8',
                            borderLeft: `3px solid ${ev.color ?? '#1B3F6E'}`,
                          }}>
                            <div style={{ fontWeight: 600, color: '#1A1916', lineHeight: 1.3 }}>{ev.title}</div>
                            {(() => { const t = formatScheduleTime(ev); return t ? <div style={{ color: '#9B9890', marginTop: 1 }}>{t}</div> : null; })()}
                          </div>
                        ))}
                        {outlookForDay(ds).map(ev => (
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

          {/* Mobile: day strip + day events */}
          <div className="week-grid-mobile">
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #E5E3DC', scrollbarWidth: 'none' }}>
              {weekDays.map((day, i) => {
                const ds = fmtDate(day);
                const isToday = ds === today;
                const isSelected = ds === mobileDay;
                return (
                  <button key={ds} onClick={() => setMobileDay(ds)} style={{
                    flex: '0 0 auto', width: 52, padding: '8px 4px', border: 'none', cursor: 'pointer',
                    background: isSelected ? '#E8EFF8' : 'none',
                    borderBottom: isSelected ? '2px solid #1B3F6E' : '2px solid transparent',
                    transition: 'all .15s',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#9B9890', letterSpacing: 0.4, textAlign: 'center' }}>{DAY_NAMES[i]}</div>
                    <div style={{ fontSize: 16, fontWeight: isToday ? 700 : 500, color: isToday ? '#1B3F6E' : '#1A1916', textAlign: 'center', marginTop: 2 }}>{day.getDate()}</div>
                    {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1B3F6E', margin: '2px auto 0' }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                {DAY_FULL[weekDays.findIndex(d => fmtDate(d) === mobileDay)] ?? ''}, {fmtShort(new Date(mobileDay + 'T12:00:00'))}
              </div>
              {mobileDayItems.length === 0 && outlookForDay(mobileDay).length === 0 ? (
                <div style={{ fontSize: 13, color: '#9B9890', fontStyle: 'italic' }}>No events scheduled</div>
              ) : (
                <>
                  {mobileDayItems.map(ev => (
                    <div key={ev.id} className="sched-item">
                      <div className="sched-dot" style={{ background: ev.color ?? '#1B3F6E' }} />
                      <div className="sched-time">{formatScheduleTime(ev) || '—'}</div>
                      <div>
                        <div className="sched-title">{ev.title}</div>
                        {ev.location && <div className="sched-sub">{ev.location}</div>}
                      </div>
                    </div>
                  ))}
                  {outlookForDay(mobileDay).map(ev => (
                    <div key={ev.id} className="sched-item">
                      <div className="sched-dot" style={{ background: '#B45309' }} />
                      <div className="sched-time">{fmtOutlookTime(ev)}</div>
                      <div>
                        <div className="sched-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span aria-hidden="true" style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#B45309', color: '#fff', fontWeight: 700, letterSpacing: 0.4 }}>OUTLOOK</span>
                          {ev.subject}
                        </div>
                        {ev.location && <div className="sched-sub">{ev.location}</div>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {console.log('[Schedule] employee.lifecycle_status:', employee.lifecycle_status) as unknown as null}
        {/* Day 1 schedule — only for onboarding employees */}
        {employee.lifecycle_status === 'onboarding' && (
        <div id="emp-schedule-day1" className="card mb2">
          <div className="card-header"><h3>Today's Schedule</h3></div>
          <div style={{ padding: '0 1.25rem' }}>
            {day1Items.length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                <p style={{ fontSize: 13, color: '#9B9890' }}>No Day 1 schedule set yet.</p>
              </div>
            ) : [...day1Items]
                  .sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)))
                  .map(s => (
                    <div key={s.id} className="sched-item">
                      <div className="sched-dot" style={{ background: s.color ?? '#1B3F6E' }} />
                      <div className="sched-time">{formatScheduleTime(s) || '—'}</div>
                      <div><div className="sched-title">{s.title}</div><div className="sched-sub">{s.location}</div></div>
                    </div>
                  ))}
          </div>
        </div>
        )}

        {/* Upcoming check-ins & reviews */}
        <div id="emp-schedule-upcoming" className="card">
          <div className="card-header"><h3>Upcoming Check-ins &amp; Reviews</h3></div>
          <div style={{ padding: '0 1.25rem' }}>
            {!hasUpcoming ? (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                <p style={{ fontSize: 13, color: '#9B9890' }}>No upcoming check-ins scheduled.</p>
              </div>
            ) : (
              <>
                {upcomingCheckins.map(c => (
                  <div key={c.id} className="sched-item">
                    <div className="sched-dot" style={{ background: checkinStatusColor(c.status) }} />
                    <div className="sched-time">{c.quarter} {c.year}</div>
                    <div>
                      <div className="sched-title">Quarterly Check-in</div>
                      <div className="sched-sub">
                        {c.status === 'overdue' ? 'Overdue' : `Scheduled ${new Date(c.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingReviews.map(r => (
                  <div key={r.id} className="sched-item">
                    <div className="sched-dot" style={{ background: checkinStatusColor(r.status) }} />
                    <div className="sched-time">{r.review_year}</div>
                    <div>
                      <div className="sched-title">Annual Review</div>
                      <div className="sched-sub">
                        {r.scheduled_at
                          ? `Scheduled ${new Date(r.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : 'Date TBD'}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
