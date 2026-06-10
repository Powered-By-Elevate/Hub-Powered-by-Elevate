import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { LifecycleCheckin } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { createEventWithTeamsMeeting, deleteCalendarEvent } from '../../../lib/graph';
import { toast } from '../../../lib/toast';

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
  const [teamsEventId, setTeamsEventId] = useState<string | null>(checkin.teams_event_id ?? null);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  async function del() {
    setDeleting(true);
    setError('');
    // Best-effort: cancel the Outlook/Teams meeting too (Microsoft notifies the
    // attendees). Don't block the record delete if the calendar cancel fails.
    if (teamsEventId && session?.provider_token) {
      await deleteCalendarEvent(session.provider_token, teamsEventId);
    }
    const { data, error: err } = await supabase
      .from('lifecycle_checkins').delete().eq('id', checkin.id).select();
    setDeleting(false);
    if (err) { setError(err.message); setConfirmingDelete(false); return; }
    // RLS can silently delete 0 rows if the user lacks permission — surface it
    // rather than closing as if it worked.
    if (!data || data.length === 0) {
      setError("Couldn't delete this check-in — you may not have permission. Ask an admin to check delete access.");
      setConfirmingDelete(false);
      return;
    }
    toast.ok('Check-in deleted');
    onSaved();
    onClose();
  }

  async function addTeamsMeeting() {
    if (!session?.provider_token) return;
    setCreatingMeeting(true);
    const [hh, mm] = (scheduledTime || '10:00').split(':').map(n => parseInt(n, 10));
    const endHh = String(hh + (mm + 30 >= 60 ? 1 : 0)).padStart(2, '0');
    const endMm = String((mm + 30) % 60).padStart(2, '0');
    const meeting = await createEventWithTeamsMeeting(session.provider_token, {
      subject: `Day ${checkin.milestone_day} Check-in — ${employeeName}`,
      startDateTime: `${checkin.scheduled_at}T${scheduledTime || '10:00'}:00`,
      endDateTime: `${checkin.scheduled_at}T${endHh}:${endMm}:00`,
      attendees: employeeEmail ? [{ email: employeeEmail, name: employeeName }] : [],
      body: `30-60-90 check-in scheduled in the Hub for ${employeeName}.`,
    });
    setCreatingMeeting(false);
    if (!meeting?.joinUrl) { setError('Failed to create Teams meeting.'); return; }
    setTeamsJoinUrl(meeting.joinUrl);
    setTeamsEventId(meeting.eventId);
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
      teams_event_id: teamsEventId,
    };
    if (completing) patch.completed_at = new Date().toISOString();
    if (uncompleting) patch.completed_at = null;
    const { error: err } = await supabase.from('lifecycle_checkins').update(patch).eq('id', checkin.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    toast.ok('Check-in updated');
    onSaved();
    onClose();
  }

  return (
    <Modal title={`Day ${checkin.milestone_day} Check-in — ${employeeName}`} onClose={onClose} footer={
      confirmingDelete ? (
        <>
          <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 13, fontWeight: 600, color: '#B91C1C' }}>
            Delete this check-in permanently?
          </span>
          <button className="btn-ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Keep</button>
          <button className="btn-primary" style={{ background: '#DC2626' }} onClick={del} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </>
      ) : (
        <>
          <button className="btn-ghost" style={{ marginRight: 'auto', color: '#DC2626' }} onClick={() => setConfirmingDelete(true)} disabled={saving}>
            Delete
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      )
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
            <button type="button" onClick={() => { setTeamsJoinUrl(null); setTeamsEventId(null); }} className="btn-ghost sm" style={{ color: '#DC2626' }}>Remove</button>
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
