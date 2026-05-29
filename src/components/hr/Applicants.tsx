import { useState } from 'react';
import { Employee } from '../../lib/database.types';
import { EmployeeAvatar } from '../shared/EmployeeAvatar';
import { Pencil, Plus, Search } from 'lucide-react';
import {
  APPLICANT_PHASES,
  APPLICANT_STAGES_BY_PHASE,
  PHASE_COLORS,
  phaseForStage,
} from '../../lib/applicantStages';

interface Props {
  employees: Employee[];
  onAddApplicant?: () => void;
  onEditApplicant?: (id: string) => void;
  onConvertApplicant?: (id: string) => void;
  onViewApplicant: (id: string) => void;
  readOnly?: boolean;
}

export function HRApplicants({ employees, onAddApplicant, onEditApplicant, onConvertApplicant, onViewApplicant, readOnly = false }: Props) {
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  const allApplicants = employees.filter(e => !e.archived && e.lifecycle_status === 'applicant');

  let filtered = allApplicants;
  if (!showClosed) {
    filtered = filtered.filter(a => phaseForStage(a.applicant_stage) !== 'Closed');
  }
  if (phaseFilter !== 'all') {
    filtered = filtered.filter(a => phaseForStage(a.applicant_stage) === phaseFilter);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.position_applied_for ?? '').toLowerCase().includes(q)
    );
  }

  // Phase counts (for stat cards)
  const phaseCounts: Record<string, number> = {};
  for (const a of allApplicants) {
    const phase = phaseForStage(a.applicant_stage) ?? 'Screening';
    phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
  }

  function hiringManagerName(id: string | null) {
    if (!id) return '—';
    return employees.find(e => e.id === id)?.name ?? '—';
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Applicants</h1>
          <p>Track candidates through the hiring pipeline</p>
        </div>
        <div className="topbar-actions">
          {!readOnly && onAddApplicant && (
            <button className="btn-primary" onClick={onAddApplicant}>
              <Plus size={14} style={{ marginRight: 4 }} /> Add Applicant
            </button>
          )}
        </div>
      </div>
      <div className="content">
        {/* Stat cards by phase */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          {APPLICANT_PHASES.map(phase => (
            <div key={phase} className="stat-card">
              <div className="stat-label">{phase}</div>
              <div className="stat-value c-navy">{phaseCounts[phase] ?? 0}</div>
              <div className="stat-sub">{phase === 'Closed' ? 'Did not move forward' : 'In progress'}</div>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="card mb2">
          <div style={{ display: 'flex', gap: 12, padding: '12px 16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B9890', pointerEvents: 'none' }} />
              <input
                className="search-input"
                style={{ width: '100%', paddingLeft: 34 }}
                placeholder="Search by name, email, or position…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} style={{ minWidth: 160 }}>
              <option value="all">All phases</option>
              {APPLICANT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B6860', cursor: 'pointer' }}>
              <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
              Show closed
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No applicants {phaseFilter !== 'all' ? `in ${phaseFilter}` : ''}{search ? ` matching "${search}"` : ''}</p>
              <div className="esub">Click "Add Applicant" to start tracking a candidate.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Position</th>
                  <th>Phase</th>
                  <th>Stage</th>
                  <th>Hiring Manager</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const phase = phaseForStage(a.applicant_stage);
                  const phaseStyle = phase ? PHASE_COLORS[phase] : null;
                  const canConvert = phase === 'Verification' || a.applicant_stage === 'Offer Letter Accepted';
                  return (
                    <tr key={a.id} className="tr-click" onClick={() => onViewApplicant(a.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <EmployeeAvatar email={a.email} name={a.name} size={32} className="av-navy" />
                          <div>
                            <div className="emp-name">{a.name}</div>
                            <div className="emp-email">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{a.position_applied_for ?? '—'}</td>
                      <td>
                        {phaseStyle ? (
                          <span style={{ padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: phaseStyle.bg, color: phaseStyle.color }}>
                            {phase}
                          </span>
                        ) : <span style={{ color: '#C5C3BB', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: '#1A1916' }}>{a.applicant_stage ?? '—'}</td>
                      <td style={{ fontSize: 12, color: '#6B6860' }}>{hiringManagerName(a.hiring_manager_id)}</td>
                      <td style={{ fontSize: 12, color: '#6B6860' }}>{a.applicant_source ?? '—'}</td>
                      <td onClick={ev => ev.stopPropagation()}>
                        {readOnly ? (
                          <span style={{ fontSize: 11, color: '#9B9890', fontStyle: 'italic' }}>Read only</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {onEditApplicant && (
                              <button className="btn-ghost sm" onClick={() => onEditApplicant(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Pencil size={11} /> Edit
                              </button>
                            )}
                            {canConvert && onConvertApplicant && (
                              <button className="btn-primary sm" onClick={() => onConvertApplicant(a.id)}>
                                Convert to Onboarding
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reference: which stage belongs to which phase (helpful for HR) */}
      <div className="content" style={{ paddingTop: 0 }}>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#9B9890', padding: '8px 4px' }}>
            Reference: applicant stages by phase
          </summary>
          <div style={{ padding: '8px 16px', background: '#FAFAF8', borderRadius: 6, fontSize: 12, color: '#6B6860', marginTop: 4 }}>
            {APPLICANT_PHASES.map(phase => (
              <div key={phase} style={{ marginBottom: 4 }}>
                <strong>{phase}:</strong> {APPLICANT_STAGES_BY_PHASE[phase].join(' · ')}
              </div>
            ))}
          </div>
        </details>
      </div>
    </>
  );
}