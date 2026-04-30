import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';

interface Props {
  employees: Employee[];
  defaultEmpId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export function AddReviewModal({ employees, defaultEmpId, onClose, onCreated }: Props) {
  const [empId, setEmpId] = useState(defaultEmpId ?? employees[0]?.id ?? '');
  const [reviewYear, setReviewYear] = useState(currentYear);
  const [scheduledAt, setScheduledAt] = useState('');
  const [summary, setSummary] = useState('');
  const [goals, setGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!empId) { setError('Please select an employee.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('annual_reviews').insert({
      employee_id: empId,
      review_year: reviewYear,
      scheduled_at: scheduledAt || null,
      summary: summary || null,
      goals_next_year: goals || null,
      status: 'pending',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  return (
    <Modal title="Schedule Annual Review" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Schedule'}</button>
      </>
    }>
      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="field">
        <label>Employee</label>
        <select value={empId} onChange={e => setEmpId(e.target.value)}>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Review Year</label>
        <select value={reviewYear} onChange={e => setReviewYear(Number(e.target.value))}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Scheduled Date (optional)</label>
        <input type="date" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
      </div>
      <div className="field">
        <label>Summary / Notes (optional)</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Review agenda, key topics…" rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div className="field">
        <label>Goals for Next Year (optional)</label>
        <textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="Performance goals and development areas…" rows={3} style={{ resize: 'vertical' }} />
      </div>
    </Modal>
  );
}
