import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AnnualReview, ReviewStatus } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';

interface Props {
  review: AnnualReview;
  employeeName: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: ReviewStatus[] = ['pending', 'in-progress', 'completed', 'overdue'];
const RATINGS = [1, 2, 3, 4, 5];

export function EditAnnualReviewModal({ review, employeeName, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [scheduledAt, setScheduledAt] = useState(review.scheduled_at ?? '');
  const [rating, setRating] = useState<number | ''>(review.rating ?? '');
  const [summary, setSummary] = useState(review.summary ?? '');
  const [goals, setGoals] = useState(review.goals_next_year ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    const completing = status === 'completed' && review.status !== 'completed';
    const uncompleting = status !== 'completed' && review.status === 'completed';
    const patch: Record<string, unknown> = {
      status,
      scheduled_at: scheduledAt || null,
      rating: rating === '' ? null : Number(rating),
      summary: summary.trim() === '' ? null : summary.trim(),
      goals_next_year: goals.trim() === '' ? null : goals.trim(),
    };
    if (completing) patch.completed_at = new Date().toISOString().split('T')[0];
    if (uncompleting) patch.completed_at = null;
    const { error: err } = await supabase.from('annual_reviews').update(patch).eq('id', review.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal title={`${review.review_year} Annual Review — ${employeeName}`} onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </>
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
    </Modal>
  );
}
