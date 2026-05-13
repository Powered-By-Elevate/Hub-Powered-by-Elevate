import { useState, useEffect } from 'react';
import { Employee, OnboardingTask } from '../../lib/database.types';
import { TaskCard } from '../shared/TaskCard';
import { supabase } from '../../lib/supabase';

type ViewMode = 'week' | 'month' | 'year' | 'all';

interface Props {
  tasks: OnboardingTask[];
  onToggle: (id: string) => void;
  onTriageChange?: (taskId: string, triage: 'critical' | 'normal') => void;
  onAddTask?: () => void;
  employee: Employee;
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
  return { start, end };
}

function filterByView(tasks: OnboardingTask[], view: ViewMode): OnboardingTask[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const { start: weekStart, end: weekEnd } = getWeekBounds();

  return tasks.filter(t => {
    if (!t.due_date || t.due_date === 'TBD') return view === 'all';
    const due = new Date(t.due_date);
    if (view === 'week') return due >= weekStart && due <= weekEnd;
    if (view === 'month') return due.getFullYear() === year && due.getMonth() === month;
    if (view === 'year') return due.getFullYear() === year;
    return true;
  });
}

function sortTasks(tasks: OnboardingTask[]): OnboardingTask[] {
  const now = new Date(); now.setHours(0,0,0,0);
  const critical = tasks.filter(t => t.triage === 'critical');
  const normal = tasks.filter(t => t.triage !== 'critical');

  function sortByDue(a: OnboardingTask, b: OnboardingTask) {
    const overA = a.due_date && a.due_date !== 'TBD' && new Date(a.due_date) < now;
    const overB = b.due_date && b.due_date !== 'TBD' && new Date(b.due_date) < now;
    if (overA && !overB) return -1;
    if (!overA && overB) return 1;
    if (!a.due_date || a.due_date === 'TBD') return 1;
    if (!b.due_date || b.due_date === 'TBD') return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  }

  return [...critical.sort(sortByDue), ...normal.sort(sortByDue)];
}

export function EmpTasks({ tasks, onToggle, onTriageChange, onAddTask }: Props) {
  const [view, setView] = useState<ViewMode>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [localTasks, setLocalTasks] = useState<OnboardingTask[]>(tasks);

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const activeTasks = localTasks.filter(t => !t.archived && t.status !== 'complete');
  const archivedTasks = localTasks.filter(t => t.archived || t.status === 'complete');

  const filtered = filterByView(activeTasks, view);
  const sorted = sortTasks(filtered);

  const criticalCount = activeTasks.filter(t => t.triage === 'critical').length;

  const views: { id: ViewMode; label: string }[] = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All' },
  ];

  async function handleTriageChange(taskId: string, triage: 'critical' | 'normal') {
    await supabase.from('onboarding_tasks').update({ triage }).eq('id', taskId);
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, triage } : t));
    onTriageChange?.(taskId, triage);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Tasks</h1>
          <p>
            {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
            {criticalCount > 0 && <span style={{ color: '#DC2626', fontWeight: 600, marginLeft: 8 }}>· {criticalCount} critical</span>}
          </p>
        </div>
        {onAddTask && (
          <div className="topbar-actions">
            <button className="btn-primary" onClick={onAddTask}>+ Add Task</button>
          </div>
        )}
      </div>
      {onAddTask && (
        <button className="fab" onClick={onAddTask} title="Add task" aria-label="Add task">+</button>
      )}
      <div className="content">
      <div id="emp-tasks-list" className="card">
          <div id="emp-tasks-filter" style={{ display: 'flex', borderBottom: '1px solid #E5E3DC', padding: '0 1.25rem', gap: 4 }}>
            {views.map(v => (
              <button
                key={v.id}
                className={`tab-btn${view === v.id ? ' active' : ''}`}
                onClick={() => setView(v.id)}
              >
                {v.label}
                {v.id !== 'all' && (
                  <span style={{
                    marginLeft: 5, padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: view === v.id ? '#E8EFF8' : '#F2F1ED',
                    color: view === v.id ? '#1B3F6E' : '#9B9890',
                  }}>
                    {filterByView(activeTasks, v.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {sorted.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <p>No tasks in this view</p>
              <div className="esub">Try switching to "All" or check another time range.</div>
            </div>
          ) : sorted.map(t => (
            <TaskCard key={t.id} task={t} isHR={false} onToggle={onToggle} onTriageChange={handleTriageChange} canReopen={false} />
          ))}
        </div>

        {archivedTasks.length > 0 && (
          <div id="emp-tasks-archived" className="card" style={{ marginTop: '1.25rem' }}>
            <button
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6B6860',
              }}
              onClick={() => setShowArchived(s => !s)}
            >
              <span>Completed tasks — {archivedTasks.length}</span>
              <span style={{ fontSize: 12, color: '#9B9890' }}>{showArchived ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showArchived && archivedTasks.map(t => (
              <TaskCard key={t.id} task={t} isHR={false} onToggle={() => {}} canReopen={false} isArchived />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
