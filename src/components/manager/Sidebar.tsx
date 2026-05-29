import { useState } from 'react';
import { AppLogo } from '../shared/AppLogo';
import { useAuth } from '../../contexts/AuthContext';
import { Employee } from '../../lib/database.types';
import { ini } from '../shared/utils';
import type { ManagerTab } from '../../pages/ManagerApp';

interface Props {
  myEmployee: Employee | null;
  tab: string;
  onTab: (tab: ManagerTab) => void;
}

const navItems: { id: ManagerTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '▦', label: 'Dashboard' },
  { id: 'team', icon: '👥', label: 'My Team' },
];

export function ManagerSidebar({ myEmployee, tab, onTab }: Props) {
  const { signOut, profile, msProfile, msPhotoUrl } = useAuth();
  const [showAvatarDrop, setShowAvatarDrop] = useState(false);
  const displayName = msProfile?.displayName ?? myEmployee?.name ?? profile?.email?.split('@')[0] ?? 'Manager';
  const initials = msProfile?.displayName
    ? msProfile.displayName.trim().split(' ').map(s => s[0]?.toUpperCase() ?? '').slice(0, 2).join('')
    : myEmployee ? ini(myEmployee.name) : 'M';
  const titleLine = msProfile?.jobTitle ?? 'Manager';

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <AppLogo variant="dark" />
        </div>
        <div className="sidebar-user">
          {msPhotoUrl ? (
            <img src={msPhotoUrl} alt={displayName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div className="avatar av-light av-32">{initials}</div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', lineHeight: 1.2 }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{titleLine}</div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-section-label">Manager View</div>
          {navItems.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`nav-btn${tab === id || (id === 'team' && tab === 'detail') ? ' active' : ''}`}
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
          <img src="/GetImage.png" alt="Hub powered by Elevate" style={{ height: 28, width: 'auto', background: '#fff', borderRadius: 6, padding: '3px 6px' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <button className="mobile-header-avatar" onClick={() => setShowAvatarDrop(v => !v)} style={msPhotoUrl ? { backgroundImage: `url(${msPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>
            {msPhotoUrl ? '' : initials}
          </button>
          {showAvatarDrop && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowAvatarDrop(false)} />
              <div className="avatar-dropdown">
                <div style={{ padding: '10px 14px 4px', fontSize: 12, color: '#9B9890', fontWeight: 600 }}>{displayName}</div>
                <div style={{ padding: '2px 14px 10px', fontSize: 11, color: '#9B9890' }}>{titleLine}</div>
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
          {navItems.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`mobile-nav-btn${tab === id || (id === 'team' && tab === 'detail') ? ' active' : ''}`}
              onClick={() => onTab(id)}
            >
              <span className="nav-m-icon">{icon}</span>
              {label}
            </button>
          ))}
          <button className="mobile-nav-btn" style={{ flex: 2 }} onClick={signOut}>
            <span className="nav-m-icon">↩</span>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
