import { useState, useRef, useEffect } from 'react';
import { Employee, Company } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { ChevronDown } from 'lucide-react';

interface Props {
  employees: Employee[];
  companies: Company[];
  departments: string[];
  onViewEmployee: (id: string) => void;
  onOpenModal: (type: string, eid?: string) => void;
  onRestoreEmployee: (id: string) => void;
  onEditEmployee: (id: string) => void;
}

export function EmployeeList({ employees, companies, departments, onViewEmployee, onOpenModal, onRestoreEmployee, onEditEmployee }: Props) {
  const [listTab, setListTab] = useState<'active' | 'archived'>('active');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterCurrentStatus, setFilterCurrentStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const addDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeEmps = employees.filter(e => !e.archived && e.lifecycle_status !== 'applicant');
  const archivedEmps = employees.filter(e => e.archived && e.lifecycle_status !== 'applicant');
  const pool = listTab === 'archived' ? archivedEmps : activeEmps;
  const depts = ['all', ...departments];
  // Only show companies that have employees in the current pool
  const activeCompanyIds = new Set(pool.map(e => e.company_id).filter(Boolean));
  const visibleCompanies = companies.filter(c => activeCompanyIds.has(c.id));

  let list = pool;
  if (listTab === 'active' && filterStatus !== 'all') list = list.filter(e => e.lifecycle_status === filterStatus);
  if (filterDept !== 'all') list = list.filter(e => e.department === filterDept);
  if (filterCompany !== 'all') list = list.filter(e => e.company_id === filterCompany);
  if (filterCurrentStatus !== 'all') list = list.filter(e => e.current_status === filterCurrentStatus);
  if (search) list = list.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    (e.department ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>All Employees</h1>
          <p>{activeEmps.length} active · {archivedEmps.length} non-active</p>
        </div>
        <div className="topbar-actions">
          <div ref={addDropRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <button
                className="btn-primary"
                style={{ borderRadius: '7px 0 0 7px', borderRight: '1px solid rgba(255,255,255,0.25)' }}
                onClick={() => onOpenModal('add-emp')}
              >
                + Add Employee
              </button>
              <button
                className="btn-primary"
                style={{ borderRadius: '0 7px 7px 0', padding: '0 10px' }}
                onClick={() => setDropOpen(v => !v)}
                aria-label="More actions"
              >
                <ChevronDown size={14} style={{ transition: 'transform 0.15s', transform: dropOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
            </div>
            {dropOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 170,
                background: '#fff', border: '1px solid #E5E3DC', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden'
              }}>
                <button
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, color: '#1C1B17', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { setDropOpen(false); onOpenModal('add-dept'); }}
                >
                  + Add Department
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E3DC' }}>
            <button
              className={`tab-btn${listTab === 'active' ? ' active' : ''}`}
              style={{ fontSize: 13, padding: '10px 18px' }}
              onClick={() => { setListTab('active'); setFilterStatus('all'); setFilterDept('all'); setFilterCompany('all'); setFilterCurrentStatus('all'); setSearch(''); }}
            >
              Active <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: listTab === 'active' ? '#E8EFF8' : '#F2F1ED', color: listTab === 'active' ? '#1B3F6E' : '#9B9890' }}>{activeEmps.length}</span>
            </button>
            <button
              className={`tab-btn${listTab === 'archived' ? ' active' : ''}`}
              style={{ fontSize: 13, padding: '10px 18px' }}
              onClick={() => { setListTab('archived'); setFilterStatus('all'); setFilterDept('all'); setFilterCompany('all'); setFilterCurrentStatus('all'); setSearch(''); }}
            >
              Non-Active <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: listTab === 'archived' ? '#E8EFF8' : '#F2F1ED', color: listTab === 'archived' ? '#1B3F6E' : '#9B9890' }}>{archivedEmps.length}</span>
            </button>
          </div>
          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="Search by name, role, or dept…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {listTab === 'active' && (
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="onboarding">Onboarding</option>
              </select>
            )}
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="filter-select"
            >
              {depts.map(d => (
                <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
              ))}
            </select>
            {visibleCompanies.length > 0 && (
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Companies</option>
                {visibleCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.code || c.name}</option>
                ))}
              </select>
            )}
            {listTab === 'active' && pool.some(e => e.current_status) && (
              <select
                value={filterCurrentStatus}
                onChange={e => setFilterCurrentStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Dev Statuses</option>
                <option value="On Track">On Track</option>
                <option value="Needs Support">Needs Support</option>
                <option value="At Risk">At Risk</option>
              </select>
            )}
          </div>
          {listTab === 'archived' && archivedEmps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>No non-active employees</p>
              <div className="esub">Terminated or retired employees will appear here.</div>
            </div>
          ) : list.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔍</div><p>No employees match your filters</p><div className="esub">Try adjusting the filters above</div></div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="emp-list-table">
                <thead>
                  <tr>
                    <th>Employee</th><th>Department</th><th>Manager</th><th>Start Date</th><th>Progress</th><th>Status</th><th>Dev Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(e => {
                    const csColors: Record<string, { bg: string; color: string }> = {
                      'On Track': { bg: '#D1FAE5', color: '#065F46' },
                      'Needs Support': { bg: '#FEF3C7', color: '#92400E' },
                      'At Risk': { bg: '#FEE2E2', color: '#991B1B' },
                    };
                    const csc = e.current_status ? csColors[e.current_status] : null;
                    return (
                    <tr key={e.id} className="tr-click" onClick={() => onViewEmployee(e.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar av-navy av-32" style={listTab === 'archived' ? { opacity: 0.6 } : {}}>{ini(e.name)}</div>
                          <div>
                            <div className="emp-name" style={listTab === 'archived' ? { color: '#6B6860' } : {}}>{e.name}</div>
                            <div className="emp-email">{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{e.department}</td>
                      <td style={{ color: '#6B6860' }}>{e.manager}</td>
                      <td style={{ fontSize: 12, color: '#6B6860' }}>{e.start_date}</td>
                      <td>
                        {e.lifecycle_status === 'active' ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', whiteSpace: 'nowrap' }}>Active</span>
                        ) : e.lifecycle_status === 'applicant' ? (
                          <span style={{ fontSize: 12, color: '#9B9890' }}>&mdash;</span>
                        ) : (
                          <>
                            <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                            <div className="prog-label">{e.progress}%</div>
                          </>
                        )}
                      </td>
                      <td>
                        {listTab === 'archived'
                          ? <span className="badge b-muted"><span className="dot-sm" /> Archived</span>
                          : e.lifecycle_status === 'applicant'
                            ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#E8EFF8', color: '#1B3F6E', whiteSpace: 'nowrap' }}>Applicant</span>
                            : e.lifecycle_status === 'active'
                              ? <span className="badge b-success">Active Employee</span>
                              : <StatusBadge status={e.status} />
                        }
                      </td>
                      <td>
                        {csc ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: csc.bg, color: csc.color, whiteSpace: 'nowrap' }}>{e.current_status}</span>
                        ) : <span style={{ color: '#C5C3BB', fontSize: 12 }}>—</span>}
                      </td>
                      <td onClick={ev => ev.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-ghost sm" onClick={() => onViewEmployee(e.id)}>View</button>
                          <button className="btn-ghost sm" onClick={() => onEditEmployee(e.id)}>Edit</button>
                          {listTab === 'archived'
                            ? <button className="btn-ghost sm" onClick={() => onRestoreEmployee(e.id)}>Restore</button>
                            : <button className="btn-ghost sm" onClick={() => onOpenModal('send-invite', e.id)}>Send Invite</button>
                          }
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="emp-list-cards">
                {list.map(e => (
                  <div key={e.id} className="emp-card" onClick={() => onViewEmployee(e.id)}>
                    <div className="avatar av-navy av-38" style={listTab === 'archived' ? { opacity: 0.6 } : {}}>{ini(e.name)}</div>
                    <div className="emp-card-info">
                      <div className="emp-card-name" style={listTab === 'archived' ? { color: '#6B6860' } : {}}>{e.name}</div>
                      <div className="emp-card-meta">{e.role} · {e.department}</div>
                      <div style={{ marginTop: 8 }}>
                      {e.lifecycle_status === 'active' ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', display: 'inline-block' }}>Active Employee</span>
                        ) : (
                          <>
                            <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                            <div className="prog-label">{e.progress}% complete</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="emp-card-right">
                    {listTab === 'archived' 
                        ? <span className="badge b-muted">Archived</span> 
                        : e.lifecycle_status === 'active'
                          ? <span className="badge b-success">Active</span>
                          : <StatusBadge status={e.status} />
                      }
                      <div style={{ display: 'flex', gap: 5, marginTop: 8 }} onClick={ev => ev.stopPropagation()}>
                        <button className="btn-ghost sm" onClick={() => onViewEmployee(e.id)}>View</button>
                        <button className="btn-ghost sm" onClick={() => onEditEmployee(e.id)}>Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
