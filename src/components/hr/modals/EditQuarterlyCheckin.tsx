import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { QuarterlyCheckin, CheckinStatus } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';

interface Props {
  checkin: QuarterlyCheckin;
  employeeName: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: CheckinStatus[] = ['pending', 'completed', 'overdue'];

export function EditQuarterlyCheckinModal({ checkin, employeeName, onClose, onSaved }: Props) {
  const [notes, setNotes] = useState(checkin.notes ?? '');
  const [status, setStatus] = useState<CheckinStatus>(checkin.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    const completing = status === 'completed' && checkin.status !== 'completed';
    const uncompleting = status !== 'completed' && checkin.status === 'completed';
    const patch: Record<string, unknown> = {
      notes: notes.trim() === '' ? null : notes.trim(),
      status,
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
    </Modal>
  );
}
