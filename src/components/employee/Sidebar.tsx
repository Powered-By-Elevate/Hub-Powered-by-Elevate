import { useState } from 'react';
import { AppLogo } from '../shared/AppLogo';
import { useAuth } from '../../contexts/AuthContext';
import { Employee } from '../../lib/database.types';
import { ini } from '../shared/utils';
import type { EmpTab } from '../../pages/EmployeeApp';

interface Props {
  employee: Employee;
  tab: EmpTab;
  onTab: (tab: EmpTab) => void;
}

const MOBILE_NAV_ACTIVE: { id: EmpTab; icon: string; label: string }[] = [
  { id: 'overview', icon: '⊞', label: 'Dashboard' },
  { id: 'tasks', icon: '✓', label: 'Tasks' },
  { id: 'schedule', icon: '🗓', label: 'Schedule' },
  { id: 'documents', icon: '📄', label: 'Docs' },
  { id: 'more', icon: '•••', label: 'More' },
];

const MOBILE_NAV_ONBOARDING: { id: EmpTab; icon: string; label: string }[] = [
  { id: 'overview', icon: '⊞', label: 'Overview' },
  { id: 'tasks', icon: '✓', label: 'Tasks' },
  { id: 'schedule', icon: '🗓', label: 'Schedule' },
  { id: 'documents', icon: '📄', label: 'Docs' },
  { id: 'more', icon: '•••', label: 'More' },
];

const MORE_ACTIVE: { id: EmpTab; icon: string; label: string }[] = [
  { id: 'team', icon: '👥', label: 'My Team' },
  { id: 'contacts', icon: '👤', label: 'Contacts' },
  { id: 'checkins', icon: '📊', label: 'Check-ins' },
];

const MORE_ONBOARDING: { id: EmpTab; icon: string; label: string }[] = [
  { id: 'contacts', icon: '👤', label: 'Contacts' },
];

export function EmpSidebar({ employee, tab, onTab }: Props) {
  const { signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const [showAvatarDrop, setShowAvatarDrop] = useState(false);
  const isActive = employee.lifecycle_status === 'active';

  const onboardingNav: { id: EmpTab; icon: string; label: string }[] = [
    { id: 'overview', icon: '▦', label: 'My Overview' },
    { id: 'tasks', icon: '✓', label: 'My Tasks' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'documents', icon: '📄', label: 'Documents' },
    { id: 'contacts', icon: '👤', label: 'Contacts' },
  ];

  const activeNav: { id: EmpTab; icon: string; label: string }[] = [
    { id: 'overview', icon: '▦', label: 'Dashboard' },
    { id: 'tasks', icon: '✓', label: 'My Tasks' },
    { id: 'team', icon: '👥', label: 'My Team' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'documents', icon: '📄', label: 'Documents' },
    { id: 'contacts', icon: '👤', label: 'Contacts' },
    { id: 'checkins', icon: '📊', label: 'Check-ins' },
  ];

  const nav = isActive ? activeNav : onboardingNav;
  const mobileNav = isActive ? MOBILE_NAV_ACTIVE : MOBILE_NAV_ONBOARDING;
  const moreItems = isActive ? MORE_ACTIVE : MORE_ONBOARDING;
  const moreTabIds = moreItems.map(i => i.id);
  const moreIsActive = moreTabIds.includes(tab as EmpTab);

  function handleMobileNav(id: string) {
    if (id === 'more') {
      setShowMore(true);
    } else {
      onTab(id as EmpTab);
    }
  }

  function handleMoreItem(id: EmpTab) {
    onTab(id);
    setShowMore(false);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <AppLogo variant="dark" />
        </div>
        <div className="sidebar-user">
          <div className="avatar av-light av-32">{ini(employee.name)}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', lineHeight: 1.2 }}>{employee.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
              {isActive ? employee.role : 'New Hire'}
            </div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-section-label">{isActive ? 'Employee Hub' : 'My Onboarding'}</div>
          {nav.map(({ id, icon, label }) => (
            <button key={id} className={`nav-btn${tab === id ? ' active' : ''}`} onClick={() => onTab(id)}>
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
          {tab === 'overview' ? (isActive ? 'Dashboard' : 'My Onboarding') : tab === 'tasks' ? 'My Tasks' : tab === 'schedule' ? 'Schedule' : tab === 'documents' ? 'Documents' : tab === 'team' ? 'My Team' : tab === 'contacts' ? 'Contacts' : tab === 'checkins' ? 'Check-ins' : 'More'}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="mobile-header-avatar" onClick={() => setShowAvatarDrop(v => !v)}>
            {ini(employee.name)}
          </button>
          {showAvatarDrop && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowAvatarDrop(false)} />
              <div className="avatar-dropdown">
                <div style={{ padding: '10px 14px 4px', fontSize: 12, color: '#9B9890', fontWeight: 600 }}>{employee.name}</div>
                <div style={{ padding: '2px 14px 10px', fontSize: 11, color: '#9B9890' }}>{isActive ? employee.role : 'New Hire'}</div>
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
          {mobileNav.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`mobile-nav-btn${(id === 'more' ? moreIsActive || showMore : tab === id) ? ' active' : ''}`}
              onClick={() => handleMobileNav(id)}
            >
              <span className="nav-m-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* More bottom sheet */}
      {showMore && (
        <>
          <div className="more-sheet-overlay" onClick={() => setShowMore(false)} />
          <div className="more-sheet">
            <div className="more-sheet-pill" />
            <div className="more-sheet-title">Navigation</div>
            {moreItems.map(({ id, icon, label }) => (
              <button
                key={id}
                className={`more-sheet-item${tab === id ? ' active' : ''}`}
                onClick={() => handleMoreItem(id)}
              >
                <span className="more-sheet-item-icon">{icon}</span>
                {label}
                <span style={{ marginLeft: 'auto', fontSize: 16, color: '#C5C3BB' }}>›</span>
              </button>
            ))}
            <div className="more-sheet-divider" />
            <div className="more-sheet-title">Account</div>
            <button className="more-sheet-item" style={{ color: '#DC2626' }} onClick={() => { setShowMore(false); signOut(); }}>
              <span className="more-sheet-item-icon">↩</span>
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  );
}
