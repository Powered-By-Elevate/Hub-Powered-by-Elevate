import { useState } from 'react';
import { Employee } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { sendMail } from '../../../lib/graph';

interface Props {
  employee: Employee;
  onClose: () => void;
  onSent?: () => void;
}

// Pre-built templates HR can pick from. The body uses {{name}} placeholder
// that gets substituted with the recipient's first name at send time.
const TEMPLATES: { id: string; label: string; subject: string; body: string }[] = [
  {
    id: 'blank',
    label: 'Blank',
    subject: '',
    body: '',
  },
  {
    id: 'welcome',
    label: 'Welcome to the team',
    subject: 'Welcome to True North!',
    body:
`Hi {{name}},

Welcome to True North Companies! We're excited to have you join the team.

You'll be receiving more information from HR over the next few days about onboarding, your schedule for the first week, and the people you'll be working with.

If you have any questions before your start date, don't hesitate to reach out.

Looking forward to meeting you,
`,
  },
  {
    id: 'check-in-reminder',
    label: 'Check-in reminder',
    subject: 'Upcoming check-in',
    body:
`Hi {{name}},

This is a friendly reminder about our upcoming check-in. Please come prepared to discuss how things are going so far, any challenges you're hitting, and what's working well.

Let me know if the time doesn't work and we can find another slot.

Thanks,
`,
  },
  {
    id: 'document-followup',
    label: 'Document acknowledgment follow-up',
    subject: 'Please review and acknowledge — outstanding documents',
    body:
`Hi {{name}},

A friendly reminder that you have outstanding documents in the Hub that need your review and acknowledgment. Please sign in at your convenience to take care of them.

Let me know if you have any questions.

Thanks,
`,
  },
];

export function SendEmailModal({ employee, onClose, onSent }: Props) {
  const { session, msProfile } = useAuth();
  const tokenAvailable = !!session?.provider_token;
  const [templateId, setTemplateId] = useState<string>('blank');
  const [to, setTo] = useState<string>(employee.email);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    const firstName = employee.name.split(' ')[0] ?? employee.name;
    const senderFirst = (msProfile?.displayName ?? '').split(' ')[0] ?? '';
    setSubject(tpl.subject);
    setBody(tpl.body.replace(/\{\{name\}\}/g, firstName) + (senderFirst ? `\n${senderFirst}\n` : ''));
  }

  async function handleSend() {
    if (!session?.provider_token) { setError('Microsoft sign-in required to send email.'); return; }
    if (!to.trim() || !subject.trim() || !body.trim()) { setError('To, subject, and body are required.'); return; }
    setSending(true);
    setError('');
    const ok = await sendMail(session.provider_token, {
      to: to.split(',').map(s => s.trim()).filter(Boolean),
      subject: subject.trim(),
      body,
    });
    setSending(false);
    if (!ok) { setError('Failed to send email. Check the console for details.'); return; }
    setSuccess(`Email sent to ${to}`);
    onSent?.();
    setTimeout(() => onClose(), 1200);
  }

  return (
    <Modal
      title={`Send Email — ${employee.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSend} disabled={sending || !tokenAvailable}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </>
      }
    >
      {!tokenAvailable && (
        <div className="error-msg" style={{ marginBottom: 12 }}>
          Microsoft sign-in required. Sign out and sign back in with "Sign in with Microsoft" to send mail from your mailbox.
        </div>
      )}
      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
      {success && <div className="modal-success-box" style={{ marginBottom: 12 }}>{success}</div>}

      <div className="field">
        <label>Template</label>
        <select value={templateId} onChange={e => applyTemplate(e.target.value)}>
          {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>To</label>
        <input type="text" value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" />
        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>Separate multiple recipients with commas.</div>
      </div>
      <div className="field">
        <label>Subject</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label>Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>
          Sent from your Microsoft 365 mailbox{msProfile?.mail ? ` (${msProfile.mail})` : ''}. A copy will be saved to your Sent Items.
        </div>
      </div>
    </Modal>
  );
}
