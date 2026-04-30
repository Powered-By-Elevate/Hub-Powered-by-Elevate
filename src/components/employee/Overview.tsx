import { useEffect, useState } from 'react';
import { Employee, OnboardingTask, Schedule, HRAnnouncement } from '../../lib/database.types';
import { CheckItem } from '../shared/CheckItem';
import type { EmpTab } from '../../pages/EmployeeApp';

interface Props {
  employee: Employee;
  tasks: OnboardingTask[];
  schedules: Schedule[];
  announcements: HRAnnouncement[];
  pct: number;
  onTab: (tab: EmpTab) => void;
  onToggle: (id: string) => void;
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatClock(d: Date) {
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} \u00b7 ${time}`;
}

function showOnboardingBanner(employee: Employee): boolean {
  if (employee.lifecycle_status !== 'active') return false;
  if (!employee.onboarding_completed_at) return true;
  const completedAt = new Date(employee.onboarding_completed_at);
  const daysSince = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 7;
}

const ANNOUNCEMENT_COLORS: Record<string, { bg: string; border: string; text: string; isGrad?: boolean }> = {
  critical:     { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  reminder:     { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  announcement: { bg: 'linear-gradient(135deg,#1B3F6E 0%,#2D5FA0 100%)', border: 'transparent', text: '#fff', isGrad: true },
  shoutout:     { bg: '#F0FDF4', border: '#86EFAC', text: '#14532D' },
  birthday:     { bg: '#FDF4FF', border: '#E9D5FF', text: '#581C87' },
};

function pickActiveBanner(announcements: HRAnnouncement[], employee: Employee): HRAnnouncement | null {
  const priority: Record<string, number> = { critical: 0, reminder: 1, announcement: 2, shoutout: 3, birthday: 4 };
  const today = new Date().toISOString().split('T')[0];
  const active = announcements.filter(a =>
    a.active &&
    a.start_date <= today &&
    a.end_date >= today &&
    (
      (!a.department_id && !a.employee_id) ||
      (a.department_id && a.department_id === employee.department) ||
      (a.employee_id && a.employee_id === employee.id)
    )
  );
  if (!active.length) return null;
  return active.sort((a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99))[0];
}

export function EmpOverview({ employee, tasks, schedules, announcements, pct, onTab, onToggle }: Props) {
  const now = useLiveClock();
  const isActive = employee.lifecycle_status === 'active';
  const activeTasks = tasks.filter(t => !t.archived && t.status !== 'complete');
  const criticalTasks = activeTasks.filter(t => t.triage === 'critical').slice(0, 3);
  const upcoming = (criticalTasks.length > 0 ? criticalTasks : activeTasks.filter(t => t.triage !== 'critical')).slice(0, 3);
  const remaining = activeTasks.length;

  const showOBBanner = showOnboardingBanner(employee);
  const activeBanner = isActive && !showOBBanner ? pickActiveBanner(announcements, employee) : null;

  const obTasks = tasks.filter(t => t.task_phase === 'onboarding');
  const statRows: [string, number, string, string][] = [
    ['Complete', obTasks.filter(t => t.status === 'complete').length, 'pf-green', 'c-green'],
    ['In Progress', obTasks.filter(t => t.status === 'in-progress').length, 'pf-navy', 'c-navy'],
    ['Not Started', obTasks.filter(t => t.status === 'pending').length, 'pf-amber', ''],
    ['Overdue', obTasks.filter(t => t.status === 'overdue').length, 'pf-red', 'c-red'],
  ];

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Welcome{isActive ? ' back' : ''}, {employee.name.split(' ')[0]}!</h1>
          <p>{isActive ? `${employee.role} \u00b7 ${employee.department}` : `Your personal onboarding hub \u00b7 Started ${employee.start_date}`}</p>
        </div>
        <div className="topbar-clock">{formatClock(now)}</div>
      </div>
      <div className="content">
        {isActive && showOBBanner && (
          <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #1B3F6E 0%, #2D9A60 100%)' }}>
            <h2>You're fully onboarded!</h2>
            <p>Welcome to {employee.department}. Your full employee hub is now unlocked.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <button className="ob-btn-solid" onClick={() => onTab('tasks')}>My Tasks</button>
              <button className="ob-btn-outline" onClick={() => onTab('team')}>My Team</button>
            </div>
          </div>
        )}

        {isActive && !showOBBanner && activeBanner && (() => {
          const colors = ANNOUNCEMENT_COLORS[activeBanner.type] ?? ANNOUNCEMENT_COLORS.announcement;
          return (
            <div style={{
              background: colors.bg,
              border: colors.isGrad ? 'none' : `1px solid ${colors.border}`,
              borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', color: colors.text,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{activeBanner.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.85 }}>{activeBanner.message}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                  padding: '3px 9px', borderRadius: 20, flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap',
                  background: colors.isGrad ? 'rgba(255,255,255,0.2)' : colors.border,
                  color: colors.text,
                }}>{activeBanner.type}</span>
              </div>
            </div>
          );
        })()}

        {!isActive && (
          <div className="welcome-banner">
            <h2>You're {pct}% onboarded!</h2>
            <p>{remaining} task{remaining !== 1 ? 's' : ''} remaining — you're doing great.</p>
            <div className="wb-row">
              <div className="wb-bar"><div className="wb-fill" style={{ width: pct + '%' }} /></div>
              <span className="wb-pct">{pct}%</span>
            </div>
          </div>
        )}

        <div className="two-col">
          <div className="card">
            <div className="card-header">
              <h3>{isActive ? 'Open Tasks' : 'Up Next'}</h3>
              <button className="btn-ghost sm" onClick={() => onTab('tasks')}>View all tasks</button>
            </div>
            {upcoming.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                <p>All tasks complete!</p>
                <div className="esub">Congratulations — you've finished your onboarding checklist.</div>
              </div>
            ) : upcoming.map(t => <CheckItem key={t.id} task={t} isHR={false} onToggle={onToggle} />)}
          </div>
          <div>
            <div className="card mb2">
              <div className="card-header">
                <h3>Today's Schedule</h3>
                <button className="btn-ghost sm" onClick={() => onTab('schedule')}>View all</button>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                {schedules.slice(0, 3).map(s => (
                  <div key={s.id} className="sched-item">
                    <div className="sched-dot" style={{ background: s.color ?? '#1B3F6E' }} />
                    <div className="sched-time">{s.time_label}</div>
                    <div><div className="sched-title">{s.title}</div><div className="sched-sub">{s.location}</div></div>
                  </div>
                ))}
                {schedules.length === 0 && <p style={{ fontSize: 13, color: '#9B9890', padding: '0.5rem 0' }}>No schedule items.</p>}
              </div>
            </div>
            {!isActive && (
              <div className="card">
                <div className="card-header"><h3>My Progress</h3></div>
                <div className="card-body">
                  {statRows.map(([label, val, fc, tc]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: '#6B6860' }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="prog-bar" style={{ width: 80 }}>
                          <div className={`prog-fill ${fc}`} style={{ width: tasks.length ? Math.round((val / tasks.length) * 100) + '%' : '0%' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 14, textAlign: 'right' }} className={tc}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
