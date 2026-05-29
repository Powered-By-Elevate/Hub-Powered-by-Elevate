import { Employee, ActivityLog, QuarterlyCheckin, AnnualReview, LifecycleCheckin } from '../../lib/database.types';
import { pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { EmployeeAvatar } from '../shared/EmployeeAvatar';
import type { HRTab } from '../../pages/HRApp';
import { UpcomingDates } from './UpcomingDates';
import { NotificationBell } from '../shared/NotificationBell';

interface Props {
  employees: Employee[];
  activity: ActivityLog[];
  checkins: QuarterlyCheckin[];
  reviews: AnnualReview[];
  lifecycleCheckins: LifecycleCheckin[];
  userId?: string;
  onViewEmployee: (id: string) => void;
  onOpenModal: (type: string, eid?: string) => void;
  onTab: (tab: HRTab) => void;
}

export function HRDashboard({ employees, activity, checkins, reviews, lifecycleCheckins, userId, onViewEmployee, onOpenModal, onTab }: Props) {
  const active = employees.filter(e => !e.archived);
  const onboarding = active.filter(e => e.lifecycle_status === 'onboarding');
  const activePhase = active.filter(e => e.lifecycle_status === 'active');
  const counts: Record<string, number> = {};
  onboarding.forEach(e => { counts[e.status] = (counts[e.status] ?? 0) + 1; });
  const overdueCheckins = checkins.filter(c => c.status === 'overdue').length;
  const pendingReviews = reviews.filter(r => r.status === 'pending' || r.status === 'in-progress').length;
  const overdueLifecycle = lifecycleCheckins.filter(lc => lc.status === 'overdue').length;
  const pendingLifecycle = lifecycleCheckins.filter(lc => lc.status === 'pending').length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Dashboard</h1>
          <p>Overview of all employee activity</p>
        </div>
        <div id="hr-dashboard-actions" className="topbar-actions">
          {userId && <NotificationBell userId={userId} onNavigate={(linkType) => {
            if (linkType === 'checkin' || linkType === 'review') onTab('checkins');
            else onTab('employees');
          }} />}
          <button className="btn-ghost" onClick={() => onOpenModal('add-checkin')}>+ Schedule Check-in</button>
          <button className="btn-primary" onClick={() => onOpenModal('add-emp')}>+ Add Employee</button>
        </div>
      </div>
      <div className="content">
        <div id="hr-dashboard-stats" className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Active</div>
            <div className="stat-value">{active.length}</div>
            <div className="stat-sub">{activePhase.length} fully active</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Onboarding</div>
            <div className="stat-value c-navy">{onboarding.length}</div>
            <div className="stat-sub">{counts['in-progress'] ?? 0} in progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Needs Attention</div>
            <div className="stat-value c-red">{counts['overdue'] ?? 0}</div>
            <div className="stat-sub">Overdue tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Check-ins Due</div>
            <div className="stat-value c-red">{overdueCheckins + pendingReviews + overdueLifecycle + pendingLifecycle}</div>
            <div className="stat-sub">{overdueCheckins + overdueLifecycle} overdue · {pendingReviews + pendingLifecycle} pending</div>
          </div>
        </div>
        <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div id="hr-dashboard-recent" className="card">
              <div className="card-header">
                <h3>Recent Employees</h3>
                <button className="btn-ghost sm" onClick={() => onTab('employees')}>View all</button>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                {active.slice(0, 5).map(e => (
                  <div
                    key={e.id}
                    onClick={() => onViewEmployee(e.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0', borderBottom: '1px solid #F2F1ED',
                      cursor: 'pointer',
                    }}
                  >
                    <EmployeeAvatar email={e.email} name={e.name} size={32} className="av-navy" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1916' }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: '#9B9890' }}>{e.role}</div>
                    </div>
                    <div style={{ flexShrink: 0, minWidth: 100 }}>
                      {e.lifecycle_status === 'onboarding' ? (
                        <>
                          <div className="prog-bar" style={{ width: 90 }}><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                          <div style={{ fontSize: 10, color: '#9B9890', marginTop: 2 }}>{e.progress}%</div>
                        </>
                      ) : (
                        <span className="badge b-success" style={{ fontSize: 10 }}>Active</span>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Onboarding in Progress */}
            <div id="hr-dashboard-onboarding" className="card">
              <div className="card-header">
                <h3>Onboarding in Progress</h3>
                <button className="btn-ghost sm" onClick={() => onTab('employees')}>View all</button>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                {onboarding.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9B9890', padding: '0.75rem 0' }}>No employees currently onboarding.</p>
                ) : onboarding.slice(0, 5).map(e => (
                  <div
                    key={e.id}
                    onClick={() => onViewEmployee(e.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0', borderBottom: '1px solid #F2F1ED',
                      cursor: 'pointer',
                    }}
                  >
                    <EmployeeAvatar email={e.email} name={e.name} size={32} className="av-navy" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1916' }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: '#9B9890' }}>{e.role}{e.start_date ? ` · Started ${e.start_date}` : ''}</div>
                    </div>
                    <div style={{ flexShrink: 0, minWidth: 100 }}>
                      <div className="prog-bar" style={{ width: 90 }}><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                      <div style={{ fontSize: 10, color: '#9B9890', marginTop: 2 }}>{e.progress}%</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Applicants */}
            <div id="hr-dashboard-applicants" className="card">
              <div className="card-header">
                <h3>Recent Applicants</h3>
                <button className="btn-ghost sm" onClick={() => onTab('applicants')}>View all</button>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                {(() => {
                  const applicants = employees.filter(e => !e.archived && e.lifecycle_status === 'applicant').slice(0, 5);
                  if (applicants.length === 0) {
                    return <p style={{ fontSize: 13, color: '#9B9890', padding: '0.75rem 0' }}>No active applicants.</p>;
                  }
                  return applicants.map(a => (
                    <div
                      key={a.id}
                      onClick={() => onViewEmployee(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: '1px solid #F2F1ED',
                        cursor: 'pointer',
                      }}
                    >
                      <EmployeeAvatar email={a.email} name={a.name} size={32} className="av-navy" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1916' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: '#9B9890' }}>{a.position_applied_for ?? a.role ?? 'Applicant'}</div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: '#FEF3C7', color: '#92400E',
                        }}>
                          {a.applicant_stage ?? a.applicant_phase ?? 'Applicant'}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div id="hr-dashboard-upcoming" className="card">
              <div className="card-header">
                <h3>Upcoming Check-ins</h3>
                <button className="btn-ghost sm" onClick={() => onTab('checkins')}>View all</button>
              </div>
              <div className="card-body" style={{ padding: '.5rem 1.25rem' }}>
                {checkins.filter(c => c.status !== 'completed').slice(0, 3).map(c => {
                  const emp = employees.find(e => e.id === c.employee_id);
                  return (
                    <div key={c.id} className="sched-item">
                      <div className="sched-dot" style={{ background: c.status === 'overdue' ? '#DC2626' : '#1B3F6E' }} />
                      <div className="sched-time">{c.quarter} {c.year}</div>
                      <div>
                        <div className="sched-title">{emp?.name ?? 'Unknown'}</div>
                        <div className="sched-sub">{c.status === 'overdue' ? 'Overdue' : `Scheduled ${c.scheduled_at}`}</div>
                      </div>
                    </div>
                  );
                })}
                {checkins.filter(c => c.status !== 'completed').length === 0 && (
                  <p style={{ fontSize: 13, color: '#9B9890', padding: '0.5rem 0' }}>No upcoming check-ins.</p>
                )}
              </div>
            </div>
            <UpcomingDates employees={employees} />
            <div id="hr-dashboard-activity" className="card">
              <div className="card-header"><h3>Recent Activity</h3></div>
              <div className="card-body" style={{ padding: '.5rem 1.25rem' }}>
                {activity.slice(0, 15).map(a => {
                  const empName = a.employee?.name ?? null;
                  const startsWithName = empName && a.action.toLowerCase().startsWith(empName.toLowerCase());
                  return (
                    <div
                      key={a.id}
                      className="act-row"
                      style={{ cursor: a.employee_id ? 'pointer' : 'default' }}
                      onClick={() => a.employee_id && onViewEmployee(a.employee_id)}
                    >
                      <div className="act-dot" />
                      <div>
                        <div className="act-text">
                          {empName && !startsWithName && (
                            <>
                              <strong style={{ color: '#1A1916' }}>{empName}</strong>
                              {' · '}
                            </>
                          )}
                          {a.action}
                        </div>
                        <div className="act-time">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activity.length === 0 && (
                  <p style={{ fontSize: 13, color: '#9B9890', padding: '0.5rem 0' }}>
                    No recent activity.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}