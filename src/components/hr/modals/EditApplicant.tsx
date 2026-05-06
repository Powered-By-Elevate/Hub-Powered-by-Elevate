import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../lib/database.types';
import {
  APPLICANT_PHASES,
  APPLICANT_STAGES_BY_PHASE,
  APPLICANT_SOURCES,
  ApplicantPhase,
  phaseForStage,
} from '../../../lib/applicantStages';

interface Props {
  applicant: Employee;
  employees: Employee[];
  onClose: () => void;
  onSaved: (updated: Employee) => void;
}

export function EditApplicantModal({ applicant: a, employees, onClose, onSaved }: Props) {
  // Determine initial phase from the saved stage (in case the row only has stage set)
  const initialPhase = (a.applicant_phase as ApplicantPhase) ||
    phaseForStage(a.applicant_stage) ||
    'Screening';

  const [form, setForm] = useState({
    name: a.name ?? '',
    email: a.email ?? '',
    phone: a.phone ?? '',
    position_applied_for: a.position_applied_for ?? '',
    applicant_phase: initialPhase,
    applicant_stage: a.applicant_stage ?? '',
    hiring_manager_id: a.hiring_manager_id ?? '',
    applicant_source: a.applicant_source ?? '',
    resume_url: a.resume_url ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeEmployees = employees.filter(e => !e.archived && e.lifecycle_status !== 'applicant' && e.id !== a.id);
  const stagesForPhase = APPLICANT_STAGES_BY_PHASE[form.applicant_phase] ?? [];

  function handlePhaseChange(newPhase: ApplicantPhase) {
    const stages = APPLICANT_STAGES_BY_PHASE[newPhase];
    setForm(f => ({
      ...f,
      applicant_phase: newPhase,
      applicant_stage: stages.includes(f.applicant_stage) ? f.applicant_stage : (stages[0] ?? ''),
    }));
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.position_applied_for.trim() || a.role,
      applicant_phase: form.applicant_phase,
      applicant_stage: form.applicant_stage,
      hiring_manager_id: form.hiring_manager_id || null,
      position_applied_for: form.position_applied_for.trim() || null,
      applicant_source: form.applicant_source || null,
      resume_url: form.resume_url.trim() || null,
    };

    const { data, error: err } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', a.id)
      .select()
      .single();

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }

    onSaved(data as Employee);
    onClose();
  }

  return (
    <Modal
      title="Edit Applicant"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Full name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="field full">
          <label>Email <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="field">
          <label>Position Applied For</label>
          <input type="text" value={form.position_applied_for} onChange={e => setForm(f => ({ ...f, position_applied_for: e.target.value }))} />
        </div>
        <div className="field">
          <label>Phase</label>
          <select value={form.applicant_phase} onChange={e => handlePhaseChange(e.target.value as ApplicantPhase)}>
            {APPLICANT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Stage</label>
          <select value={form.applicant_stage} onChange={e => setForm(f => ({ ...f, applicant_stage: e.target.value }))}>
            {stagesForPhase.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Hiring Manager</label>
          <select value={form.hiring_manager_id} onChange={e => setForm(f => ({ ...f, hiring_manager_id: e.target.value }))}>
            <option value="">— None —</option>
            {activeEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}{emp.role ? ` · ${emp.role}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Source</label>
          <select value={form.applicant_source} onChange={e => setForm(f => ({ ...f, applicant_source: e.target.value }))}>
            <option value="">— Select —</option>
            {APPLICANT_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field full">
          <label>Resume URL</label>
          <input type="url" value={form.resume_url} onChange={e => setForm(f => ({ ...f, resume_url: e.target.value }))} placeholder="https://..." />
        </div>
      </div>
    </Modal>
  );
}