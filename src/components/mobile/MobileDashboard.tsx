import { useState, useEffect } from 'react';
import { Employee, OnboardingTask, Schedule, HRAnnouncement } from '../../lib/database.types';

interface MobileDashboardProps {
  employee: Employee;
  tasks: OnboardingTask[];
  schedules: Schedule[];
  announcement?: HRAnnouncement | null;
  onToggleTask: (id: string) => void;
  onTab: (tab: string) => void;
}

function LiveDateTime() {
  const [dt, setDt] = useState('');
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const h = now.getHours() % 12 || 12;
      const m = now.getMinutes().toString().padStart(2,'0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      setDt(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · ${h}:${m} ${ampm}`);
    };
    fmt();
    const t = setInterval(fmt, 30000);
    return () => clearInterval(t);
  }, []);
  return <div className="m-datetime">{dt}</div>;
}

function Banner({ employee, announcement }: { employee: Employee; announcement?: HRAnnouncement | null }) {
  const isActive = employee.lifecycle_status === 'active';
  const pct = employee.progress ?? 0;

  if (isActive) {
    const completedAt = employee.onboarding_completed_at ? new Date(employee.onboarding_completed_at) : null;
    const daysSince = completedAt ? Math.floor((Date.now() - completedAt.getTime()) / 86400000) : 999;
    if (daysSince <= 7) {
      return (
        <div className="m-banner m-banner-active">
          <h3>You're fully onboarded!</h3>
          <p>Welcome to the team — your full employee hub is now unlocked.</p>
        </div>
      );
    }
    if (announcement) {
      const colors: Record<string, string> = {
        critical: 'linear-gradient(135deg,#991B1B,#DC2626)',
        reminder: 'linear-gradient(135deg,#92400E,#D97706)',
        announcement: 'linear-gradient(135deg,#1B3F6E,#2563EB)',
        shoutout: 'linear-gradient(135deg,#166534,#2D9A60)',
        birthday: 'linear-gradient(135deg,#1B3F6E,#1B3F6E)',
      };
      return (
        <div className="m-banner" style={{ background: colors[announcement.type] || colors.announcement }}>
          <h3>{announcement.title}</h3>
          <p>{announcement.message}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="m-banner m-banner-onboarding">
      <h3>You're {pct}% onboarded!</h3>
      <p>{pct === 100 ? 'All tasks done — transition in progress.' : "Keep going — you're making great progress."}</p>
      <div className="m-progress-row">
        <div className="m-progress-track">
          <div className="m-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="m-progress-pct">{pct}%</span>
      </div>
    </div>
  );
}

const catClass: Record<string, string> = {
  document: 'm-pill-doc', form: 'm-pill-form', meeting: 'm-pill-meeting',
  training: 'm-pill-training', personal: 'm-pill-personal',
};

function TaskRow({ task, onToggle }: { task: OnboardingTask; onToggle: (id: string) => void }) {
  const done = task.status === 'complete';
  const overdue = !done && !!task.due_date && new Date(task.due_date) < new Date();
  const isCrit = task.triage === 'critical';
  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className={`m-task${isCrit ? ' m-task-critical' : ''}`}>
      {isCrit && !done && <em className="m-task-crit-icon">!</em>}
      <div className="m-task-body">
        <div className={`m-task-title${done ? ' m-task-title-done' : ''}`}>{task.title}</div>
        <div className="m-task-meta">
          <span className={`m-pill ${catClass[task.category] || 'm-pill-doc'}`}>{task.category}</span>
          {dueLabel && (
            <span className={`m-due${overdue ? ' m-due-overdue' : ''}`}>
              {overdue ? `Overdue · ${dueLabel}` : `Due ${dueLabel}`}
            </span>
          )}
        </div>
      </div>
      <div className="m-task-check" onClick={() => onToggle(task.id)}>
        <div className={`m-checkbox${done ? ' m-checkbox-done' : ''}`}>
          {done && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileDashboard({ employee, tasks, schedules, announcement, onToggleTask, onTab }: MobileDashboardProps) {
  const activeTasks = tasks.filter(t => t.status !== 'complete' && !t.archived);
  const criticalTasks = activeTasks.filter(t => t.triage === 'critical').slice(0, 3);
  const upNext = activeTasks
    .filter(t => t.triage !== 'critical')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 3);

  const todayStr = new Date().toDateString();
  const todaySchedule = schedules.filter(s => s.schedule_date && new Date(s.schedule_date).toDateString() === todayStr);
  const dotColors = ['#1B3F6E', '#2D9A60', '#D97706', '#DC2626', '#4B8BB0'];

  return (
    <div className="m-screen">
      <LiveDateTime />
      <Banner employee={employee} announcement={announcement} />

      {criticalTasks.length > 0 && (
        <>
          <div className="m-section m-section-red">Critical Tasks</div>
          <div className="m-card">
            {criticalTasks.map(t => <TaskRow key={t.id} task={t} onToggle={onToggleTask} />)}
          </div>
        </>
      )}

      <div className="m-section">
        <span>Up Next</span>
        <button className="m-section-link" onClick={() => onTab('tasks')}>View all</button>
      </div>
      <div className="m-card">
        {upNext.length > 0
          ? upNext.map(t => <TaskRow key={t.id} task={t} onToggle={onToggleTask} />)
          : (
            <div className="m-empty" style={{ padding: '20px 0' }}>
              <div className="m-empty-icon">✓</div>
              <div className="m-empty-text">All tasks complete!</div>
            </div>
          )
        }
      </div>

      <div className="m-section"><span>Today's Schedule</span></div>
      <div className="m-card m-card-pad">
        {todaySchedule.length > 0 ? todaySchedule.map((s, i) => (
          <div key={s.id} className="m-sched-row">
            <div className="m-sched-dot" style={{ background: dotColors[i % dotColors.length] }} />
            <div className="m-sched-time">{s.time_label ?? ''}</div>
            <div>
              <div className="m-sched-title">{s.title}</div>
              {s.location && <div className="m-sched-loc">{s.location}</div>}
            </div>
          </div>
        )) : (
          <div className="m-empty" style={{ padding: 16 }}>
            <div className="m-empty-text">No events today</div>
          </div>
        )}
      </div>
    </div>
  );
}
