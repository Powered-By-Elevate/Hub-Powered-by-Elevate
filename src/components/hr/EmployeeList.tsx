import { useState, useRef, useEffect } from 'react';
import { Employee, Company } from '../../lib/database.types';
import { ini, pfColor } from '../shared/utils';
import { StatusBadge } from '../shared/StatusBadge';
import { ChevronDown } from 'lucide-react';

interface Props {
  employees: Employee[];
  companies: Company[];
  onViewEmployee: (id: string) => void;
  onOpenModal: (type: string, eid?: string) => void;
  onRestoreEmployee: (id: string) => void;
  onEditEmployee: (id: string) => void;
}

export function EmployeeList({ employees, companies, onViewEmployee, onOpenModal, onRestoreEmployee, onEditEmployee }: Props) {
  const [listTab, setListTab] = useState<'active' | 'archived'>('active');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [search, setSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeEmps = employees.filter(e => !e.archived);
  const archivedEmps = employees.filter(e => e.archived);
  const pool = listTab === 'archived' ? archivedEmps : activeEmps;
  const depts = ['all', ...Array.from(new Set(pool.map(e => e.department).filter(Boolean))) as string[]];
  // Only show companies that have employees in the current pool
  const activeCompanyIds = new Set(pool.map(e => e.company_id).filter(Boolean));
  const visibleCompanies = companies.filter(c => activeCompanyIds.has(c.id));

  let list = pool;
  if (listTab === 'active' && filterStatus !== 'all') list = list.filter(e => e.status === filterStatus);
  if (filterDept !== 'all') list = list.filter(e => e.department === filterDept);
  if (filterCompany !== 'all') list = list.filter(e => e.company_id === filterCompany);
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
          <p>{activeEmps.length} active · {archivedEmps.length} archived</p>
        </div>
        <div className="topbar-actions">
          <div ref={dropRef} style={{ position: 'relative' }}>
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
              onClick={() => { setListTab('active'); setFilterStatus('all'); setFilterDept('all'); setFilterCompany('all'); setSearch(''); }}
            >
              Active <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: listTab === 'active' ? '#E8EFF8' : '#F2F1ED', color: listTab === 'active' ? '#1B3F6E' : '#9B9890' }}>{activeEmps.length}</span>
            </button>
            <button
              className={`tab-btn${listTab === 'archived' ? ' active' : ''}`}
              style={{ fontSize: 13, padding: '10px 18px' }}
              onClick={() => { setListTab('archived'); setFilterStatus('all'); setFilterDept('all'); setFilterCompany('all'); setSearch(''); }}
            >
              Archived <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: listTab === 'archived' ? '#E8EFF8' : '#F2F1ED', color: listTab === 'archived' ? '#1B3F6E' : '#9B9890' }}>{archivedEmps.length}</span>
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
              <>
                <span className="divider-label">Status:</span>
                {['all', 'in-progress', 'complete', 'overdue', 'not-started'].map(s => (
                  <button key={s} className={`filter-chip${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {s === 'all' ? 'All' : s === 'not-started' ? 'Not Started' : s === 'in-progress' ? 'In Progress' : s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </>
            )}
            <span className="divider-label">Dept:</span>
            {depts.map(d => (
              <button key={d} className={`filter-chip${filterDept === d ? ' active' : ''}`} onClick={() => setFilterDept(d)}>
                {d === 'all' ? 'All' : d}
              </button>
            ))}
            {visibleCompanies.length > 0 && (
              <>
                <span className="divider-label">Company:</span>
                <button className={`filter-chip${filterCompany === 'all' ? ' active' : ''}`} onClick={() => setFilterCompany('all')}>All</button>
                {visibleCompanies.map(c => (
                  <button key={c.id} className={`filter-chip${filterCompany === c.id ? ' active' : ''}`} onClick={() => setFilterCompany(c.id)}>
                    {c.code || c.name}
                  </button>
                ))}
              </>
            )}
          </div>
          {listTab === 'archived' && archivedEmps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>No archived employees</p>
              <div className="esub">Employees who complete onboarding can be archived from their profile.</div>
            </div>
          ) : list.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔍</div><p>No employees match your filters</p><div className="esub">Try adjusting the filters above</div></div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="emp-list-table">
                <thead>
                  <tr>
                    <th>Employee</th><th>Department</th><th>Manager</th><th>Start Date</th><th>Progress</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(e => (
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
                        <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                        <div className="prog-label">{e.progress}%</div>
                      </td>
                      <td>
                        {listTab === 'archived' ? <span className="badge b-muted"><span className="dot-sm" /> Archived</span> : <StatusBadge status={e.status} />}
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
                  ))}
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
                        <div className="prog-bar"><div className={`prog-fill ${pfColor(e.progress, e.status)}`} style={{ width: e.progress + '%' }} /></div>
                        <div className="prog-label">{e.progress}% complete</div>
                      </div>
                    </div>
                    <div className="emp-card-right">
                      {listTab === 'archived' ? <span className="badge b-muted">Archived</span> : <StatusBadge status={e.status} />}
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
