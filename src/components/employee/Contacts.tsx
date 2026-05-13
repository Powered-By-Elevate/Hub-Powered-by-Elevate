import { useState } from 'react';
import { Employee, Contact } from '../../lib/database.types';
import { ini } from '../shared/utils';
import { Mail, MessageSquare, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface Props {
  contacts: Contact[];
  employee: Employee;
  allEmployees: Employee[];
}

const EXEC_KEYWORDS = ['CEO', 'COO', 'CFO', 'VP', 'Director', 'President', 'Executive'];

function isExec(emp: Employee): boolean {
  return EXEC_KEYWORDS.some(k => (emp.role ?? '').includes(k));
}

function teamsLink(email: string) {
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
}

function ContactCard({ emp }: { emp: Employee }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid #F2F1ED',
    }}>
      <div className="avatar av-navy av-38" style={{ flexShrink: 0 }}>{ini(emp.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1916' }}>{emp.name}</div>
        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 1 }}>{emp.role}{emp.department ? ` · ${emp.department}` : ''}</div>
        {emp.phone && <div style={{ fontSize: 11, color: '#6B6860', marginTop: 1 }}>{emp.phone}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <a href={`mailto:${emp.email}`} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Mail size={12} /> Email
        </a>
        <a href={teamsLink(emp.email)} target="_blank" rel="noopener noreferrer" className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MessageSquare size={12} /> Teams
        </a>
      </div>
    </div>
  );
}

function ExternalCard({ c }: { c: Contact }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid #F2F1ED',
    }}>
      <div className="avatar av-navy av-38" style={{ flexShrink: 0 }}>{ini(c.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1916' }}>{c.name}</div>
        <div style={{ fontSize: 11, color: '#9B9890', marginTop: 1 }}>{c.role}{c.department ? ` · ${c.department}` : ''}</div>
        {c.phone && <div style={{ fontSize: 11, color: '#6B6860', marginTop: 1 }}>{c.phone}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {c.email && (
          <a href={`mailto:${c.email}`} className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Mail size={12} /> Email
          </a>
        )}
        {c.email && (
          <a href={teamsLink(c.email)} target="_blank" rel="noopener noreferrer" className="btn-ghost sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MessageSquare size={12} /> Teams
          </a>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}

function CollapsibleSection({ title, subtitle, defaultOpen = false, children, count }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb2">
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '1rem 1.25rem',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: open ? '1px solid #E5E3DC' : 'none',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1916' }}>{title}</span>
            {count !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9890', background: '#F2F1ED', padding: '1px 7px', borderRadius: 10 }}>{count}</span>
            )}
          </div>
          {subtitle && <div style={{ fontSize: 12, color: '#9B9890', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {open ? <ChevronDown size={16} style={{ color: '#9B9890', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#9B9890', flexShrink: 0 }} />}
      </button>
      {open && <div style={{ padding: '0 1.25rem' }}>{children}</div>}
    </div>
  );
}

function matchesSearch(emp: Employee, q: string): boolean {
  const lq = q.toLowerCase();
  return emp.name.toLowerCase().includes(lq) ||
    (emp.role ?? '').toLowerCase().includes(lq) ||
    (emp.department ?? '').toLowerCase().includes(lq) ||
    emp.email.toLowerCase().includes(lq);
}

function matchesContactSearch(c: Contact, q: string): boolean {
  const lq = q.toLowerCase();
  return c.name.toLowerCase().includes(lq) ||
    (c.role ?? '').toLowerCase().includes(lq) ||
    (c.department ?? '').toLowerCase().includes(lq) ||
    (c.email ?? '').toLowerCase().includes(lq);
}

export function EmpContacts({ contacts, employee: me, allEmployees }: Props) {
  const [search, setSearch] = useState('');
  const q = search.trim();

  const activeEmps = allEmployees.filter(e => !e.archived);

  // My Team — same dept, not me
  const myTeam = activeEmps.filter(e => e.id !== me.id && e.department === me.department && !e.is_test_account);

  // My Company — all employees not in my dept
  const companyByDept: Record<string, Employee[]> = {};
  for (const e of activeEmps) {
    if (e.id === me.id || e.department === me.department) continue;
    const dept = e.department ?? 'Other';
    if (!companyByDept[dept]) companyByDept[dept] = [];
    companyByDept[dept].push(e);
  }

  // Executives
  const executives = activeEmps.filter(e => e.id !== me.id && isExec(e));

  // HR and Admin
  const hrAdmins = activeEmps.filter(e => e.id !== me.id && (e.role?.toLowerCase().includes('hr') || e.role?.toLowerCase().includes('admin')));

  // External contacts from contacts table
  const externalContacts = contacts;

  // Apply search filter
  function filterEmps(list: Employee[]) { return q ? list.filter(e => matchesSearch(e, q)) : list; }
  function filterContacts(list: Contact[]) { return q ? list.filter(c => matchesContactSearch(c, q)) : list; }

  const filteredTeam = filterEmps(myTeam);
  const filteredExecs = filterEmps(executives);
  const filteredHR = filterEmps(hrAdmins);
  const filteredExternal = filterContacts(externalContacts);
  const filteredCompanyDepts = Object.entries(companyByDept)
    .map(([dept, emps]) => ({ dept, emps: filterEmps(emps) }))
    .filter(({ emps }) => emps.length > 0);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Contacts</h1>
          <p>Your team and company directory</p>
        </div>
      </div>
      <div className="content">
        {/* Search */}
        <div id="emp-contacts-search" style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B9890', pointerEvents: 'none' }} />
          <input
            className="search-input"
            style={{ maxWidth: '100%', width: '100%', paddingLeft: 34 }}
            placeholder="Search by name, role, department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* My Team */}
        {filteredTeam.length > 0 && (
          <div id="emp-contacts-myteam">
            <CollapsibleSection title="My Team" subtitle={`${me.department} department`} defaultOpen count={filteredTeam.length}>
              {filteredTeam.map(e => <ContactCard key={e.id} emp={e} />)}
            </CollapsibleSection>
          </div>
        )}

        {/* Executives */}
        {filteredExecs.length > 0 && (
          <CollapsibleSection title="Executive Contacts" count={filteredExecs.length}>
            {filteredExecs.map(e => <ContactCard key={e.id} emp={e} />)}
          </CollapsibleSection>
        )}

        {/* My Company by department */}
        {filteredCompanyDepts.length > 0 && (
          <CollapsibleSection title="My Company" subtitle="All departments" count={filteredCompanyDepts.reduce((s, d) => s + d.emps.length, 0)}>
            {filteredCompanyDepts.map(({ dept, emps }) => (
              <div key={dept} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', letterSpacing: 0.6, textTransform: 'uppercase', padding: '10px 0 4px' }}>{dept}</div>
                {emps.map(e => <ContactCard key={e.id} emp={e} />)}
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* HR and Admin */}
        {filteredHR.length > 0 && (
          <CollapsibleSection title="HR &amp; Admin" count={filteredHR.length}>
            {filteredHR.map(e => <ContactCard key={e.id} emp={e} />)}
          </CollapsibleSection>
        )}

        {/* External Contacts */}
        {filteredExternal.length > 0 && (
          <div id="emp-contacts-external">
            <CollapsibleSection title="External Contacts" subtitle="Vendors, IT support, benefits providers" count={filteredExternal.length}>
              {filteredExternal.map(c => <ExternalCard key={c.id} c={c} />)}
            </CollapsibleSection>
          </div>
        )}

        {/* Empty state when search finds nothing */}
        {q && filteredTeam.length === 0 && filteredExecs.length === 0 && filteredCompanyDepts.length === 0 && filteredHR.length === 0 && filteredExternal.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <p>No contacts match "{q}"</p>
              <div className="esub">Try a different name, role, or department.</div>
            </div>
          </div>
        )}

        {!q && filteredTeam.length === 0 && activeEmps.length <= 1 && (
          <div className="card">
            <div className="empty-state">
              <p>No contacts yet</p>
              <div className="esub">Your team members will appear here once they join the platform.</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
