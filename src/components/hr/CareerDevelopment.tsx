import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, Pathway, Checkin, DevelopmentPlan } from '../../lib/database.types';

const PILLARS = ['Phileo Love', 'Trust', 'Teamwork', 'Big Goal', 'Legacy', 'Identity'];
const READINESS_LABELS: Record<string, { short: string; color: string }> = {
  'Ready Now':                { short: 'Ready Now',  color: '#065F46' },
  'Ready in One Year':        { short: '~1 Year',    color: '#1B3F6E' },
  'Ready in 2-3 Years':       { short: '2–3 Years',  color: '#92400E' },
  'Longer Term Development Needed': { short: 'Long Term', color: '#6B6860' },
};
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'On Track':     { bg: '#D1FAE5', color: '#065F46' },
  'Needs Support':{ bg: '#FEF3C7', color: '#92400E' },
  'At Risk':      { bg: '#FEE2E2', color: '#991B1B' },
};

interface PillarData {
  pillar: string;
  count: number;
  recent: string | null;
}

function computePillarHealth(checkins: Checkin[]): PillarData[] {
  const data: Record<string, { count: number; recent: string | null }> = {};
  for (const p of PILLARS) data[p] = { count: 0, recent: null };
  for (const c of checkins) {
    if (c.pillar_focus && data[c.pillar_focus] !== undefined) {
      data[c.pillar_focus].count += 1;
      if (!data[c.pillar_focus].recent || c.checkin_date > data[c.pillar_focus].recent!) {
        data[c.pillar_focus].recent = c.checkin_date;
      }
    }
  }
  return PILLARS.map(p => ({ pillar: p, ...data[p] }));
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  employees: Employee[];
  pathways: Pathway[];
  onViewEmployee: (id: string) => void;
}

export function CareerDevelopment({ employees, pathways, onViewEmployee }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pillar' | 'atrisk'>('overview');
  const [allCheckins, setAllCheckins] = useState<Checkin[]>([]);
  const [allPlans, setAllPlans] = useState<DevelopmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: checkins }, { data: plans }] = await Promise.all([
      supabase.from('checkins').select('*').order('checkin_date', { ascending: false }),
      supabase.from('development_plans').select('*').order('created_at'),
    ]);
    setAllCheckins(checkins ?? []);
    setAllPlans(plans ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeEmps = employees.filter(e => !e.archived);
  const pathwayName = (id: string | null) => pathways.find(p => p.id === id)?.name ?? '—';

  // Filtering for overview table
  let filteredEmps = activeEmps;
  if (search) filteredEmps = filteredEmps.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.role ?? '').toLowerCase().includes(search.toLowerCase()) || (e.department ?? '').toLowerCase().includes(search.toLowerCase()));
  if (filterStatus !== 'all') filteredEmps = filteredEmps.filter(e => e.current_status === filterStatus);

  const atRisk = activeEmps.filter(e => e.current_status === 'At Risk' || e.current_status === 'Needs Support');
  const pillarData = computePillarHealth(allCheckins);
  const maxPillarCount = Math.max(...pillarData.map(p => p.count), 1);

  // Plans summary per employee
  const plansByEmp: Record<string, DevelopmentPlan[]> = {};
  for (const p of allPlans) {
    if (!plansByEmp[p.employee_id]) plansByEmp[p.employee_id] = [];
    plansByEmp[p.employee_id].push(p);
  }

  // Summary stats
  const withPathway = activeEmps.filter(e => e.pathway_id).length;
  const withLevel = activeEmps.filter(e => e.current_level).length;
  const readyNow = activeEmps.filter(e => e.readiness_level === 'Ready Now').length;
  const atRiskCount = activeEmps.filter(e => e.current_status === 'At Risk').length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Career Development</h1>
          <p>Level progression, pathways, pillar health, and at-risk employees</p>
        </div>
      </div>
      <div className="content">

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            ['On a Pathway', withPathway, activeEmps.length, '#1B3F6E', '#E8EFF8'],
            ['Level Assigned', withLevel, activeEmps.length, '#0D9488', '#CCFBF1'],
            ['Ready Now', readyNow, activeEmps.length, '#2D9A60', '#D1FAE5'],
            ['At Risk', atRiskCount, activeEmps.length, '#DC2626', '#FEE2E2'],
          ].map(([label, val, total, color, bg]) => (
            <div key={label as string} style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: color as string, lineHeight: 1 }}>{val as number}</div>
              <div style={{ fontSize: 11, color: '#9B9890', marginTop: 4 }}>of {total as number} active</div>
              <div style={{ marginTop: 8, height: 4, background: '#F2F1ED', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (total as number) > 0 ? Math.round(((val as number) / (total as number)) * 100) + '%' : '0%', background: bg as string, borderRadius: 2, borderLeft: `2px solid ${color as string}` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E3DC' }}>
            {(['overview', 'pillar', 'atrisk'] as const).map(t => (
              <button
                key={t}
                className={`tab-btn${activeTab === t ? ' active' : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t === 'overview' ? 'Level & Pathway Overview' : t === 'pillar' ? 'Pillar Health' : `At-Risk Employees ${atRisk.length > 0 ? `(${atRisk.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              <div className="filter-bar">
                <input className="search-input" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
                <span className="divider-label">Status:</span>
                {['all', 'On Track', 'Needs Support', 'At Risk'].map(s => (
                  <button key={s} className={`filter-chip${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>{s === 'all' ? 'All' : s}</button>
                ))}
              </div>

              {loading ? (
                <div className="empty-state"><p>Loading…</p></div>
              ) : filteredEmps.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🔍</div><p>No employees match</p></div>
              ) : (
                <table className="emp-list-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Current Level</th>
                      <th>Next Level</th>
                      <th>Pathway</th>
                      <th>Readiness</th>
                      <th>Status</th>
                      <th>Open Goals</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmps.map(emp => {
                      const plans = plansByEmp[emp.id] ?? [];
                      const openPlans = plans.filter(p => p.status !== 'Completed').length;
                      const readyInfo = READINESS_LABELS[emp.readiness_level ?? ''];
                      const statusStyle = STATUS_STYLES[emp.current_status ?? ''];
                      return (
                        <tr key={emp.id} className="tr-click" onClick={() => onViewEmployee(emp.id)}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: '#9B9890' }}>{emp.role}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1B3F6E' }}>{emp.current_level ?? '—'}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: '#6B6860' }}>{emp.next_level ?? '—'}</span>
                          </td>
                          <td style={{ fontSize: 12, color: '#1A1916' }}>{emp.pathway_id ? pathwayName(emp.pathway_id) : '—'}</td>
                          <td>
                            {readyInfo ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: readyInfo.color + '22', color: readyInfo.color }}>{readyInfo.short}</span>
                            ) : <span style={{ color: '#9B9890', fontSize: 12 }}>—</span>}
                          </td>
                          <td>
                            {statusStyle ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: statusStyle.bg, color: statusStyle.color }}>{emp.current_status}</span>
                            ) : <span style={{ color: '#9B9890', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ fontSize: 13, color: openPlans > 0 ? '#1B3F6E' : '#9B9890', fontWeight: openPlans > 0 ? 700 : 400 }}>
                            {openPlans > 0 ? openPlans : '—'}
                          </td>
                          <td onClick={ev => ev.stopPropagation()}>
                            <button className="btn-ghost sm" onClick={() => onViewEmployee(emp.id)}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Pillar Health tab */}
          {activeTab === 'pillar' && (
            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: 16, fontSize: 13, color: '#6B6860' }}>
                Based on {allCheckins.length} check-in{allCheckins.length !== 1 ? 's' : ''} across all active employees.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {pillarData.map(({ pillar, count, recent }) => {
                  const pct = Math.round((count / maxPillarCount) * 100);
                  return (
                    <div key={pillar} style={{ background: '#FAFAF8', border: '1px solid #E5E3DC', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1916' }}>{pillar}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1B3F6E', background: '#E8EFF8', padding: '2px 8px', borderRadius: 8 }}>
                          {count} focus{count !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#E5E3DC', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ height: '100%', width: pct + '%', background: count > 0 ? '#1B3F6E' : '#E5E3DC', borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9890' }}>
                        {count > 0 ? `Last focus: ${fmt(recent)}` : 'No check-ins focused on this pillar'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* At-Risk tab */}
          {activeTab === 'atrisk' && (
            <div>
              {atRisk.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p>No at-risk employees</p>
                  <div className="esub">All active employees are currently on track or unassigned.</div>
                </div>
              ) : (
                <table className="emp-list-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Pathway</th>
                      <th>Last Check-in</th>
                      <th>Open Goals</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.map(emp => {
                      const empCheckins = allCheckins.filter(c => c.employee_id === emp.id);
                      const lastCheckin = empCheckins[0]?.checkin_date ?? null;
                      const plans = plansByEmp[emp.id] ?? [];
                      const openPlans = plans.filter(p => p.status !== 'Completed').length;
                      const statusStyle = STATUS_STYLES[emp.current_status ?? ''];
                      return (
                        <tr key={emp.id} className="tr-click" onClick={() => onViewEmployee(emp.id)}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: '#9B9890' }}>{emp.role}</div>
                          </td>
                          <td>
                            {statusStyle && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: statusStyle.bg, color: statusStyle.color }}>
                                {emp.current_status}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: '#6B6860' }}>{emp.department ?? '—'}</td>
                          <td style={{ fontSize: 12 }}>{emp.pathway_id ? pathwayName(emp.pathway_id) : '—'}</td>
                          <td style={{ fontSize: 12, color: lastCheckin ? '#1A1916' : '#9B9890' }}>{fmt(lastCheckin)}</td>
                          <td style={{ fontSize: 13, color: openPlans > 0 ? '#1B3F6E' : '#9B9890', fontWeight: openPlans > 0 ? 700 : 400 }}>
                            {openPlans > 0 ? openPlans : '—'}
                          </td>
                          <td onClick={ev => ev.stopPropagation()}>
                            <button className="btn-ghost sm" onClick={() => onViewEmployee(emp.id)}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
