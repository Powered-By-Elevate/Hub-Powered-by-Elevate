import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { LifecycleCheckin } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { createEventWithTeamsMeeting } from '../../../lib/graph';

interface Props {
  checkin: LifecycleCheckin;
  employeeName: string;
  employeeEmail: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: LifecycleCheckin['status'][] = ['pending', 'completed', 'overdue', 'skipped'];

export function EditLifecycleCheckinModal({ checkin, employeeName, employeeEmail, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const msTokenAvailable = !!session?.provider_token;
  const [notes, setNotes] = useState(checkin.notes ?? '');
  const [status, setStatus] = useState<LifecycleCheckin['status']>(checkin.status);
  const [scheduledTime, setScheduledTime] = useState((checkin.scheduled_time ?? '10:00').slice(0, 5));
  const [teamsJoinUrl, setTeamsJoinUrl] = useState<string | null>(checkin.teams_join_url ?? null);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addTeamsMeeting() {
    if (!session?.provider_token) return;
    setCreatingMeeting(true);
    const [hh, mm] = (scheduledTime || '10:00').split(':').map(n => parseInt(n, 10));
    const endHh = String(hh + (mm + 30 >= 60 ? 1 : 0)).padStart(2, '0');
    const endMm = String((mm + 30) % 60).padStart(2, '0');
    const url = await createEventWithTeamsMeeting(session.provider_token, {
      subject: `Day ${checkin.milestone_day} Check-in — ${employeeName}`,
      startDateTime: `${checkin.scheduled_at}T${scheduledTime || '10:00'}:00`,
      endDateTime: `${checkin.scheduled_at}T${endHh}:${endMm}:00`,
      attendees: employeeEmail ? [{ email: employeeEmail, name: employeeName }] : [],
      body: `30-60-90 check-in scheduled in the Hub for ${employeeName}.`,
    });
    setCreatingMeeting(false);
    if (!url) { setError('Failed to create Teams meeting.'); return; }
    setTeamsJoinUrl(url);
  }

  async function save() {
    setSaving(true);
    setError('');
    const completing = status === 'completed' && checkin.status !== 'completed';
    const uncompleting = status !== 'completed' && checkin.status === 'completed';
    const patch: Record<string, unknown> = {
      notes: notes.trim() === '' ? null : notes.trim(),
      status,
      scheduled_time: scheduledTime || null,
      teams_join_url: teamsJoinUrl,
    };
    if (completing) patch.completed_at = new Date().toISOString();
    if (uncompleting) patch.completed_at = null;
    const { error: err } = await supabase.from('lifecycle_checkins').update(patch).eq('id', checkin.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal title={`Day ${checkin.milestone_day} Check-in — ${employeeName}`} onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </>
    }>
      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Scheduled Date</label>
          <div style={{ fontSize: 13, color: '#6B6860' }}>{checkin.scheduled_at}</div>
        </div>
        <div className="field">
          <label>Time</label>
          <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as LifecycleCheckin['status'])}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Agenda, talking points, or recap…"
          rows={6}
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="field">
        <label>Microsoft Teams</label>
        {teamsJoinUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <a href={teamsJoinUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1B3F6E', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Join meeting
            </a>
            <button type="button" onClick={() => setTeamsJoinUrl(null)} className="btn-ghost sm" style={{ color: '#DC2626' }}>Remove</button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost sm"
            onClick={addTeamsMeeting}
            disabled={!msTokenAvailable || creatingMeeting}
            title={msTokenAvailable ? '' : 'Sign in with Microsoft to enable'}
          >
            {creatingMeeting ? 'Creating…' : '+ Create Teams meeting'}
          </button>
        )}
      </div>
    </Modal>
  );
}
