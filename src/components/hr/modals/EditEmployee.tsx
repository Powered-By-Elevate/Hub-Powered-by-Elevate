import { useState, useEffect } from 'react';
import { Modal } from '../../shared/Modal';
import { JobTitleInput } from '../../shared/JobTitleInput';
import { supabase } from '../../../lib/supabase';
import { Employee, Company, Pathway } from '../../../lib/database.types';

interface Props {
  employee: Employee;
  departments: string[];
  companies: Company[];
  employees: Employee[];
  pathways: Pathway[];
  onClose: () => void;
  onSaved: (updated: Employee) => void;
}

const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Seasonal'];
const ROLES = ['Employee', 'Manager', 'HR Admin'];
const LIFECYCLE_STATUSES = ['Onboarding', 'Active'];
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
const READINESS_LEVELS = ['Ready Now', 'Ready in One Year', 'Ready in 2-3 Years', 'Longer Term Development Needed'];
const CURRENT_STATUSES = ['At Risk', 'Needs Support', 'On Track'];

export function EditEmployeeModal({ employee: e, departments, companies, employees, pathways, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: e.name ?? '',
    email: e.email ?? '',
    role: e.role ?? '',
    department: e.department ?? '',
    manager: e.manager ?? '',
    start_date: e.start_date ?? '',
    phone: e.phone ?? '',
    employment_type: e.employment_type ?? 'Full Time',
    auth_role: (e as any).auth_role ?? 'Employee',
    lifecycle_status: e.lifecycle_status ?? 'onboarding',
    company_id: e.company_id ?? '',
    current_level: e.current_level ?? '',
    next_level: e.next_level ?? '',
    pathway_id: e.pathway_id ?? '',
    readiness_level: e.readiness_level ?? '',
    current_status: e.current_status ?? '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(e.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const otherEmployees = employees.filter(emp => emp.id !== e.id && !emp.archived);

  function set(k: keyof typeof form) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: ev.target.value }));
  }

  function handleAvatarChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    let avatar_url = e.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `avatars/${e.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('employee-documents')
        .upload(path, avatarFile, { upsert: true });
      if (uploadErr) {
        setError('Failed to upload photo: ' + uploadErr.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(path);
      avatar_url = urlData.publicUrl;
    }

    const updates: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role.trim(),
      department: form.department || null,
      manager: form.manager || null,
      start_date: form.start_date || null,
      phone: form.phone || null,
      lifecycle_status: form.lifecycle_status,
      company_id: form.company_id || null,
      employment_type: form.employment_type || null,
      current_level: form.current_level || null,
      next_level: form.next_level || null,
      pathway_id: form.pathway_id || null,
      readiness_level: form.readiness_level || null,
      current_status: form.current_status || null,
      avatar_url,
    };

    (updates as any).auth_role = form.auth_role;

    const { data, error: saveErr } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', e.id)
      .select()
      .single();

    setSaving(false);

    if (saveErr) {
      setError(saveErr.message);
      setSaving(false);
      return;
    }

    setSuccess('Changes saved successfully.');
    onSaved(data as Employee);
    setTimeout(onClose, 1200);
  }

  const ini = (name: string) => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Modal
      title="Edit Employee Profile"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      {success && (
        <div style={{
          background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46',
          borderRadius: 7, padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}>{success}</div>
      )}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={form.name}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E3DC' }}
            />
          ) : (
            <div className="avatar av-navy" style={{ width: 64, height: 64, fontSize: 20, lineHeight: '64px' }}>
              {ini(form.name || e.name)}
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="avatar-upload"
            style={{
              display: 'inline-block', padding: '7px 14px', fontSize: 13, fontWeight: 600,
              border: '1px solid #E5E3DC', borderRadius: 7, cursor: 'pointer',
              color: '#1C1B17', background: '#F7F6F2',
            }}
          >
            Change Photo
          </label>
          <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>PNG, JPG or GIF, max 5MB</div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field full">
          <label>Full name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={form.name} onChange={set('name')} placeholder="Jane Smith" />
        </div>
        <div className="field full">
          <label>Work email <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="jane.smith@company.com" />
        </div>
        <div className="field full">
          <label>Job title</label>
          <JobTitleInput value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} />
        </div>
        <div className="field">
          <label>Department</label>
          <select value={form.department} onChange={set('department')}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Manager</label>
          <select value={form.manager ?? ''} onChange={set('manager')}>
            <option value="">— None —</option>
            {otherEmployees.map(emp => (
              <option key={emp.id} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={form.start_date} onChange={set('start_date')} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="field">
          <label>Employment type</label>
          <select value={form.employment_type} onChange={set('employment_type')}>
            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Role</label>
          <select value={form.auth_role} onChange={set('auth_role')}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Lifecycle status</label>
          <select value={form.lifecycle_status} onChange={set('lifecycle_status')}>
            {LIFECYCLE_STATUSES.map(s => (
              <option key={s} value={s.toLowerCase()}>{s}</option>
            ))}
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

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6B6860', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 20, marginBottom: 12, paddingTop: 16, borderTop: '1px solid #F2F1ED' }}>Career Development</div>
      <div className="form-grid">
        <div className="field">
          <label>Current Level</label>
          <select value={form.current_level} onChange={set('current_level')}>
            <option value="">— None —</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Next Level</label>
          <select value={form.next_level} onChange={set('next_level')}>
            <option value="">— None —</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field full">
          <label>Pathway</label>
          <select value={form.pathway_id} onChange={set('pathway_id')}>
            <option value="">— None —</option>
            {pathways.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Readiness Level</label>
          <select value={form.readiness_level} onChange={set('readiness_level')}>
            <option value="">— None —</option>
            {READINESS_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Current Status</label>
          <select value={form.current_status} onChange={set('current_status')}>
            <option value="">— None —</option>
            {CURRENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
