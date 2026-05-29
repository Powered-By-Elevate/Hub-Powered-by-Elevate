import { useState } from 'react';
import { Employee, Schedule } from '../../lib/database.types';
import { formatScheduleTime } from '../shared/utils';
import { EmployeeAvatar } from '../shared/EmployeeAvatar';
import { Mail, MessageSquare, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface Props {
  employee: Employee;
  teammates: Employee[];
  allEmployees?: Employee[];
  schedules: Schedule[];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function EmpTeam({ employee: me, teammates, allEmployees = [], schedules }: Props) {
  const [calTab, setCalTab] = useState<'team' | 'calendar'>('team');
  const [teamView, setTeamView] = useState<'dept' | 'company'>('dept');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => fmtDate(new Date()));

  const today = fmtDate(new Date());
  const hasCompany = !!me.company_id;

  const companyMembers = hasCompany
    ? allEmployees.filter(e => e.id !== me.id && !e.archived && e.company_id === me.company_id && !e.is_test_account)
    : teammates;
  const visibleTeammates = teamView === 'company' && hasCompany ? companyMembers : teammates;
  const allMembers = [me, ...visibleTeammates];

  const byDept: Record<string, Employee[]> = {};
  if (teamView === 'company') {
    for (const emp of visibleTeammates) {
      const d = emp.department ?? 'Other';
      if (!byDept[d]) byDept[d] = [];
      byDept[d].push(emp);
    }
  }

  const datedSchedules = schedules.filter(s => s.schedule_date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtDisplay(weekDays[0])} — ${fmtDisplay(weekDays[6])}, ${weekDays[0].getFullYear()}`;

  function memberScheduleForDay(member: Employee, dateStr: string): Schedule[] {
    return datedSchedules.filter(s =>
      s.schedule_date === dateStr &&
      (s.employee_id === member.id || (s.department && s.department === me.department))
    );
  }

  const selectedDayMemberSchedules = allMembers.map(m => ({
    member: m,
    events: memberScheduleForDay(m, selectedDay),
  }));

  function teamsLink(email: string) {
    return `msteams:/l/chat/0/0?users=${encodeURIComponent(email)}`;
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Team</h1>
          <p>
            {teamView === 'company' ? 'My Company' : (me.department ?? 'My Department')}
            {' · '}{allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="content">
      <div id="emp-team-tabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: '#fff', borderRadius: 14, border: '1px solid #E5E3DC', overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
            <button
              className={`tab-btn${calTab === 'team' ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px' }}
              onClick={() => setCalTab('team')}
            >
              Team Members
            </button>
            <button
              className={`tab-btn${calTab === 'calendar' ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px' }}
              onClick={() => setCalTab('calendar')}
            >
              <CalendarDays size={14} />
              Team Calendar
            </button>
          </div>
          {hasCompany && calTab === 'team' && (
            <div id="emp-team-scope-toggle" style={{ display: 'flex', gap: 4, padding: '0 12px', alignItems: 'center' }}>
              <button
                onClick={() => setTeamView('dept')}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: teamView === 'dept' ? '#1B3F6E' : '#F2F1ED',
                  color: teamView === 'dept' ? '#fff' : '#6B6860',
                  transition: 'all .15s',
                }}
              >My Dept</button>
              <button
                onClick={() => setTeamView('company')}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: teamView === 'company' ? '#1B3F6E' : '#F2F1ED',
                  color: teamView === 'company' ? '#fff' : '#6B6860',
                  transition: 'all .15s',
                }}
              >My Company</button>
            </div>
          )}
        </div>

        {calTab === 'team' && teamView === 'dept' && (
          <div>
            <div id="emp-team-self" className="card mb2">
              <div className="card-body" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14 }}>
                <EmployeeAvatar email={me.email} name={me.name} size={48} className="av-navy" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{me.name} <span className="badge b-navy" style={{ marginLeft: 6 }}>You</span></div>
                  <div style={{ fontSize: 12, color: '#6B6860' }}>{me.role} · {me.department}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`mailto:${me.email}`} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={12} /> Email
                  </a>
                  <a href={teamsLink(me.email)} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageSquare size={12} /> Teams
                  </a>
                </div>
              </div>
            </div>

            {teammates.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>No teammates yet in {me.department}</p>
                  <div className="esub">Your teammates will appear here once they join the platform.</div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h3>{me.department ?? 'My Department'}</h3>
                  <span style={{ fontSize: 11, background: '#F2F1ED', color: '#9B9890', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{teammates.length}</span>
                </div>
                <div style={{ padding: '0 1.25rem' }}>
                  {teammates.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F2F1ED' }}>
                      <EmployeeAvatar email={t.email} name={t.name} size={36} className="av-navy" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: '#9B9890' }}>
                          {t.role}
                          {t.manager === me.name && <span className="badge b-muted" style={{ marginLeft: 8, fontSize: 10 }}>Your Report</span>}
                          {me.manager === t.name && <span className="badge b-success" style={{ marginLeft: 8, fontSize: 10 }}>Your Manager</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <a href={`mailto:${t.email}`} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} /> Email
                        </a>
                        <a href={teamsLink(t.email)} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MessageSquare size={12} /> Teams
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {calTab === 'team' && teamView === 'company' && (
          <div>
            <div className="card mb2">
              <div className="card-body" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14 }}>
                <EmployeeAvatar email={me.email} name={me.name} size={48} className="av-navy" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{me.name} <span className="badge b-navy" style={{ marginLeft: 6 }}>You</span></div>
                  <div style={{ fontSize: 12, color: '#6B6860' }}>{me.role} · {me.department}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`mailto:${me.email}`} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={12} /> Email
                  </a>
                  <a href={teamsLink(me.email)} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageSquare size={12} /> Teams
                  </a>
                </div>
              </div>
            </div>

            {Object.keys(byDept).length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>No other company members found</p>
                  <div className="esub">Other employees at your company will appear here once they are assigned the same company entity.</div>
                </div>
              </div>
            ) : (
              Object.entries(byDept).sort(([a], [b]) => a.localeCompare(b)).map(([dept, members]) => (
                <div key={dept} className="card mb2">
                  <div className="card-header">
                    <h3>{dept}</h3>
                    <span style={{ fontSize: 11, background: '#F2F1ED', color: '#9B9890', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{members.length}</span>
                  </div>
                  <div style={{ padding: '0 1.25rem' }}>
                    {members.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F2F1ED' }}>
                        <EmployeeAvatar email={t.email} name={t.name} size={36} className="av-navy" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: '#9B9890' }}>{t.role}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <a href={`mailto:${t.email}`} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={12} /> Email
                          </a>
                          <a href={teamsLink(t.email)} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MessageSquare size={12} /> Teams
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

{calTab === 'calendar' && (
          <div id="emp-team-calendar" className="card">
            <div className="card-header">
              <h3>Team Calendar</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn-ghost sm" style={{ padding: '4px 8px' }} onClick={() => setWeekStart(w => addDays(w, -7))}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1916', minWidth: 180, textAlign: 'center' }}>{weekLabel}</span>
                <button className="btn-ghost sm" style={{ padding: '4px 8px' }} onClick={() => setWeekStart(w => addDays(w, 7))}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #E5E3DC', overflowX: 'auto' }}>
              {weekDays.map((day, i) => {
                const ds = fmtDate(day);
                const isToday = ds === today;
                const isSelected = ds === selectedDay;
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDay(ds)}
                    style={{
                      flex: 1, minWidth: 64, padding: '10px 6px', border: 'none', cursor: 'pointer',
                      background: isSelected ? '#E8EFF8' : 'none',
                      borderBottom: isSelected ? '2px solid #1B3F6E' : '2px solid transparent',
                      transition: 'all .15s',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9890', letterSpacing: 0.4 }}>{DAY_LABELS[i]}</div>
                    <div style={{
                      fontSize: 14, fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#1B3F6E' : isSelected ? '#1B3F6E' : '#1A1916',
                      marginTop: 2,
                    }}>
                      {day.getDate()}
                    </div>
                    {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1B3F6E', margin: '3px auto 0' }} />}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '0 1.25rem' }}>
              {selectedDayMemberSchedules.map(({ member, events }) => (
                <div key={member.id} style={{ paddingTop: 14, paddingBottom: 14, borderBottom: '1px solid #F2F1ED' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <EmployeeAvatar email={member.email} name={member.name} size={32} className="av-navy" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{member.name} {member.id === me.id && <span style={{ color: '#9B9890', fontWeight: 400 }}>(You)</span>}</div>
                      <div style={{ fontSize: 11, color: '#9B9890' }}>{member.role}</div>
                    </div>
                  </div>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#C5C3BB', paddingLeft: 40, fontStyle: 'italic' }}>No schedule entries</div>
                  ) : (
                    events.map(ev => (
                      <div key={ev.id} style={{ display: 'flex', gap: 10, paddingLeft: 40, marginBottom: 6, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color ?? '#1B3F6E', flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</div>
                          {(() => { const t = formatScheduleTime(ev); return (t || ev.location) ? <div style={{ fontSize: 11, color: '#9B9890' }}>{t}{t && ev.location ? ' · ' : ''}{ev.location ?? ''}</div> : null; })()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}