interface SettingsRow { icon: string; label: string; onClick: () => void; danger?: boolean; }
interface SettingsGroup { label: string; rows: SettingsRow[]; }

interface MobileHRSettingsProps {
  onOrgTab: (tab: string) => void;
  onSignOut: () => void;
}

export function MobileHRSettings({ onOrgTab, onSignOut }: MobileHRSettingsProps) {
  const groups: SettingsGroup[] = [
    {
      label: 'Organization',
      rows: [
        { icon: '🏢', label: 'Company Entities', onClick: () => onOrgTab('companies') },
        { icon: '👥', label: 'Departments and Teams', onClick: () => onOrgTab('departments') },
        { icon: '💼', label: 'Job Titles', onClick: () => onOrgTab('job-titles') },
      ],
    },
    {
      label: 'HR Tools',
      rows: [
        { icon: '📅', label: 'Check-in and Review Schedule', onClick: () => onOrgTab('schedule') },
        { icon: '📢', label: 'Employee Hub Banner', onClick: () => onOrgTab('announcements') },
      ],
    },
    {
      label: 'Account',
      rows: [
        { icon: '🚪', label: 'Sign Out', onClick: onSignOut, danger: true },
      ],
    },
  ];

  return (
    <div className="m-screen">
      {groups.map(group => (
        <div key={group.label}>
          <div className="m-set-group">{group.label}</div>
          {group.rows.map(row => (
            <div key={row.label} className="m-set-row" onClick={row.onClick}>
              <div className="m-set-icon" style={row.danger ? { background: '#FEE2E2' } : {}}>{row.icon}</div>
              <span className="m-set-label" style={row.danger ? { color: '#DC2626' } : {}}>{row.label}</span>
              {!row.danger && <span className="m-set-arrow">›</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
