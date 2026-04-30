import { useState, useRef } from 'react';
import { Employee, OnboardingTask, Document, Schedule, QuarterlyCheckin, AnnualReview, EmployeeNote, Company } from '../../lib/database.types';
import { ini, pfColor, checkinStatusClass, reviewStatusClass } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { CheckItem } from '../shared/CheckItem';
import { TaskCard } from '../shared/TaskCard';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Download, Eye, Trash2, Pencil, X, Check } from 'lucide-react';

type DetailTab = 'overview' | 'tasks' | 'documents' | 'schedule' | 'checkins' | 'notes';

const DOC_CATEGORIES = ['Policy', 'Form', 'Handbook', 'Contract', 'Training', 'Other'];
const DOC_SECTIONS = ['Onboarding Documents', 'HR Forms', 'Policies', 'Training Materials', 'Contracts', 'Custom'];

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

interface Props {
  employee: Employee;
  tasks: OnboardingTask[];
  documents: Document[];
  schedules: Schedule[];
  checkins: QuarterlyCheckin[];
  reviews: AnnualReview[];
  notes: EmployeeNote[];
  companies?: Company[];
  onBack: () => void;
  onOpenModal: (type: string, eid?: string) => void;
  onToggleTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  onTaskTriageChange?: (taskId: string, triage: 'critical' | 'normal') => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onEditEmployee: (id: string) => void;
  onDocumentsChanged: (empId: string) => void;
}

export function EmployeeDetail({
  employee: e, tasks, documents, schedules, checkins, reviews, notes, companies = [],
  onBack, onOpenModal, onToggleTask, onTaskStatusChange, onTaskTriageChange,
  onArchive, onRestore, onEditEmployee, onDocumentsChanged,
}: Props) {
  const companyName = companies.find(c => c.id === e.company_id)?.name ?? null;
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const obTasks = tasks.filter(t => t.task_phase === 'onboarding');
  const done = obTasks.filter(t => t.status === 'complete').length;
  const tabs: DetailTab[] = ['overview', 'tasks', 'documents', 'schedule', 'checkins', 'notes'];

  const tabLabel: Record<DetailTab, string> = {
    overview: 'Overview',
    tasks: 'Tasks',
    documents: 'Documents',
    schedule: 'Schedule',
    checkins: 'Check-ins',
    notes: 'Notes',
  };

  const empDocs = documents.filter(d => d.employee_id === e.id);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
            <button className="btn-ghost sm" onClick={onBack}>← Back</button>
            <h1>{e.name}</h1>
            <StatusBadge status={e.status} />
            {e.lifecycle_status === 'active' && (
              <span className="badge b-success" style={{ marginLeft: 4 }}>Active Employee</span>
            )}
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
          <div>
            <div className="card mb2">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
                {e.avatar_url ? (
                  <img
                    src={e.avatar_url}
                    alt={e.name}
                    style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px', display: 'block', border: '2px solid #E5E3DC' }}
                  />
                ) : (
                  <div className="avatar av-navy av-52" style={{ margin: '0 auto 12px' }}>{ini(e.name)}</div>
                )}
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1916' }}>{e.name}</div>
                <div style={{ color: '#6B6860', fontSize: 13, marginTop: 3 }}>{e.role}</div>
                {e.lifecycle_status === 'onboarding' && (
                  <div style={{ margin: '14px 0' }}>
                    <div className="prog-bar" style={{ height: 8 }}>
                      <div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6860', marginTop: 5 }}>{e.progress}% complete — {done} of {obTasks.length} onboarding tasks done</div>
                  </div>
                )}
                {e.lifecycle_status === 'active'
                  ? <span className="badge b-success">Active Employee</span>
                  : <StatusBadge status={e.status} />
                }
              </div>
            </div>
            <div className="card mb2">
              <div className="card-header"><h3>Employee Info</h3></div>
              <div className="card-body" style={{ padding: '.5rem 1.25rem' }}>
                {([
                  ['Email', e.email],
                  ['Phone', e.phone],
                  ['Department', e.department],
                  ['Manager', e.manager],
                  ['Start date', e.start_date],
                  ...(companyName ? [['Company', companyName]] : []),
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
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onOpenModal('add-checkin', e.id)}>Schedule Check-in</button>
                <button className="btn-ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => onOpenModal('add-review', e.id)}>Schedule Review</button>
                {e.archived ? (
                  <button className="btn-ghost sm" style={{ justifyContent: 'flex-start', borderColor: '#2D9A60', color: '#2D9A60' }} onClick={() => onRestore(e.id)}>Restore to Active</button>
                ) : (
                  <>
                    <hr style={{ border: 'none', borderTop: '1px solid #F2F1ED', margin: '4px 0' }} />
                    <button className="btn-ghost sm" style={{ justifyContent: 'flex-start', borderColor: '#9B9890', color: '#6B6860' }} onClick={() => onArchive(e.id)}>Archive Employee</button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="tabs-row">
              {tabs.map(t => (
                <button key={t} className={`tab-btn${detailTab === t ? ' active' : ''}`} onClick={() => setDetailTab(t)}>
                  {tabLabel[t]}
                  {t === 'documents' && empDocs.length > 0 && (
                    <span style={{ marginLeft: 5, padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: detailTab === t ? '#E8EFF8' : '#F2F1ED', color: detailTab === t ? '#1B3F6E' : '#9B9890' }}>
                      {empDocs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <>
                <div className="two-col-sm">
                  {[
                    ['Not Started', obTasks.filter(t => t.status === 'pending').length, ''],
                    ['In Progress', obTasks.filter(t => t.status === 'in-progress').length, 'c-navy'],
                    ['Complete', obTasks.filter(t => t.status === 'complete').length, 'c-green'],
                    ['Overdue', obTasks.filter(t => t.status === 'overdue').length, 'c-red'],
                  ].map(([label, val, cls]) => (
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
                    <CheckItem key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} />
                  ))}
                </div>
              </>
            )}

            {detailTab === 'tasks' && (
              <HRTasksView tasks={tasks} onOpenModal={onOpenModal} empId={e.id} onToggleTask={onToggleTask} onTaskStatusChange={onTaskStatusChange} onTriageChange={onTaskTriageChange} />
            )}

            {detailTab === 'documents' && (
              <HRDocumentsView
                employee={e}
                documents={empDocs}
                onDocumentsChanged={() => onDocumentsChanged(e.id)}
              />
            )}

            {detailTab === 'schedule' && (
              <div className="card">
                <div className="card-header"><h3>Day 1 Schedule</h3></div>
                <div style={{ padding: '0 1.25rem' }}>
                  {schedules.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📅</div><p>No schedule yet</p></div>
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

            {detailTab === 'checkins' && (
              <>
                <div className="card mb2">
                  <div className="card-header">
                    <h3>Quarterly Check-ins</h3>
                    <button className="btn-primary sm" onClick={() => onOpenModal('add-checkin', e.id)}>+ Schedule</button>
                  </div>
                  {checkins.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">📅</div><p>No check-ins scheduled</p></div>
                  ) : checkins.map(c => (
                    <div key={c.id} className="check-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.quarter} {c.year}</div>
                        <span className={`badge ${checkinStatusClass(c.status)}`}>{c.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B6860' }}>Scheduled: {c.scheduled_at}</div>
                      {c.notes && <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2 }}>{c.notes}</div>}
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3>Annual Reviews</h3>
                    <button className="btn-primary sm" onClick={() => onOpenModal('add-review', e.id)}>+ Schedule</button>
                  </div>
                  {reviews.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">📊</div><p>No reviews scheduled</p></div>
                  ) : reviews.map(r => (
                    <div key={r.id} className="check-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.review_year} Annual Review</div>
                        <span className={`badge ${reviewStatusClass(r.status)}`}>{r.status}</span>
                      </div>
                      {r.scheduled_at && <div style={{ fontSize: 12, color: '#6B6860' }}>Scheduled: {r.scheduled_at}</div>}
                      {r.rating && <div style={{ fontSize: 12, color: '#6B6860' }}>Rating: {r.rating}/5</div>}
                      {r.summary && <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2 }}>{r.summary}</div>}
                    </div>
                  ))}
                </div>
              </>
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
                    <div style={{ fontSize: 11, color: '#9B9890' }}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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

type DocWithExt = Document;

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

  const [form, setForm] = useState<UploadForm>({
    file: null, displayName: '', category: 'Other',
    section: 'Onboarding Documents', customSection: '', description: '', requiresAck: false,
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, file, displayName: file.name.replace(/\.[^.]+$/, '') }));
  }

  async function handleUpload() {
    if (!form.file) { setUploadError('Please select a file.'); return; }
    if (!form.displayName.trim()) { setUploadError('Please enter a display name.'); return; }
    setUploading(true);
    setUploadError('');
    setUploadProgress(10);

    const ext = form.file.name.split('.').pop();
    const path = `docs/${employee.id}/${Date.now()}-${form.file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from('employee-documents')
      .upload(path, form.file);

    if (uploadErr) {
      setUploadError('Upload failed: ' + uploadErr.message);
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(70);
    const section = form.section === 'Custom' ? form.customSection || 'Custom' : form.section;

    const { error: dbErr } = await supabase.from('documents').insert({
      employee_id: employee.id,
      name: form.displayName.trim(),
      file_path: path,
      category: form.category,
      section,
      description: form.description || null,
      requires_acknowledgment: form.requiresAck,
      type: form.file.type || (ext ?? ''),
      size_label: fmtSize(form.file.size),
      file_size_bytes: form.file.size,
      mime_type: form.file.type,
      visible_to_employee: true,
      uploaded_by: 'HR',
    });

    setUploadProgress(100);
    setUploading(false);

    if (dbErr) {
      await supabase.storage.from('employee-documents').remove([path]);
      setUploadError('Failed to save document record: ' + dbErr.message);
      setUploadProgress(0);
      return;
    }

    setForm({ file: null, displayName: '', category: 'Other', section: 'Onboarding Documents', customSection: '', description: '', requiresAck: false });
    setShowUpload(false);
    setUploadProgress(0);
    onDocumentsChanged();
  }

  async function handleDelete(doc: DocWithExt) {
    setDeleting(true);
    if (doc.file_path) {
      await supabase.storage.from('employee-documents').remove([doc.file_path]);
    }
    await supabase.from('documents').delete().eq('id', doc.id);
    setDeleting(false);
    setDeleteConfirm(null);
    onDocumentsChanged();
  }

  async function handleView(doc: DocWithExt) {
    if (!doc.file_path) {
      if (doc.file_url) window.open(doc.file_url, '_blank');
      return;
    }
    const { data } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) {
      const mime = doc.mime_type ?? '';
      if (mime.startsWith('image/') || mime === 'application/pdf') {
        window.open(data.signedUrl, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = doc.name;
        a.click();
      }
    }
  }

  async function handleDownload(doc: DocWithExt) {
    if (!doc.file_path) {
      if (doc.file_url) window.open(doc.file_url, '_blank');
      return;
    }
    const { data } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.name;
      a.click();
    }
  }

  function startEdit(doc: DocWithExt) {
    setEditingId(doc.id);
    setEditForm({ name: doc.name, category: doc.category, section: (doc as DocWithExt).section ?? 'Onboarding Documents' });
  }

  async function saveEdit(docId: string) {
    await supabase.from('documents').update({
      name: editForm.name,
      category: editForm.category,
      section: editForm.section,
    }).eq('id', docId);
    setEditingId(null);
    onDocumentsChanged();
  }

  // Group by section
  const sections: Record<string, DocWithExt[]> = {};
  for (const doc of documents as DocWithExt[]) {
    const sec = doc.section ?? 'Onboarding Documents';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(doc);
  }

  return (
    <>
      {/* Upload panel */}
      <div className="card mb2">
        <div className="card-header">
          <h3>Documents {documents.length > 0 && `(${documents.length})`}</h3>
          <button
            className="btn-primary sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowUpload(v => !v)}
          >
            <Upload size={13} /> Upload Document
          </button>
        </div>

        {showUpload && (
          <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
            {uploadError && <div className="error-msg" style={{ marginBottom: 12 }}>{uploadError}</div>}

            {/* File picker */}
            <div
              style={{
                border: '2px dashed #E5E3DC', borderRadius: 8, padding: '18px 14px',
                textAlign: 'center', cursor: 'pointer', marginBottom: 12,
                background: form.file ? '#F7FFF9' : '#FAFAF8',
              }}
              onClick={() => fileRef.current?.click()}
            >
              {form.file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <FileText size={18} style={{ color: '#1B3F6E' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{form.file.name}</div>
                    <div style={{ fontSize: 11, color: '#9B9890' }}>{fmtSize(form.file.size)}</div>
                  </div>
                  <button
                    style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9B9890' }}
                    onClick={ev => { ev.stopPropagation(); setForm(f => ({ ...f, file: null, displayName: '' })); }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.4 }} />
                  <div style={{ fontSize: 13, color: '#9B9890' }}>Click to select a file</div>
                  <div style={{ fontSize: 11, color: '#BCBAB3', marginTop: 2 }}>PDF, DOC, DOCX, PNG, JPG, XLSX</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx" style={{ display: 'none' }} onChange={handleFileSelect} />

            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="field full">
                <label>Display name</label>
                <input type="text" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Employee Handbook 2024" />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Section</label>
                <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                  {DOC_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.section === 'Custom' && (
                <div className="field full">
                  <label>Custom section name</label>
                  <input type="text" value={form.customSection} onChange={e => setForm(f => ({ ...f, customSection: e.target.value }))} placeholder="e.g. Safety Certifications" />
                </div>
              )}
              <div className="field full">
                <label>Description <span style={{ color: '#9B9890', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
              </div>
              <div className="field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="req-ack"
                  checked={form.requiresAck}
                  onChange={e => setForm(f => ({ ...f, requiresAck: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="req-ack" style={{ margin: 0, fontSize: 13, fontWeight: 400, color: '#1A1916' }}>
                  Requires employee acknowledgment
                </label>
              </div>
            </div>

            {uploading && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6860', marginBottom: 4 }}>
                  <span>Uploading…</span><span>{uploadProgress}%</span>
                </div>
                <div style={{ height: 6, background: '#E5E3DC', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: uploadProgress + '%', background: '#1B3F6E', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost sm" onClick={() => { setShowUpload(false); setUploadError(''); setForm(f => ({ ...f, file: null, displayName: '' })); }}>Cancel</button>
              <button className="btn-primary sm" onClick={handleUpload} disabled={uploading || !form.file}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {documents.length === 0 && !showUpload ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>No documents yet</p>
            <div className="esub">Upload onboarding documents, contracts, policies and more.</div>
          </div>
        ) : (
          Object.entries(sections).map(([section, docs]) => (
            <div key={section}>
              <div style={{
                padding: '10px 1.25rem 6px',
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                textTransform: 'uppercase', color: '#9B9890',
                borderBottom: '1px solid #F2F1ED',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {section}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#BCBAB3', background: '#F2F1ED', padding: '1px 6px', borderRadius: 8 }}>
                  {docs.length}
                </span>
              </div>
              {docs.map(doc => (
                <div key={doc.id} style={{ padding: '10px 1.25rem', borderBottom: '1px solid #F9F8F5' }}>
                  {editingId === doc.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        style={{ fontSize: 13 }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} style={{ fontSize: 12 }}>
                          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          type="text"
                          value={editForm.section}
                          onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}
                          placeholder="Section name"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-primary sm" onClick={() => saveEdit(doc.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Save
                        </button>
                        <button className="btn-ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} style={{ color: '#1B3F6E', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 1 }}>
                          {doc.category}
                          {doc.size_label && ` · ${doc.size_label}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button
                          title="View"
                          onClick={() => handleView(doc)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#6B6860', borderRadius: 5, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F2F1ED'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          title="Download"
                          onClick={() => handleDownload(doc)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#6B6860', borderRadius: 5, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F2F1ED'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => startEdit(doc)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#6B6860', borderRadius: 5, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F2F1ED'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setDeleteConfirm(doc.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#DC2626', borderRadius: 5, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation inline */}
                  {deleteConfirm === doc.id && (
                    <div style={{
                      marginTop: 8, padding: '10px 12px', background: '#FEF2F2',
                      border: '1px solid #FECACA', borderRadius: 7,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}>
                      <div style={{ fontSize: 13, color: '#991B1B' }}>
                        Delete <strong>{doc.name}</strong>? This cannot be undone.
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn-ghost sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        <button
                          className="btn-ghost sm"
                          style={{ borderColor: '#DC2626', color: '#DC2626' }}
                          onClick={() => handleDelete(doc)}
                          disabled={deleting}
                        >
                          {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
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
}

function HRTasksView({ tasks, empId, onOpenModal, onToggleTask, onTaskStatusChange, onTriageChange }: HRTasksViewProps) {
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
          <div className="empty-state"><div style={{ fontSize: 24, marginBottom: 8 }}>📋</div><p>No active onboarding tasks</p></div>
        ) : obActive.map(t => (
          <TaskCard key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} onTriageChange={onTriageChange} canReopen={false} />
        ))}
      </div>
      {ongoingActive.length > 0 && (
        <div className="card mb2">
          <div className="card-header">
            <h3>Ongoing Tasks ({ongoingActive.length})</h3>
          </div>
          {ongoingActive.map(t => (
            <TaskCard key={t.id} task={t} isHR onToggle={onToggleTask} onStatusChange={onTaskStatusChange} onTriageChange={onTriageChange} canReopen={false} />
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <div className="card">
          <button
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6B6860',
            }}
            onClick={() => setShowArchived(s => !s)}
          >
            <span>Completed tasks — {archived.length}</span>
            <span style={{ fontSize: 12, color: '#9B9890' }}>{showArchived ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showArchived && archived.map(t => (
            <TaskCard key={t.id} task={t} isHR onToggle={() => {}} onStatusChange={onTaskStatusChange} onReopen={reopenTask} canReopen isArchived />
          ))}
        </div>
      )}
    </>
  );
}
