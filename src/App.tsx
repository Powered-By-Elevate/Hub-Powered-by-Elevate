import { useEffect, useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ViewerProvider } from './contexts/ViewerContext';
import { LoginPage } from './pages/Login';
import { SetupPage } from './pages/Setup';
import { HRApp } from './pages/HRApp';
import { EmployeeApp } from './pages/EmployeeApp';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { msalInstance } from './lib/msal';

// Detect when this page is running inside an MSAL popup window so we render
// nothing (let MSAL's internal popup handler complete the handoff and close
// the window). If we render the LoginPage here, the user sees a duplicate
// login screen inside the popup and clicking the MS button again throws
// block_nested_popups.
function isInMsalPopup(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.opener || window.opener === window) return false;
  const hash = window.location.hash || '';
  return /[#&](code|error|state|access_token|id_token)=/.test(hash);
}

function AppRouter() {
  const { user, profile, loading } = useAuth();
  const [setupToken, setSetupToken] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('setup');
    if (token) setSetupToken(token);
  }, []);
  if (isInMsalPopup()) {
    return <div className="loading-screen"><div className="loading-spinner" /></div>;
  }
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;
  if (setupToken) return (
    <SetupPage
      token={setupToken}
      onDone={() => {
        setSetupToken(null);
        window.history.replaceState({}, '', '/');
      }}
    />
  );
  if (!user) return <LoginPage />;
  if (!profile) return <div className="loading-screen"><div className="loading-spinner" /></div>;
  if (profile.role === 'hr') return <ErrorBoundary><HRApp /></ErrorBoundary>;
  if (profile.role === 'manager' || profile.role === 'employee') {
    if (!profile.employee_id) {
      return (
        <div className="loading-screen" style={{ flexDirection: 'column', gap: 12 }}>
          <p style={{ color: '#6B6860', fontSize: 14 }}>Your employee profile is not linked yet.</p>
          <p style={{ color: '#9B9890', fontSize: 12 }}>Please contact HR to complete your account setup.</p>
        </div>
      );
    }
    return <ErrorBoundary><EmployeeApp /></ErrorBoundary>;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <ViewerProvider>
            <AppRouter />
          </ViewerProvider>
        </AuthProvider>
      </MsalProvider>
    </ErrorBoundary>
  );
}