import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, Company } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { listTenantUsers, type MsTenantUser } from '../../lib/graph';

interface Props {
  employees: Employee[];
  companies: Company[];
  onImported: () => void;
}

interface SyncRow {
  user: MsTenantUser;
  email: string;
  existingMatch: Employee | null;
  /** True iff HR has checked this row to import. */
  selected: boolean;
}

export function M365SyncSection({ employees, companies, onImported }: Props) {
  const { session } = useAuth();
  const msTokenAvailable = !!session?.provider_token;
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<SyncRow[] | null>(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState<string>(() => {
    return companies.find(c => c.name?.toLowerCase().includes('true north'))?.id ?? companies[0]?.id ?? '';
  });
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [resultMsg, setResultMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  /** When true, the import button also refreshes job title / department /
   * phone / manager on already-imported employees from Entra. */
  const [refreshExisting, setRefreshExisting] = useState<boolean>(true);

  async function fetchDirectory() {
    if (!session?.provider_token) { setErrorMsg('No Microsoft session — sign out and back in with "Sign in with Microsoft" first.'); return; }
    setLoading(true);
    setErrorMsg('');
    setResultMsg('');
    const users = await listTenantUsers(session.provider_token);
    setLoading(false);
    if (users.length === 0) {
      setErrorMsg('No users returned from Microsoft Graph. The signed-in account may lack User.Read.All consent.');
      return;
    }
    const existingByEmail = new Map(employees.map(e => [e.email.toLowerCase(), e]));
    const next: SyncRow[] = users
      .filter(u => u.accountEnabled)
      .map(u => {
        const email = (u.mail ?? u.userPrincipalName ?? '').toLowerCase();
        const existingMatch = email ? (existingByEmail.get(email) ?? null) : null;
        return {
          user: u,
          email,
          existingMatch,
          // Default to UNCHECKED. The tenant also contains shared mailboxes
          // (Accounts Payable, ACE II…), vendor, and external accounts that
          // aren't real employees. HR opts in per row (or "Select all new"),
          // so a stray Import click can't dump hundreds of junk records.
          selected: false,
        };
      })
      .sort((a, b) => (a.user.displayName ?? '').localeCompare(b.user.displayName ?? ''));
    setRows(next);
    setLastFetchedAt(new Date());
  }

  function toggleRow(idx: number) {
    setRows(rs => rs ? rs.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r) : rs);
  }

  function toggleAllNew(value: boolean) {
    setRows(rs => rs ? rs.map(r => r.existingMatch || !r.email ? r : { ...r, selected: value }) : rs);
  }

  async function importSelected() {
    if (!rows) return;
    const toImport = rows.filter(r => r.selected && !r.existingMatch && r.email);
    if (toImport.length === 0 && !refreshExisting) return;
    setImporting(true);
    setErrorMsg('');
    setResultMsg('');

    let insertedRows: Employee[] = [];
    if (toImport.length > 0) {
      const inserts = toImport.map(r => ({
        name: r.user.displayName ?? r.email,
        email: r.email,
        role: r.user.jobTitle ?? 'Employee',
        department: r.user.department ?? null,
        phone: r.user.mobilePhone ?? r.user.businessPhone ?? null,
        company_id: defaultCompanyId || null,
        status: 'not-started',
        progress: 0,
        archived: false,
        lifecycle_status: 'active',
        is_test_account: false,
      }));
      const { data: inserted, error } = await supabase.from('employees').insert(inserts).select();
      if (error) {
        setImporting(false);
        setErrorMsg(`Import failed: ${error.message}`);
        return;
      }
      insertedRows = (inserted ?? []) as Employee[];
    }

    // Optional refresh: pull fresh job title / department / phone for already-
    // imported employees if HR opted into it. Skips rows where nothing changed.
    let refreshedCount = 0;
    if (refreshExisting) {
      const refreshUpdates: { id: string; patch: Partial<Employee> }[] = [];
      for (const r of rows) {
        if (!r.existingMatch || !r.email) continue;
        const existing = r.existingMatch;
        const patch: Partial<Employee> = {};
        const newRole = r.user.jobTitle ?? null;
        if (newRole && newRole !== existing.role) patch.role = newRole;
        const newDept = r.user.department ?? null;
        if (newDept && newDept !== existing.department) patch.department = newDept;
        const newPhone = r.user.mobilePhone ?? r.user.businessPhone ?? null;
        if (newPhone && newPhone !== existing.phone) patch.phone = newPhone;
        const newName = r.user.displayName ?? null;
        if (newName && newName !== existing.name) patch.name = newName;
        if (Object.keys(patch).length > 0) {
          refreshUpdates.push({ id: existing.id, patch });
        }
      }
      if (refreshUpdates.length > 0) {
        const results = await Promise.all(
          refreshUpdates.map(u => supabase.from('employees').update(u.patch).eq('id', u.id)),
        );
        refreshedCount = results.filter(r => !r.error).length;
      }
    }

    // Phase 2: link manager_id for any Hub employee whose Entra record names
    // a manager that's also in the Hub. Covers both:
    //  - newly-imported employees getting a manager
    //  - existing Hub employees whose manager was just imported in this batch
    //    (or whose manager was already in Hub and never linked)
    // Look up every Entra row that has a managerEmail, find both ends in
    // employees (including the just-inserted rows), and UPSERT manager_id.
    const allEmps: Employee[] = [...employees, ...insertedRows];
    const empByEmail = new Map(allEmps.map(e => [e.email.toLowerCase(), e]));
    const managerUpdates: { id: string; manager_id: string; manager: string | null }[] = [];
    for (const r of rows) {
      const managerEmail = r.user.managerEmail;
      if (!managerEmail || !r.email) continue;
      const userRow = empByEmail.get(r.email);
      const managerRow = empByEmail.get(managerEmail);
      if (!userRow || !managerRow) continue;
      // Only update if the link is missing or different.
      if (userRow.manager_id === managerRow.id) continue;
      managerUpdates.push({ id: userRow.id, manager_id: managerRow.id, manager: managerRow.name });
    }

    let linked = 0;
    if (managerUpdates.length > 0) {
      // Issue updates in parallel. Each is keyed by id so they don't collide.
      const results = await Promise.all(
        managerUpdates.map(u =>
          supabase.from('employees').update({ manager_id: u.manager_id, manager: u.manager }).eq('id', u.id),
        ),
      );
      linked = results.filter(r => !r.error).length;
    }

    setImporting(false);
    const parts: string[] = [];
    if (insertedRows.length > 0) parts.push(`Imported ${insertedRows.length} new employee${insertedRows.length === 1 ? '' : 's'}.`);
    if (refreshedCount > 0) parts.push(`Refreshed ${refreshedCount} existing record${refreshedCount === 1 ? '' : 's'}.`);
    if (linked > 0) parts.push(`Linked ${linked} manager relationship${linked === 1 ? '' : 's'}.`);
    if (parts.length === 0) parts.push('No changes — everything in Hub is up to date with Microsoft 365.');
    setResultMsg(parts.join(' '));

    setRows(rs => rs ? rs.map(r => {
      const justImported = insertedRows.find(e => e.email.toLowerCase() === r.email);
      if (justImported && !r.existingMatch) return { ...r, existingMatch: justImported, selected: false };
      return r;
    }) : rs);
    onImported();
  }

  const newCount = rows ? rows.filter(r => !r.existingMatch && r.email).length : 0;
  const selectedCount = rows ? rows.filter(r => r.selected && !r.existingMatch && r.email).length : 0;
  const matchedCount = rows ? rows.filter(r => !!r.existingMatch).length : 0;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Microsoft 365 Directory Sync</h3>
        {lastFetchedAt && (
          <span style={{ fontSize: 11, color: '#9B9890' }}>
            Last fetched {lastFetchedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div style={{ padding: '0 1.25rem 1rem' }}>
        <p style={{ fontSize: 13, color: '#6B6860', margin: '6px 0 14px' }}>
          Pull employees directly from the True North Microsoft 365 tenant. Matched by email — already-imported employees are skipped. <strong>Check the people you want to import</strong> — nothing is selected by default, since the tenant also includes shared mailboxes and vendor accounts. New employees use the company below; you can change company / role / department on each profile after import.
        </p>

        {!msTokenAvailable && (
          <div className="error-msg" style={{ marginBottom: 14 }}>
            Microsoft sign-in required. Sign out and sign back in using "Sign in with Microsoft" to authorize directory access.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Default company for new imports</label>
            <select value={defaultCompanyId} onChange={e => setDefaultCompanyId(e.target.value)}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="">(none)</option>
            </select>
          </div>
          <button className="btn-primary" onClick={fetchDirectory} disabled={!msTokenAvailable || loading}>
            {loading ? 'Fetching…' : rows ? 'Refresh from Microsoft 365' : 'Fetch from Microsoft 365'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B6860', cursor: 'pointer' }}>
            <input type="checkbox" checked={refreshExisting} onChange={e => setRefreshExisting(e.target.checked)} />
            Also update existing employees with latest M365 data
          </label>
        </div>

        {errorMsg && <div className="error-msg" style={{ marginBottom: 12 }}>{errorMsg}</div>}
        {resultMsg && <div className="modal-success-box" style={{ marginBottom: 12 }}>{resultMsg}</div>}

        {rows && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: '#6B6860' }}>
              <span>
                <strong>{rows.length}</strong> active accounts · <strong>{newCount}</strong> new · <strong>{matchedCount}</strong> already in Hub
              </span>
              {newCount > 0 && (
                <span>
                  <button className="btn-ghost sm" onClick={() => toggleAllNew(true)}>Select all new</button>
                  <button className="btn-ghost sm" style={{ marginLeft: 6 }} onClick={() => toggleAllNew(false)}>Clear</button>
                </span>
              )}
            </div>

            <div style={{ maxHeight: 480, overflow: 'auto', border: '1px solid #E5E3DC', borderRadius: 6 }}>
              <table style={{ width: '100%', tableLayout: 'auto' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8F7F4', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 30 }}></th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Manager</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const importable = !r.existingMatch && !!r.email;
                    return (
                      <tr key={r.user.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={r.selected && importable}
                            disabled={!importable}
                            onChange={() => toggleRow(i)}
                          />
                        </td>
                        <td>
                          <div className="emp-name">{r.user.displayName ?? '(no name)'}</div>
                        </td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{r.email || <em>no email</em>}</td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{r.user.jobTitle ?? '—'}</td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{r.user.department ?? '—'}</td>
                        <td style={{ fontSize: 12, color: '#6B6860' }}>{r.user.managerName ?? '—'}</td>
                        <td>
                          {r.existingMatch ? (
                            <span className="badge b-muted">In Hub</span>
                          ) : !r.email ? (
                            <span className="badge b-muted">No email</span>
                          ) : (
                            <span className="badge b-navy">New</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn-primary" onClick={importSelected} disabled={importing || selectedCount === 0}>
                {importing ? 'Importing…' : `Import ${selectedCount} selected`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
