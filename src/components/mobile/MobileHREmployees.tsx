import { useState } from 'react';
import { Employee } from '../../lib/database.types';

interface MobileHREmployeesProps {
  employees: Employee[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarClass(status: string) {
  if (status === 'complete') return 'm-av-green';
  if (status === 'overdue') return 'm-av-red';
  return 'm-av-navy';
}

function badgeClass(status: string) {
  if (status === 'complete') return 'm-badge-green';
  if (status === 'overdue') return 'm-badge-red';
  if (status === 'in-progress' || status === 'in_progress') return 'm-badge-navy';
  return 'm-badge-muted';
}

function badgeLabel(status: string) {
  const map: Record<string, string> = {
    complete: 'Complete', 'in-progress': 'In Progress', in_progress: 'In Progress',
    overdue: 'Overdue', 'not-started': 'Not Started', not_started: 'Not Started',
  };
  return map[status] || status;
}

function progClass(status: string) {
  if (status === 'complete') return 'm-prog-green';
  if (status === 'overdue') return 'm-prog-red';
  return 'm-prog-navy';
}

const STATUS_FILTERS = ['All', 'In Progress', 'Complete', 'Overdue', 'Not Started'];

export function MobileHREmployees({ employees, onView, onEdit }: MobileHREmployeesProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const active = employees.filter(e => !e.archived);
  const archived = employees.filter(e => e.archived);
  const pool = tab === 'active' ? active : archived;

  const filtered = pool.filter(e => {
    const matchSearch = !search || [e.name, e.email, e.role, e.department].some(
      f => f?.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === 'All' || badgeLabel(e.status).toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  return (
    <div className="m-screen">
      <input
        className="m-search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, role, or dept…"
      />

      <div style={{ display: 'flex', borderBottom: '1px solid #E5E3DC', marginBottom: 12 }}>
        {(['active', 'archived'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? '#1B3F6E' : '#9B9890',
              borderBottom: tab === t ? '2px solid #1B3F6E' : '2px solid transparent',
            }}
          >
            {t === 'active' ? `Active ${active.length}` : `Archived ${archived.length}`}
          </button>
        ))}
      </div>

      <div className="m-chips">
        {STATUS_FILTERS.map(f => (
          <div key={f} className={`m-chip${statusFilter === f ? ' m-chip-active' : ''}`} onClick={() => setStatusFilter(f)}>{f}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">🔍</div>
          <div className="m-empty-text">No employees match your filters</div>
          <div className="m-empty-sub">Try adjusting the search or filters above</div>
        </div>
      ) : (
        filtered.map(emp => (
          <div key={emp.id} className="m-emp-card">
            <div className="m-emp-row1">
              <div className={`m-avatar ${avatarClass(emp.status)}`}>{initials(emp.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="m-emp-name">{emp.name}</div>
                <div className="m-emp-role">{emp.role}</div>
              </div>
              <div className={`m-badge ${badgeClass(emp.status)}`}>
                <span className="m-badge-dot" />
                {badgeLabel(emp.status)}
              </div>
            </div>
            <div className="m-emp-details">
              {[emp.department, emp.start_date && new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })].filter(Boolean).join(' · ')}
            </div>
            <div className="m-prog-wrap">
              <div className="m-prog-track">
                <div className={`m-prog-fill ${progClass(emp.status)}`} style={{ width: `${emp.progress || 0}%` }} />
              </div>
              <div className="m-prog-pct">{emp.progress || 0}% complete</div>
            </div>
            <div className="m-emp-actions">
              <button className="m-btn" onClick={() => onView(emp.id)}>View</button>
              <button className="m-btn" onClick={() => onEdit(emp.id)}>Edit</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
