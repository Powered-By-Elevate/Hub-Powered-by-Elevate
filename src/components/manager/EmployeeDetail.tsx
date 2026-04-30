import { useState } from 'react';
import { Employee, OnboardingTask, Document, Schedule } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { CheckItem } from '../shared/CheckItem';
import { DocRow } from '../shared/DocRow';

type DetailTab = 'overview' | 'tasks' | 'documents' | 'schedule';

interface Props {
  employee: Employee;
  tasks: OnboardingTask[];
  documents: Document[];
  schedules: Schedule[];
  onBack: () => void;
  onOpenModal: (type: string, eid?: string) => void;
  onToggleTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
}

export function ManagerEmployeeDetail({ employee: e, tasks, documents, schedules, onBack, onOpenModal, onToggleTask, onTaskStatusChange }: Props) {
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const done = tasks.filter(t => t.status === 'complete').length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
            <button className="btn-ghost sm" onClick={onBack}>← Back</button>
            <h1>{e.name}</h1>
            <StatusBadge status={e.status} />
          </div>
          <p>{e.role} · {e.department} · Started {e.start_date}</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => onOpenModal('add-task', e.id)}>+ Assign Task</button>
        </div>
      </div>
      <div className="content">
        <div className="detail-grid">
          <div>
            <div className="card mb2">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
                <div className="avatar av-navy av-52" style={{ margin: '0 auto 12px' }}>{ini(e.name)}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
                <div style={{ color: '#6B6860', fontSize: 13, marginTop: 3 }}>{e.role}</div>
                {e.phase === 'onboarding' && (
                  <div style={{ margin: '14px 0' }}>
                    <div className="prog-bar" style={{ height: 8 }}>
                      <div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6860', marginTop: 5 }}>{e.progress}% — {done}/{tasks.length} tasks</div>
                  </div>
                )}
                {e.phase === 'active'
                  ? <span className="badge b-success">Active Employee</span>
                  : <StatusBadge status={e.status} />
                }
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Employee Info</h3></div>
              <div className="card-body" style={{ padding: '.5rem 1.25rem' }}>
                {[['Email', e.email], ['Department', e.department], ['Manager', e.manager], ['Start date', e.start_date]].map(([k, v]) => (
                  <div key={k as string} className="info-row">
                    <span className="info-key">{k}</span>
                    <span className="info-val">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="tabs-row">
              {(['overview', 'tasks', 'documents', 'schedule'] as DetailTab[]).map(t => (
                <button key={t} className={`tab-btn${detailTab === t ? ' active' : ''}`} onClick={() => setDetailTab(t)}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <>
                <div className="two-col-sm">
                  {[
                    ['Not Started', tasks.filter(t => t.status === 'pending').length, ''],
                    ['Complete', tasks.filter(t => t.status === 'complete').length, 'c-green'],
                    ['In Progress', tasks.filter(t => t.status === 'in-progress').length, 'c-navy'],
                    ['Overdue', tasks.filter(t => t.status === 'overdue').length, 'c-red'],
                  ].map(([label, val, cls]) => (
                    <div key={label as string} className="stat-card">
                      <div className="stat-label">{label}</div>
                      <div className={`stat-value ${cls}`}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3>Recent Tasks</h3>
                    <button className="btn-ghost sm" onClick={() => setDetailTab('tasks')}>View all</button>
                  </div>
                  {tasks.slice(0, 5).map(t => (
                    <CheckItem key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} />
                  ))}
                </div>
              </>
            )}
            {detailTab === 'tasks' && (
              <div className="card">
                <div className="card-header">
                  <h3>All Tasks ({tasks.length})</h3>
                  <button className="btn-primary sm" onClick={() => onOpenModal('add-task', e.id)}>+ Assign Task</button>
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📋</div><p>No tasks yet</p></div>
                ) : tasks.map(t => (
                  <CheckItem key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} />
                ))}
              </div>
            )}
            {detailTab === 'documents' && (
              <div className="card">
                <div className="card-header"><h3>Documents</h3></div>
                <div style={{ padding: '0 1.25rem' }}>
                  {documents.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📄</div><p>No documents</p></div>
                    : documents.map(d => <DocRow key={d.id} doc={d} />)
                  }
                </div>
              </div>
            )}
            {detailTab === 'schedule' && (
              <div className="card">
                <div className="card-header"><h3>Schedule</h3></div>
                <div style={{ padding: '0 1.25rem' }}>
                  {schedules.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📅</div><p>No schedule</p></div>
                    : schedules.map(s => (
                      <div key={s.id} className="sched-item">
                        <div className="sched-dot" style={{ background: s.color ?? '#1B3F6E' }} />
                        <div className="sched-time">{s.time_label}</div>
                        <div><div className="sched-title">{s.title}</div><div className="sched-sub">{s.location}</div></div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
