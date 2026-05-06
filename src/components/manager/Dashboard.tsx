import { Employee } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';

interface Props {
  team: Employee[];
  myEmployee: Employee | null;
  onViewEmployee: (id: string) => void;
  onOpenModal: (type: string, eid?: string) => void;
}

export function ManagerDashboard({ team, myEmployee, onViewEmployee, onOpenModal }: Props) {
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
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">My Team</div>
            <div className="stat-value">{team.length}</div>
            <div className="stat-sub">Direct reports</div>
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

        <div className="card">
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
                        <div className="avatar av-navy av-32">{ini(e.name)}</div>
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
      </div>
    </>
  );
}
