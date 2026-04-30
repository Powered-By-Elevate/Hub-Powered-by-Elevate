import { useState, ReactNode } from 'react';

interface FabAction {
  label: string;
  onClick: () => void;
}

type HRNavTab = 'dashboard' | 'employees' | 'templates' | 'checkins' | 'settings';
type EmpNavTab = 'overview' | 'tasks' | 'schedule' | 'documents' | 'more';

interface MobileLayoutProps {
  title: string;
  isHR: boolean;
  userName: string;
  userInitials: string;
  onSignOut: () => void;
  fabActions?: FabAction[];
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  moreItems?: { id: string; label: string; icon: string }[];
  moreActiveTab?: string;
}

const HR_NAV: { id: HRNavTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'employees', icon: '👥', label: 'Employees' },
  { id: 'templates', icon: '📋', label: 'Templates' },
  { id: 'checkins', icon: '📅', label: 'Check-ins' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

const EMP_NAV: { id: EmpNavTab; icon: string; label: string }[] = [
  { id: 'overview', icon: '⊞', label: 'Dashboard' },
  { id: 'tasks', icon: '✓', label: 'Tasks' },
  { id: 'schedule', icon: '🗓', label: 'Schedule' },
  { id: 'documents', icon: '📄', label: 'Docs' },
  { id: 'more', icon: '···', label: 'More' },
];

export function MobileLayout({
  title, isHR, userName, userInitials, onSignOut,
  fabActions = [], children, activeTab, onTabChange,
  moreItems = [], moreActiveTab,
}: MobileLayoutProps) {
  const [showAvatarDrop, setShowAvatarDrop] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const nav = isHR ? HR_NAV : EMP_NAV;
  const moreTabIds = moreItems.map(i => i.id);
  const moreIsActive = moreActiveTab ? moreTabIds.includes(moreActiveTab) : false;

  function handleNavClick(id: string) {
    if (id === 'more') {
      setShowMore(true);
    } else {
      onTabChange(id);
    }
  }

  function handleFabClick() {
    if (fabActions.length === 1) {
      fabActions[0].onClick();
    } else if (fabActions.length > 1) {
      setShowFabMenu(v => !v);
    }
  }

  return (
    <div className="m-layout">
      {/* Top bar */}
      <div className="m-topbar">
        <div className="m-topbar-logo">
          <img src="/GetImage.png" alt="TrueNorth" style={{ height: 26, width: 'auto', background: '#fff', borderRadius: 6, padding: '3px 6px' }} />
        </div>
        <div className="m-topbar-title">{title}</div>
        <div style={{ position: 'relative' }}>
          <button className="m-topbar-avatar" onClick={() => setShowAvatarDrop(v => !v)}>
            {userInitials}
          </button>
          {showAvatarDrop && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowAvatarDrop(false)} />
              <div className="m-avatar-drop">
                <div className="m-avatar-drop-name">{userName}</div>
                <div className="m-avatar-drop-role">{isHR ? 'HR Administrator' : 'Employee'}</div>
                <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #E5E3DC' }} />
                <button
                  className="m-avatar-drop-signout"
                  onClick={() => { setShowAvatarDrop(false); onSignOut(); }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="m-content">
        {children}
      </div>

      {/* FAB */}
      {fabActions.length > 0 && (
        <>
          {showFabMenu && fabActions.length > 1 && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={() => setShowFabMenu(false)} />
              <div className="m-fab-menu">
                {fabActions.map(a => (
                  <button key={a.label} className="m-fab-menu-item" onClick={() => { setShowFabMenu(false); a.onClick(); }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <button className="m-fab" onClick={handleFabClick} aria-label="Add">+</button>
        </>
      )}

      {/* Bottom nav */}
      <div className="m-bottom-nav">
        {nav.map(({ id, icon, label }) => {
          const isActive = id === 'more'
            ? (moreIsActive || showMore)
            : activeTab === id || (id === 'employees' && activeTab === 'detail');
          return (
            <button
              key={id}
              className={`m-nav-btn${isActive ? ' m-nav-active' : ''}`}
              onClick={() => handleNavClick(id)}
            >
              <span className="m-nav-icon">{icon}</span>
              <span className="m-nav-label">{label}</span>
            </button>
          );
        })}
      </div>

      {/* More bottom sheet (employee only) */}
      {showMore && !isHR && (
        <>
          <div className="m-sheet-overlay" onClick={() => setShowMore(false)} />
          <div className="m-sheet">
            <div className="m-sheet-pill" />
            <div className="m-sheet-group">Navigation</div>
            {moreItems.map(({ id, icon, label }) => (
              <button
                key={id}
                className={`m-sheet-row${moreActiveTab === id ? ' m-sheet-row-active' : ''}`}
                onClick={() => { onTabChange(id); setShowMore(false); }}
              >
                <span className="m-sheet-row-icon">{icon}</span>
                <span>{label}</span>
                <span className="m-sheet-row-arrow">›</span>
              </button>
            ))}
            <div className="m-sheet-divider" />
            <div className="m-sheet-group">Account</div>
            <button
              className="m-sheet-row"
              style={{ color: '#DC2626' }}
              onClick={() => { setShowMore(false); onSignOut(); }}
            >
              <span className="m-sheet-row-icon">↩</span>
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
