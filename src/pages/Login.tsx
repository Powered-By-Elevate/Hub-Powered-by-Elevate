import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLogo } from '../components/shared/AppLogo';

export function LoginPage() {
  const { signIn, signInWithMicrosoft, msSsoAvailable } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleMicrosoftSignIn() {
    setMsLoading(true);
    setError('');
    const { error: err } = await signInWithMicrosoft();
    setMsLoading(false);
    if (err) setError(err);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <AppLogo variant="light" />
        </div>
        <h2>Welcome back</h2>
        <p className="login-sub">Sign in with your company email to continue</p>
        {error && <div className="error-msg">{error}</div>}

        {msSsoAvailable && (
          <>
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={msLoading || loading}
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: 14,
                fontWeight: 600,
                color: '#1A1916',
                background: '#fff',
                border: '1px solid #C5C3BB',
                borderRadius: 8,
                cursor: msLoading || loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <MicrosoftLogo />
              {msLoading ? 'Opening Microsoft sign-in…' : 'Sign in with Microsoft'}
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 14px',
              color: '#9B9890', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              <div style={{ flex: 1, height: 1, background: '#E5E3DC' }} />
              <span>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: '#E5E3DC' }} />
            </div>
          </>
        )}

        <div className="field">
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@true-north-companies.com"
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            autoComplete="current-password"
          />
        </div>
        <button className="btn-signin" onClick={handleSignIn} disabled={loading || msLoading}>
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
        <p style={{ fontSize: 12, color: '#9B9890', marginTop: 16 }}>
          Need access?{' '}
          <a
            href="mailto:tbenas@true-north-companies.com?subject=Hub%20Access%20Request"
            style={{ color: '#1B3F6E', textDecoration: 'underline' }}
          >
            Contact your HR administrator
          </a>
        </p>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0" y="0" width="7" height="7" fill="#F25022" />
      <rect x="9" y="0" width="7" height="7" fill="#7FBA00" />
      <rect x="0" y="9" width="7" height="7" fill="#00A4EF" />
      <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
    </svg>
  );
}
