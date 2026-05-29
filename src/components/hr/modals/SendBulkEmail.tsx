import { useState, useMemo } from 'react';
import { Employee, Company } from '../../../lib/database.types';
import { Modal } from '../../shared/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { sendMail } from '../../../lib/graph';

interface Props {
  employees: Employee[];
  companies: Company[];
  onClose: () => void;
  onSent?: (count: number) => void;
}

type RecipientMode = 'all' | 'company' | 'department' | 'lifecycle';

const TEMPLATES: { id: string; label: string; subject: string; body: string }[] = [
  { id: 'blank', label: 'Blank', subject: '', body: '' },
  {
    id: 'announcement',
    label: 'Company announcement',
    subject: '[Announcement] ',
    body:
`Hi team,

Quick update from HR — please read through:

— TYPE YOUR MESSAGE HERE —

Reach out with any questions.

Thanks,
`,
  },
  {
    id: 'policy',
    label: 'Policy update',
    subject: 'Policy update — please review',
    body:
`Hi team,

A policy in the Hub has been updated and may require your acknowledgment. Please sign in to the Hub at your convenience to review.

If you have any questions, reply to this email.

Thanks,
`,
  },
  {
    id: 'reminder',
    label: 'General reminder',
    subject: 'Quick reminder',
    body:
`Hi team,

Just a friendly reminder about:

— TYPE THE REMINDER HERE —

Thanks,
`,
  },
];

export function SendBulkEmailModal({ employees, companies, onClose, onSent }: Props) {
  const { session, msProfile } = useAuth();
  const tokenAvailable = !!session?.provider_token;
  const [mode, setMode] = useState<RecipientMode>('all');
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? '');
  const [department, setDepartment] = useState<string>('');
  const [lifecycle, setLifecycle] = useState<'onboarding' | 'active'>('active');
  const [templateId, setTemplateId] = useState<string>('blank');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [employees]);

  const recipients = useMemo(() => {
    return employees.filter(e => {
      if (e.archived || e.is_test_account || !e.email) return false;
      if (mode === 'all') return true;
      if (mode === 'company') return e.company_id === companyId;
      if (mode === 'department') return e.department === department;
      if (mode === 'lifecycle') return e.lifecycle_status === lifecycle;
      return false;
    });
  }, [employees, mode, companyId, department, lifecycle]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    const senderFirst = (msProfile?.displayName ?? '').split(' ')[0] ?? '';
    setSubject(tpl.subject);
    setBody(tpl.body + (senderFirst ? `${senderFirst}\n` : ''));
  }

  async function handleSend() {
    if (!session?.provider_token) { setError('Microsoft sign-in required to send email.'); return; }
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required.'); return; }
    if (recipients.length === 0) { setError('No recipients match the selected filter.'); return; }
    setSending(true);
    setError('');
    const ok = await sendMail(session.provider_token, {
      to: recipients.map(r => r.email),
      subject: subject.trim(),
      body,
    });
    setSending(false);
    if (!ok) { setError('Failed to send email. Check the console for details.'); return; }
    setSuccess(`Sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`);
    onSent?.(recipients.length);
    setTimeout(() => onClose(), 1400);
  }

  return (
    <Modal
      title="Send Announcement Email"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSend} disabled={sending || !tokenAvailable || recipients.length === 0}>
            {sending ? 'Sending…' : `Send to ${recipients.length}`}
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
        <label>Recipients</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {([
            { id: 'all', label: 'All active employees' },
            { id: 'company', label: 'By company' },
            { id: 'department', label: 'By department' },
            { id: 'lifecycle', label: 'By status' },
          ] as { id: RecipientMode; label: string }[]).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 14, cursor: 'pointer',
                border: '1px solid #C5C3BB',
                background: mode === opt.id ? '#1B3F6E' : '#fff',
                color: mode === opt.id ? '#fff' : '#1A1916',
                fontWeight: 500,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {mode === 'company' && (
          <select value={companyId} onChange={e => setCompanyId(e.target.value)}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {mode === 'department' && (
          <select value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">— pick a department —</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {mode === 'lifecycle' && (
          <select value={lifecycle} onChange={e => setLifecycle(e.target.value as 'onboarding' | 'active')}>
            <option value="active">Active employees</option>
            <option value="onboarding">Onboarding (new hires)</option>
          </select>
        )}
        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 6 }}>
          {recipients.length} recipient{recipients.length === 1 ? '' : 's'} match this filter.
        </div>
      </div>

      <div className="field">
        <label>Template</label>
        <select value={templateId} onChange={e => applyTemplate(e.target.value)}>
          {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Subject</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label>Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>
          Sent from your Microsoft 365 mailbox{msProfile?.mail ? ` (${msProfile.mail})` : ''}. Each recipient receives a separate copy via the To field — they will see each other's addresses. (Use Edit Profile in M365 to set up BCC distribution lists for sensitive sends.)
        </div>
      </div>
    </Modal>
  );
}
