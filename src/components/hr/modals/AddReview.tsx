import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { createOnlineMeeting } from '../../../lib/graph';

interface Props {
  employees: Employee[];
  defaultEmpId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export function AddReviewModal({ employees, defaultEmpId, onClose, onCreated }: Props) {
  const { session } = useAuth();
  const msTokenAvailable = !!session?.provider_token;
  const [empId, setEmpId] = useState(defaultEmpId ?? employees[0]?.id ?? '');
  const [reviewYear, setReviewYear] = useState(currentYear);
  const [scheduledAt, setScheduledAt] = useState('');
  const [summary, setSummary] = useState('');
  const [goals, setGoals] = useState('');
  const [createTeams, setCreateTeams] = useState(msTokenAvailable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!empId) { setError('Please select an employee.'); return; }
    setSaving(true);
    let teamsJoinUrl: string | null = null;
    if (createTeams && scheduledAt && session?.provider_token) {
      const empName = employees.find(e => e.id === empId)?.name ?? 'Employee';
      teamsJoinUrl = await createOnlineMeeting(session.provider_token, {
        subject: `${reviewYear} Annual Review — ${empName}`,
        startDateTime: `${scheduledAt}T10:00:00`,
        endDateTime: `${scheduledAt}T11:00:00`,
      });
    }
    const { error: err } = await supabase.from('annual_reviews').insert({
      employee_id: empId,
      review_year: reviewYear,
      scheduled_at: scheduledAt || null,
      summary: summary || null,
      goals_next_year: goals || null,
      status: 'pending',
      teams_join_url: teamsJoinUrl,
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
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <input
          type="checkbox"
          id="add-review-teams"
          checked={createTeams && msTokenAvailable && !!scheduledAt}
          disabled={!msTokenAvailable || !scheduledAt}
          onChange={e => setCreateTeams(e.target.checked)}
        />
        <label htmlFor="add-review-teams" style={{ fontSize: 13, color: (msTokenAvailable && scheduledAt) ? '#1A1916' : '#9B9890', cursor: (msTokenAvailable && scheduledAt) ? 'pointer' : 'not-allowed' }}>
          Create Microsoft Teams meeting
          {!msTokenAvailable && ' (sign in with Microsoft to enable)'}
          {msTokenAvailable && !scheduledAt && ' (set a scheduled date first)'}
        </label>
      </div>
    </Modal>
  );
}
