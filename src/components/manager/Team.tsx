import { Employee } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';

interface Props {
  team: Employee[];
  onViewEmployee: (id: string) => void;
  onOpenModal: (type: string, eid?: string) => void;
}

export function ManagerTeam({ team, onViewEmployee, onOpenModal }: Props) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Team</h1>
          <p>{team.length} direct report{team.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="content">
        <div id="mgr-team-list" className="card">
          {team.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No team members yet</p>
              <div className="esub">HR will assign employees to your team.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Start Date</th><th>Phase</th><th>Progress</th><th>Status</th><th>Actions</th>
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
                          <div className="emp-email">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{e.department}</td>
                    <td style={{ fontSize: 12, color: '#6B6860' }}>{e.start_date}</td>
                    <td>
                    <span className={`badge ${e.lifecycle_status === 'active' ? 'b-success' : 'b-navy'}`}>
                    {e.lifecycle_status === 'active' ? 'Active' : 'Onboarding'}
                      </span>
                    </td>
                    <td>
                    {e.lifecycle_status === 'onboarding' ? (
                        <>
                          <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                          <div className="prog-label">{e.progress}%</div>
                        </>
                      ) : <span style={{ fontSize: 12, color: '#6B6860' }}>—</span>}
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
