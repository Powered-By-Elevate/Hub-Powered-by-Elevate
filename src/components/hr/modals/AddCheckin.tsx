import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { createEventWithTeamsMeeting } from '../../../lib/graph';

interface Props {
  employees: Employee[];
  defaultEmpId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export function AddCheckinModal({ employees, defaultEmpId, onClose, onCreated }: Props) {
  const { session } = useAuth();
  const msTokenAvailable = !!session?.provider_token;
  const [empId, setEmpId] = useState(defaultEmpId ?? employees[0]?.id ?? '');
  const [quarter, setQuarter] = useState('Q1');
  const [year, setYear] = useState(currentYear);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [createTeams, setCreateTeams] = useState(msTokenAvailable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!empId || !scheduledAt) { setError('Please select an employee and a date.'); return; }
    setSaving(true);
    const startTime = scheduledTime || '10:00';
    const [hh, mm] = startTime.split(':').map(n => parseInt(n, 10));
    const endHh = String(hh + (mm + 30 >= 60 ? 1 : 0)).padStart(2, '0');
    const endMm = String((mm + 30) % 60).padStart(2, '0');
    let teamsJoinUrl: string | null = null;
    if (createTeams && session?.provider_token) {
      const emp = employees.find(e => e.id === empId);
      const empName = emp?.name ?? 'Employee';
      teamsJoinUrl = await createEventWithTeamsMeeting(session.provider_token, {
        subject: `${quarter} ${year} Check-in — ${empName}`,
        startDateTime: `${scheduledAt}T${startTime}:00`,
        endDateTime: `${scheduledAt}T${endHh}:${endMm}:00`,
        attendees: emp?.email ? [{ email: emp.email, name: empName }] : [],
        body: `Quarterly check-in scheduled in the Hub for ${empName}.`,
      });
    }
    const { error: err } = await supabase.from('quarterly_checkins').insert({
      employee_id: empId,
      quarter,
      year,
      scheduled_at: scheduledAt,
      scheduled_time: scheduledTime || null,
      notes: notes || null,
      status: 'pending',
      teams_join_url: teamsJoinUrl,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  return (
    <Modal title="Schedule Quarterly Check-in" onClose={onClose} footer={
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Quarter</label>
          <select value={quarter} onChange={e => setQuarter(e.target.value)}>
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Scheduled Date</label>
          <input type="date" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <div className="field">
          <label>Time</label>
          <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Agenda or talking points…" rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <input
          type="checkbox"
          id="add-checkin-teams"
          checked={createTeams && msTokenAvailable}
          disabled={!msTokenAvailable}
          onChange={e => setCreateTeams(e.target.checked)}
        />
        <label htmlFor="add-checkin-teams" style={{ fontSize: 13, color: msTokenAvailable ? '#1A1916' : '#9B9890', cursor: msTokenAvailable ? 'pointer' : 'not-allowed' }}>
          Create Microsoft Teams meeting{!msTokenAvailable && ' (sign in with Microsoft to enable)'}
        </label>
      </div>
    </Modal>
  );
}
