export function ini(name: string): string {
  return name.trim().split(' ').map(x => x[0]?.toUpperCase() ?? '').join('');
}

export function pfColor(pct: number, status: string): string {
  if (pct >= 80) return 'pf-green';
  if (status === 'overdue') return 'pf-red';
  return 'pf-navy';
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    complete: 'b-success',
    'in-progress': 'b-navy',
    overdue: 'b-danger',
    'not-started': 'b-muted',
    pending: 'b-muted',
  };
  return map[status] ?? 'b-muted';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    complete: 'Complete',
    'in-progress': 'In Progress',
    overdue: 'Overdue',
    'not-started': 'Not Started',
    pending: 'Not Started',
  };
  return map[status] ?? status;
}

export function catColor(cat: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    document: { bg: '#E8EFF8', color: '#1B3F6E', label: 'Document' },
    training: { bg: '#E8F7EF', color: '#2D9A60', label: 'Training' },
    form: { bg: '#FEF3C7', color: '#B45309', label: 'Form' },
    meeting: { bg: '#E0F2FE', color: '#0369A1', label: 'Meeting' },
    task: { bg: '#F2F1ED', color: '#6B6860', label: 'Task' },
    personal: { bg: '#FCE7F3', color: '#9D174D', label: 'Personal' },
    other: { bg: '#F2F1ED', color: '#6B6860', label: 'Other' },
  };
  return map[cat] ?? { bg: '#F2F1ED', color: '#6B6860', label: cat };
}

export function priorityColor(priority: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    high:   { color: '#DC2626', label: 'High' },
    medium: { color: '#D97706', label: 'Med' },
    low:    { color: '#9B9890', label: 'Low' },
  };
  return map[priority] ?? { color: '#9B9890', label: priority };
}

export function checkinStatusClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'b-success',
    pending: 'b-navy',
    overdue: 'b-danger',
  };
  return map[status] ?? 'b-muted';
}

export function reviewStatusClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'b-success',
    'in-progress': 'b-navy',
    pending: 'b-muted',
    overdue: 'b-danger',
  };
  return map[status] ?? 'b-muted';
}

export function computeProgress(tasks: { status: string }[]): { pct: number; status: string } {
  if (!tasks.length) return { pct: 0, status: 'not-started' };
  const done = tasks.filter(t => t.status === 'complete').length;
  const pct = Math.round((done / tasks.length) * 100);
  let status = 'not-started';
  if (tasks.every(t => t.status === 'complete')) status = 'complete';
  else if (tasks.some(t => t.status === 'overdue')) status = 'overdue';
  else if (tasks.some(t => t.status === 'in-progress')) status = 'in-progress';
  else if (done > 0) status = 'in-progress';
  return { pct, status };
}

export function dayLabel(d: number): string {
  if (d === 1) return 'Day 1';
  if (d < 8) return 'Day ' + d;
  if (d < 30) return 'Week ' + Math.round(d / 7);
  if (d === 30) return 'Day 30';
  if (d === 60) return 'Day 60';
  if (d === 90) return 'Day 90';
  return 'Day ' + d;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Formats a Postgres TIME value ("HH:MM" or "HH:MM:SS") into "9:00 AM" style.
export function formatTime12h(t: string | null | undefined): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  if (Number.isNaN(h)) return '';
  const meridian = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${meridian}`;
}

// Best display string for a schedule row: prefer parsed start_time, fall back to legacy time_label.
export function formatScheduleTime(s: { start_time?: string | null; time_label?: string | null }): string {
  if (s.start_time) return formatTime12h(s.start_time);
  return s.time_label ?? '';
}

// Stable sort key for schedule rows: undated rows last, then by start_time, then by label as tiebreaker.
export function scheduleSortKey(s: { schedule_date?: string | null; start_time?: string | null; time_label?: string | null }): string {
  const date = s.schedule_date ?? '9999-99-99';
  const time = s.start_time ?? '99:99';
  return `${date}|${time}|${s.time_label ?? ''}`;
}

// Pretty header like "Wed, May 6" from a YYYY-MM-DD string. Avoids timezone shift.
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
