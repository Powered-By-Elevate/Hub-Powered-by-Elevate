import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { QuarterlyCheckin, CheckinStatus } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { createOnlineMeeting } from '../../../lib/graph';

interface Props {
  checkin: QuarterlyCheckin;
  employeeName: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: CheckinStatus[] = ['pending', 'completed', 'overdue'];

export function EditQuarterlyCheckinModal({ checkin, employeeName, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const msTokenAvailable = !!session?.provider_token;
  const [notes, setNotes] = useState(checkin.notes ?? '');
  const [status, setStatus] = useState<CheckinStatus>(checkin.status);
  const [teamsJoinUrl, setTeamsJoinUrl] = useState<string | null>(checkin.teams_join_url ?? null);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addTeamsMeeting() {
    if (!session?.provider_token) return;
    setCreatingMeeting(true);
    const url = await createOnlineMeeting(session.provider_token, {
      subject: `${checkin.quarter} ${checkin.year} Check-in — ${employeeName}`,
      startDateTime: `${checkin.scheduled_at}T10:00:00`,
      endDateTime: `${checkin.scheduled_at}T10:30:00`,
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
      teams_join_url: teamsJoinUrl,
    };
    if (completing) patch.completed_at = new Date().toISOString().split('T')[0];
    if (uncompleting) patch.completed_at = null;
    const { error: err } = await supabase.from('quarterly_checkins').update(patch).eq('id', checkin.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal title={`${checkin.quarter} ${checkin.year} Check-in — ${employeeName}`} onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </>
    }>
      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="field">
        <label>Scheduled</label>
        <div style={{ fontSize: 13, color: '#6B6860' }}>{checkin.scheduled_at}</div>
      </div>
      <div className="field">
        <label>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as CheckinStatus)}>
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
