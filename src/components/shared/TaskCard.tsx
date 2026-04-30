import { OnboardingTask } from '../../lib/database.types';
import { CatPill } from './CatPill';
import { supabase } from '../../lib/supabase';

interface Props {
  task: OnboardingTask;
  isHR: boolean;
  onToggle: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onTriageChange?: (taskId: string, triage: 'critical' | 'normal') => void;
  onReopen?: (taskId: string) => void;
  canReopen: boolean;
  isArchived?: boolean;
}

function daysOverdue(dueDate: string): number {
  if (!dueDate || dueDate === 'TBD') return 0;
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(dueDate);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function TaskCard({ task, isHR, onToggle, onStatusChange, onTriageChange, onReopen, canReopen, isArchived }: Props) {
  const done = task.status === 'complete' || !!task.archived;
  const isCritical = task.triage === 'critical' && !done;
  const over = task.status === 'overdue' || (!done && task.due_date && task.due_date !== 'TBD' && new Date(task.due_date) < new Date());
  const overdueDays = over && task.due_date ? daysOverdue(task.due_date) : 0;

  async function toggleTriage() {
    if (!isHR || isArchived) return;
    const newTriage = task.triage === 'critical' ? 'normal' : 'critical';
    await supabase.from('onboarding_tasks').update({ triage: newTriage }).eq('id', task.id);
    onTriageChange?.(task.id, newTriage);
  }

  return (
    <div
      className={`task-card${done ? ' task-done' : ''}${over ? ' task-over' : ''}${isCritical ? ' task-critical' : ''}`}
      style={isCritical ? { borderLeft: '3px solid #DC2626' } : undefined}
    >
      {/* Mobile triage strip */}
      <div className="task-card-strip" />

      {!isArchived && (
        <button
          className={`check-box-btn${done ? ' checked' : ''}`}
          style={{ marginTop: 2, flexShrink: 0 }}
          onClick={() => onToggle(task.id)}
        >
          {done ? '✓' : ''}
        </button>
      )}
      {isArchived && (
        <div className="check-box-btn checked" style={{ marginTop: 2, flexShrink: 0, cursor: 'default' }}>✓</div>
      )}

      <div className="task-body-mobile" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          {isCritical && (
            <span style={{ fontSize: 13, color: '#DC2626', flexShrink: 0, marginTop: 1 }}>‼</span>
          )}
          <span className={`check-title${done ? ' done' : ''}`} style={{ flex: 1, minWidth: 0 }}>{task.title}</span>
          {isCritical && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
              background: '#FEE2E2', color: '#DC2626', flexShrink: 0,
            }}>CRITICAL</span>
          )}
        </div>

        <div className="check-meta" style={{ marginTop: 6 }}>
          {over && overdueDays > 0 ? (
            <span className="due-overdue" style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {overdueDays}d overdue
            </span>
          ) : (
            <span className="due-label">Due {task.due_date || 'TBD'}</span>
          )}
          <CatPill cat={task.category} />
          {task.assigned_by_name && (
            <span style={{ fontSize: 11, color: '#9B9890' }}>by {task.assigned_by_name}</span>
          )}
        </div>

        {task.notes && (
          <div style={{ fontSize: 11, color: '#6B6860', marginTop: 4, lineHeight: 1.5 }}>{task.notes}</div>
        )}

        {isArchived && task.completed_at && (
          <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>
            Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
        {isHR && !isArchived && (
          <button
            onClick={toggleTriage}
            title={isCritical ? 'Mark as normal' : 'Mark as critical'}
            style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, cursor: 'pointer',
              border: isCritical ? '1.5px solid #FECACA' : '1.5px solid #E5E3DC',
              background: isCritical ? '#FEF2F2' : '#F8F7F4',
              color: isCritical ? '#DC2626' : '#9B9890',
            }}
          >
            {isCritical ? '‼ Critical' : 'Normal'}
          </button>
        )}
        {isHR && onStatusChange && !isArchived && (
          <select
            style={{ fontSize: 11, padding: '5px 8px', border: '1.5px solid #E5E3DC', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#1A1916' }}
            value={task.status}
            onChange={e => onStatusChange(task.id, e.target.value)}
          >
            <option value="pending">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="overdue">Overdue</option>
          </select>
        )}
        {isHR && canReopen && isArchived && onReopen && (
          <button className="btn-ghost sm" style={{ fontSize: 11 }} onClick={() => onReopen(task.id)}>Reopen</button>
        )}
      </div>
    </div>
  );
}
