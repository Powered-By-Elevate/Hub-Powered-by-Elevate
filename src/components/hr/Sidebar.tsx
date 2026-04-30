import { useState } from 'react';
import { AppLogo } from '../shared/AppLogo';
import { useAuth } from '../../contexts/AuthContext';
import type { HRTab } from '../../pages/HRApp';

const navItems: { id: HRTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '▦', label: 'Dashboard' },
  { id: 'employees', icon: '👥', label: 'All Employees' },
  { id: 'templates', icon: '📋', label: 'Templates' },
  { id: 'checkins', icon: '📅', label: 'Check-ins & Reviews' },
  { id: 'career', icon: '🎯', label: 'Career Development' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

interface Props {
  tab: string;
  onTab: (tab: HRTab) => void;
}

const mobileNavItems: { id: HRTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'employees', icon: '👥', label: 'Employees' },
  { id: 'career', icon: '🎯', label: 'Career' },
  { id: 'checkins', icon: '📅', label: 'Check-ins' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export function HRSidebar({ tab, onTab }: Props) {
  const { signOut, profile } = useAuth();
  const [showAvatarDrop, setShowAvatarDrop] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <AppLogo variant="dark" />
        </div>
        <div className="sidebar-user">
          <div className="avatar av-light av-32">HR</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', lineHeight: 1.2 }}>
              {profile?.email?.split('@')[0] ?? 'HR Admin'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>HR Administrator</div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`nav-btn${tab === id || (id === 'employees' && tab === 'detail') ? ' active' : ''}`}
              onClick={() => onTab(id)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="logout-btn-inner" onClick={signOut}>↩&nbsp; Sign out</button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="mobile-header">
        <div className="mobile-header-logo">
          <img src="/GetImage.png" alt="TrueNorth" style={{ height: 26, width: 'auto', background: '#fff', borderRadius: 6, padding: '3px 6px' }} />
        </div>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: -0.2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {tab === 'dashboard' ? 'Dashboard' : tab === 'employees' || tab === 'detail' ? 'Employees' : tab === 'templates' ? 'Templates' : tab === 'checkins' ? 'Check-ins' : tab === 'settings' ? 'Settings' : 'HR'}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="mobile-header-avatar" onClick={() => setShowAvatarDrop(v => !v)}>
            HR
          </button>
          {showAvatarDrop && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowAvatarDrop(false)} />
              <div className="avatar-dropdown">
                <div style={{ padding: '10px 14px 4px', fontSize: 12, color: '#9B9890', fontWeight: 600 }}>
                  {profile?.email?.split('@')[0] ?? 'HR Admin'}
                </div>
                <div style={{ padding: '2px 14px 10px', fontSize: 11, color: '#9B9890' }}>HR Administrator</div>
                <hr />
                <button onClick={() => { setShowAvatarDrop(false); signOut(); }}>↩ Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {mobileNavItems.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`mobile-nav-btn${tab === id || (id === 'employees' && tab === 'detail') ? ' active' : ''}`}
              onClick={() => onTab(id)}
            >
              <span className="nav-m-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
