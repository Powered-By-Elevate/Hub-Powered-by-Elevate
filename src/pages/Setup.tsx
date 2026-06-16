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
  const [statusMsg, setStatusMsg] = useState('');
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

  // Sign in, tolerating the brief "email not confirmed" propagation window that
  // can occur on the fallback path. Real errors (wrong password, etc.) surface
  // immediately. Returns an error message, or null on success.
  async function signInWithRetry(): Promise<string | null> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInErr) return null;
      const msg = signInErr.message ?? '';
      if (!/not confirmed/i.test(msg)) return msg; // genuine failure — stop
      setStatusMsg('Finalizing your account…');
      await new Promise(r => setTimeout(r, 2500));
    }
    return 'Your account is still finalizing — give it a few seconds and click Activate again.';
  }

  function finishActivation() {
    setSaving(false);
    setStatusMsg('');
    setStep('done');
    // Full reload so AuthContext picks up the new session cleanly.
    setTimeout(() => { window.location.href = '/'; }, 1500);
  }

  async function handleSetup() {
    if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    setError('');
    setStatusMsg('');

    try {
      // Preferred path: server-side activation. The activate-account edge
      // function uses the service role to create the user already
      // email-confirmed (no confirmation race), links the employee, sets the
      // access role, and marks the token used. We then just sign in.
      let serverActivated = false;
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('activate-account', {
          body: { email, password, employeeId, tokenId },
        });
        if (!fnErr && data && (data as { success?: boolean }).success) serverActivated = true;
      } catch {
        // Function unreachable / not deployed — fall through to client flow.
      }

      if (serverActivated) {
        const signInErr = await signInWithRetry();
        if (signInErr) { setError(signInErr); setSaving(false); setStatusMsg(''); return; }
        finishActivation();
        return;
      }

      // Fallback: original client-side flow (used if the edge function isn't
      // available). Sign up, then sign in (with a short retry for the
      // confirmation propagation window), then link via RPC.
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });

      let userId: string | undefined;
      if (signUpErr) {
        if (signUpErr.message?.includes('already been registered') || signUpErr.message?.includes('already registered')) {
          const signInErr = await signInWithRetry();
          if (signInErr) { setError(signInErr); setSaving(false); setStatusMsg(''); return; }
          userId = (await supabase.auth.getUser()).data.user?.id;
        } else {
          setError(signUpErr.message);
          setSaving(false);
          return;
        }
      } else if (signUpData?.session) {
        userId = signUpData.user?.id;
      } else {
        const signInErr = await signInWithRetry();
        if (signInErr) { setError(signInErr); setSaving(false); setStatusMsg(''); return; }
        userId = (await supabase.auth.getUser()).data.user?.id;
      }

      if (!userId) {
        setError('Account created but could not retrieve user ID. Please try logging in.');
        setSaving(false);
        return;
      }

      const { data: rpcResult, error: rpcErr } = await supabase.rpc('activate_account', {
        p_token_id: tokenId,
        p_employee_id: employeeId,
        p_user_id: userId,
        p_email: email,
      });
      if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }
      if (rpcResult && !rpcResult.success) { setError(rpcResult.error || 'Activation failed.'); setSaving(false); return; }

      finishActivation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Please check your internet and try again.');
      setSaving(false);
      setStatusMsg('');
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
        {!error && statusMsg && (
          <div style={{ padding: '10px 14px', background: '#E8EFF8', borderRadius: 8, border: '1px solid #B8CCE4', fontSize: 13, color: '#1B3F6E', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="loading-spinner" style={{ width: 14, height: 14, border: '2px solid #B8CCE4', borderTopColor: '#1B3F6E', borderRadius: '50%', display: 'inline-block' }} />
            {statusMsg}
          </div>
        )}
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
          {saving ? (statusMsg ? 'Finalizing…' : 'Activating...') : 'Activate Account'}
        </button>
      </div>
    </div>
  );
}
