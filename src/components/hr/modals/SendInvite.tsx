import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../lib/database.types';

interface Props {
  employee: Employee;
  onClose: () => void;
  isNewEmployee?: boolean;
}

function buildMailtoBody(employeeName: string, setupUrl: string, isNew: boolean): string {
  const firstName = employeeName.split(' ')[0];
  if (isNew) {
    return `Hi ${firstName},\n\nWelcome to True North! We're so glad to have you on the team.\n\nPlease follow the link below to set up your account on Hub, our people development platform:\n\n${setupUrl}\n\nThis link will expire in 7 days. Once you click it, you'll be prompted to create a password and you'll be all set.\n\nLooking forward to working with you!\n\nBest,\nTrue North HR`;
  }
  return `Hi ${firstName},\n\nWe're excited to introduce Hub, our new people development platform!\n\nPlease follow the link below to set up your account:\n\n${setupUrl}\n\nThis link will expire in 7 days. Once you click it, you'll be prompted to create a password and you'll have full access.\n\nLet us know if you have any questions!\n\nBest,\nTrue North HR`;
}

export function SendInviteModal({ employee, onClose, isNewEmployee = true }: Props) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [setupUrl, setSetupUrl] = useState('');
  const [error, setError] = useState('');

  async function handleSend() {
    setSending(true);
    setError('');
    const { data, error: err } = await supabase
      .from('setup_tokens')
      .insert({ employee_id: employee.id, email: employee.email })
      .select()
      .single();
    setSending(false);
    if (err) { setError(err.message); return; }

    const url = `${window.location.origin}?setup=${data.token}`;
    setSetupUrl(url);
    setDone(true);

    // Open the user's email client with pre-populated content
    const subject = encodeURIComponent('Set up your Hub account — True North');
    const body = encodeURIComponent(buildMailtoBody(employee.name, url, isNewEmployee));
    window.location.href = `mailto:${employee.email}?subject=${subject}&body=${body}`;
  }

  return (
    <Modal title={`Send Setup Link — ${employee.name}`} onClose={onClose} footer={
      <button className="btn-ghost" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
    }>
      {error && <div className="error-msg">{error}</div>}
      {!done ? (
        <>
          <p style={{ fontSize: 13, color: '#6B6860', marginBottom: '1rem' }}>
            This will generate a secure setup link for <strong style={{ color: '#1A1916' }}>{employee.name}</strong> and open your email client with the invite pre-written to <strong style={{ color: '#1A1916' }}>{employee.email}</strong>.
          </p>
          <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
            <button className="btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Generating…' : 'Send Invite'}</button>
          </div>
        </>
      ) : (
        <>
          <div className="modal-success-box">Invite generated! Your email client should have opened.</div>
          <div style={{ marginTop: '1rem' }}>
            <label className="field">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6860', marginBottom: 5 }}>Setup URL (backup — copy if email didn't open)</div>
              <input
                type="text"
                readOnly
                value={setupUrl}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E3DC', borderRadius: 10, fontSize: 12, background: '#F8F7F4', color: '#1A1916', outline: 'none', cursor: 'text' }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
            </label>
            <p style={{ fontSize: 11, color: '#9B9890', marginTop: 8 }}>
              This link expires in 7 days. The employee will be prompted to set a password on first visit.
            </p>
          </div>
        </>
      )}
    </Modal>
  );
}
