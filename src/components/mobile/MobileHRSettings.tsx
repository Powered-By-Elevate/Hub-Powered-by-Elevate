import { HRSettings } from '../hr/Settings';
import { useState } from 'react';
import type { Employee } from '../../lib/database.types';

interface Props {
  onOrgTab: () => void;
  onSignOut: () => void;
  employees?: Employee[];
  onCheckinUpdated?: () => void;
  onReviewUpdated?: () => void;
  onDepartmentChanged?: () => void;
}

type SubScreen =
  | null
  | 'companies'
  | 'departments'
  | 'jobtitles'
  | 'schedule'
  | 'banners';

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

function BackHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #E5E3DC', background: '#fff' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E8EFF8', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#1B3F6E', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36 }}>
        <BackIcon /> Settings
      </button>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1916' }}>{label}</span>
    </div>
  );
}

export function MobileHRSettings({
  onSignOut,
  employees = [],
  onCheckinUpdated = () => {},
  onReviewUpdated = () => {},
  onDepartmentChanged = () => {},
}: Props) {
  const [sub, setSub] = useState<SubScreen>(null);

  if (sub) {
    const labels: Record<NonNullable<SubScreen>, string> = {
      companies: 'Company Entities',
      departments: 'Departments and Teams',
      jobtitles: 'Job Titles',
      schedule: 'Check-in & Review Schedule',
      banners: 'Employee Hub Banner',
    };

    const sectionMap: Record<NonNullable<SubScreen>, 'schedule' | 'banners' | 'organization'> = {
      companies: 'organization',
      departments: 'organization',
      jobtitles: 'organization',
      schedule: 'schedule',
      banners: 'banners',
    };

    const orgTabMap: Record<NonNullable<SubScreen>, 'companies' | 'departments' | 'job-titles' | undefined> = {
      companies: 'companies',
      departments: 'departments',
      jobtitles: 'job-titles',
      schedule: undefined,
      banners: undefined,
    };

    return (
      <div>
        <BackHeader label={labels[sub]} onBack={() => setSub(null)} />
        <HRSettings
          employees={employees}
          onCheckinUpdated={onCheckinUpdated}
          onReviewUpdated={onReviewUpdated}
          onDepartmentChanged={onDepartmentChanged}
          initialSection={sectionMap[sub]}
          initialOrgTab={orgTabMap[sub]}
          hideSidebar={true}
        />
      </div>
    );
  }

  return (
    <div className="m-screen" style={{ padding: 14, paddingBottom: 80 }}>
      <div className="m-set-group">Organization</div>
      <div className="m-set-row" onClick={() => setSub('companies')}>
        <div className="m-set-icon">🏢</div>
        <span className="m-set-label">Company Entities</span>
        <span className="m-set-arrow">›</span>
      </div>
      <div className="m-set-row" onClick={() => setSub('departments')}>
        <div className="m-set-icon">👥</div>
        <span className="m-set-label">Departments and Teams</span>
        <span className="m-set-arrow">›</span>
      </div>
      <div className="m-set-row" onClick={() => setSub('jobtitles')}>
        <div className="m-set-icon">💼</div>
        <span className="m-set-label">Job Titles</span>
        <span className="m-set-arrow">›</span>
      </div>
      <div className="m-set-group">HR Tools</div>
      <div className="m-set-row" onClick={() => setSub('schedule')}>
        <div className="m-set-icon">📅</div>
        <span className="m-set-label">Check-in &amp; Review Schedule</span>
        <span className="m-set-arrow">›</span>
      </div>
      <div className="m-set-row" onClick={() => setSub('banners')}>
        <div className="m-set-icon">📢</div>
        <span className="m-set-label">Employee Hub Banner</span>
        <span className="m-set-arrow">›</span>
      </div>
      <div className="m-set-group">Account</div>
      <div className="m-set-row" onClick={onSignOut} style={{ color: '#DC2626' }}>
        <div className="m-set-icon" style={{ background: '#FEE2E2' }}>🚪</div>
        <span className="m-set-label" style={{ color: '#DC2626' }}>Sign Out</span>
      </div>
    </div>
  );
}