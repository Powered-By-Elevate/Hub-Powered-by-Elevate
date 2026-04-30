import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { TemplateWithTasks, Employee } from '../../../lib/database.types';

interface Props {
  templates: TemplateWithTasks[];
  employees: Employee[];
  defaultTemplateId?: string;
  onClose: () => void;
  onApplied: (employeeId: string) => void;
}

export function ApplyTemplateModal({ templates, employees, defaultTemplateId, onClose, onApplied }: Props) {
  const { user, profile } = useAuth();
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id ?? '');
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleApply() {
    const tpl = templates.find(t => t.id === templateId);
    const emp = employees.find(e => e.id === employeeId);
    if (!tpl || !emp) return;
    setSaving(true);
    setError('');

    const tasks = tpl.tasks.map(t => {
      let dueDate = `Day ${t.days_from_start} from start`;
      try {
        const base = new Date(emp.start_date);
        if (!isNaN(base.getTime())) {
          base.setDate(base.getDate() + (t.days_from_start ?? 1) - 1);
          dueDate = base.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      } catch { /* keep default */ }
      return { employee_id: employeeId, title: t.title, category: t.category, due_date: dueDate, status: 'pending', required: t.required, notes: '', assigned_by: user?.id ?? null, assigned_by_name: profile?.email ?? null, assigned_by_role: 'hr', task_phase: 'onboarding' };
    });

    const { error: err } = await supabase.from('onboarding_tasks').insert(tasks);
    if (err) { setError(err.message); setSaving(false); return; }

    await supabase.from('onboarding_templates').update({ used_count: tpl.used_count + 1 }).eq('id', tpl.id);
    setSaving(false);
    onApplied(employeeId);
    onClose();
  }

  const selectedTpl = templates.find(t => t.id === templateId);

  return (
    <Modal title="Apply Template to Employee" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleApply} disabled={saving}>{saving ? 'Applying…' : 'Apply Template'}</button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <div className="field">
        <label>Template</label>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.tasks.length} tasks)</option>)}
        </select>
      </div>
      <div className="field">
        <label>Select employee</label>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
        </select>
      </div>
      <div className="modal-info-box">
        This will add all {selectedTpl?.tasks.length ?? 0} tasks from <strong>{selectedTpl?.name}</strong> to the employee's checklist. Existing tasks will not be removed.
      </div>
    </Modal>
  );
}
