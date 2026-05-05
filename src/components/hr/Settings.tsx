import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, HRAnnouncement, Department, JobTitle, Company, CompanyType, Contact } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../shared/Modal';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

type SettingsSection = 'schedule' | 'banners' | 'organization' | 'contacts';

interface Props {
  employees: Employee[];
  onCheckinUpdated: () => void;
  onReviewUpdated: () => void;
  onDepartmentChanged?: () => void;
  initialSection?: 'schedule' | 'banners' | 'organization';
  initialOrgTab?: 'departments' | 'job-titles' | 'companies';
  hideSidebar?: boolean;
}

interface ScheduleSettings {
  annual_review_date: string;
  q1_checkin_date: string;
  q2_checkin_date: string;
  q3_checkin_date: string;
  q4_checkin_date: string;
}

const SETTING_KEYS: (keyof ScheduleSettings)[] = [
  'annual_review_date', 'q1_checkin_date', 'q2_checkin_date', 'q3_checkin_date', 'q4_checkin_date',
];

const LABEL_MAP: Record<keyof ScheduleSettings, string> = {
  annual_review_date: 'Annual Review Date',
  q1_checkin_date: 'Q1 Check-in Date',
  q2_checkin_date: 'Q2 Check-in Date',
  q3_checkin_date: 'Q3 Check-in Date',
  q4_checkin_date: 'Q4 Check-in Date',
};

const BANNER_TYPE_OPTS = ['announcement', 'critical', 'reminder', 'shoutout', 'birthday'] as const;
const DEPT_TYPES = ['Office and Corporate', 'Construction', 'Field Operations', 'Other'];
const TITLE_CATEGORIES = ['Office and Corporate', 'Construction Leadership', 'Construction Field', 'Other'];

export function HRSettings({ employees, onCheckinUpdated, onReviewUpdated, onDepartmentChanged, initialSection, initialOrgTab, hideSidebar }: Props) {
  const { profile } = useAuth();
  const [section, setSection] = useState<SettingsSection>(initialSection ?? 'schedule');
  const [settings, setSettings] = useState<ScheduleSettings>({ annual_review_date: '', q1_checkin_date: '', q2_checkin_date: '', q3_checkin_date: '', q4_checkin_date: '' });
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>([]);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editBanner, setEditBanner] = useState<HRAnnouncement | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orgTab, setOrgTab] = useState<'departments' | 'job-titles' | 'companies'>(initialOrgTab ?? 'departments');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [editTitle, setEditTitle] = useState<JobTitle | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
const [showContactModal, setShowContactModal] = useState(false);
const [editContact, setEditContact] = useState<Contact | null>(null);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('company_settings').select('*');
    if (data) {
      const s: Partial<ScheduleSettings> = {};
      data.forEach(row => { if (SETTING_KEYS.includes(row.setting_key as keyof ScheduleSettings)) (s as Record<string, string>)[row.setting_key] = row.setting_value; });
      setSettings(prev => ({ ...prev, ...s }));
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase.from('hr_announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(data ?? []);
  }, []);

  const loadDepartments = useCallback(async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    setDepartments(data ?? []);
  }, []);

  const loadJobTitles = useCallback(async () => {
    const { data } = await supabase.from('job_titles').select('*').order('category').order('title');
    setJobTitles(data ?? []);
  }, []);

  const loadCompanies = useCallback(async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data ?? []);
  }, []);
  const loadContacts = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*').order('name');
    setContacts(data ?? []);
  }, []);

  useEffect(() => {
    loadSettings();
    loadAnnouncements();
    loadDepartments();
    loadJobTitles();
    loadCompanies();
    loadContacts();
  }, [loadSettings, loadAnnouncements, loadDepartments, loadJobTitles, loadCompanies, loadContacts]);

  async function saveSettings() {
    setSaving(true);
    await Promise.all(
      SETTING_KEYS.map(key =>
        supabase.from('company_settings').upsert({ setting_key: key, setting_value: settings[key] ?? '', updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })
      )
    );
    setSaving(false);
  }

  async function pushToAll() {
    setPushing(true);
    setPushMsg('');
    const year = new Date().getFullYear();
    const activeEmps = employees.filter(e => !e.archived);
    let pushed = 0;

    for (const emp of activeEmps) {
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
        const dateKey = `${q.toLowerCase()}_checkin_date` as keyof ScheduleSettings;
        const dateVal = settings[dateKey];
        if (!dateVal) continue;
        const { data: existing } = await supabase.from('quarterly_checkins')
          .select('id, is_overridden').eq('employee_id', emp.id).eq('quarter', q).eq('year', year).maybeSingle();
        if (!existing) {
          await supabase.from('quarterly_checkins').insert({ employee_id: emp.id, quarter: q, year, scheduled_at: dateVal, status: 'pending', is_overridden: false });
          pushed++;
        } else if (!existing.is_overridden) {
          await supabase.from('quarterly_checkins').update({ scheduled_at: dateVal }).eq('id', existing.id);
          pushed++;
        }
      }
      if (settings.annual_review_date) {
        const { data: existingReview } = await supabase.from('annual_reviews')
          .select('id, is_overridden').eq('employee_id', emp.id).eq('review_year', year).maybeSingle();
        if (!existingReview) {
          await supabase.from('annual_reviews').insert({ employee_id: emp.id, review_year: year, scheduled_at: settings.annual_review_date, status: 'pending', is_overridden: false });
          pushed++;
        } else if (!existingReview.is_overridden) {
          await supabase.from('annual_reviews').update({ scheduled_at: settings.annual_review_date }).eq('id', existingReview.id);
          pushed++;
        }
      }
    }

    onCheckinUpdated();
    onReviewUpdated();
    setPushing(false);
    setPushMsg(`Done — updated ${pushed} record${pushed !== 1 ? 's' : ''} across ${activeEmps.length} employee${activeEmps.length !== 1 ? 's' : ''}.`);
  }

  async function toggleBannerActive(id: string, active: boolean) {
    await supabase.from('hr_announcements').update({ active }).eq('id', id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active } : a));
  }

  async function deleteBanner(id: string) {
    await supabase.from('hr_announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }

  async function deleteDept(dept: Department) {
    const assignedCount = employees.filter(e => !e.archived && e.department === dept.name).length;
    if (assignedCount > 0) {
      alert(`Cannot delete "${dept.name}" — ${assignedCount} employee${assignedCount !== 1 ? 's are' : ' is'} assigned to this department.`);
      return;
    }
    await supabase.from('departments').delete().eq('id', dept.id);
    setDepartments(prev => prev.filter(d => d.id !== dept.id));
  }

  async function toggleTitleActive(jt: JobTitle) {
    await supabase.from('job_titles').update({ active: !jt.active }).eq('id', jt.id);
    setJobTitles(prev => prev.map(t => t.id === jt.id ? { ...t, active: !jt.active } : t));
  }

  async function deleteJobTitle(jt: JobTitle) {
    await supabase.from('job_titles').delete().eq('id', jt.id);
    setJobTitles(prev => prev.filter(t => t.id !== jt.id));
  }

  async function toggleCompanyActive(company: Company) {
    await supabase.from('companies').update({ active: !company.active }).eq('id', company.id);
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, active: !c.active } : c));
  }

  async function deleteCompany(company: Company) {
    const count = employees.filter(e => !e.archived && e.company_id === company.id).length;
    if (count > 0) {
      alert(`Cannot delete "${company.name}" — ${count} employee${count !== 1 ? 's are' : ' is'} assigned to this company.`);
      return;
    }
    await supabase.from('companies').delete().eq('id', company.id);
    setCompanies(prev => prev.filter(c => c.id !== company.id));
  }
  async function deleteContact(contact: Contact) {
    if (!confirm(`Delete contact "${contact.name}"?`)) return;
    await supabase.from('contacts').delete().eq('id', contact.id);
    setContacts(prev => prev.filter(c => c.id !== contact.id));
  }

  const sections: { id: SettingsSection; label: string }[] = [
    { id: 'schedule', label: 'Check-in & Review Schedule' },
    { id: 'banners', label: 'Hub Banners' },
    { id: 'organization', label: 'Organization Setup' },
    { id: 'contacts', label: 'External Contacts' },
  ];

  const titlesByCategory: Record<string, JobTitle[]> = {};
  for (const jt of jobTitles) {
    if (!titlesByCategory[jt.category]) titlesByCategory[jt.category] = [];
    titlesByCategory[jt.category].push(jt);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Settings</h1>
          <p>Global HR configuration and employee hub settings</p>
        </div>
      </div>
      <div className="content">
        <div className="detail-grid" style={{ gridTemplateColumns: hideSidebar ? '1fr' : '200px 1fr' }}>
          {!hideSidebar && (
            <div className="card" style={{ height: 'fit-content', padding: '.5rem' }}>
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: section === s.id ? '#E8EFF8' : 'none',
                    color: section === s.id ? '#1B3F6E' : '#6B6860',
                    transition: 'background .15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div>
            {section === 'schedule' && (
              <div className="card">
                <div className="card-header">
                  <h3>Check-in & Review Schedule</h3>
                  <button className="btn-primary sm" onClick={saveSettings} disabled={saving}>{saving ? 'Saving…' : 'Save Dates'}</button>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: 13, color: '#6B6860', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                    Set company-wide dates for all quarterly check-ins and the annual performance review.
                    These dates will be applied to all active employees unless they have individual overrides.
                  </p>
                  <div className="form-grid">
                    {SETTING_KEYS.map(key => (
                      <div key={key} className="field">
                        <label>{LABEL_MAP[key]}</label>
                        <input
                          type="date"
                          value={settings[key]}
                          onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E3DC' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Push to All Employees</div>
                      <div style={{ fontSize: 12, color: '#6B6860', lineHeight: 1.6 }}>
                        Apply these dates to every active employee. Employees with individual date overrides will not be affected.
                      </div>
                    </div>
                    <button className="btn-primary" onClick={pushToAll} disabled={pushing}>
                      {pushing ? 'Pushing…' : 'Push to All Employees'}
                    </button>
                    {pushMsg && (
                      <div className="modal-success-box" style={{ marginTop: 10, marginBottom: 0 }}>{pushMsg}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {section === 'banners' && (
              <div className="card">
                <div className="card-header">
                  <h3>Hub Banners</h3>
                  <button className="btn-primary sm" onClick={() => { setEditBanner(null); setShowBannerModal(true); }}>+ New Banner</button>
                </div>
                {announcements.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📢</div>
                    <p>No banners configured</p>
                    <div className="esub">Create announcements, reminders, or shoutouts for your employees.</div>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th><th>Type</th><th>Dates</th><th>Target</th><th>Active</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div className="emp-name">{a.title}</div>
                            <div className="emp-email">{a.message.slice(0, 60)}{a.message.length > 60 ? '…' : ''}</div>
                          </td>
                          <td>
                            <span className={`badge ${a.type === 'critical' ? 'b-danger' : a.type === 'reminder' ? 'b-amber' : a.type === 'shoutout' ? 'b-success' : 'b-navy'}`}>
                              {a.type}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#6B6860' }}>{a.start_date} — {a.end_date}</td>
                          <td style={{ fontSize: 12, color: '#6B6860' }}>
                            {a.employee_id ? 'Individual' : a.department_id ? a.department_id : 'All Employees'}
                          </td>
                          <td>
                            <button
                              onClick={() => toggleBannerActive(a.id, !a.active)}
                              style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: a.active ? '#DCFCE7' : '#F2F1ED',
                                color: a.active ? '#16A34A' : '#6B6860',
                              }}
                            >
                              {a.active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-ghost sm" onClick={() => { setEditBanner(a); setShowBannerModal(true); }}>Edit</button>
                              <button className="btn-danger-soft sm" onClick={() => deleteBanner(a.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

{section === 'contacts' && (
              <div className="card">
                <div className="card-header">
                  <h3>External Contacts</h3>
                  <button className="btn-primary sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { setEditContact(null); setShowContactModal(true); }}>
                    <Plus size={13} /> Add Contact
                  </button>
                </div>
                {contacts.length === 0 ? (
                  <div className="empty-state">
                    <p>No external contacts yet</p>
                    <div className="esub">Add vendors, IT support, benefits providers, etc.</div>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Role / Vendor</th><th>Email</th><th>Phone</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {contacts.map(c => (
                        <tr key={c.id}>
                          <td><div className="emp-name">{c.name}</div></td>
                          <td style={{ fontSize: 12, color: '#6B6860' }}>{c.role || '—'}</td>
                          <td style={{ fontSize: 12, color: '#6B6860' }}>{c.email || '—'}</td>
                          <td style={{ fontSize: 12, color: '#6B6860' }}>{c.phone || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setEditContact(c); setShowContactModal(true); }}>
                                <Pencil size={11} /> Edit
                              </button>
                              <button className="btn-danger-soft sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => deleteContact(c)}>
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {section === 'organization' && (
              <div>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #E5E3DC' }}>
                    {([
                      { id: 'departments', label: 'Departments & Teams' },
                      { id: 'job-titles', label: 'Job Titles' },
                      { id: 'companies', label: 'Companies' },
                    ] as const).map(t => (
                      <button
                        key={t.id}
                        className={`tab-btn${orgTab === t.id ? ' active' : ''}`}
                        style={{ fontSize: 13, padding: '10px 18px' }}
                        onClick={() => setOrgTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {orgTab === 'departments' && (
                    <>
                      <div className="card-header" style={{ borderTop: 'none' }}>
                        <div>
                          <h3 style={{ marginBottom: 2 }}>Departments & Teams</h3>
                          <div style={{ fontSize: 12, color: '#9B9890' }}>{departments.length} departments · departments with assigned employees cannot be deleted</div>
                        </div>
                        <button className="btn-primary sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { setEditDept(null); setShowDeptModal(true); }}>
                          <Plus size={13} /> Add Department
                        </button>
                      </div>
                      {departments.length === 0 ? (
                        <div className="empty-state">
                          <p>No departments yet</p>
                          <div className="esub">Add departments to organize your employees.</div>
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr><th>Department</th><th>Type</th><th>Employees</th><th>Actions</th></tr>
                          </thead>
                          <tbody>
                            {departments.map(dept => {
                              const count = employees.filter(e => !e.archived && e.department === dept.name).length;
                              return (
                                <tr key={dept.id}>
                                  <td><div className="emp-name">{dept.name}</div></td>
                                  <td>
                                    {dept.type
                                      ? <span className="badge b-navy" style={{ fontSize: 11 }}>{dept.type}</span>
                                      : <span style={{ color: '#C5C3BB', fontSize: 12 }}>—</span>
                                    }
                                  </td>
                                  <td>
                                    <span style={{
                                      padding: '2px 9px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                                      background: count > 0 ? '#E8EFF8' : '#F2F1ED',
                                      color: count > 0 ? '#1B3F6E' : '#9B9890',
                                    }}>
                                      {count} {count === 1 ? 'employee' : 'employees'}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setEditDept(dept); setShowDeptModal(true); }}>
                                        <Pencil size={11} /> Edit
                                      </button>
                                      <button
                                        className="btn-danger-soft sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: count > 0 ? 0.4 : 1, cursor: count > 0 ? 'not-allowed' : 'pointer' }}
                                        onClick={() => deleteDept(dept)}
                                        title={count > 0 ? `${count} employee(s) assigned` : 'Delete department'}
                                      >
                                        <Trash2 size={11} /> Delete
                                      </button>
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

                  {orgTab === 'job-titles' && (
                    <>
                      <div className="card-header" style={{ borderTop: 'none' }}>
                        <div>
                          <h3 style={{ marginBottom: 2 }}>Job Titles</h3>
                          <div style={{ fontSize: 12, color: '#9B9890' }}>{jobTitles.filter(t => t.active).length} active · {jobTitles.filter(t => !t.active).length} hidden</div>
                        </div>
                        <button className="btn-primary sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { setEditTitle(null); setShowTitleModal(true); }}>
                          <Plus size={13} /> Add Job Title
                        </button>
                      </div>
                      {Object.keys(titlesByCategory).length === 0 ? (
                        <div className="empty-state">
                          <p>No job titles yet</p>
                          <div className="esub">Add job titles to populate the searchable dropdown when adding employees.</div>
                        </div>
                      ) : (
                        Object.entries(titlesByCategory).map(([cat, titles]) => (
                          <div key={cat}>
                            <div style={{
                              padding: '8px 20px 6px', fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
                              color: '#9B9890', textTransform: 'uppercase', borderTop: '1px solid #F2F1ED',
                              background: '#FAFAF8',
                            }}>{cat}</div>
                            <table>
                              <tbody>
                                {titles.map(jt => (
                                  <tr key={jt.id} style={{ opacity: jt.active ? 1 : 0.45 }}>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="emp-name" style={{ fontWeight: 500 }}>{jt.title}</span>
                                        {!jt.active && <span style={{ fontSize: 10, color: '#9B9890', background: '#F2F1ED', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>HIDDEN</span>}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                          className="btn-ghost sm"
                                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                          onClick={() => toggleTitleActive(jt)}
                                          title={jt.active ? 'Hide from dropdown' : 'Show in dropdown'}
                                        >
                                          {jt.active ? <><X size={11} /> Hide</> : <><Check size={11} /> Show</>}
                                        </button>
                                        <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setEditTitle(jt); setShowTitleModal(true); }}>
                                          <Pencil size={11} /> Edit
                                        </button>
                                        <button className="btn-danger-soft sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => deleteJobTitle(jt)}>
                                          <Trash2 size={11} /> Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {orgTab === 'companies' && (
                    <>
                      <div className="card-header" style={{ borderTop: 'none' }}>
                        <div>
                          <h3 style={{ marginBottom: 2 }}>Companies</h3>
                          <div style={{ fontSize: 12, color: '#9B9890' }}>{companies.filter(c => c.active).length} active · companies with assigned employees cannot be deleted</div>
                        </div>
                        <button className="btn-primary sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { setEditCompany(null); setShowCompanyModal(true); }}>
                          <Plus size={13} /> Add Company
                        </button>
                      </div>
                      {companies.length === 0 ? (
                        <div className="empty-state">
                          <p>No companies yet</p>
                          <div className="esub">Add company entities to group and filter your employees.</div>
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr><th>Company</th><th>Code</th><th>Type</th><th>Employees</th><th>Status</th><th>Actions</th></tr>
                          </thead>
                          <tbody>
                            {companies.map(c => {
                              const count = employees.filter(e => !e.archived && e.company_id === c.id).length;
                              return (
                                <tr key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
                                  <td><div className="emp-name">{c.name}</div></td>
                                  <td>
                                    {c.code
                                      ? <span className="badge b-navy" style={{ fontSize: 11 }}>{c.code}</span>
                                      : <span style={{ color: '#C5C3BB', fontSize: 12 }}>—</span>}
                                  </td>
                                  <td style={{ fontSize: 12, color: '#6B6860' }}>{c.type || '—'}</td>
                                  <td>
                                    <span style={{
                                      padding: '2px 9px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                                      background: count > 0 ? '#E8EFF8' : '#F2F1ED',
                                      color: count > 0 ? '#1B3F6E' : '#9B9890',
                                    }}>
                                      {count} {count === 1 ? 'employee' : 'employees'}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => toggleCompanyActive(c)}
                                      style={{
                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        border: 'none', cursor: 'pointer',
                                        background: c.active ? '#DCFCE7' : '#F2F1ED',
                                        color: c.active ? '#16A34A' : '#6B6860',
                                      }}
                                    >
                                      {c.active ? 'Active' : 'Inactive'}
                                    </button>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setEditCompany(c); setShowCompanyModal(true); }}>
                                        <Pencil size={11} /> Edit
                                      </button>
                                      <button
                                        className="btn-danger-soft sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: count > 0 ? 0.4 : 1, cursor: count > 0 ? 'not-allowed' : 'pointer' }}
                                        onClick={() => deleteCompany(c)}
                                        title={count > 0 ? `${count} employee(s) assigned` : 'Delete company'}
                                      >
                                        <Trash2 size={11} /> Delete
                                      </button>
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBannerModal && (
        <BannerModal
          banner={editBanner}
          employees={employees}
          createdBy={profile?.id ?? null}
          onClose={() => setShowBannerModal(false)}
          onSaved={loadAnnouncements}
        />
      )}

      {showDeptModal && (
        <DeptModal
          dept={editDept}
          onClose={() => setShowDeptModal(false)}
          onSaved={() => { loadDepartments(); onDepartmentChanged?.(); }}
        />
      )}

      {showTitleModal && (
        <TitleModal
          jobTitle={editTitle}
          onClose={() => setShowTitleModal(false)}
          onSaved={loadJobTitles}
        />
      )}

      {showCompanyModal && (
        <CompanyModal
          company={editCompany}
          onClose={() => setShowCompanyModal(false)}
          onSaved={loadCompanies}
        />
      )}
      {showContactModal && (
        <ContactModal
          contact={editContact}
          onClose={() => setShowContactModal(false)}
          onSaved={loadContacts}
        />
      )}
    </>
  );
}

interface BannerModalProps {
  banner: HRAnnouncement | null;
  employees: Employee[];
  createdBy: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function BannerModal({ banner, employees, createdBy, onClose, onSaved }: BannerModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    title: banner?.title ?? '',
    message: banner?.message ?? '',
    type: banner?.type ?? 'announcement',
    start_date: banner?.start_date ?? today,
    end_date: banner?.end_date ?? today,
    active: banner?.active ?? true,
    target: banner?.employee_id ? 'employee' : banner?.department_id ? 'department' : 'all',
    employee_id: banner?.employee_id ?? '',
    department_id: banner?.department_id ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  async function save() {
    if (!form.title.trim() || !form.message.trim()) { setError('Title and message are required.'); return; }
    if (!form.start_date || !form.end_date) { setError('Start and end dates are required.'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type as HRAnnouncement['type'],
      start_date: form.start_date,
      end_date: form.end_date,
      active: form.active,
      employee_id: form.target === 'employee' ? form.employee_id || null : null,
      department_id: form.target === 'department' ? form.department_id || null : null,
      created_by: createdBy,
    };
    const { error: err } = banner
      ? await supabase.from('hr_announcements').update(payload).eq('id', banner.id)
      : await supabase.from('hr_announcements').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal title={banner ? 'Edit Banner' : 'New Banner'} onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Banner'}</button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Title</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Open Enrollment Reminder" />
        </div>
        <div className="field full">
          <label>Message</label>
          <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Message body shown to employees…" rows={3} />
        </div>
        <div className="field">
          <label>Banner Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as HRAnnouncement['type'] }))}>
            {BANNER_TYPE_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Target Audience</label>
          <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
            <option value="all">All Employees</option>
            <option value="department">Specific Department</option>
            <option value="employee">Specific Employee</option>
          </select>
        </div>
        {form.target === 'department' && (
          <div className="field full">
            <label>Department</label>
            <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">— select —</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        {form.target === 'employee' && (
          <div className="field full">
            <label>Employee</label>
            <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
              <option value="">— select —</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label>Display Start Date</label>
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div className="field">
          <label>Display End Date</label>
          <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
        </div>
        <div className="field full">
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#1A1916', fontWeight: 500 }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 16, height: 16 }} />
            Active (visible to employees)
          </label>
        </div>
      </div>
    </Modal>
  );
}

interface DeptModalProps {
  dept: Department | null;
  onClose: () => void;
  onSaved: () => void;
}

function DeptModal({ dept, onClose, onSaved }: DeptModalProps) {
  const [name, setName] = useState(dept?.name ?? '');
  const [type, setType] = useState(dept?.type ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Department name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = { name: trimmed, type: type || null };
    const { error: err } = dept
      ? await supabase.from('departments').update(payload).eq('id', dept.id)
      : await supabase.from('departments').insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message.includes('unique') ? 'A department with that name already exists.' : err.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      title={dept ? 'Edit Department' : 'Add Department'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : dept ? 'Save Changes' : 'Add Department'}</button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Department Name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input
            type="text"
            placeholder="e.g. Design, Legal, Customer Success"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        </div>
        <div className="field full">
          <label>Team Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="">— select type —</option>
            {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}


interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSaved: () => void;
}

function CompanyModal({ company, onClose, onSaved }: CompanyModalProps) {
  const [name, setName] = useState(company?.name ?? '');
  const [code, setCode] = useState(company?.code ?? '');
  const [type, setType] = useState(company?.type ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState<CompanyType[]>([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    const { data } = await supabase
      .from('company_types')
      .select('*')
      .eq('active', true)
      .order('name');
    setTypes(data ?? []);
  }

  async function addNewType() {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    setSavingType(true);
    const { data, error: err } = await supabase
      .from('company_types')
      .insert({ name: trimmed })
      .select()
      .single();
    setSavingType(false);
    if (err) {
      setError(err.message.includes('unique') ? 'That type already exists.' : err.message);
      return;
    }
    if (data) {
      setTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setType(data.name);
    }
    setNewTypeName('');
    setShowAddType(false);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Company name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = { name: trimmed, code: code.trim().toUpperCase(), type: type || '' };
    const { error: err } = company
      ? await supabase.from('companies').update(payload).eq('id', company.id)
      : await supabase.from('companies').insert({ ...payload, active: true });
    setSaving(false);
    if (err) {
      setError(err.message.includes('unique') ? 'A company with that name already exists.' : err.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      title={company ? 'Edit Company' : 'Add Company'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : company ? 'Save Changes' : 'Add Company'}</button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Company Name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input
            type="text"
            placeholder="e.g. True North Companies"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        </div>
        <div className="field">
          <label>Short Code</label>
          <input
            type="text"
            placeholder="e.g. TNC"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={10}
          />
        </div>
        <div className="field">
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Company Type</span>
            <button
              type="button"
              onClick={() => setShowAddType(true)}
              style={{ background: 'none', border: 'none', color: '#1B3F6E', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              + Add New Type
            </button>
          </label>
          {showAddType ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Enter new type name"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNewType()}
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-primary sm"
                onClick={addNewType}
                disabled={savingType || !newTypeName.trim()}
              >
                {savingType ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                className="btn-ghost sm"
                onClick={() => { setShowAddType(false); setNewTypeName(''); }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="">— select type —</option>
              {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface TitleModalProps {
  jobTitle: JobTitle | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ContactModalProps {
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}

function ContactModal({ contact, onClose, onSaved }: ContactModalProps) {
  const [name, setName] = useState(contact?.name ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: name.trim(),
      role: role.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    };
    const { error: err } = contact
      ? await supabase.from('contacts').update(payload).eq('id', contact.id)
      : await supabase.from('contacts').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal
      title={contact ? 'Edit Contact' : 'Add Contact'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : contact ? 'Save Changes' : 'Add Contact'}</button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" placeholder="e.g. IT Help Desk" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="field full">
          <label>Role / Vendor</label>
          <input type="text" placeholder="e.g. Cortavo · Technical Support" value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="helpdesk@vendor.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="tel" placeholder="(555) 555-5555" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
function TitleModal({ jobTitle, onClose, onSaved }: TitleModalProps) {
  const [title, setTitle] = useState(jobTitle?.title ?? '');
  const [category, setCategory] = useState(jobTitle?.category ?? 'Other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    const payload = { title: trimmed, category };
    const { error: err } = jobTitle
      ? await supabase.from('job_titles').update(payload).eq('id', jobTitle.id)
      : await supabase.from('job_titles').insert({ ...payload, active: true });
    setSaving(false);
    if (err) {
      setError(err.message.includes('unique') ? 'A job title with that name already exists.' : err.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      title={jobTitle ? 'Edit Job Title' : 'Add Job Title'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : jobTitle ? 'Save Changes' : 'Add Job Title'}</button>
        </>
      }
    >
      {error && <div className="error-msg">{error}</div>}
      <div className="form-grid">
        <div className="field full">
          <label>Job Title <span style={{ color: '#E53E3E' }}>*</span></label>
          <input
            type="text"
            placeholder="e.g. Senior Project Manager"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        </div>
        <div className="field full">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {TITLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}