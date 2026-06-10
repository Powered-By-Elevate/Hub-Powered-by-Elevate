import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AnnualReview, ReviewStatus } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { createEventWithTeamsMeeting, deleteCalendarEvent } from '../../../lib/graph';
import { toast } from '../../../lib/toast';

interface Props {
  review: AnnualReview;
  employeeName: string;
  employeeEmail: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: ReviewStatus[] = ['pending', 'in-progress', 'completed', 'overdue'];
const RATINGS = [1, 2, 3, 4, 5];

export function EditAnnualReviewModal({ review, employeeName, employeeEmail, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const msTokenAvailable = !!session?.provider_token;
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [scheduledAt, setScheduledAt] = useState(review.scheduled_at ?? '');
  const [scheduledTime, setScheduledTime] = useState((review.scheduled_time ?? '10:00').slice(0, 5));
  const [rating, setRating] = useState<number | ''>(review.rating ?? '');
  const [summary, setSummary] = useState(review.summary ?? '');
  const [goals, setGoals] = useState(review.goals_next_year ?? '');
  const [teamsJoinUrl, setTeamsJoinUrl] = useState<string | null>(review.teams_join_url ?? null);
  const [teamsEventId, setTeamsEventId] = useState<string | null>(review.teams_event_id ?? null);
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
      .from('annual_reviews').delete().eq('id', review.id).select();
    setDeleting(false);
    if (err) { setError(err.message); setConfirmingDelete(false); return; }
    // RLS can silently delete 0 rows if the user lacks permission — surface it
    // rather than closing as if it worked.
    if (!data || data.length === 0) {
      setError("Couldn't delete this review — you may not have permission. Ask an admin to check delete access.");
      setConfirmingDelete(false);
      return;
    }
    toast.ok('Review deleted');
    onSaved();
    onClose();
  }

  async function addTeamsMeeting() {
    if (!session?.provider_token || !scheduledAt) return;
    setCreatingMeeting(true);
    const [hh, mm] = (scheduledTime || '10:00').split(':').map(n => parseInt(n, 10));
    const endHh = String(hh + 1).padStart(2, '0');
    const endMm = String(mm).padStart(2, '0');
    const meeting = await createEventWithTeamsMeeting(session.provider_token, {
      subject: `${review.review_year} Annual Review — ${employeeName}`,
      startDateTime: `${scheduledAt}T${scheduledTime || '10:00'}:00`,
      endDateTime: `${scheduledAt}T${endHh}:${endMm}:00`,
      attendees: employeeEmail ? [{ email: employeeEmail, name: employeeName }] : [],
      body: `Annual review scheduled in the Hub for ${employeeName}.`,
    });
    setCreatingMeeting(false);
    if (!meeting?.joinUrl) { setError('Failed to create Teams meeting.'); return; }
    setTeamsJoinUrl(meeting.joinUrl);
    setTeamsEventId(meeting.eventId);
  }

  async function save() {
    setSaving(true);
    setError('');
    const completing = status === 'completed' && review.status !== 'completed';
    const uncompleting = status !== 'completed' && review.status === 'completed';
    const patch: Record<string, unknown> = {
      status,
      scheduled_at: scheduledAt || null,
      scheduled_time: scheduledTime || null,
      rating: rating === '' ? null : Number(rating),
      summary: summary.trim() === '' ? null : summary.trim(),
      goals_next_year: goals.trim() === '' ? null : goals.trim(),
      teams_join_url: teamsJoinUrl,
      teams_event_id: teamsEventId,
    };
    if (completing) patch.completed_at = new Date().toISOString().split('T')[0];
    if (uncompleting) patch.completed_at = null;
    const { error: err } = await supabase.from('annual_reviews').update(patch).eq('id', review.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    toast.ok('Review updated');
    onSaved();
    onClose();
  }

  return (
    <Modal title={`${review.review_year} Annual Review — ${employeeName}`} onClose={onClose} footer={
      confirmingDelete ? (
        <>
          <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 13, fontWeight: 600, color: '#B91C1C' }}>
            Delete this review permanently?
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
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as ReviewStatus)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Scheduled Date</label>
          <input type="date" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Time</label>
        <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
      </div>
      <div className="field">
        <label>Rating</label>
        <select value={rating} onChange={e => setRating(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">—</option>
          {RATINGS.map(r => <option key={r} value={r}>{r} / 5</option>)}
        </select>
      </div>
      <div className="field">
        <label>Summary</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Review summary, key topics, recap…"
          rows={4}
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="field">
        <label>Goals for Next Year</label>
        <textarea
          value={goals}
          onChange={e => setGoals(e.target.value)}
          placeholder="Performance goals and development areas…"
          rows={4}
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
            disabled={!msTokenAvailable || !scheduledAt || creatingMeeting}
            title={!msTokenAvailable ? 'Sign in with Microsoft to enable' : !scheduledAt ? 'Set a scheduled date first' : ''}
          >
            {creatingMeeting ? 'Creating…' : '+ Create Teams meeting'}
          </button>
        )}
      </div>
    </Modal>
  );
}
