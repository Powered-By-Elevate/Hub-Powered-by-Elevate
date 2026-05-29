import { Employee } from '../../lib/database.types';
import { pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { EmployeeAvatar } from '../shared/EmployeeAvatar';

interface Props {
  team: Employee[];
  myEmployee: Employee | null;
  onViewEmployee: (id: string) => void;
  onOpenModal: (type: string, eid?: string) => void;
}

export function ManagerDashboard({ team, myEmployee, onViewEmployee, onOpenModal }: Props) {
  const myApplicants = myEmployee
    ? team.filter(e => e.lifecycle_status === 'applicant' && e.hiring_manager_id === myEmployee.id)
    : [];
  const openApplicants = myApplicants.filter(a =>
    a.applicant_phase !== 'Closed' && a.applicant_stage !== 'Closed (did not move forward)'
  );
  const onboarding = team.filter(e => e.lifecycle_status === 'onboarding');
  const active = team.filter(e => e.lifecycle_status === 'active');
  const overdue = team.filter(e => e.status === 'overdue');

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Dashboard</h1>
          <p>Overview of your direct reports</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => onOpenModal('add-task')}>+ Assign Task</button>
        </div>
      </div>
      <div className="content">
      <div id="mgr-dashboard-stats" className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">My Team</div>
            <div className="stat-value">{team.filter(e => e.lifecycle_status !== 'applicant').length}</div>
            <div className="stat-sub">Direct reports</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Open Applicants</div>
            <div className="stat-value c-navy">{openApplicants.length}</div>
            <div className="stat-sub">{myApplicants.length - openApplicants.length} closed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Onboarding</div>
            <div className="stat-value c-navy">{onboarding.length}</div>
            <div className="stat-sub">In progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fully Active</div>
            <div className="stat-value c-green">{active.length}</div>
            <div className="stat-sub">Onboarding complete</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Needs Attention</div>
            <div className="stat-value c-red">{overdue.length}</div>
            <div className="stat-sub">Overdue tasks</div>
          </div>
        </div>

        <div id="mgr-dashboard-team" className="card">
          <div className="card-header">
            <h3>Team Members</h3>
          </div>
          {team.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No team members assigned yet</p>
              <div className="esub">HR will assign employees to your team.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Start Date</th><th>Progress</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map(e => (
                  <tr key={e.id} className="tr-click" onClick={() => onViewEmployee(e.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <EmployeeAvatar email={e.email} name={e.name} size={32} className="av-navy" />
                        <div>
                          <div className="emp-name">{e.name}</div>
                          <div className="emp-email">{e.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>{e.department}</td>
                    <td style={{ fontSize: 12, color: '#6B6860' }}>{e.start_date}</td>
                    <td>
                    {e.lifecycle_status === 'onboarding' ? (
                        <>
                          <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                          <div className="prog-label">{e.progress}%</div>
                        </>
                      ) : (
                        <span className="badge b-success">Active</span>
                      )}
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                    <td onClick={ev => ev.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn-ghost sm" onClick={() => onViewEmployee(e.id)}>View</button>
                        <button className="btn-ghost sm" onClick={() => onOpenModal('add-task', e.id)}>+ Task</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Onboarding in Progress on my team */}
        <div id="mgr-dashboard-onboarding" className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Onboarding in Progress</h3>
          </div>
          <div style={{ padding: '0 1.25rem' }}>
            {onboarding.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9B9890', padding: '0.75rem 0' }}>No team members currently onboarding.</p>
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

        {/* My Open Applicants */}
        <div id="mgr-dashboard-applicants" className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>My Open Applicants</h3>
          </div>
          <div style={{ padding: '0 1.25rem' }}>
            {myApplicants.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9B9890', padding: '0.75rem 0' }}>No applicants currently assigned to you.</p>
            ) : myApplicants.slice(0, 5).map(a => (
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
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
