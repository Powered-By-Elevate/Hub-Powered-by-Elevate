import { useState, useRef } from 'react';
import { Modal } from '../../shared/Modal';
import { JobTitleInput } from '../../shared/JobTitleInput';
import { supabase } from '../../../lib/supabase';
import type { Employee, Company } from '../../../lib/database.types';
import { X, Upload, FileText } from 'lucide-react';

interface StagedDoc {
  file: File;
  displayName: string;
  category: string;
  section: string;
}

const DOC_CATEGORIES = ['Policy', 'Form', 'Handbook', 'Contract', 'Training', 'Other'];
const DOC_SECTIONS = ['Onboarding Documents', 'HR Forms', 'Policies', 'Training Materials', 'Contracts', 'Custom'];

interface Props {
  onClose: () => void;
  onCreated: (emp: Employee) => void;
  departments: string[];
  companies: Company[];
  employees: Employee[];
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function AddEmployeeModal({ onClose, onCreated, departments, companies, employees }: Props) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', role: '',
    department: departments[0] ?? '', manager: '', manager_id: '', startDate: '',
    company_id: companies[0]?.id ?? '', lifecycle_status: 'onboarding' as string,
    pillar_focus: '',
  });
  const activeEmployees = employees.filter(emp => !emp.archived);
  const [docs, setDocs] = useState<StagedDoc[]>([]);
  const [customSection, setCustomSection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocs(prev => [...prev, {
      file,
      displayName: file.name.replace(/\.[^.]+$/, ''),
      category: 'Other',
      section: 'Onboarding Documents',
    }]);
    e.target.value = '';
  }

  function updateDoc(idx: number, patch: Partial<StagedDoc>) {
    setDocs(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  }

  function removeDoc(idx: number) {
    setDocs(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    setError('');

    const selectedManager = activeEmployees.find(emp => emp.id === form.manager_id);
    const { data: emp, error: empErr } = await supabase.from('employees').insert({
      name: `${form.firstName} ${form.lastName}`,
      email: form.email,
      role: form.role || 'Employee',
      department: form.department || 'General',
      manager: selectedManager?.name || 'TBD',
      manager_id: form.manager_id || null,
      start_date: form.startDate || 'TBD',
      status: 'not-started',
      progress: 0,
      company_id: form.company_id || null,
      lifecycle_status: form.lifecycle_status,
      pillar_focus: form.pillar_focus || null,
    }).select().single();

    if (empErr || !emp) {
      setError(empErr?.message ?? 'Failed to create employee.');
      setSaving(false);
      return;
    }

    const uploadedPaths: string[] = [];
    let docUploadFailed = false;

    for (const doc of docs) {
      const ext = doc.file.name.split('.').pop();
      const path = `docs/${emp.id}/${Date.now()}-${doc.file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('employee-documents')
        .upload(path, doc.file);
      if (uploadErr) {
        docUploadFailed = true;
        break;
      }
      uploadedPaths.push(path);
      const section = doc.section === 'Custom' ? customSection || 'Custom' : doc.section;
      await supabase.from('documents').insert({
        employee_id: emp.id,
        name: doc.displayName,
        file_path: path,
        category: doc.category,
        section,
        type: doc.file.type || (ext ?? ''),
        size_label: fmtSize(doc.file.size),
        file_size_bytes: doc.file.size,
        mime_type: doc.file.type,
        visible_to_employee: true,
        uploaded_by: 'HR',
      });
    }

    if (docUploadFailed) {
      for (const path of uploadedPaths) {
        await supabase.storage.from('employee-documents').remove([path]);
      }
      await supabase.from('employees').delete().eq('id', emp.id);
      setError('Document upload failed. Employee was not created. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onCreated(emp as Employee);
    onClose();
  }

  return (
    <Modal
      title="Add New Employee"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Employee'}
          </button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field">
          <label>First name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="Jane" />
        </div>
        <div className="field">
          <label>Last name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Smith" />
        </div>
        <div className="field full">
          <label>{form.lifecycle_status === 'applicant' ? 'Contact email' : 'Work email'} <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="email" value={form.email} onChange={set('email')} placeholder={form.lifecycle_status === 'applicant' ? 'jane.smith@gmail.com' : 'jane.smith@company.com'} />
        </div>
        <div className="field full">
          <label>Job title</label>
          <JobTitleInput value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} />
        </div>
        <div className="field">
          <label>Department</label>
          <select value={form.department} onChange={set('department')}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Manager</label>
          <select value={form.manager_id} onChange={set('manager_id')}>
            <option value="">-- Select Manager --</option>
            {activeEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.lifecycle_status} onChange={set('lifecycle_status')}>
            <option value="applicant">Applicant</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
          </select>
        </div>
        <div className="field">
          <label>Pillar Focus</label>
          <select value={form.pillar_focus} onChange={set('pillar_focus')}>
            <option value="">— None —</option>
            <option value="Phileo Love">Phileo Love</option>
            <option value="Trust">Trust</option>
            <option value="Teamwork">Teamwork</option>
            <option value="Big Goal">Big Goal</option>
            <option value="Legacy">Legacy</option>
            <option value="Identity">Identity</option>
          </select>
        </div>
        {companies.length > 0 && (
          <div className="field">
            <label>Company</label>
            <select value={form.company_id} onChange={set('company_id')}>
              <option value="">— None —</option>
              {companies.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Documents section */}
      <div style={{ marginTop: 24, borderTop: '1px solid #E5E3DC', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1916' }}>Documents</div>
            <div style={{ fontSize: 12, color: '#9B9890', marginTop: 1 }}>Optionally attach files to this employee's profile</div>
          </div>
          <button
            type="button"
            className="btn-ghost sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={13} /> Add File
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {docs.length === 0 ? (
          <div
            style={{
              border: '2px dashed #E5E3DC', borderRadius: 8, padding: '20px 14px',
              textAlign: 'center', color: '#9B9890', fontSize: 13, cursor: 'pointer',
            }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
            Click to attach documents
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map((doc, idx) => (
              <div key={idx} style={{
                border: '1px solid #E5E3DC', borderRadius: 8, padding: 12, background: '#FAFAF8',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <FileText size={18} style={{ color: '#1B3F6E', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#6B6860', marginBottom: 4 }}>
                      {doc.file.name} · {fmtSize(doc.file.size)}
                    </div>
                    <input
                      type="text"
                      value={doc.displayName}
                      onChange={e => updateDoc(idx, { displayName: e.target.value })}
                      placeholder="Display name"
                      style={{ fontSize: 13, width: '100%' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoc(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9B9890' }}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6860', display: 'block', marginBottom: 3 }}>Category</label>
                    <select
                      value={doc.category}
                      onChange={e => updateDoc(idx, { category: e.target.value })}
                      style={{ fontSize: 12 }}
                    >
                      {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6860', display: 'block', marginBottom: 3 }}>Section</label>
                    <select
                      value={doc.section}
                      onChange={e => updateDoc(idx, { section: e.target.value })}
                      style={{ fontSize: 12 }}
                    >
                      {DOC_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {doc.section === 'Custom' && (
                  <input
                    type="text"
                    value={customSection}
                    onChange={e => setCustomSection(e.target.value)}
                    placeholder="Custom section name"
                    style={{ marginTop: 8, fontSize: 12, width: '100%' }}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={13} /> Add Another File
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
