import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Employee } from '../../../lib/database.types';


interface Props {
  employeeId: string;
  employee?: Employee;
  assignedByRole?: 'hr' | 'manager' | 'employee';
  assignedByName?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddTaskModal({ employeeId, employee, assignedByRole = 'hr', assignedByName, onClose, onCreated }: Props) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', category: 'document', dueDate: '',
    notes: '', required: false, triage: 'normal' as 'critical' | 'normal',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const taskPhase = employee?.lifecycle_status === 'active' ? 'active' : 'onboarding';

  async function handleSave() {
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('onboarding_tasks').insert({
      employee_id: employeeId,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category,
      due_date: form.dueDate || 'TBD',
      status: 'pending',
      required: form.required,
      notes: form.notes || null,
      triage: form.triage,
      task_phase: taskPhase,
      assigned_by: user?.id ?? null,
      assigned_by_name: assignedByName ?? profile?.email ?? null,
      assigned_by_role: assignedByRole,
      archived: false,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  return (
    <Modal title="Add Task" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Adding…' : 'Add Task'}</button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Task title</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete benefits enrollment form" />
        </div>
        <div className="field full">
          <label>Description (optional)</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="More detail about what needs to be done…" rows={2} />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="document">Document</option>
            <option value="training">Training</option>
            <option value="form">Form</option>
            <option value="meeting">Meeting</option>
            <option value="task">Task</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Due date</label>
          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div className="field full">
          <label>Triage</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, triage: 'normal' }))}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                border: form.triage === 'normal' ? '2px solid #1B3F6E' : '1.5px solid #E5E3DC',
                background: form.triage === 'normal' ? '#E8EFF8' : '#fff',
                color: form.triage === 'normal' ? '#1B3F6E' : '#6B6860',
              }}
            >Normal</button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, triage: 'critical' }))}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                border: form.triage === 'critical' ? '2px solid #DC2626' : '1.5px solid #E5E3DC',
                background: form.triage === 'critical' ? '#FEE2E2' : '#fff',
                color: form.triage === 'critical' ? '#DC2626' : '#6B6860',
              }}
            >‼ Critical</button>
          </div>
        </div>
        <div className="field">
          <label>Assigned by</label>
          <input type="text" value={assignedByName ?? profile?.email ?? ''} readOnly style={{ background: '#F8F7F4', color: '#9B9890' }} />
        </div>
        <div className="field full">
          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add any helpful notes…" rows={2} />
        </div>
        <div className="field full">
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#1A1916', fontWeight: 500 }}>
            <input type="checkbox" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Mark as required
          </label>
        </div>
      </div>
    </Modal>
  );
}
