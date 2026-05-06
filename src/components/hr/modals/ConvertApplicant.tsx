import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { Employee, TemplateWithTasks } from '../../../lib/database.types';

interface Props {
  applicant: Employee;
  templates: TemplateWithTasks[];
  departments: string[];
  onClose: () => void;
  onConverted: (updated: Employee) => void;
}

export function ConvertApplicantModal({ applicant: a, templates, departments, onClose, onConverted }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    role: a.position_applied_for ?? a.role ?? '',
    department: a.department ?? '',
    start_date: today,
    template_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function convert() {
    if (!form.role.trim()) { setError('Job title is required.'); return; }
    if (!form.start_date) { setError('Start date is required.'); return; }

    setSaving(true);
    setError('');

    // 1. Update the employee row: applicant -> onboarding
    const { data: updated, error: updateErr } = await supabase
      .from('employees')
      .update({
        lifecycle_status: 'onboarding',
        phase: 'onboarding',
        status: 'not-started',
        progress: 0,
        role: form.role.trim(),
        department: form.department || null,
        start_date: form.start_date,
        // Clear applicant-only fields
        applicant_phase: null,
        applicant_stage: null,
        position_applied_for: null,
        applicant_source: null,
        // Keep hiring_manager_id and resume_url for historical reference
      })
      .eq('id', a.id)
      .select()
      .single();

    if (updateErr) {
      setError(`Conversion failed: ${updateErr.message}`);
      setSaving(false);
      return;
    }

    // 2. Optionally apply onboarding template
    if (form.template_id) {
      const tpl = templates.find(t => t.id === form.template_id);
      if (tpl) {
        const startDate = new Date(form.start_date);
        const tasksToInsert = tpl.tasks.map(tt => {
          const due = new Date(startDate);
          due.setDate(due.getDate() + tt.days_from_start);
          return {
            employee_id: a.id,
            title: tt.title,
            category: tt.category,
            required: tt.required,
            due_date: due.toISOString().split('T')[0],
            status: 'pending',
            task_phase: 'onboarding',
            triage: 'normal',
            priority: 'medium',
            assigned_by_role: 'system',
            archived: false,
          };
        });
        if (tasksToInsert.length > 0) {
          const { error: taskErr } = await supabase.from('onboarding_tasks').insert(tasksToInsert);
          if (taskErr) {
            // Don't fail the conversion — log it
            console.error('Failed to apply template tasks:', taskErr);
          } else {
            await supabase.from('onboarding_templates').update({ used_count: tpl.used_count + 1 }).eq('id', tpl.id);
          }
        }
      }
    }

    // 3. Activity log
    await supabase.from('activity_log').insert({
      employee_id: a.id,
      action: `Converted applicant ${a.name} to onboarding employee`,
      created_at: new Date().toISOString(),
    });

    setSaving(false);
    onConverted(updated as Employee);
    onClose();
  }

  return (
    <Modal
      title="Convert to Onboarding Employee"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={convert} disabled={saving}>
            {saving ? 'Converting…' : 'Convert'}
          </button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div style={{ background: '#F7FBFF', border: '1px solid #D6E4F0', padding: '12px 14px', borderRadius: 7, marginBottom: 14, fontSize: 13, color: '#1B3F6E' }}>
        <strong>{a.name}</strong> will be moved from <strong>Applicant</strong> to <strong>Onboarding</strong>.
        Their applicant phase and stage will be cleared. Hiring manager and contact info are preserved.
      </div>

      <div className="form-grid">
        <div className="field full">
          <label>Official Job Title <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Senior Project Manager" autoFocus />
        </div>
        <div className="field">
          <label>Department</label>
          <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Start Date <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div className="field full">
          <label>Apply Onboarding Template (optional)</label>
          <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}>
            <option value="">— No template —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.department ? ` · ${t.department}` : ''} ({t.tasks.length} tasks)</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>
            Tasks will be created with due dates calculated from the start date above.
          </div>
        </div>
      </div>
    </Modal>
  );
}