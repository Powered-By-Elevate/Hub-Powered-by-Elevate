import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Document, DocumentBucket, Employee, Company, DocumentAcknowledgment } from '../../lib/database.types';
import { Modal } from '../shared/Modal';
import { Plus, Pencil, Trash2, FileText, Upload, X, Check, Eye, Users } from 'lucide-react';

interface Props {
  employees: Employee[];
  companies: Company[];
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function HRDocuments({ employees, companies }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [buckets, setBuckets] = useState<DocumentBucket[]>([]);
  const [acks, setAcks] = useState<DocumentAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [viewAcks, setViewAcks] = useState<Document | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: docs }, { data: bks }, { data: ackData }] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('document_buckets').select('*').eq('active', true).order('sort_order'),
      supabase.from('document_acknowledgments').select('*'),
    ]);
    setDocuments(docs ?? []);
    setBuckets(bks ?? []);
    setAcks(ackData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function deleteDoc(doc: Document) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    if (doc.file_path) await supabase.storage.from('employee-documents').remove([doc.file_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    loadAll();
  }

  async function archiveDoc(doc: Document) {
    const newStatus = doc.published_status === 'archived' ? 'published' : 'archived';
    await supabase.from('documents').update({ published_status: newStatus }).eq('id', doc.id);
    loadAll();
  }

  function ackCount(docId: string): number {
    return acks.filter(a => a.document_id === docId).length;
  }

  function targetLabel(doc: Document): string {
    if (doc.target_type === 'all') return 'All employees';
    if (doc.target_type === 'company') {
      const co = companies.find(c => c.id === doc.target_company_id);
      return co ? `Company: ${co.name}` : 'Company';
    }
    if (doc.target_type === 'department') return `Department: ${doc.target_department ?? '—'}`;
    if (doc.target_type === 'individual') {
      const emp = employees.find(e => e.id === doc.employee_id);
      return emp ? `Individual: ${emp.name}` : 'Individual';
    }
    return '—';
  }

  let filtered = documents;
  if (selectedBucket !== 'all') filtered = filtered.filter(d => d.bucket_id === selectedBucket);
  if (!showArchived) filtered = filtered.filter(d => d.published_status !== 'archived');

  const byBucket: Record<string, Document[]> = {};
  for (const d of filtered) {
    const key = d.bucket_id ?? 'no-bucket';
    if (!byBucket[key]) byBucket[key] = [];
    byBucket[key].push(d);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Documents</h1>
          <p>Company-wide and employee documents organized by bucket</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={14} style={{ marginRight: 4 }} /> Upload Document
          </button>
        </div>
      </div>

      <div className="content">
        <div className="card mb2">
          <div style={{ display: 'flex', gap: 12, padding: '12px 16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedBucket} onChange={e => setSelectedBucket(e.target.value)} style={{ minWidth: 200 }}>
              <option value="all">All buckets</option>
              {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B6860', cursor: 'pointer' }}>
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9B9890' }}>
              {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading documents…</p></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '2.5rem 1.25rem' }}>
              <FileText size={32} style={{ color: '#BCBAB3', margin: '0 auto 12px', display: 'block' }} />
              <p>No documents yet</p>
              <div className="esub">Click "Upload Document" to add the first one.</div>
            </div>
          </div>
        ) : (
          buckets.map(bucket => {
            const docs = byBucket[bucket.id];
            if (!docs || docs.length === 0) return null;
            return (
              <div key={bucket.id} className="card mb2">
                <div className="card-header">
                  <h3>{bucket.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9890', background: '#F2F1ED', padding: '2px 8px', borderRadius: 10 }}>
                    {docs.length}
                  </span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Acks</th>
                      <th>Version</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id} style={{ opacity: d.published_status === 'archived' ? 0.5 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={14} style={{ color: '#1B3F6E' }} />
                            <div>
                              <div className="emp-name">{d.name}</div>
                              {d.description && <div className="emp-email">{d.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{targetLabel(d)}</td>
                        <td>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: d.published_status === 'archived' ? '#F2F1ED' : d.published_status === 'draft' ? '#FEF3C7' : '#DCFCE7',
                            color: d.published_status === 'archived' ? '#6B6860' : d.published_status === 'draft' ? '#92400E' : '#16A34A',
                          }}>
                            {d.published_status ?? 'published'}
                          </span>
                        </td>
                        <td>
                          {d.requires_acknowledgment ? (
                            <button className="btn-ghost sm" onClick={() => setViewAcks(d)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Users size={11} /> {ackCount(d.id)}
                            </button>
                          ) : <span style={{ color: '#C5C3BB', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>v{d.version_number ?? 1}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-ghost sm" onClick={() => setEditDoc(d)}><Pencil size={11} /></button>
                            <button className="btn-ghost sm" onClick={() => archiveDoc(d)} title={d.published_status === 'archived' ? 'Unarchive' : 'Archive'}>
                              {d.published_status === 'archived' ? <Check size={11} /> : <X size={11} />}
                            </button>
                            <button className="btn-danger-soft sm" onClick={() => deleteDoc(d)}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        {byBucket['no-bucket'] && byBucket['no-bucket'].length > 0 && (
          <div className="card mb2">
            <div className="card-header">
              <h3>Uncategorized</h3>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9890', background: '#F2F1ED', padding: '2px 8px', borderRadius: 10 }}>
                {byBucket['no-bucket'].length}
              </span>
            </div>
            <table>
              <thead><tr><th>Document</th><th>Actions</th></tr></thead>
              <tbody>
                {byBucket['no-bucket'].map(d => (
                  <tr key={d.id}>
                    <td><div className="emp-name">{d.name}</div></td>
                    <td><button className="btn-ghost sm" onClick={() => setEditDoc(d)}>Assign Bucket</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showUpload || editDoc) && (
        <UploadDocumentModal
          doc={editDoc}
          buckets={buckets}
          employees={employees}
          companies={companies}
          onClose={() => { setShowUpload(false); setEditDoc(null); }}
          onSaved={() => { setShowUpload(false); setEditDoc(null); loadAll(); }}
        />
      )}

      {viewAcks && (
        <AcknowledgmentsModal
          document={viewAcks}
          employees={employees}
          acks={acks.filter(a => a.document_id === viewAcks.id)}
          onClose={() => setViewAcks(null)}
        />
      )}
    </>
  );
}

interface UploadProps {
  doc: Document | null;
  buckets: DocumentBucket[];
  employees: Employee[];
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
}

function UploadDocumentModal({ doc, buckets, employees, companies, onClose, onSaved }: UploadProps) {
  const isEdit = !!doc;
  const [name, setName] = useState(doc?.name ?? '');
  const [description, setDescription] = useState(doc?.description ?? '');
  const [bucketId, setBucketId] = useState<string>(doc?.bucket_id ?? buckets[0]?.id ?? '');
  const [targetType, setTargetType] = useState<'all' | 'company' | 'department' | 'individual'>(doc?.target_type ?? 'all');
  const [targetCompanyId, setTargetCompanyId] = useState<string>(doc?.target_company_id ?? '');
  const [targetDepartment, setTargetDepartment] = useState<string>(doc?.target_department ?? '');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(doc?.employee_id ?? '');
  const [requiresAck, setRequiresAck] = useState(doc?.requires_acknowledgment ?? false);
  const [publishedStatus, setPublishedStatus] = useState<'draft' | 'published'>(doc?.published_status === 'archived' ? 'published' : (doc?.published_status as 'draft' | 'published') ?? 'published');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  async function save() {
    setError('');
    if (!name.trim()) { setError('Document name is required.'); return; }
    if (!bucketId) { setError('Bucket is required.'); return; }
    if (targetType === 'company' && !targetCompanyId) { setError('Company is required when targeting a company.'); return; }
    if (targetType === 'department' && !targetDepartment) { setError('Department is required when targeting a department.'); return; }
    if (targetType === 'individual' && !targetEmployeeId) { setError('Employee is required when targeting an individual.'); return; }
    if (!isEdit && !file) { setError('Please select a file.'); return; }

    setSaving(true);
    let filePath = doc?.file_path ?? null;
    let mimeType = doc?.mime_type ?? null;
    let fileSize = doc?.file_size_bytes ?? null;
    let sizeLabel = doc?.size_label ?? null;

    if (file) {
      setProgress(20);
      const path = `docs/company/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('employee-documents').upload(path, file);
      if (upErr) { setError('Upload failed: ' + upErr.message); setSaving(false); return; }
      filePath = path;
      mimeType = file.type;
      fileSize = file.size;
      sizeLabel = fmtSize(file.size);
      setProgress(60);
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      bucket_id: bucketId,
      target_type: targetType,
      target_company_id: targetType === 'company' ? targetCompanyId : null,
      target_department: targetType === 'department' ? targetDepartment : null,
      employee_id: targetType === 'individual' ? targetEmployeeId : null,
      requires_acknowledgment: requiresAck,
      published_status: publishedStatus,
      published_at: publishedStatus === 'published' ? new Date().toISOString() : null,
      file_path: filePath,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      size_label: sizeLabel,
      visible_to_employee: true,
      category: 'Other',
      type: mimeType ?? 'application/octet-stream',
    };

    setProgress(80);
    const { error: dbErr } = isEdit
      ? await supabase.from('documents').update(payload).eq('id', doc!.id)
      : await supabase.from('documents').insert(payload);

    setProgress(100);
    setSaving(false);
    if (dbErr) { setError('Save failed: ' + dbErr.message); return; }
    onSaved();
  }

  return (
    <Modal
      title={isEdit ? 'Edit Document' : 'Upload Document'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? `Saving… ${progress}%` : isEdit ? 'Save Changes' : 'Upload'}
          </button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}

      <div className="form-grid">
        {!isEdit && (
          <div className="field full">
            <label>File <span style={{ color: '#E53E3E' }}>*</span></label>
            <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!name) setName(f.name); } }} />
            {file && <div style={{ fontSize: 11, color: '#6B6860', marginTop: 4 }}>{file.name} · {fmtSize(file.size)}</div>}
          </div>
        )}

        <div className="field full">
          <label>Display Name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026 Employee Handbook" />
        </div>

        <div className="field full">
          <label>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional — shown to employees" />
        </div>

        <div className="field">
          <label>Bucket <span style={{ color: '#E53E3E' }}>*</span></label>
          <select value={bucketId} onChange={e => setBucketId(e.target.value)}>
            <option value="">— select —</option>
            {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Status</label>
          <select value={publishedStatus} onChange={e => setPublishedStatus(e.target.value as 'draft' | 'published')}>
            <option value="published">Published (visible)</option>
            <option value="draft">Draft (hidden)</option>
          </select>
        </div>

        <div className="field full">
          <label>Target Audience <span style={{ color: '#E53E3E' }}>*</span></label>
          <select value={targetType} onChange={e => setTargetType(e.target.value as 'all' | 'company' | 'department' | 'individual')}>
            <option value="all">All Employees</option>
            <option value="company">Specific Company</option>
            <option value="department">Specific Department</option>
            <option value="individual">Specific Employee</option>
          </select>
        </div>

        {targetType === 'company' && (
          <div className="field full">
            <label>Company</label>
            <select value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)}>
              <option value="">— select —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {targetType === 'department' && (
          <div className="field full">
            <label>Department</label>
            <select value={targetDepartment} onChange={e => setTargetDepartment(e.target.value)}>
              <option value="">— select —</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {targetType === 'individual' && (
          <div className="field full">
            <label>Employee</label>
            <select value={targetEmployeeId} onChange={e => setTargetEmployeeId(e.target.value)}>
              <option value="">— select —</option>
              {employees.filter(e => !e.archived).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}

        <div className="field full">
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#1A1916' }}>
            <input type="checkbox" checked={requiresAck} onChange={e => setRequiresAck(e.target.checked)} style={{ width: 16, height: 16 }} />
            Require employee acknowledgment
          </label>
        </div>
      </div>
    </Modal>
  );
}

interface AcksProps {
  document: Document;
  employees: Employee[];
  acks: DocumentAcknowledgment[];
  onClose: () => void;
}

function AcknowledgmentsModal({ document, employees, acks, onClose }: AcksProps) {
  // Determine who should have acknowledged based on targeting
  const targetEmps = employees.filter(e => {
    if (e.archived || e.is_test_account) return false;
    if (document.target_type === 'all') return true;
    if (document.target_type === 'company') return e.company_id === document.target_company_id;
    if (document.target_type === 'department') return e.department === document.target_department;
    if (document.target_type === 'individual') return e.id === document.employee_id;
    return false;
  });

  const ackedIds = new Set(acks.map(a => a.employee_id));
  const acked = targetEmps.filter(e => ackedIds.has(e.id));
  const pending = targetEmps.filter(e => !ackedIds.has(e.id));

  return (
    <Modal title={`Acknowledgments — ${document.name}`} onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>Close</button>}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#6B6860', marginBottom: 4 }}>
          {acked.length} of {targetEmps.length} have acknowledged
        </div>
        <div style={{ height: 8, background: '#F2F1ED', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: targetEmps.length ? `${(acked.length / targetEmps.length) * 100}%` : '0%', background: '#2D9A60' }} />
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>PENDING ({pending.length})</div>
          {pending.map(e => (
            <div key={e.id} style={{ padding: '6px 0', borderBottom: '1px solid #F2F1ED', fontSize: 13 }}>
              {e.name} <span style={{ color: '#9B9890', fontSize: 11 }}>· {e.department ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {acked.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>ACKNOWLEDGED ({acked.length})</div>
          {acked.map(e => {
            const ack = acks.find(a => a.employee_id === e.id);
            return (
              <div key={e.id} style={{ padding: '6px 0', borderBottom: '1px solid #F2F1ED', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>{e.name}</span>
                <span style={{ color: '#9B9890', fontSize: 11 }}>{ack?.acknowledged_at ? new Date(ack.acknowledged_at).toLocaleDateString() : '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}