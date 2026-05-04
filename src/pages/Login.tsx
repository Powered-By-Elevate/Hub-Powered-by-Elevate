import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLogo } from '../components/shared/AppLogo';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    setLoading(false);
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
        <button className="btn-signin" onClick={handleSignIn} disabled={loading}>
          {loading ? 'Signing in\u2026' : 'Sign in \u2192'}
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
