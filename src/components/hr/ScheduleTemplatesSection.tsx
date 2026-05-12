import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, Company, ScheduleTemplate, ScheduleTemplateEvent, ScheduleTemplateWithEvents } from '../../lib/database.types';
import { Modal } from '../shared/Modal';
import { Pencil, Trash2, Plus, Copy } from 'lucide-react';

interface Props {
  employees: Employee[];
  companies: Company[];
}

export function ScheduleTemplatesSection({ employees, companies }: Props) {
  const [templates, setTemplates] = useState<ScheduleTemplateWithEvents[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTpl, setEditTpl] = useState<ScheduleTemplateWithEvents | null>(null);
  const [filterCompany, setFilterCompany] = useState<string>('all');

  const loadTemplates = useCallback(async () => {
    const { data: tpls } = await supabase.from('schedule_templates').select('*').order('name');
    if (!tpls) { setTemplates([]); return; }
    const withEvents: ScheduleTemplateWithEvents[] = await Promise.all(
      tpls.map(async (t: ScheduleTemplate) => {
        const { data: evs } = await supabase
          .from('schedule_template_events')
          .select('*')
          .eq('template_id', t.id)
          .order('day_offset', { ascending: true })
          .order('sort_order', { ascending: true });
        return { ...t, events: evs ?? [] };
      })
    );
    setTemplates(withEvents);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function deleteTemplate(t: ScheduleTemplateWithEvents) {
    if (!confirm(`Delete schedule template "${t.name}"? This cannot be undone.`)) return;
    await supabase.from('schedule_templates').delete().eq('id', t.id);
    loadTemplates();
  }

  async function cloneTemplate(t: ScheduleTemplateWithEvents) {
    const newName = prompt(`New template name`, `${t.name} (Copy)`);
    if (!newName?.trim()) return;
    const { data: newTpl, error: e1 } = await supabase
      .from('schedule_templates')
      .insert({ company_id: t.company_id, name: newName.trim(), description: t.description })
      .select()
      .single();
    if (e1 || !newTpl) { alert(`Clone failed: ${e1?.message ?? 'Unknown'}`); return; }
    if (t.events.length > 0) {
      const rows = t.events.map(ev => ({
        template_id: newTpl.id,
        day_offset: ev.day_offset,
        time_label: ev.time_label,
        title: ev.title,
        location: ev.location,
        shadow_employee_id: ev.shadow_employee_id,
        color: ev.color,
        sort_order: ev.sort_order,
      }));
      await supabase.from('schedule_template_events').insert(rows);
    }
    loadTemplates();
  }

  const filtered = filterCompany === 'all' ? templates : templates.filter(t => t.company_id === filterCompany);
  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? 'Unknown';

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ marginBottom: 2 }}>Schedule Templates</h3>
            <div style={{ fontSize: 12, color: '#9B9890' }}>Reusable onboarding schedules organized by company</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="filter-select"
              style={{ fontSize: 12 }}
            >
              <option value="all">All Companies</option>
              {companies.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.code || c.name}</option>
              ))}
            </select>
            <button
              className="btn-primary sm"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => { setEditTpl(null); setShowModal(true); }}
            >
              <Plus size={13} /> New Template
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No schedule templates yet</p>
            <div className="esub">Create reusable onboarding schedules that can be applied to new hires in one click.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Template Name</th><th>Company</th><th>Events</th><th>Span</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const maxDay = t.events.length > 0 ? Math.max(...t.events.map(e => e.day_offset)) : 0;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="emp-name">{t.name}</div>
                      {t.description && <div className="emp-email">{t.description}</div>}
                    </td>
                    <td><span className="badge b-navy" style={{ fontSize: 11 }}>{companyName(t.company_id)}</span></td>
                    <td style={{ fontSize: 13, color: '#6B6860' }}>{t.events.length}</td>
                    <td style={{ fontSize: 13, color: '#6B6860' }}>{maxDay > 0 ? `Day 1 — Day ${maxDay}` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => { setEditTpl(t); setShowModal(true); }}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => cloneTemplate(t)}>
                          <Copy size={11} /> Clone
                        </button>
                        <button className="btn-danger-soft sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => deleteTemplate(t)}>
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
      </div>

      {showModal && (
        <ScheduleTemplateModal
          template={editTpl}
          employees={employees}
          companies={companies}
          onClose={() => setShowModal(false)}
          onSaved={loadTemplates}
        />
      )}
    </>
  );
}

// ── Schedule Template Edit Modal ─────────────────────────────────────────────

interface NewEvent {
  tempId: string;
  day_offset: number;
  time_label: string;
  title: string;
  location: string;
  shadow_employee_id: string | null;
  color: string;
  sort_order: number;
}

interface ModalProps {
  template: ScheduleTemplateWithEvents | null;
  employees: Employee[];
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
}

function ScheduleTemplateModal({ template, employees, companies, onClose, onSaved }: ModalProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [companyId, setCompanyId] = useState(template?.company_id ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [events, setEvents] = useState<NewEvent[]>(
    template?.events.map((e: ScheduleTemplateEvent) => ({
      tempId: e.id,
      day_offset: e.day_offset,
      time_label: e.time_label ?? '',
      title: e.title,
      location: e.location ?? '',
      shadow_employee_id: e.shadow_employee_id,
      color: e.color ?? '#1B3F6E',
      sort_order: e.sort_order,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeCompanies = companies.filter(c => c.active);
  const activeEmployees = employees.filter(e => !e.archived && e.lifecycle_status === 'active');

  function addEvent() {
    setEvents(prev => [...prev, {
      tempId: `new_${Date.now()}`,
      day_offset: 1,
      time_label: '',
      title: '',
      location: '',
      shadow_employee_id: null,
      color: '#1B3F6E',
      sort_order: prev.length,
    }]);
  }

  function updateEvent(id: string, patch: Partial<NewEvent>) {
    setEvents(prev => prev.map(e => e.tempId === id ? { ...e, ...patch } : e));
  }

  function removeEvent(id: string) {
    setEvents(prev => prev.filter(e => e.tempId !== id));
  }

  async function handleSave() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    if (!companyId) { setError('Please select a company.'); return; }
    setSaving(true);
    setError('');

    let templateId = template?.id;
    if (template) {
      await supabase.from('schedule_templates')
        .update({ name: name.trim(), description: description.trim() || null, company_id: companyId, updated_at: new Date().toISOString() })
        .eq('id', template.id);
      // Wipe existing events; we'll reinsert
      await supabase.from('schedule_template_events').delete().eq('template_id', template.id);
    } else {
      const { data: newTpl, error: e1 } = await supabase
        .from('schedule_templates')
        .insert({ name: name.trim(), description: description.trim() || null, company_id: companyId })
        .select()
        .single();
      if (e1 || !newTpl) { setError(e1?.message ?? 'Failed to create template'); setSaving(false); return; }
      templateId = newTpl.id;
    }

    if (events.length > 0 && templateId) {
      const rows = events.map((e, i) => ({
        template_id: templateId,
        day_offset: e.day_offset,
        time_label: e.time_label || null,
        title: e.title.trim(),
        location: e.location || null,
        shadow_employee_id: e.shadow_employee_id,
        color: e.color,
        sort_order: i,
      }));
      const { error: e2 } = await supabase.from('schedule_template_events').insert(rows);
      if (e2) { setError(e2.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={template ? 'Edit Schedule Template' : 'New Schedule Template'} onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
        </button>
      </>
    }>
      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Template Name <span style={{ color: '#E53E3E' }}>*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. TNC Field Worker Onboarding" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Company <span style={{ color: '#E53E3E' }}>*</span></label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)}>
            <option value="">— select company —</option>
            {activeCompanies.map(c => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}
          </select>
        </div>
        <div className="field full" style={{ margin: 0 }}>
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What roles does this schedule apply to?" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Schedule Events <span style={{ fontWeight: 400, color: '#9B9890', fontSize: 12 }}>({events.length})</span>
        </div>
        <button className="btn-primary sm" onClick={addEvent}>+ Add Event</button>
      </div>
      <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 8 }}>
        Day 1 is the employee's start date. Day 2 is the next workday, etc.
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #E5E3DC', borderRadius: 10, padding: '0 12px' }}>
        {events.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9B9890', fontSize: 13 }}>
            No events yet — click "+ Add Event" to start building.
          </div>
        ) : events.sort((a, b) => a.day_offset - b.day_offset).map((ev) => (
          <div key={ev.tempId} style={{ padding: '12px 0', borderBottom: '1px solid #F2F1ED', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: '#9B9890', whiteSpace: 'nowrap' }}>Day</span>
                <input
                  type="number" min={1} max={365}
                  value={ev.day_offset}
                  onChange={e => updateEvent(ev.tempId, { day_offset: parseInt(e.target.value) || 1 })}
                  style={{ width: 50, padding: '5px 6px', border: '1px solid #E5E3DC', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
                />
              </div>
              <input
                type="text"
                placeholder="Event title"
                value={ev.title}
                onChange={e => updateEvent(ev.tempId, { title: e.target.value })}
                style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #E5E3DC', borderRadius: 7, fontSize: 13 }}
              />
              <button
                onClick={() => removeEvent(ev.tempId)}
                style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #FECACA', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Time (e.g. 10:00 AM)"
                value={ev.time_label}
                onChange={e => updateEvent(ev.tempId, { time_label: e.target.value })}
                style={{ width: 130, padding: '5px 8px', border: '1px solid #E5E3DC', borderRadius: 6, fontSize: 12 }}
              />
              <input
                type="text"
                placeholder="Location"
                value={ev.location}
                onChange={e => updateEvent(ev.tempId, { location: e.target.value })}
                style={{ flex: 1, padding: '5px 8px', border: '1px solid #E5E3DC', borderRadius: 6, fontSize: 12 }}
              />
              <select
                value={ev.shadow_employee_id ?? ''}
                onChange={e => updateEvent(ev.tempId, { shadow_employee_id: e.target.value || null })}
                style={{ flex: 1, padding: '5px 8px', border: '1px solid #E5E3DC', borderRadius: 6, fontSize: 12, background: '#fff' }}
              >
                <option value="">Shadow employee (optional)</option>
                {activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {['#1B3F6E', '#D97706', '#DC2626', '#0D9488', '#2D9A60', '#7C3AED'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateEvent(ev.tempId, { color: c })}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: ev.color === c ? '2px solid #1A1916' : '1.5px solid #E5E3DC',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}