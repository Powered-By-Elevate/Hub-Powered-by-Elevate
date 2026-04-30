import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';

const DEPT_TYPES = ['Office and Corporate', 'Construction', 'Field Operations', 'Other'];

interface Props {
  onClose: () => void;
  onCreated: (name: string) => void;
}

export function AddDepartmentModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Department name is required.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.from('departments').insert({ name: trimmed, type: type || null });
    setLoading(false);
    if (err) {
      setError(err.message.includes('unique') ? 'A department with that name already exists.' : err.message);
      return;
    }
    onCreated(trimmed);
    onClose();
  }

  return (
    <Modal
      title="Add Department"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding…' : 'Add Department'}
          </button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Department Name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input
            type="text"
            placeholder="e.g. Design, Legal, Customer Success"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="field full">
          <label>Team Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="">— select type —</option>
            {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
