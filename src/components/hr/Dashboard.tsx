import { Employee, ActivityLog, QuarterlyCheckin, AnnualReview, LifecycleCheckin } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
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
        <div className="topbar-actions">
          {userId && <NotificationBell userId={userId} onNavigate={(linkType) => {
            if (linkType === 'checkin' || linkType === 'review') onTab('checkins');
            else onTab('employees');
          }} />}
          <button className="btn-ghost" onClick={() => onOpenModal('add-checkin')}>+ Schedule Check-in</button>
          <button className="btn-primary" onClick={() => onOpenModal('add-emp')}>+ Add Employee</button>
        </div>
      </div>
      <div className="content">
        <div className="stats-grid">
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
          <div className="card">
            <div className="card-header">
              <h3>Recent Employees</h3>
              <button className="btn-ghost sm" onClick={() => onTab('employees')}>View all</button>
            </div>
            <table>
              <tbody>
                {active.slice(0, 5).map(e => (
                  <tr key={e.id} className="tr-click" onClick={() => onViewEmployee(e.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar av-navy av-32">{ini(e.name)}</div>
                        <div>
                          <div className="emp-name">{e.name}</div>
                          <div className="emp-email">{e.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {e.lifecycle_status === 'onboarding' ? (
                        <>
                          <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                          <div className="prog-label">{e.progress}% onboarding</div>
                        </>
                      ) : (
                        <span className="badge b-success">Active Employee</span>
                      )}
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
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
            <div className="card">
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