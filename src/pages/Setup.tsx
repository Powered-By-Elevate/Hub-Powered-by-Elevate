import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppLogo } from '../components/shared/AppLogo';
import { supabase } from '../lib/supabase';

interface Props {
  token: string;
  onDone: () => void;
}

export function SetupPage({ token, onDone }: Props) {
  const [step, setStep] = useState<'loading' | 'form' | 'invalid' | 'done'>('loading');
  const [employeeName, setEmployeeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    async function checkToken() {
      const { data } = await supabase
        .from('setup_tokens')
        .select('*, employees(name, email)')
        .eq('token', token)
        .eq('used', false)
        .maybeSingle();

      if (!data || new Date(data.expires_at) < new Date()) {
        setStep('invalid');
        return;
      }
      const emp = data.employees as { name: string; email: string } | null;
      setEmployeeName(emp?.name ?? '');
      setEmail(emp?.email ?? data.email);
      setTokenId(data.id);
      setEmployeeId(data.employee_id);
      setStep('form');
    }
    checkToken();
  }, [token]);

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const passwordTooShort = password.length > 0 && password.length < 8;

  async function handleSetup() {
    if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-account`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, employeeId, tokenId }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error || 'Failed to activate account.');
        setSaving(false);
        return;
      }

      // Auto sign-in now that the account is confirmed
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setStep('done');
      setTimeout(onDone, 2000);
    } catch {
      setError('Connection error. Please check your internet and try again.');
      setSaving(false);
    }
  }

  if (step === 'loading') return <div className="loading-screen"><div className="loading-spinner" /></div>;

  if (step === 'invalid') return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#9888;</div>
        <h2 style={{ marginBottom: 8 }}>Link Expired or Invalid</h2>
        <p style={{ color: '#6B6860', fontSize: 13, marginBottom: '1.5rem' }}>This setup link is no longer valid. Please contact HR to generate a new one.</p>
        <button className="btn-ghost" onClick={onDone}>Go to Login</button>
      </div>
    </div>
  );

  if (step === 'done') return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
        <h2 style={{ marginBottom: 8 }}>Account Activated!</h2>
        <p style={{ color: '#6B6860', fontSize: 13 }}>Welcome aboard, {employeeName.split(' ')[0]}! Redirecting you now...</p>
      </div>
    </div>
  );

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <AppLogo variant="light" />
        </div>
        <h2>Set your password</h2>
        <p className="login-sub">Welcome, {employeeName || 'there'}! Create a password to activate your account.</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="field">
          <label>Email address</label>
          <input type="email" value={email} readOnly style={{ background: '#F8F7F4', color: '#6B6860' }} />
        </div>
        <div className="field">
          <label>New password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9B9890',
              }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordTooShort && (
            <span style={{ fontSize: 11, color: '#C4420A', marginTop: 4, display: 'block' }}>
              Must be at least 8 characters
            </span>
          )}
        </div>
        <div className="field">
          <label>Confirm password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              onKeyDown={e => e.key === 'Enter' && handleSetup()}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9B9890',
              }}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordMismatch && (
            <span style={{ fontSize: 11, color: '#C4420A', marginTop: 4, display: 'block' }}>
              Passwords do not match
            </span>
          )}
        </div>
        <button
          className="btn-signin"
          onClick={handleSetup}
          disabled={saving || passwordMismatch || passwordTooShort || !password || !confirm}
        >
          {saving ? 'Activating...' : 'Activate Account'}
        </button>
      </div>
    </div>
  );
}
