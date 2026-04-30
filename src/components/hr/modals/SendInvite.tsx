import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../lib/database.types';

interface Props {
  employee: Employee;
  onClose: () => void;
}

export function SendInviteModal({ employee, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState('');
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
    setToken(data.token);
    setDone(true);

    /* MICROSOFT INTEGRATION HOOK:
       Replace this with a call to a Supabase Edge Function that sends
       the setup link via Outlook/Microsoft Graph API:
       POST /functions/v1/send-invite
       { email, setupUrl, employeeName }
    */
    const setupUrl = `${window.location.origin}?setup=${data.token}`;
    console.log('[DEMO] Setup link for', employee.email, ':', setupUrl);
  }

  const setupUrl = token ? `${window.location.origin}?setup=${token}` : '';

  return (
    <Modal title={`Send Setup Link — ${employee.name}`} onClose={onClose} footer={
      <button className="btn-ghost" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
    }>
      {error && <div className="error-msg">{error}</div>}
      {!done ? (
        <>
          <p style={{ fontSize: 13, color: '#6B6860', marginBottom: '1rem' }}>
            This will generate a secure one-time setup link for <strong style={{ color: '#1A1916' }}>{employee.name}</strong> ({employee.email}) to create their password and activate their account.
          </p>
          <div className="modal-info-box">
            In production, this link is emailed automatically. For this demo, the link will be shown on screen.
          </div>
          <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
            <button className="btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Generating…' : 'Generate & Send Link'}</button>
          </div>
        </>
      ) : (
        <>
          <div className="modal-success-box">Setup link generated successfully!</div>
          <div style={{ marginTop: '1rem' }}>
            <label className="field">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6860', marginBottom: 5 }}>Setup URL (share with employee)</div>
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
