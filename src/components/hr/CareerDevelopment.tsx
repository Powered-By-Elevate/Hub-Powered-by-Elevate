import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, Pathway, Checkin, DevelopmentPlan } from '../../lib/database.types';
import { Pencil, X, Save } from 'lucide-react';

const PILLARS = ['Phileo Love', 'Trust', 'Teamwork', 'Big Goal', 'Legacy', 'Identity'];
const PILLAR_COLORS: Record<string, string> = {
  'Phileo Love': '#DC2626',
  'Trust': '#0D9488',
  'Teamwork': '#1B3F6E',
  'Big Goal': '#D97706',
  'Legacy': '#7C3AED',
  'Identity': '#059669',
};
const READINESS_LABELS: Record<string, { short: string; color: string }> = {
  'Ready Now':                { short: 'Ready Now',  color: '#065F46' },
  'Ready in One Year':        { short: '~1 Year',    color: '#1B3F6E' },
  'Ready in 2-3 Years':       { short: '2-3 Years',  color: '#92400E' },
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
  employees: { id: string; name: string; role: string; department: string | null; lastFocus: string; count: number }[];
}

function computePillarHealth(checkins: Checkin[], employees: Employee[]): PillarData[] {
  const empMap = new Map(employees.map(e => [e.id, e]));
  const data: Record<string, { count: number; recent: string | null; empCounts: Record<string, { count: number; last: string }> }> = {};
  for (const p of PILLARS) data[p] = { count: 0, recent: null, empCounts: {} };

  // Include employees with a direct pillar_focus assignment
  for (const emp of employees) {
    if (emp.pillar_focus && data[emp.pillar_focus] !== undefined) {
      if (!data[emp.pillar_focus].empCounts[emp.id]) {
        data[emp.pillar_focus].empCounts[emp.id] = { count: 0, last: '' };
      }
    }
  }

  // Layer in check-in data
  for (const c of checkins) {
    if (c.pillar_focus && data[c.pillar_focus] !== undefined) {
      data[c.pillar_focus].count += 1;
      if (!data[c.pillar_focus].recent || c.checkin_date > data[c.pillar_focus].recent!) {
        data[c.pillar_focus].recent = c.checkin_date;
      }
      if (!data[c.pillar_focus].empCounts[c.employee_id]) {
        data[c.pillar_focus].empCounts[c.employee_id] = { count: 0, last: c.checkin_date };
      }
      data[c.pillar_focus].empCounts[c.employee_id].count += 1;
      if (c.checkin_date > data[c.pillar_focus].empCounts[c.employee_id].last) {
        data[c.pillar_focus].empCounts[c.employee_id].last = c.checkin_date;
      }
    }
  }

  return PILLARS.map(p => ({
    pillar: p,
    count: data[p].count,
    recent: data[p].recent,
    employees: Object.entries(data[p].empCounts)
      .map(([eid, info]) => {
        const emp = empMap.get(eid);
        return { id: eid, name: emp?.name ?? 'Unknown', role: emp?.role ?? '', department: emp?.department ?? null, lastFocus: info.last, count: info.count };
      })
      .sort((a, b) => b.count - a.count),
  }));
}

function fmt(d: string | null | undefined) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  employees: Employee[];
  pathways: Pathway[];
  onViewEmployee: (id: string) => void;
  onRefresh?: () => void;
  readOnly?: boolean;
}

export function CareerDevelopment({ employees, pathways, onViewEmployee, onRefresh, readOnly = false }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pillar' | 'atrisk'>('overview');
  const [allCheckins, setAllCheckins] = useState<Checkin[]>([]);
  const [allPlans, setAllPlans] = useState<DevelopmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ current_level: string; next_level: string; pathway_id: string; readiness_level: string; current_status: string }>({ current_level: '', next_level: '', pathway_id: '', readiness_level: '', current_status: '' });
  const [saving, setSaving] = useState(false);
  const [pillarSearch, setPillarSearch] = useState('');
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

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

  const activeEmps = employees.filter(e => !e.archived && (e.lifecycle_status === 'active' || e.lifecycle_status === 'onboarding'));
  const pathwayName = (id: string | null) => pathways.find(p => p.id === id)?.name ?? '\u2014';

  let filteredEmps = activeEmps;
  if (search) filteredEmps = filteredEmps.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.role ?? '').toLowerCase().includes(search.toLowerCase()) || (e.department ?? '').toLowerCase().includes(search.toLowerCase()));
  if (filterStatus !== 'all') filteredEmps = filteredEmps.filter(e => e.current_status === filterStatus);

  const atRisk = activeEmps.filter(e => e.current_status === 'At Risk' || e.current_status === 'Needs Support');
  const pillarData = computePillarHealth(allCheckins, activeEmps);
  const maxPillarCount = Math.max(...pillarData.map(p => p.count), 1);

  const plansByEmp: Record<string, DevelopmentPlan[]> = {};
  for (const p of allPlans) {
    if (!plansByEmp[p.employee_id]) plansByEmp[p.employee_id] = [];
    plansByEmp[p.employee_id].push(p);
  }

  const withPathway = activeEmps.filter(e => e.pathway_id).length;
  const withLevel = activeEmps.filter(e => e.current_level).length;
  const readyNow = activeEmps.filter(e => e.readiness_level === 'Ready Now').length;
  const atRiskCount = activeEmps.filter(e => e.current_status === 'At Risk').length;

  // Pillar analytics
  const totalCheckins = allCheckins.length;
  const empsWithPillarFocus = new Set(allCheckins.filter(c => c.pillar_focus).map(c => c.employee_id)).size;
  const empsNeverFocused = activeEmps.filter(e => !e.pillar_focus && !allCheckins.some(c => c.employee_id === e.id && c.pillar_focus)).length;

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm({
      current_level: emp.current_level ?? '',
      next_level: emp.next_level ?? '',
      pathway_id: emp.pathway_id ?? '',
      readiness_level: emp.readiness_level ?? '',
      current_status: emp.current_status ?? '',
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);

    const updates: Record<string, unknown> = {
      current_level: editForm.current_level || null,
      next_level: editForm.next_level || null,
      pathway_id: editForm.pathway_id || null,
      readiness_level: editForm.readiness_level || null,
      current_status: editForm.current_status || null,
    };

    let { error } = await supabase.from('employees').update(updates).eq('id', editingId);

    // Fallback: if schema cache rejects, save fields individually
    if (error?.message?.includes('schema cache')) {
      error = null;
      for (const [key, val] of Object.entries(updates)) {
        const res = await supabase.from('employees').update({ [key]: val }).eq('id', editingId);
        if (res.error && !res.error.message.includes('schema cache')) {
          error = res.error;
          break;
        }
      }
    }

    if (!error) {
      setEditingId(null);
      onRefresh?.();
    }
    setSaving(false);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Career Development</h1>
          <p>Level progression, pathways, pillar health, and at-risk employees</p>
        </div>
      </div>
      <div className="content">

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
                <input className="search-input" placeholder="Search by name\u2026" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="On Track">On Track</option>
                  <option value="Needs Support">Needs Support</option>
                  <option value="At Risk">At Risk</option>
                </select>
              </div>

              {loading ? (
                <div className="empty-state"><p>Loading\u2026</p></div>
              ) : filteredEmps.length === 0 ? (
                <div className="empty-state"><p>No employees match</p></div>
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
                      const isEditing = editingId === emp.id;

                      if (isEditing && !readOnly) {
                        return (
                          <tr key={emp.id} style={{ background: '#FAFAF8' }}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: '#9B9890' }}>{emp.role}</div>
                            </td>
                            <td>
                              <input
                                value={editForm.current_level}
                                onChange={e => setEditForm(f => ({ ...f, current_level: e.target.value }))}
                                placeholder="e.g. Level 2"
                                style={{ width: 90, fontSize: 12, padding: '4px 6px', border: '1px solid #E5E3DC', borderRadius: 5 }}
                              />
                            </td>
                            <td>
                              <input
                                value={editForm.next_level}
                                onChange={e => setEditForm(f => ({ ...f, next_level: e.target.value }))}
                                placeholder="e.g. Level 3"
                                style={{ width: 90, fontSize: 12, padding: '4px 6px', border: '1px solid #E5E3DC', borderRadius: 5 }}
                              />
                            </td>
                            <td>
                              <select
                                value={editForm.pathway_id}
                                onChange={e => setEditForm(f => ({ ...f, pathway_id: e.target.value }))}
                                style={{ fontSize: 12, padding: '4px 6px', border: '1px solid #E5E3DC', borderRadius: 5, maxWidth: 130 }}
                              >
                                <option value="">-- None --</option>
                                {pathways.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <select
                                value={editForm.readiness_level}
                                onChange={e => setEditForm(f => ({ ...f, readiness_level: e.target.value }))}
                                style={{ fontSize: 12, padding: '4px 6px', border: '1px solid #E5E3DC', borderRadius: 5, maxWidth: 140 }}
                              >
                                <option value="">-- None --</option>
                                {Object.keys(READINESS_LABELS).map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td>
                              <select
                                value={editForm.current_status}
                                onChange={e => setEditForm(f => ({ ...f, current_status: e.target.value }))}
                                style={{ fontSize: 12, padding: '4px 6px', border: '1px solid #E5E3DC', borderRadius: 5 }}
                              >
                                <option value="">-- None --</option>
                                <option value="On Track">On Track</option>
                                <option value="Needs Support">Needs Support</option>
                                <option value="At Risk">At Risk</option>
                              </select>
                            </td>
                            <td style={{ fontSize: 13, color: '#9B9890' }}>{openPlans > 0 ? openPlans : '\u2014'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-ghost sm" onClick={saveEdit} disabled={saving} style={{ color: '#065F46' }}>
                                  <Save size={14} />
                                </button>
                                <button className="btn-ghost sm" onClick={() => setEditingId(null)} style={{ color: '#991B1B' }}>
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={emp.id} className="tr-click" onClick={() => onViewEmployee(emp.id)}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: '#9B9890' }}>{emp.role}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1B3F6E' }}>{emp.current_level ?? '\u2014'}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: '#6B6860' }}>{emp.next_level ?? '\u2014'}</span>
                          </td>
                          <td style={{ fontSize: 12, color: '#1A1916' }}>{emp.pathway_id ? pathwayName(emp.pathway_id) : '\u2014'}</td>
                          <td>
                            {readyInfo ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: readyInfo.color + '22', color: readyInfo.color }}>{readyInfo.short}</span>
                            ) : <span style={{ color: '#9B9890', fontSize: 12 }}>{'\u2014'}</span>}
                          </td>
                          <td>
                            {statusStyle ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: statusStyle.bg, color: statusStyle.color }}>{emp.current_status}</span>
                            ) : <span style={{ color: '#9B9890', fontSize: 12 }}>{'\u2014'}</span>}
                          </td>
                          <td style={{ fontSize: 13, color: openPlans > 0 ? '#1B3F6E' : '#9B9890', fontWeight: openPlans > 0 ? 700 : 400 }}>
                            {openPlans > 0 ? openPlans : '\u2014'}
                          </td>
                          <td onClick={ev => ev.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn-ghost sm" onClick={() => onViewEmployee(emp.id)}>View</button>
                              {!readOnly && (
                                <button className="btn-ghost sm" onClick={() => startEdit(emp)} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Pencil size={12} /> Edit
                                </button>
                              )}
                            </div>
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
              {/* Pillar analytics summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#F8F7F4', border: '1px solid #E5E3DC', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 4 }}>Total Check-ins</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1B3F6E' }}>{totalCheckins}</div>
                  <div style={{ fontSize: 11, color: '#9B9890', marginTop: 2 }}>with pillar focus data</div>
                </div>
                <div style={{ background: '#F8F7F4', border: '1px solid #E5E3DC', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 4 }}>Employees Engaged</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0D9488' }}>{empsWithPillarFocus}</div>
                  <div style={{ fontSize: 11, color: '#9B9890', marginTop: 2 }}>of {activeEmps.length} active employees</div>
                </div>
                <div style={{ background: '#F8F7F4', border: '1px solid #E5E3DC', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 4 }}>No Pillar Focus</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: empsNeverFocused > 0 ? '#DC2626' : '#065F46' }}>{empsNeverFocused}</div>
                  <div style={{ fontSize: 11, color: '#9B9890', marginTop: 2 }}>employees never focused</div>
                </div>
              </div>

              {/* Pillar distribution bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 8 }}>Focus Distribution</div>
                <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E3DC' }}>
                  {pillarData.filter(p => p.count > 0).map(p => {
                    const pct = (p.count / totalCheckins) * 100;
                    return (
                      <div
                        key={p.pillar}
                        style={{ width: pct + '%', background: PILLAR_COLORS[p.pillar], display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: pct > 8 ? undefined : 0 }}
                        title={`${p.pillar}: ${p.count} (${Math.round(pct)}%)`}
                      >
                        {pct > 12 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.pillar}</span>}
                      </div>
                    );
                  })}
                  {totalCheckins === 0 && <div style={{ width: '100%', background: '#F2F1ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11, color: '#9B9890' }}>No data yet</span></div>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                  {PILLARS.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B6860' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: PILLAR_COLORS[p] }} />
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual pillar cards with employee breakdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>Pillar Breakdown</div>
                <input
                  className="search-input"
                  placeholder="Search employees\u2026"
                  value={pillarSearch}
                  onChange={e => setPillarSearch(e.target.value)}
                  style={{ maxWidth: 180, fontSize: 12 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {pillarData.map(({ pillar, count, recent, employees: empList }) => {
                  const pct = Math.round((count / maxPillarCount) * 100);
                  const isExpanded = expandedPillar === pillar;
                  const filteredEmpList = pillarSearch
                    ? empList.filter(e => e.name.toLowerCase().includes(pillarSearch.toLowerCase()))
                    : empList;
                  return (
                    <div key={pillar} style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 12, overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: isExpanded ? '0 2px 12px rgba(0,0,0,0.06)' : 'none' }}>
                      <div
                        style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #E5E3DC' : 'none' }}
                        onClick={() => setExpandedPillar(isExpanded ? null : pillar)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: PILLAR_COLORS[pillar] }} />
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1916' }}>{pillar}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1B3F6E', background: '#E8EFF8', padding: '2px 8px', borderRadius: 8 }}>
                            {count} focus{count !== 1 ? 'es' : ''}
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#F2F1ED', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: pct + '%', background: PILLAR_COLORS[pillar], borderRadius: 3, transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 11, color: '#9B9890' }}>
                            {count > 0 ? `Last: ${fmt(recent)}` : 'No check-ins yet'}
                          </div>
                          <div style={{ fontSize: 11, color: '#9B9890' }}>
                            {empList.length} employee{empList.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 16px 14px', maxHeight: 220, overflowY: 'auto' }}>
                          {filteredEmpList.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#9B9890', padding: '12px 0' }}>
                              {pillarSearch ? 'No matching employees' : 'No employees have focused on this pillar yet.'}
                            </div>
                          ) : (
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #F2F1ED' }}>
                                  <th style={{ textAlign: 'left', padding: '8px 0 6px', fontWeight: 600, color: '#9B9890', fontSize: 10 }}>Employee</th>
                                  <th style={{ textAlign: 'left', padding: '8px 0 6px', fontWeight: 600, color: '#9B9890', fontSize: 10 }}>Dept</th>
                                  <th style={{ textAlign: 'center', padding: '8px 0 6px', fontWeight: 600, color: '#9B9890', fontSize: 10 }}>Focuses</th>
                                  <th style={{ textAlign: 'right', padding: '8px 0 6px', fontWeight: 600, color: '#9B9890', fontSize: 10 }}>Last</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredEmpList.map(emp => (
                                  <tr
                                    key={emp.id}
                                    style={{ borderBottom: '1px solid #F8F7F4', cursor: 'pointer' }}
                                    onClick={() => onViewEmployee(emp.id)}
                                  >
                                    <td style={{ padding: '6px 0', fontWeight: 500, color: '#1A1916' }}>{emp.name}</td>
                                    <td style={{ padding: '6px 0', color: '#6B6860' }}>{emp.department ?? '\u2014'}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'center', fontWeight: 700, color: PILLAR_COLORS[pillar] }}>{emp.count}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#9B9890', fontSize: 11 }}>{fmt(emp.lastFocus)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Employees with no pillar focus */}
              {empsNeverFocused > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 10 }}>
                    Employees Without Pillar Focus ({empsNeverFocused})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeEmps
                      .filter(e => !e.pillar_focus && !allCheckins.some(c => c.employee_id === e.id && c.pillar_focus))
                      .slice(0, 20)
                      .map(emp => (
                        <div
                          key={emp.id}
                          onClick={() => onViewEmployee(emp.id)}
                          style={{ padding: '6px 12px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#92400E', cursor: 'pointer', transition: 'background 0.15s' }}
                        >
                          {emp.name}
                        </div>
                      ))}
                    {empsNeverFocused > 20 && (
                      <div style={{ padding: '6px 12px', fontSize: 12, color: '#9B9890' }}>+{empsNeverFocused - 20} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* At-Risk tab */}
          {activeTab === 'atrisk' && (
            <div>
              {atRisk.length === 0 ? (
                <div className="empty-state">
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
                          <td style={{ fontSize: 12, color: '#6B6860' }}>{emp.department ?? '\u2014'}</td>
                          <td style={{ fontSize: 12 }}>{emp.pathway_id ? pathwayName(emp.pathway_id) : '\u2014'}</td>
                          <td style={{ fontSize: 12, color: lastCheckin ? '#1A1916' : '#9B9890' }}>{fmt(lastCheckin)}</td>
                          <td style={{ fontSize: 13, color: openPlans > 0 ? '#1B3F6E' : '#9B9890', fontWeight: openPlans > 0 ? 700 : 400 }}>
                            {openPlans > 0 ? openPlans : '\u2014'}
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
