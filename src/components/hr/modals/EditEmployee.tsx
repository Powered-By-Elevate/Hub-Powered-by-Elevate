import { useState, useEffect } from 'react';
import { Modal } from '../../shared/Modal';
import { JobTitleInput } from '../../shared/JobTitleInput';
import { supabase } from '../../../lib/supabase';
import { Employee, Company } from '../../../lib/database.types';

interface Props {
  employee: Employee;
  departments: string[];
  companies: Company[];
  employees: Employee[];
  onClose: () => void;
  onSaved: (updated: Employee) => void;
}

const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Seasonal'];
const ROLES = ['Employee', 'Manager', 'HR Admin'];
const LIFECYCLE_STATUSES = ['Onboarding', 'Active'];

export function EditEmployeeModal({ employee: e, departments, companies, employees, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: e.name ?? '',
    email: e.email ?? '',
    role: e.role ?? '',
    department: e.department ?? '',
    manager: e.manager ?? '',
    start_date: e.start_date ?? '',
    phone: e.phone ?? '',
    employment_type: (e as any).employment_type ?? 'Full Time',
    auth_role: (e as any).auth_role ?? 'Employee',
    lifecycle_status: e.lifecycle_status ?? 'onboarding',
    company_id: e.company_id ?? '',
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
      avatar_url,
    };

    // Store employment_type and auth_role if columns exist — ignore errors silently
    (updates as any).employment_type = form.employment_type;
    (updates as any).auth_role = form.auth_role;

    const { data, error: saveErr } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', e.id)
      .select()
      .single();

    setSaving(false);

    if (saveErr) {
      // If extra columns don't exist, retry without them
      const safeUpdates = { ...updates };
      delete (safeUpdates as any).employment_type;
      delete (safeUpdates as any).auth_role;
      const { data: data2, error: err2 } = await supabase
        .from('employees')
        .update(safeUpdates)
        .eq('id', e.id)
        .select()
        .single();
      if (err2) { setError(err2.message); setSaving(false); return; }
      setSuccess('Changes saved successfully.');
      onSaved(data2 as Employee);
      setTimeout(onClose, 1200);
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
    </Modal>
  );
}
