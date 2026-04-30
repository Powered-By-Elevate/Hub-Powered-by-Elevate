import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Modal } from '../../shared/Modal';

interface Props {
  employeeId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddNoteModal({ employeeId, onClose, onCreated }: Props) {
  const { profile } = useAuth();
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!body.trim()) { setError('Please enter a note.'); return; }
    if (!profile?.id) { setError('Not authenticated.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('employee_notes').insert({
      employee_id: employeeId,
      author_id: profile.id,
      body: body.trim(),
      pinned,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  return (
    <Modal title="Add HR Note" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
      </>
    }>
      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="field">
        <label>Note</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Internal HR note — not visible to the employee…"
          rows={5}
          style={{ resize: 'vertical' }}
          autoFocus
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1A1916', cursor: 'pointer' }}>
        <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
        Pin this note to the top
      </label>
      <p style={{ fontSize: 11, color: '#9B9890', marginTop: 10 }}>Notes are only visible to HR and managers.</p>
    </Modal>
  );
}
