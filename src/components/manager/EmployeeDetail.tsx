import { useState, useCallback, useEffect } from 'react';
import { Employee, OnboardingTask, Document, Schedule, DevelopmentPlan, Certification, Checkin, Pathway } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { CheckItem } from '../shared/CheckItem';
import { DocRow } from '../shared/DocRow';

// Manager-visible career status colors (current_status is visible to managers)
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'On Track':      { bg: '#D1FAE5', color: '#065F46' },
  'Needs Support': { bg: '#FEF3C7', color: '#92400E' },
  'At Risk':       { bg: '#FEE2E2', color: '#991B1B' },
};

const PLAN_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'Not Started': { bg: '#F2F1ED', color: '#6B6860' },
  'In Progress': { bg: '#E8EFF8', color: '#1B3F6E' },
  'Completed':   { bg: '#D1FAE5', color: '#065F46' },
};

// Manager sees motivation level on check-ins, but NOT decision/notes/reflection/contribution/bd
const MOTIVATION_COLORS: Record<string, string> = {
  'Highly Motivated':   '#2D9A60',
  'Generally Motivated':'#0D9488',
  'Neutral/Unsure':     '#6B6860',
  'Struggling':         '#D97706',
  'At Risk':            '#DC2626',
};

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type DetailTab = 'overview' | 'tasks' | 'documents' | 'schedule' | 'development' | 'checkins';

interface Props {
  employee: Employee;
  tasks: OnboardingTask[];
  documents: Document[];
  schedules: Schedule[];
  pathways: Pathway[];
  onBack: () => void;
  onOpenModal: (type: string, eid?: string) => void;
  onToggleTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  readOnly?: boolean;
}

export function ManagerEmployeeDetail({
  employee: e, tasks, documents, schedules, pathways,
  onBack, onOpenModal, onToggleTask, onTaskStatusChange, readOnly,
}: Props) {
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [devPlans, setDevPlans] = useState<DevelopmentPlan[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const done = tasks.filter(t => t.status === 'complete').length;
  const pathwayName = pathways.find(p => p.id === e.pathway_id)?.name ?? null;
  const statusStyle = e.current_status ? STATUS_COLORS[e.current_status] ?? null : null;

  const loadCareerData = useCallback(async () => {
    const [{ data: plans }, { data: certs }, { data: chks }] = await Promise.all([
      supabase.from('development_plans').select('*').eq('employee_id', e.id).order('created_at'),
      supabase.from('certifications').select('*').eq('employee_id', e.id).order('created_at'),
      supabase.from('checkins').select('*').eq('employee_id', e.id).order('checkin_date', { ascending: false }).limit(10),
    ]);
    setDevPlans(plans ?? []);
    setCertifications(certs ?? []);
    setCheckins(chks ?? []);
  }, [e.id]);

  useEffect(() => {
    if (detailTab === 'development' || detailTab === 'checkins') {
      loadCareerData();
    }
  }, [detailTab, loadCareerData]);

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
        {!readOnly && <button className="btn-primary" onClick={() => onOpenModal('add-task', e.id)}>+ Assign Task</button>}
        {readOnly && <span style={{ fontSize: 11, color: '#9B9890', fontStyle: 'italic' }}>View only — HR can manage tasks</span>}
        </div>
      </div>
      <div className="content">
        <div className="detail-grid">
          {/* Sidebar */}
          <div>
            <div className="card mb2">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
                {e.avatar_url ? (
                  <img src={e.avatar_url} alt={e.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px', display: 'block', border: '2px solid #E5E3DC' }} />
                ) : (
                  <div className="avatar av-navy av-52" style={{ margin: '0 auto 12px' }}>{ini(e.name)}</div>
                )}
                <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
                <div style={{ color: '#6B6860', fontSize: 13, marginTop: 3 }}>{e.role}</div>

                {/* Current Status — visible to managers */}
                {statusStyle && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.color, display: 'inline-block' }} />
                    {e.current_status}
                  </div>
                )}

                {/* Level and Pathway — visible to managers, NOT next_level/readiness */}
                {(e.current_level || pathwayName) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F2F1ED', textAlign: 'left' }}>
                    {e.current_level && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#9B9890' }}>Level</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1B3F6E' }}>{e.current_level}</span>
                      </div>
                    )}
                    {pathwayName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#9B9890' }}>Pathway</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1916', maxWidth: 130, textAlign: 'right', lineHeight: 1.3 }}>{pathwayName}</span>
                      </div>
                    )}
                  </div>
                )}

{e.lifecycle_status === 'onboarding' && (
                  <div style={{ margin: '14px 0' }}>
                    <div className="prog-bar" style={{ height: 8 }}>
                      <div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6860', marginTop: 5 }}>{e.progress}% — {done}/{tasks.length} tasks</div>
                  </div>
                )}
                {e.lifecycle_status === 'active'
                  ? <span className="badge b-success" style={{ marginTop: 12 }}>Active Employee</span>
                  : <StatusBadge status={e.status} />
                }
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Employee Info</h3></div>
              <div className="card-body" style={{ padding: '.5rem 1.25rem' }}>
                {([
                  ['Email', e.email], ['Department', e.department],
                  ['Manager', e.manager], ['Start date', e.start_date],
                  ['Employment', e.employment_type],
                ] as [string, string | null][]).map(([k, v]) => (
                  <div key={k} className="info-row">
                    <span className="info-key">{k}</span>
                    <span className="info-val">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div>
            <div className="tabs-row" style={{ overflowX: 'auto', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
              {(['overview', 'tasks', 'documents', 'schedule', 'development', 'checkins'] as DetailTab[]).map(t => (
                <button key={t} className={`tab-btn${detailTab === t ? ' active' : ''}`} onClick={() => setDetailTab(t)}>
                  {t === 'overview' ? 'Overview' : t === 'tasks' ? 'Tasks' : t === 'documents' ? 'Documents' : t === 'schedule' ? 'Schedule' : t === 'development' ? 'Dev Plans' : 'Check-ins'}
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
                    <CheckItem key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} readOnly={readOnly} />
                  ))}
                </div>
              </>
            )}

            {detailTab === 'tasks' && (
              <div className="card">
                <div className="card-header">
                  <h3>All Tasks ({tasks.length})</h3>
                  {!readOnly && <button className="btn-primary sm" onClick={() => onOpenModal('add-task', e.id)}>+ Assign Task</button>}
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📋</div><p>No tasks yet</p></div>
                ) : tasks.map(t => (
                  <CheckItem key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} readOnly={readOnly} />
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

            {/* Development Plans — read-only for managers */}
            {detailTab === 'development' && (
              <div className="card">
                <div className="card-header">
                  <h3>Development Plans ({devPlans.length})</h3>
                  <span style={{ fontSize: 11, color: '#9B9890', fontStyle: 'italic' }}>Read only</span>
                </div>
                {devPlans.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🎯</div><p>No development goals yet</p></div>
                ) : devPlans.map(p => {
                  const sc = PLAN_STATUS_COLORS[p.status] ?? PLAN_STATUS_COLORS['Not Started'];
                  return (
                    <div key={p.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{p.goal_title}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 700 }}>{p.status}</span>
                      </div>
                      {p.target_date && <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 6 }}>Target: {fmt(p.target_date)}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, maxWidth: 200, height: 6, background: '#F2F1ED', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: p.progress_pct + '%', background: p.status === 'Completed' ? '#2D9A60' : '#1B3F6E', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6860' }}>{p.progress_pct}%</span>
                      </div>
                    </div>
                  );
                })}
                {certifications.length > 0 && (
                  <>
                    <div style={{ padding: '10px 1.25rem 6px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#9B9890', borderBottom: '1px solid #F2F1ED', borderTop: '1px solid #F2F1ED', marginTop: 4 }}>
                      Certifications ({certifications.length})
                    </div>
                    {certifications.map(c => {
                      const sc = PLAN_STATUS_COLORS[c.status] ?? PLAN_STATUS_COLORS['Not Started'];
                      return (
                        <div key={c.id} style={{ padding: '10px 1.25rem', borderBottom: '1px solid #F9F8F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.course_name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {c.completion_date && <span style={{ fontSize: 11, color: '#9B9890' }}>{fmt(c.completion_date)}</span>}
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 700 }}>{c.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Check-ins — manager sees date and motivation level ONLY */}
            {/* Hidden from managers: decision, notes, pillar_reflection, contribution, bd_involvement */}
            {detailTab === 'checkins' && (
              <div className="card">
                <div className="card-header">
                  <h3>Check-ins ({checkins.length})</h3>
                  <span style={{ fontSize: 11, color: '#9B9890', fontStyle: 'italic' }}>Read only — date & motivation</span>
                </div>
                {checkins.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📋</div><p>No check-ins recorded</p></div>
                ) : checkins.map(c => {
                  const motColor = MOTIVATION_COLORS[c.motivation_level] ?? '#6B6860';
                  return (
                    <div key={c.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F2F1ED', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(c.checkin_date)}</div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: motColor + '22', color: motColor }}>
                            {c.motivation_level}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
