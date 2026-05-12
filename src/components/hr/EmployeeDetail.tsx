import { useState, useRef } from 'react';
import { Employee, OnboardingTask, Document, Schedule, EmployeeNote, Company, Pathway, Review, DevelopmentPlan, Certification, Checkin } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { CheckItem } from '../shared/CheckItem';
import { TaskCard } from '../shared/TaskCard';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Download, Eye, Trash2, Pencil, X, Check, Plus } from 'lucide-react';
import { Modal } from '../shared/Modal';

type DetailTab = 'overview' | 'tasks' | 'documents' | 'schedule' | 'checkins' | 'reviews' | 'development' | 'certifications' | 'notes';

const DOC_CATEGORIES = ['Policy', 'Form', 'Handbook', 'Contract', 'Training', 'Other'];
const DOC_SECTIONS = ['Onboarding Documents', 'HR Forms', 'Policies', 'Training Materials', 'Contracts', 'Custom'];

const MOTIVATION_COLORS: Record<string, string> = {
  'Highly Motivated': '#2D9A60', 'Generally Motivated': '#0D9488', 'Neutral/Unsure': '#6B6860',
  'Struggling': '#D97706', 'At Risk': '#DC2626',
};
const DECISION_COLORS: Record<string, string> = {
  'Continue': '#2D9A60', 'Adjust': '#D97706', 'Change Path': '#DC2626',
};
const SENTIMENT_COLORS: Record<string, string> = {
  'Motivated': '#2D9A60', 'Neutral': '#6B6860', 'Struggling': '#DC2626',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'On Track': { bg: '#D1FAE5', color: '#065F46' },
  'Needs Support': { bg: '#FEF3C7', color: '#92400E' },
  'At Risk': { bg: '#FEE2E2', color: '#991B1B' },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  employee: Employee;
  tasks: OnboardingTask[];
  documents: Document[];
  schedules: Schedule[];
  notes: EmployeeNote[];
  companies?: Company[];
  pathways?: Pathway[];
  reviews: Review[];
  developmentPlans: DevelopmentPlan[];
  certifications: Certification[];
  checkins: Checkin[];
  onBack: () => void;
  onOpenModal: (type: string, eid?: string) => void;
  onToggleTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  onTaskTriageChange?: (taskId: string, triage: 'critical' | 'normal') => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete?: (id: string) => void;
  onEditEmployee: (id: string) => void;
  onDocumentsChanged: (empId: string) => void;
  onDataChanged: (empId: string) => void;
}

export function EmployeeDetail({
  employee: e, tasks, documents, schedules, notes, companies = [], pathways = [],
  reviews, developmentPlans, certifications, checkins,
  onBack, onOpenModal, onToggleTask, onTaskStatusChange, onTaskTriageChange,
  onArchive, onRestore, onDelete, onEditEmployee, onDocumentsChanged, onDataChanged,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const companyName = companies.find(c => c.id === e.company_id)?.name ?? null;
  const pathwayName = pathways.find(p => p.id === e.pathway_id)?.name ?? null;
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const obTasks = tasks.filter(t => t.task_phase === 'onboarding');
  const done = obTasks.filter(t => t.status === 'complete').length;
  const empDocs = documents.filter(d => d.employee_id === e.id);

  const [editingTask, setEditingTask] = useState<OnboardingTask | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ title: '', due_date: '', category: 'Document', notes: '', required: false });
  const [taskSaving, setTaskSaving] = useState(false);

  function startEditTask(task: OnboardingTask) {
    setEditingTask(task);
    setEditTaskForm({ title: task.title, due_date: task.due_date || '', category: task.category, notes: task.notes || '', required: task.required });
  }

  async function saveEditTask() {
    if (!editingTask) return;
    setTaskSaving(true);
    await supabase.from('onboarding_tasks').update({
      title: editTaskForm.title.trim(),
      due_date: editTaskForm.due_date || null,
      category: editTaskForm.category,
      notes: editTaskForm.notes.trim() || null,
      required: editTaskForm.required,
    }).eq('id', editingTask.id);
    setTaskSaving(false);
    setEditingTask(null);
    onDataChanged(e.id);
  }

  async function deleteTask(taskId: string) {
    console.log('[deleteTask] called for', taskId);
    if (!confirm('Delete this task permanently?')) {
      console.log('[deleteTask] user cancelled the confirm dialog');
      return;
    }
    const { data, error, count } = await supabase
      .from('onboarding_tasks')
      .delete({ count: 'exact' })
      .eq('id', taskId)
      .select();
    console.log('[deleteTask] result:', { data, count, error });
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    if (!count || count === 0) {
      alert('Task delete returned 0 rows — likely an RLS policy is blocking it.');
      return;
    }
    onDataChanged(e.id);
  }

  const [scheduleModal, setScheduleModal] = useState<'add' | 'edit' | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [schedForm, setSchedForm] = useState({ title: '', time_label: '', location: '', color: '#1B3F6E' });
  const [schedSaving, setSchedSaving] = useState(false);

  function openAddSchedule() {
    setEditingSchedule(null);
    setSchedForm({ title: '', time_label: '', location: '', color: '#1B3F6E' });
    setScheduleModal('add');
  }

  function openEditSchedule(s: Schedule) {
    setEditingSchedule(s);
    setSchedForm({ title: s.title, time_label: s.time_label || '', location: s.location || '', color: s.color || '#1B3F6E' });
    setScheduleModal('edit');
  }

  async function saveSchedule() {
    if (!schedForm.title.trim()) return;
    setSchedSaving(true);
    if (scheduleModal === 'edit' && editingSchedule) {
      await supabase.from('schedules').update({
        title: schedForm.title.trim(),
        time_label: schedForm.time_label.trim() || null,
        location: schedForm.location.trim() || null,
        color: schedForm.color,
      }).eq('id', editingSchedule.id);
    } else {
      await supabase.from('schedules').insert({
        employee_id: e.id,
        title: schedForm.title.trim(),
        time_label: schedForm.time_label.trim() || null,
        location: schedForm.location.trim() || null,
        color: schedForm.color,
      });
    }
    setSchedSaving(false);
    setScheduleModal(null);
    onDataChanged(e.id);
  }

  async function deleteScheduleEvent(id: string) {
    if (!confirm('Delete this schedule event?')) return;
    await supabase.from('schedules').delete().eq('id', id);
    onDataChanged(e.id);
  }

  const statusStyle = e.current_status ? STATUS_COLORS[e.current_status] ?? {} : null;

  const tabs: DetailTab[] = ['overview', 'tasks', 'documents', 'schedule', 'checkins', 'reviews', 'development', 'certifications', 'notes'];
  const tabLabel: Record<DetailTab, string> = {
    overview: 'Overview', tasks: 'Tasks', documents: 'Documents', schedule: 'Schedule',
    checkins: 'Check-ins', reviews: 'Reviews', development: 'Dev Plans', certifications: 'Certifications', notes: 'Notes',
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
            <button className="btn-ghost sm" onClick={onBack}>← Back</button>
            <h1>{e.name}</h1>
            <StatusBadge status={e.status} />
            {e.lifecycle_status === 'active' && <span className="badge b-success" style={{ marginLeft: 4 }}>Active Employee</span>}
          </div>
          <p>{e.role} · {e.department} · Started {e.start_date}</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost" onClick={() => onOpenModal('add-task', e.id)}>+ Add Task</button>
          <button className="btn-ghost" onClick={() => onOpenModal('add-note', e.id)}>Add Note</button>
          <button className="btn-primary" onClick={() => onEditEmployee(e.id)}>Edit Profile</button>
        </div>
      </div>
      <div className="content">
        <div className="detail-grid">
          {/* ── Sidebar ────────────────────────────────────── */}
          <div>
            <div className="card mb2">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
                <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 12px', cursor: 'pointer' }} onClick={() => onEditEmployee(e.id)}>
                  {e.avatar_url ? (
                    <img src={e.avatar_url} alt={e.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid #E5E3DC' }} />
                  ) : (
                    <div className="avatar av-navy av-52">{ini(e.name)}</div>
                  )}
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#1B3F6E', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={10} color="#fff" />
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1916' }}>{e.name}</div>
                <div style={{ color: '#6B6860', fontSize: 13, marginTop: 3 }}>{e.role}</div>

                {/* Current Status badge */}
                {e.current_status && statusStyle && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.color, display: 'inline-block' }} />
                    {e.current_status}
                  </div>
                )}

                {/* Level & Pathway */}
                {(e.current_level || pathwayName) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F2F1ED', textAlign: 'left' }}>
                    {e.current_level && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#9B9890' }}>Level</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1B3F6E' }}>
                          {e.current_level}{e.next_level ? ` → ${e.next_level}` : ''}
                        </span>
                      </div>
                    )}
                    {pathwayName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#9B9890' }}>Pathway</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1916', maxWidth: 130, textAlign: 'right', lineHeight: 1.3 }}>{pathwayName}</span>
                      </div>
                    )}
                    {e.readiness_level && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#9B9890' }}>Readiness</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1916', maxWidth: 130, textAlign: 'right', lineHeight: 1.3 }}>{e.readiness_level}</span>
                      </div>
                    )}
                  </div>
                )}

                {e.lifecycle_status === 'onboarding' && (
                  <div style={{ margin: '14px 0' }}>
                    <div className="prog-bar" style={{ height: 8 }}>
                      <div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6860', marginTop: 5 }}>{e.progress}% complete — {done} of {obTasks.length} onboarding tasks done</div>
                  </div>
                )}
                {e.lifecycle_status === 'active' ? <span className="badge b-success" style={{ marginTop: 12 }}>Active Employee</span> : <StatusBadge status={e.status} />}
              </div>
            </div>

            <div className="card mb2">
              <div className="card-header"><h3>Employee Info</h3></div>
              <div className="card-body" style={{ padding: '.5rem 1.25rem' }}>
                {([
                  ['Email', e.email], ['Phone', e.phone], ['Department', e.department],
                  ['Manager', e.manager], ['Start date', e.start_date],
                  ...(companyName ? [['Company', companyName]] : []),
                  ['Employment', e.employment_type],
                  ['Phase', e.lifecycle_status === 'active' ? 'Active Employee' : 'Onboarding'],
                ] as [string, string | null][]).map(([k, v]) => (
                  <div key={k as string} className="info-row">
                    <span className="info-key">{k}</span>
                    <span className="info-val">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Actions</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '.75rem 1.25rem' }}>
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onEditEmployee(e.id)}>Edit Profile</button>
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onOpenModal('add-note', e.id)}>Add HR Note</button>
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onOpenModal('send-invite', e.id)}>Send Setup Link</button>
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onOpenModal('add-checkin-new', e.id)}>Add Check-in</button>
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onOpenModal('save-as-template', e.id)}>Save as Template</button>
                {e.archived ? (
                  <button className="btn-ghost sm" style={{ justifyContent: 'flex-start', borderColor: '#2D9A60', color: '#2D9A60' }} onClick={() => onRestore(e.id)}>Restore to Active</button>
                ) : (
                  <>
                    <hr style={{ border: 'none', borderTop: '1px solid #F2F1ED', margin: '4px 0' }} />
                    <button className="btn-ghost sm" style={{ justifyContent: 'flex-start', borderColor: '#9B9890', color: '#6B6860' }} onClick={() => onArchive(e.id)}>Archive Employee</button>
                  </>
                )}
                <hr style={{ border: 'none', borderTop: '1px solid #F2F1ED', margin: '4px 0' }} />
                {!confirmDelete ? (
                  <button className="btn-ghost sm" style={{ justifyContent: 'flex-start', borderColor: '#C4420A', color: '#C4420A' }} onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={13} style={{ marginRight: 6 }} />Delete Employee
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
                    <span style={{ fontSize: 11, color: '#C4420A', fontWeight: 600 }}>Permanently delete this employee and all their data?</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost sm" style={{ flex: 1, borderColor: '#C4420A', color: '#C4420A', fontWeight: 600 }} onClick={() => { console.log('[Yes, Delete] clicked. onDelete defined?', typeof onDelete, 'employee id:', e.id); onDelete?.(e.id); setConfirmDelete(false); }}>Yes, Delete</button>
                      <button className="btn-ghost sm" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Main tabs ──────────────────────────────────── */}
          <div>
            <div className="tabs-row" style={{ overflowX: 'auto', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
              {tabs.map(t => (
                <button key={t} className={`tab-btn${detailTab === t ? ' active' : ''}`} onClick={() => setDetailTab(t)}>
                  {tabLabel[t]}
                  {t === 'documents' && empDocs.length > 0 && (
                    <span style={{ marginLeft: 5, padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: detailTab === t ? '#E8EFF8' : '#F2F1ED', color: detailTab === t ? '#1B3F6E' : '#9B9890' }}>{empDocs.length}</span>
                  )}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <>
                <div className="two-col-sm">
                  {[['Not Started', obTasks.filter(t => t.status === 'pending').length, ''], ['In Progress', obTasks.filter(t => t.status === 'in-progress').length, 'c-navy'], ['Complete', obTasks.filter(t => t.status === 'complete').length, 'c-green'], ['Overdue', obTasks.filter(t => t.status === 'overdue').length, 'c-red']].map(([label, val, cls]) => (
                    <div key={label as string} className="stat-card">
                      <div className="stat-label">{label}</div>
                      <div className={`stat-value ${cls}`}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3>Task Summary</h3>
                    <button className="btn-ghost sm" onClick={() => setDetailTab('tasks')}>View all</button>
                  </div>
                  {obTasks.filter(t => !t.archived && t.status !== 'complete').slice(0, 5).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ flex: 1 }}>
                        <CheckItem task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} />
                      </div>
                      <button onClick={() => startEditTask(t)} title="Edit task" style={{ padding: 5, borderRadius: 6, border: '1px solid #E5E3DC', background: '#F8F7F4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Pencil size={12} color="#6B6860" />
                      </button>
                      <button onClick={() => deleteTask(t.id)} title="Delete task" style={{ padding: 5, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={12} color="#DC2626" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {detailTab === 'tasks' && (
              <HRTasksView tasks={tasks} onOpenModal={onOpenModal} empId={e.id} onToggleTask={onToggleTask} onTaskStatusChange={onTaskStatusChange} onTriageChange={onTaskTriageChange} onEditTask={startEditTask} onDeleteTask={deleteTask} />
            )}

            {detailTab === 'documents' && (
              <HRDocumentsView employee={e} documents={empDocs} onDocumentsChanged={() => onDocumentsChanged(e.id)} />
            )}

            {detailTab === 'schedule' && (
              <div className="card">
                <div className="card-header">
                  <h3>Day 1 Schedule</h3>
                  <button className="btn-primary sm" onClick={openAddSchedule}>
                    <Plus size={13} style={{ marginRight: 4 }} />Add Event
                  </button>
                </div>
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  {schedules.length === 0
                    ? <div className="empty-state"><p>No schedule yet</p><div className="esub">Add events to build the onboarding day schedule.</div></div>
                    : schedules.map(s => (
                      <div key={s.id} className="sched-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="sched-dot" style={{ background: s.color ?? '#1B3F6E' }} />
                        <div className="sched-time">{s.time_label}</div>
                        <div style={{ flex: 1 }}>
                          <div className="sched-title">{s.title}</div>
                          <div className="sched-sub">{s.location}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => openEditSchedule(s)} title="Edit event" style={{ padding: 5, borderRadius: 6, border: '1px solid #E5E3DC', background: '#F8F7F4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pencil size={12} color="#6B6860" />
                          </button>
                          <button onClick={() => deleteScheduleEvent(s.id)} title="Delete event" style={{ padding: 5, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={12} color="#DC2626" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {detailTab === 'checkins' && (
              <CheckinsTab checkins={checkins} empId={e.id} onChanged={() => onDataChanged(e.id)} />
            )}

            {detailTab === 'reviews' && (
              <ReviewsTab reviews={reviews} empId={e.id} onChanged={() => onDataChanged(e.id)} />
            )}

            {detailTab === 'development' && (
              <DevelopmentTab plans={developmentPlans} empId={e.id} onChanged={() => onDataChanged(e.id)} />
            )}

            {detailTab === 'certifications' && (
              <CertificationsTab certifications={certifications} empId={e.id} onChanged={() => onDataChanged(e.id)} />
            )}

            {detailTab === 'notes' && (
              <div className="card">
                <div className="card-header">
                  <h3>HR Notes</h3>
                  <button className="btn-primary sm" onClick={() => onOpenModal('add-note', e.id)}>+ Add Note</button>
                </div>
                {notes.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📝</div><p>No notes yet</p><div className="esub">Internal notes are only visible to HR and managers.</div></div>
                ) : notes.map(n => (
                  <div key={n.id} className="check-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    {n.pinned && <span className="badge b-navy" style={{ fontSize: 10 }}>Pinned</span>}
                    <div style={{ fontSize: 14, color: '#1A1916', lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: '#9B9890' }}>{fmt(n.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingTask && (
        <Modal title="Edit Task" onClose={() => setEditingTask(null)} footer={
          <>
            <button className="btn-ghost" onClick={() => setEditingTask(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveEditTask} disabled={taskSaving || !editTaskForm.title.trim()}>
              {taskSaving ? 'Saving\u2026' : 'Save Changes'}
            </button>
          </>
        }>
          <div className="form-grid">
            <div className="field full">
              <label>Task title</label>
              <input type="text" value={editTaskForm.title} onChange={ev => setEditTaskForm(f => ({ ...f, title: ev.target.value }))} />
            </div>
            <div className="field">
              <label>Due date</label>
              <input type="text" value={editTaskForm.due_date} onChange={ev => setEditTaskForm(f => ({ ...f, due_date: ev.target.value }))} placeholder="Day 1 from start" />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={editTaskForm.category} onChange={ev => setEditTaskForm(f => ({ ...f, category: ev.target.value }))}>
                <option value="Document">Document</option>
                <option value="Training">Training</option>
                <option value="Meeting">Meeting</option>
                <option value="Form">Form</option>
                <option value="Setup">Setup</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="field full">
              <label>Notes</label>
              <textarea rows={3} value={editTaskForm.notes} onChange={ev => setEditTaskForm(f => ({ ...f, notes: ev.target.value }))} placeholder="Optional notes..." />
            </div>
            <div className="field full">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editTaskForm.required} onChange={ev => setEditTaskForm(f => ({ ...f, required: ev.target.checked }))} />
                Required task
              </label>
            </div>
          </div>
        </Modal>
      )}

      {scheduleModal && (
        <Modal title={scheduleModal === 'edit' ? 'Edit Event' : 'Add Event'} onClose={() => setScheduleModal(null)} footer={
          <>
            <button className="btn-ghost" onClick={() => setScheduleModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveSchedule} disabled={schedSaving || !schedForm.title.trim()}>
              {schedSaving ? 'Saving\u2026' : scheduleModal === 'edit' ? 'Save Changes' : 'Add Event'}
            </button>
          </>
        }>
          <div className="form-grid">
            <div className="field full">
              <label>Event title</label>
              <input type="text" value={schedForm.title} onChange={ev => setSchedForm(f => ({ ...f, title: ev.target.value }))} placeholder="IT Setup and Equipment" />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="text" value={schedForm.time_label} onChange={ev => setSchedForm(f => ({ ...f, time_label: ev.target.value }))} placeholder="10:00 AM" />
            </div>
            <div className="field">
              <label>Location</label>
              <input type="text" value={schedForm.location} onChange={ev => setSchedForm(f => ({ ...f, location: ev.target.value }))} placeholder="Conference Room A" />
            </div>
            <div className="field">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#1B3F6E', '#D97706', '#DC2626', '#0D9488', '#2D9A60', '#6B6860'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSchedForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: schedForm.color === c ? '3px solid #1A1916' : '2px solid #E5E3DC',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Check-ins Tab ──────────────────────────────────────────────────────────

const MOTIVATION_LEVELS = ['Highly Motivated', 'Generally Motivated', 'Neutral/Unsure', 'Struggling', 'At Risk'];
const DECISIONS = ['Continue', 'Adjust', 'Change Path'];
const PILLARS = ['Phileo Love', 'Trust', 'Teamwork', 'Big Goal', 'Legacy', 'Identity'];
const CONTRIBUTIONS = ['Strengthened Client Relationships', 'Supported Team Growth', 'Process Improvement', 'Business Development Contribution', 'Internal Leadership', 'Not Applicable This Quarter'];
const BIZ_DEV = ['Active Contributor', 'Support Role', 'Learning/Exposure', 'Not a Focus'];

function CheckinsTab({ checkins, empId, onChanged }: { checkins: Checkin[]; empId: string; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const blankForm = { checkin_date: new Date().toISOString().split('T')[0], motivation_level: 'Generally Motivated', notes: '', decision: 'Continue', pillar_focus: '', pillar_reflection: '', contribution_to_growth: '', business_dev_involvement: '' };
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);

  function setF(k: keyof typeof form) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: ev.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = { employee_id: empId, checkin_date: form.checkin_date, motivation_level: form.motivation_level, notes: form.notes, decision: form.decision, pillar_focus: form.pillar_focus || null, pillar_reflection: form.pillar_reflection || null, contribution_to_growth: form.contribution_to_growth || null, business_dev_involvement: form.business_dev_involvement || null };
    if (editId) {
      await supabase.from('checkins').update(payload).eq('id', editId);
    } else {
      await supabase.from('checkins').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm({ ...blankForm });
    onChanged();
  }

  function startEdit(c: Checkin) {
    setEditId(c.id);
    setForm({ checkin_date: c.checkin_date, motivation_level: c.motivation_level, notes: c.notes ?? '', decision: c.decision, pillar_focus: c.pillar_focus ?? '', pillar_reflection: c.pillar_reflection ?? '', contribution_to_growth: c.contribution_to_growth ?? '', business_dev_involvement: c.business_dev_involvement ?? '' });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this check-in?')) return;
    await supabase.from('checkins').delete().eq('id', id);
    onChanged();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Check-ins ({checkins.length})</h3>
        <button className="btn-primary sm" onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ ...blankForm }); }}>+ Add Check-in</button>
      </div>

      {showForm && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
          <div className="form-grid">
            <div className="field"><label>Date</label><input type="date" value={form.checkin_date} onChange={setF('checkin_date')} /></div>
            <div className="field"><label>Motivation Level</label>
              <select value={form.motivation_level} onChange={setF('motivation_level')}>
                {MOTIVATION_LEVELS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="field"><label>Decision</label>
              <select value={form.decision} onChange={setF('decision')}>
                {DECISIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field"><label>Pillar Focus</label>
              <select value={form.pillar_focus} onChange={setF('pillar_focus')}>
                <option value="">— None —</option>
                {PILLARS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field"><label>Contribution to Company Growth</label>
              <select value={form.contribution_to_growth} onChange={setF('contribution_to_growth')}>
                <option value="">— None —</option>
                {CONTRIBUTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Business Development Involvement</label>
              <select value={form.business_dev_involvement} onChange={setF('business_dev_involvement')}>
                <option value="">— None —</option>
                {BIZ_DEV.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="field full"><label>Pillar Reflection</label><textarea value={form.pillar_reflection} onChange={setF('pillar_reflection')} rows={2} placeholder="How did this pillar show up this quarter?" /></div>
            <div className="field full"><label>Notes</label><textarea value={form.notes} onChange={setF('notes')} rows={3} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn-ghost sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Check-in'}</button>
          </div>
        </div>
      )}

      {checkins.length === 0 && !showForm ? (
        <div className="empty-state"><div className="empty-icon">📋</div><p>No check-ins recorded</p></div>
      ) : checkins.map(c => {
        const motColor = MOTIVATION_COLORS[c.motivation_level] ?? '#6B6860';
        const decColor = DECISION_COLORS[c.decision] ?? '#6B6860';
        const isOpen = expanded === c.id;
        return (
          <div key={c.id} style={{ borderBottom: '1px solid #F2F1ED' }}>
            <div
              style={{ padding: '12px 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => setExpanded(isOpen ? null : c.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(c.checkin_date)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: motColor + '22', color: motColor }}>{c.motivation_level}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: decColor + '22', color: decColor }}>{c.decision}</span>
                  {c.pillar_focus && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E8EFF8', color: '#1B3F6E', fontWeight: 600 }}>{c.pillar_focus}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={ev => ev.stopPropagation()}>
                <button className="btn-ghost sm" onClick={() => startEdit(c)}>Edit</button>
                <button className="btn-ghost sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => handleDelete(c.id)}>Delete</button>
              </div>
              <span style={{ fontSize: 12, color: '#9B9890' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '0 1.25rem 14px', background: '#FAFAF8' }}>
                {c.pillar_reflection && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', marginBottom: 3 }}>Pillar Reflection</div><div style={{ fontSize: 13, color: '#1A1916' }}>{c.pillar_reflection}</div></div>}
                {c.contribution_to_growth && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', marginBottom: 3 }}>Contribution to Growth</div><div style={{ fontSize: 13, color: '#1A1916' }}>{c.contribution_to_growth}</div></div>}
                {c.business_dev_involvement && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', marginBottom: 3 }}>Business Development</div><div style={{ fontSize: 13, color: '#1A1916' }}>{c.business_dev_involvement}</div></div>}
                {c.notes && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', marginBottom: 3 }}>Notes</div><div style={{ fontSize: 13, color: '#1A1916' }}>{c.notes}</div></div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Reviews Tab ────────────────────────────────────────────────────────────

const REVIEW_TYPES = ['Annual', 'Q1', 'Q2', 'Q3', 'Q4'];
const SENTIMENTS = ['Motivated', 'Neutral', 'Struggling'];

function ReviewsTab({ reviews, empId, onChanged }: { reviews: Review[]; empId: string; onChanged: () => void }) {
  const blankForm = { review_date: new Date().toISOString().split('T')[0], review_type: 'Annual', review_year: new Date().getFullYear(), sentiment: 'Neutral', notes: '', pdf: null as File | null };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function setF(k: keyof typeof form) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: k === 'review_year' ? parseInt((ev.target as HTMLInputElement).value) || new Date().getFullYear() : ev.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    let pdf_path: string | null = null;
    if (form.pdf) {
      const path = `${empId}/${Date.now()}_${form.pdf.name}`;
      await supabase.storage.from('review-documents').upload(path, form.pdf, { upsert: true });
      pdf_path = path;
    }
    const payload = { employee_id: empId, review_date: form.review_date, review_type: form.review_type, review_year: form.review_year, sentiment: form.sentiment, notes: form.notes, ...(pdf_path ? { pdf_path } : {}) };
    if (editId) {
      await supabase.from('reviews').update(payload).eq('id', editId);
    } else {
      await supabase.from('reviews').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm({ ...blankForm });
    onChanged();
  }

  function startEdit(r: Review) {
    setEditId(r.id);
    setForm({ review_date: r.review_date, review_type: r.review_type, review_year: r.review_year, sentiment: r.sentiment ?? 'Neutral', notes: r.notes ?? '', pdf: null });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this review?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    onChanged();
  }

  async function viewPdf(path: string) {
    const { data } = await supabase.storage.from('review-documents').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Reviews ({reviews.length})</h3>
        <button className="btn-primary sm" onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ ...blankForm }); }}>+ Add Review</button>
      </div>

      {showForm && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
          <div className="form-grid">
            <div className="field"><label>Review Date</label><input type="date" value={form.review_date} onChange={setF('review_date')} /></div>
            <div className="field"><label>Review Type</label>
              <select value={form.review_type} onChange={setF('review_type')}>
                {REVIEW_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Review Year</label><input type="number" value={form.review_year} onChange={setF('review_year')} min={2020} max={2040} /></div>
            <div className="field"><label>Sentiment</label>
              <select value={form.sentiment} onChange={setF('sentiment')}>
                {SENTIMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field full"><label>Notes</label><textarea value={form.notes} onChange={setF('notes')} rows={3} /></div>
            <div className="field full">
              <label>PDF Upload (optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn-ghost sm" type="button" onClick={() => fileRef.current?.click()}>
                  <Upload size={13} /> Choose PDF
                </button>
                {form.pdf && <span style={{ fontSize: 12, color: '#1B3F6E' }}>{form.pdf.name}</span>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setForm(f => ({ ...f, pdf: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn-ghost sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Review'}</button>
          </div>
        </div>
      )}

      {reviews.length === 0 && !showForm ? (
        <div className="empty-state"><div className="empty-icon">📊</div><p>No reviews yet</p></div>
      ) : reviews.map(r => {
        const sentColor = SENTIMENT_COLORS[r.sentiment ?? ''] ?? '#6B6860';
        return (
          <div key={r.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F2F1ED', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.review_type} {r.review_year}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sentColor + '22', color: sentColor, fontWeight: 700 }}>{r.sentiment}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 4 }}>{fmt(r.review_date)}</div>
              {r.notes && <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.5 }}>{r.notes}</div>}
              {r.pdf_path && (
                <button className="btn-ghost sm" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => viewPdf(r.pdf_path!)}>
                  <FileText size={12} /> View PDF
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn-ghost sm" onClick={() => startEdit(r)}>Edit</button>
              <button className="btn-ghost sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => handleDelete(r.id)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Development Plans Tab ─────────────────────────────────────────────────

const PLAN_STATUSES = ['Not Started', 'In Progress', 'Completed'];

function DevelopmentTab({ plans, empId, onChanged }: { plans: DevelopmentPlan[]; empId: string; onChanged: () => void }) {
  const blank = { goal_title: '', status: 'Not Started', progress_pct: 0, target_date: '', notes: '' };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setF(k: keyof typeof form) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: k === 'progress_pct' ? Math.min(100, Math.max(0, parseInt((ev.target as HTMLInputElement).value) || 0)) : ev.target.value }));
  }

  async function handleSave() {
    if (!form.goal_title.trim()) return;
    setSaving(true);
    const payload = { employee_id: empId, goal_title: form.goal_title.trim(), status: form.status, progress_pct: form.progress_pct, target_date: form.target_date || null, notes: form.notes };
    if (editId) {
      await supabase.from('development_plans').update(payload).eq('id', editId);
    } else {
      await supabase.from('development_plans').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm({ ...blank });
    onChanged();
  }

  async function updateProgress(id: string, pct: number) {
    await supabase.from('development_plans').update({ progress_pct: pct }).eq('id', id);
    onChanged();
  }

  function startEdit(p: DevelopmentPlan) {
    setEditId(p.id);
    setForm({ goal_title: p.goal_title, status: p.status, progress_pct: p.progress_pct, target_date: p.target_date ?? '', notes: p.notes ?? '' });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return;
    await supabase.from('development_plans').delete().eq('id', id);
    onChanged();
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    'Not Started': { bg: '#F2F1ED', color: '#6B6860' },
    'In Progress': { bg: '#E8EFF8', color: '#1B3F6E' },
    'Completed': { bg: '#D1FAE5', color: '#065F46' },
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Development Plans ({plans.length})</h3>
        <button className="btn-primary sm" onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ ...blank }); }}>+ Add Goal</button>
      </div>

      {showForm && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
          <div className="form-grid">
            <div className="field full"><label>Goal Title</label><input type="text" value={form.goal_title} onChange={setF('goal_title')} placeholder="e.g. Complete PMP Certification" /></div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={setF('status')}>
                {PLAN_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Target Date</label><input type="date" value={form.target_date} onChange={setF('target_date')} /></div>
            <div className="field full">
              <label>Progress — {form.progress_pct}%</label>
              <input type="range" min={0} max={100} step={5} value={form.progress_pct} onChange={setF('progress_pct')} style={{ width: '100%' }} />
            </div>
            <div className="field full"><label>Notes</label><textarea value={form.notes} onChange={setF('notes')} rows={2} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn-ghost sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Goal'}</button>
          </div>
        </div>
      )}

      {plans.length === 0 && !showForm ? (
        <div className="empty-state"><div className="empty-icon">🎯</div><p>No development goals yet</p></div>
      ) : plans.map(p => {
        const sc = statusColors[p.status] ?? statusColors['Not Started'];
        return (
          <div key={p.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.goal_title}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 700 }}>{p.status}</span>
                </div>
                {p.target_date && <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 6 }}>Target: {fmt(p.target_date)}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 6, background: '#F2F1ED', borderRadius: 3, overflow: 'hidden', cursor: 'pointer' }}
                    title="Click to edit progress"
                    onClick={() => { const pct = parseInt(prompt('Set progress (0-100)', String(p.progress_pct)) ?? ''); if (!isNaN(pct)) updateProgress(p.id, Math.min(100, Math.max(0, pct))); }}
                  >
                    <div style={{ height: '100%', width: p.progress_pct + '%', background: p.status === 'Completed' ? '#2D9A60' : '#1B3F6E', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6860', minWidth: 32 }}>{p.progress_pct}%</span>
                </div>
                {p.notes && <div style={{ fontSize: 12, color: '#6B6860' }}>{p.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn-ghost sm" onClick={() => startEdit(p)}>Edit</button>
                <button className="btn-ghost sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Certifications Tab ────────────────────────────────────────────────────

const CERT_STATUSES = ['Not Started', 'In Progress', 'Completed'];

function CertificationsTab({ certifications, empId, onChanged }: { certifications: Certification[]; empId: string; onChanged: () => void }) {
  const blank = { course_name: '', status: 'Not Started', completion_date: '', proof: null as File | null };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function setF(k: keyof typeof form) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: ev.target.value }));
  }

  async function handleSave() {
    if (!form.course_name.trim()) return;
    setSaving(true);
    let proof_path: string | null = null;
    if (form.proof) {
      const path = `${empId}/${Date.now()}_${form.proof.name}`;
      await supabase.storage.from('certification-proofs').upload(path, form.proof, { upsert: true });
      proof_path = path;
    }
    const payload = { employee_id: empId, course_name: form.course_name.trim(), status: form.status, completion_date: form.completion_date || null, ...(proof_path ? { proof_path } : {}) };
    if (editId) {
      await supabase.from('certifications').update(payload).eq('id', editId);
    } else {
      await supabase.from('certifications').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm({ ...blank });
    onChanged();
  }

  function startEdit(c: Certification) {
    setEditId(c.id);
    setForm({ course_name: c.course_name, status: c.status, completion_date: c.completion_date ?? '', proof: null });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this certification?')) return;
    await supabase.from('certifications').delete().eq('id', id);
    onChanged();
  }

  async function viewProof(path: string) {
    const { data } = await supabase.storage.from('certification-proofs').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    'Not Started': { bg: '#F2F1ED', color: '#6B6860' },
    'In Progress': { bg: '#E8EFF8', color: '#1B3F6E' },
    'Completed': { bg: '#D1FAE5', color: '#065F46' },
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Certifications ({certifications.length})</h3>
        <button className="btn-primary sm" onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ ...blank }); }}>+ Add Certification</button>
      </div>

      {showForm && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
          <div className="form-grid">
            <div className="field full"><label>Course Name</label><input type="text" value={form.course_name} onChange={setF('course_name')} placeholder="e.g. OSHA 30-Hour Construction" /></div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={setF('status')}>
                {CERT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Completion Date {form.status !== 'Completed' && <span style={{ color: '#9B9890', fontWeight: 400 }}>(if completed)</span>}</label>
              <input type="date" value={form.completion_date} onChange={setF('completion_date')} />
            </div>
            <div className="field full">
              <label>Proof Document (PDF, optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn-ghost sm" type="button" onClick={() => fileRef.current?.click()}>
                  <Upload size={13} /> Choose PDF
                </button>
                {form.proof && <span style={{ fontSize: 12, color: '#1B3F6E' }}>{form.proof.name}</span>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setForm(f => ({ ...f, proof: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn-ghost sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Certification'}</button>
          </div>
        </div>
      )}

      {certifications.length === 0 && !showForm ? (
        <div className="empty-state"><div className="empty-icon">🏆</div><p>No certifications yet</p></div>
      ) : certifications.map(c => {
        const sc = statusColors[c.status] ?? statusColors['Not Started'];
        return (
          <div key={c.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F2F1ED', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.course_name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 700 }}>{c.status}</span>
              </div>
              {c.completion_date && <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 4 }}>Completed: {fmt(c.completion_date)}</div>}
              {c.proof_path && (
                <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => viewProof(c.proof_path!)}>
                  <FileText size={12} /> View Proof
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn-ghost sm" onClick={() => startEdit(c)}>Edit</button>
              <button className="btn-ghost sm" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => handleDelete(c.id)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── HR Documents View ─────────────────────────────────────────────────────

interface HRDocumentsViewProps {
  employee: Employee;
  documents: Document[];
  onDocumentsChanged: () => void;
}

interface UploadForm {
  file: File | null;
  displayName: string;
  category: string;
  section: string;
  customSection: string;
  description: string;
  requiresAck: boolean;
}

function HRDocumentsView({ employee, documents, onDocumentsChanged }: HRDocumentsViewProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', section: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UploadForm>({ file: null, displayName: '', category: 'Other', section: 'Onboarding Documents', customSection: '', description: '', requiresAck: false });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, file, displayName: file.name.replace(/\.[^.]+$/, '') }));
  }

  async function handleUpload() {
    if (!form.file) { setUploadError('Please select a file.'); return; }
    if (!form.displayName.trim()) { setUploadError('Please enter a display name.'); return; }
    setUploading(true); setUploadError(''); setUploadProgress(10);
    const path = `docs/${employee.id}/${Date.now()}-${form.file.name}`;
    const { error: uploadErr } = await supabase.storage.from('employee-documents').upload(path, form.file);
    if (uploadErr) { setUploadError('Upload failed: ' + uploadErr.message); setUploading(false); setUploadProgress(0); return; }
    setUploadProgress(70);
    const section = form.section === 'Custom' ? form.customSection || 'Custom' : form.section;
    const { error: dbErr } = await supabase.from('documents').insert({
      employee_id: employee.id, name: form.displayName.trim(), file_path: path,
      category: form.category, section, description: form.description || null,
      requires_acknowledgment: form.requiresAck, type: form.file.type,
      size_label: fmtSize(form.file.size), file_size_bytes: form.file.size,
      mime_type: form.file.type, visible_to_employee: true, uploaded_by: 'HR',
    });
    setUploadProgress(100); setUploading(false);
    if (dbErr) { await supabase.storage.from('employee-documents').remove([path]); setUploadError('Failed to save record: ' + dbErr.message); setUploadProgress(0); return; }
    setForm({ file: null, displayName: '', category: 'Other', section: 'Onboarding Documents', customSection: '', description: '', requiresAck: false });
    setShowUpload(false); setUploadProgress(0);
    onDocumentsChanged();
  }

  async function handleDelete(doc: Document) {
    setDeleting(true);
    if (doc.file_path) await supabase.storage.from('employee-documents').remove([doc.file_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    setDeleting(false); setDeleteConfirm(null);
    onDocumentsChanged();
  }

  async function handleView(doc: Document) {
    if (!doc.file_path) { if (doc.file_url) window.open(doc.file_url, '_blank'); return; }
    const { data } = await supabase.storage.from('employee-documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function handleDownload(doc: Document) {
    if (!doc.file_path) { if (doc.file_url) window.open(doc.file_url, '_blank'); return; }
    const { data } = await supabase.storage.from('employee-documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) { const a = document.createElement('a'); a.href = data.signedUrl; a.download = doc.name; a.click(); }
  }

  async function saveEdit(docId: string) {
    await supabase.from('documents').update({ name: editForm.name, category: editForm.category, section: editForm.section }).eq('id', docId);
    setEditingId(null); onDocumentsChanged();
  }

  const sections: Record<string, Document[]> = {};
  for (const doc of documents) {
    const sec = doc.section ?? 'Onboarding Documents';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(doc);
  }

  return (
    <>
      <div className="card mb2">
        <div className="card-header">
          <h3>Documents {documents.length > 0 && `(${documents.length})`}</h3>
          <button className="btn-primary sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowUpload(v => !v)}>
            <Upload size={13} /> Upload Document
          </button>
        </div>

        {showUpload && (
          <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
            {uploadError && <div className="error-msg" style={{ marginBottom: 12 }}>{uploadError}</div>}
            <div style={{ border: '2px dashed #E5E3DC', borderRadius: 8, padding: '18px 14px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: form.file ? '#F7FFF9' : '#FAFAF8' }} onClick={() => fileRef.current?.click()}>
              {form.file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <FileText size={18} style={{ color: '#1B3F6E' }} />
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: 13, fontWeight: 600 }}>{form.file.name}</div><div style={{ fontSize: 11, color: '#9B9890' }}>{fmtSize(form.file.size)}</div></div>
                  <button style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9B9890' }} onClick={ev => { ev.stopPropagation(); setForm(f => ({ ...f, file: null, displayName: '' })); }}><X size={14} /></button>
                </div>
              ) : (
                <><Upload size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.4 }} /><div style={{ fontSize: 13, color: '#9B9890' }}>Click to select a file</div></>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx" style={{ display: 'none' }} onChange={handleFileSelect} />
            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="field full"><label>Display name</label><input type="text" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Employee Handbook 2024" /></div>
              <div className="field"><label>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label>Section</label><select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>{DOC_SECTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
              {form.section === 'Custom' && <div className="field full"><label>Custom section name</label><input type="text" value={form.customSection} onChange={e => setForm(f => ({ ...f, customSection: e.target.value }))} /></div>}
              <div className="field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="req-ack" checked={form.requiresAck} onChange={e => setForm(f => ({ ...f, requiresAck: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <label htmlFor="req-ack" style={{ margin: 0, fontSize: 13, fontWeight: 400 }}>Requires employee acknowledgment</label>
              </div>
            </div>
            {uploading && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6860', marginBottom: 4 }}><span>Uploading…</span><span>{uploadProgress}%</span></div>
                <div style={{ height: 6, background: '#E5E3DC', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: uploadProgress + '%', background: '#1B3F6E', transition: 'width 0.3s' }} /></div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost sm" onClick={() => { setShowUpload(false); setUploadError(''); }}>Cancel</button>
              <button className="btn-primary sm" onClick={handleUpload} disabled={uploading || !form.file}>{uploading ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
        )}

        {documents.length === 0 && !showUpload ? (
          <div className="empty-state"><div className="empty-icon">📄</div><p>No documents yet</p></div>
        ) : Object.entries(sections).map(([section, docs]) => (
          <div key={section}>
            <div style={{ padding: '10px 1.25rem 6px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#9B9890', borderBottom: '1px solid #F2F1ED', display: 'flex', alignItems: 'center', gap: 6 }}>
              {section} <span style={{ fontSize: 10, fontWeight: 600, color: '#BCBAB3', background: '#F2F1ED', padding: '1px 6px', borderRadius: 8 }}>{docs.length}</span>
            </div>
            {docs.map(doc => (
              <div key={doc.id} style={{ padding: '10px 1.25rem', borderBottom: '1px solid #F9F8F5' }}>
                {editingId === doc.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 13 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} style={{ fontSize: 12 }}>{DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                      <input type="text" value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} placeholder="Section" style={{ fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary sm" onClick={() => saveEdit(doc.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Save</button>
                      <button className="btn-ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={16} style={{ color: '#1B3F6E', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                      <div style={{ fontSize: 11, color: '#9B9890', marginTop: 1 }}>{doc.category}{doc.size_label && ` · ${doc.size_label}`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {([['View', () => handleView(doc), Eye, '#6B6860', ''], ['Download', () => handleDownload(doc), Download, '#6B6860', ''], ['Edit', () => { setEditingId(doc.id); setEditForm({ name: doc.name, category: doc.category, section: doc.section ?? '' }); }, Pencil, '#6B6860', ''], ['Delete', () => setDeleteConfirm(doc.id), Trash2, '#DC2626', '#FEF2F2']] as [string, () => void, React.ElementType, string, string][]).map(([title, handler, Icon, color, hoverBg]) => (
                        <button key={title} title={title} onClick={handler} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color, borderRadius: 5, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = hoverBg || '#F2F1ED'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        ><Icon size={14} /></button>
                      ))}
                    </div>
                  </div>
                )}
                {deleteConfirm === doc.id && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 13, color: '#991B1B' }}>Delete <strong>{doc.name}</strong>? This cannot be undone.</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn-ghost sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      <button className="btn-ghost sm" style={{ borderColor: '#DC2626', color: '#DC2626' }} onClick={() => handleDelete(doc)} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── HR Tasks View ────────────────────────────────────────────────────────

interface HRTasksViewProps {
  tasks: OnboardingTask[];
  empId: string;
  onOpenModal: (type: string, eid?: string) => void;
  onToggleTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  onTriageChange?: (taskId: string, triage: 'critical' | 'normal') => void;
  onEditTask?: (task: OnboardingTask) => void;
  onDeleteTask?: (taskId: string) => void;
}

function HRTasksView({ tasks, empId, onOpenModal, onToggleTask, onTaskStatusChange, onTriageChange, onEditTask, onDeleteTask }: HRTasksViewProps) {
  const [showArchived, setShowArchived] = useState(false);
  const obActive = tasks.filter(t => t.task_phase === 'onboarding' && !t.archived && t.status !== 'complete');
  const ongoingActive = tasks.filter(t => t.task_phase === 'active' && !t.archived && t.status !== 'complete');
  const archived = tasks.filter(t => t.archived || t.status === 'complete');

  async function reopenTask(taskId: string) {
    await supabase.from('onboarding_tasks').update({ status: 'in-progress', archived: false, completed_at: null }).eq('id', taskId);
    onTaskStatusChange(taskId, 'in-progress');
  }

  return (
    <>
      <div className="card mb2">
        <div className="card-header">
          <h3>Onboarding Tasks ({obActive.length})</h3>
          <button className="btn-primary sm" onClick={() => onOpenModal('add-task', empId)}>+ Add Task</button>
        </div>
        {obActive.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">{'\u2713'}</div><p>All onboarding tasks complete</p></div>
        ) : obActive.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingRight: 8 }}>
            <div style={{ flex: 1 }}>
              <TaskCard task={t} isHR onToggle={onToggleTask} onTriageChange={onTriageChange} canReopen={false} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12 }}>
              {onEditTask && (
                <button onClick={() => onEditTask(t)} title="Edit task" style={{ padding: 5, borderRadius: 6, border: '1px solid #E5E3DC', background: '#F8F7F4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={12} color="#6B6860" />
                </button>
              )}
              {onDeleteTask && (
                <button onClick={() => onDeleteTask(t.id)} title="Delete task" style={{ padding: 5, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} color="#DC2626" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {ongoingActive.length > 0 && (
        <div className="card mb2">
          <div className="card-header"><h3>Ongoing Tasks ({ongoingActive.length})</h3></div>
          {ongoingActive.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingRight: 8 }}>
              <div style={{ flex: 1 }}>
                <TaskCard task={t} isHR onToggle={onToggleTask} onTriageChange={onTriageChange} canReopen={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12 }}>
                {onEditTask && (
                  <button onClick={() => onEditTask(t)} title="Edit task" style={{ padding: 5, borderRadius: 6, border: '1px solid #E5E3DC', background: '#F8F7F4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={12} color="#6B6860" />
                  </button>
                )}
                {onDeleteTask && (
                  <button onClick={() => onDeleteTask(t.id)} title="Delete task" style={{ padding: 5, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} color="#DC2626" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <div className="card">
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6B6860' }} onClick={() => setShowArchived(v => !v)}>
            <span>Completed / Archived ({archived.length})</span>
            <span style={{ fontSize: 12, color: '#9B9890' }}>{showArchived ? '\u25B2 Hide' : '\u25BC Show'}</span>
          </button>
          {showArchived && archived.map(t => (
            <TaskCard key={t.id} task={t} isHR onToggle={() => {}} canReopen onReopen={reopenTask} isArchived />
          ))}
        </div>
      )}
    </>
  );
}
