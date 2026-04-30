import type { OnboardingTask } from '../../lib/database.types';
import { CatPill } from './CatPill';

interface Props {
  task: OnboardingTask;
  isHR: boolean;
  onToggle: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
}

export function CheckItem({ task, isHR, onToggle, onStatusChange }: Props) {
  const done = task.status === 'complete';
  const over = task.status === 'overdue';
  return (
    <div className="check-item">
      <button
        className={`check-box-btn${done ? ' checked' : ''}`}
        onClick={() => onToggle(task.id)}
      >
        {done ? '✓' : ''}
      </button>
      <div className="check-body">
        <div className={`check-title${done ? ' done' : ''}`}>{task.title}</div>
        <div className="check-meta">
          <span className={`due-label${over ? ' due-overdue' : ''}`}>Due {task.due_date || 'TBD'}</span>
          <CatPill cat={task.category} />
          {over && <span className="badge b-danger" style={{ fontSize: 10, padding: '2px 7px' }}>Overdue</span>}
          {task.required && <span className="badge b-muted" style={{ fontSize: 10, padding: '2px 7px' }}>Required</span>}
        </div>
        {task.notes && <div className="check-note">📍 {task.notes}</div>}
      </div>
      {isHR && onStatusChange && (
        <select
          style={{ fontSize: 11, padding: '5px 8px', border: '1.5px solid #E5E3DC', borderRadius: 7, cursor: 'pointer', background: '#fff', color: '#1A1916', flexShrink: 0 }}
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
        >
          <option value="pending">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="complete">Complete</option>
          <option value="overdue">Overdue</option>
        </select>
      )}
    </div>
  );
}
