import { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { TemplateWithTasks, TemplateTask } from '../../../lib/database.types';
import { dayLabel } from '../../shared/utils';

interface NewTask { tempId: string; title: string; category: string; required: boolean; days_from_start: number }

interface CreateProps {
  departments: string[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTemplateModal({ departments, onClose, onCreated }: CreateProps) {
  const [name, setName] = useState('');
  const [dept, setDept] = useState('All Departments');
  const [desc, setDesc] = useState('');
  const [tasks, setTasks] = useState<NewTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addTask() { setTasks(t => [...t, { tempId: String(Date.now()), title: '', category: 'document', required: false, days_from_start: 1 }]); }
  function removeTask(id: string) { setTasks(t => t.filter(x => x.tempId !== id)); }
  function updateTask(id: string, patch: Partial<NewTask>) { setTasks(t => t.map(x => x.tempId === id ? { ...x, ...patch } : x)); }

  async function handleSave() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    setSaving(true);
    const { data: tpl, error: e1 } = await supabase.from('onboarding_templates').insert({ name, department: dept, description: desc }).select().single();
    if (e1 || !tpl) { setError(e1?.message ?? 'Failed to create template'); setSaving(false); return; }
    if (tasks.length) {
      const rows = tasks.map(t => ({ template_id: tpl.id, title: t.title, category: t.category, required: t.required, days_from_start: t.days_from_start }));
      const { error: e2 } = await supabase.from('template_tasks').insert(rows);
      if (e2) { setError(e2.message); setSaving(false); return; }
    }
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <Modal title="Create Onboarding Template" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Creating…' : 'Create Template'}</button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <TaskEditorBody name={name} dept={dept} desc={desc} tasks={tasks} departments={departments}
        onName={setName} onDept={setDept} onDesc={setDesc}
        onAdd={addTask} onRemove={removeTask} onUpdate={updateTask} />
    </Modal>
  );
}

interface EditProps {
  template: TemplateWithTasks;
  departments: string[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditTemplateModal({ template, departments, onClose, onUpdated }: EditProps) {
  const [name, setName] = useState(template.name);
  const [dept, setDept] = useState(template.department ?? 'All Departments');
  const [desc, setDesc] = useState(template.description ?? '');
  const [tasks, setTasks] = useState<NewTask[]>(template.tasks.map(t => ({ tempId: t.id, title: t.title, category: t.category, required: t.required, days_from_start: t.days_from_start })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addTask() { setTasks(t => [...t, { tempId: 'new_' + Date.now(), title: '', category: 'document', required: false, days_from_start: 1 }]); }
  function removeTask(id: string) { setTasks(t => t.filter(x => x.tempId !== id)); }
  function updateTask(id: string, patch: Partial<NewTask>) { setTasks(t => t.map(x => x.tempId === id ? { ...x, ...patch } : x)); }

  async function handleSave() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    setSaving(true);
    await supabase.from('onboarding_templates').update({ name, department: dept, description: desc }).eq('id', template.id);
    await supabase.from('template_tasks').delete().eq('template_id', template.id);
    if (tasks.length) {
      const rows = tasks.map(t => ({ template_id: template.id, title: t.title, category: t.category, required: t.required, days_from_start: t.days_from_start }));
      await supabase.from('template_tasks').insert(rows);
    }
    setSaving(false);
    onUpdated();
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    await supabase.from('onboarding_templates').delete().eq('id', template.id);
    onUpdated();
    onClose();
  }

  return (
    <Modal title={`Edit Template — ${template.name}`} onClose={onClose} footer={
      <>
        <button className="btn-danger-soft sm" style={{ marginRight: 'auto' }} onClick={handleDelete}>Delete Template</button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <TaskEditorBody name={name} dept={dept} desc={desc} tasks={tasks} departments={departments}
        onName={setName} onDept={setDept} onDesc={setDesc}
        onAdd={addTask} onRemove={removeTask} onUpdate={updateTask} />
    </Modal>
  );
}

interface BodyProps {
  name: string; dept: string; desc: string; tasks: NewTask[]; departments: string[];
  onName: (v: string) => void; onDept: (v: string) => void; onDesc: (v: string) => void;
  onAdd: () => void; onRemove: (id: string) => void; onUpdate: (id: string, p: Partial<NewTask>) => void;
}

function TaskEditorBody({ name, dept, desc, tasks, departments, onName, onDept, onDesc, onAdd, onRemove, onUpdate }: BodyProps) {
  return (
    <>
      <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="field" style={{ margin: 0 }}><label>Template name</label><input type="text" value={name} onChange={e => onName(e.target.value)} placeholder="e.g. Engineering Track" /></div>
        <div className="field" style={{ margin: 0 }}><label>Target department</label>
          <select value={dept} onChange={e => onDept(e.target.value)}>
            <option value="All Departments">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field full" style={{ margin: 0 }}><label>Description</label><textarea value={desc} onChange={e => onDesc(e.target.value)} style={{ minHeight: 60 }} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>Task Schedule <span style={{ fontWeight: 400, color: '#9B9890', fontSize: 12 }}>({tasks.length} tasks)</span></div>
        <button className="btn-primary sm" onClick={onAdd}>+ Add Task</button>
      </div>
      <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 8 }}>Due dates are relative to the employee's start date.</div>
      <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #E5E3DC', borderRadius: 10, padding: '0 12px' }}>
        {tasks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9B9890', fontSize: 13 }}>No tasks yet — click "+ Add Task" to build the schedule.</div>
        ) : tasks.map((t, i) => (
          <div key={t.tempId} className="tpl-task-row">
            <span style={{ fontSize: 11, color: '#9B9890', fontWeight: 600, minWidth: 18, textAlign: 'right', paddingTop: 8 }}>{i + 1}</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="text" value={t.title} onChange={e => onUpdate(t.tempId, { title: e.target.value })} placeholder="Task title"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E5E3DC', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#1A1916' }} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={t.category} onChange={e => onUpdate(t.tempId, { category: e.target.value })}
                  style={{ padding: '6px 8px', border: '1.5px solid #E5E3DC', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#1A1916' }}>
                  <option value="document">Document</option>
                  <option value="training">Training</option>
                  <option value="form">Form</option>
                  <option value="meeting">Meeting</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#9B9890', whiteSpace: 'nowrap' }}>Day</span>
                  <input type="number" min={1} max={365} value={t.days_from_start} onChange={e => onUpdate(t.tempId, { days_from_start: parseInt(e.target.value) || 1 })}
                    style={{ width: 60, padding: '6px 8px', border: '1.5px solid #E5E3DC', borderRadius: 8, fontSize: 12, background: '#fff', color: '#1A1916', outline: 'none', textAlign: 'center' }} />
                  <span style={{ fontSize: 11, color: '#9B9890', whiteSpace: 'nowrap' }}>from start</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B6860', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                  <input type="checkbox" checked={t.required} onChange={e => onUpdate(t.tempId, { required: e.target.checked })} style={{ cursor: 'pointer' }} /> Required
                </label>
              </div>
            </div>
            <button onClick={() => onRemove(t.tempId)}
              style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #FECACA', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1, marginTop: 4 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
// ─── Clone Template ──────────────────────────────────────────────────────────

interface CloneProps {
  template: TemplateWithTasks;
  onClose: () => void;
  onCloned: (newTemplateId: string) => void;
}

export function CloneTemplateModal({ template, onClose, onCloned }: CloneProps) {
  const [name, setName] = useState(`${template.name} (Copy)`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleClone() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    setSaving(true);

    // Create new template
    const { data: tpl, error: e1 } = await supabase
      .from('onboarding_templates')
      .insert({ name: name.trim(), department: template.department, description: template.description })
      .select()
      .single();
    if (e1 || !tpl) { setError(e1?.message ?? 'Failed to clone template'); setSaving(false); return; }

    // Copy all tasks to the new template
    if (template.tasks.length) {
      const rows = template.tasks.map(t => ({
        template_id: tpl.id,
        title: t.title,
        category: t.category,
        required: t.required,
        days_from_start: t.days_from_start,
      }));
      const { error: e2 } = await supabase.from('template_tasks').insert(rows);
      if (e2) { setError(e2.message); setSaving(false); return; }
    }

    setSaving(false);
    onCloned(tpl.id);
    onClose();
  }

  return (
    <Modal title="Clone Template" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleClone} disabled={saving}>
          {saving ? 'Cloning\u2026' : 'Clone Template'}
        </button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <div style={{ marginBottom: 16, padding: '10px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, fontSize: 13, color: '#075985' }}>
        Cloning <strong>{template.name}</strong> with {template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}. You can edit the copy after creation.
      </div>
      <div className="field">
        <label>New template name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
    </Modal>
  );
}

// ─── Save Employee as Template ───────────────────────────────────────────────

interface SaveAsTemplateProps {
  employeeName: string;
  employeeId: string;
  department: string | null;
  onClose: () => void;
  onSaved: (newTemplateId: string) => void;
}

export function SaveAsTemplateModal({ employeeName, employeeId, department, onClose, onSaved }: SaveAsTemplateProps) {
  const [name, setName] = useState(`${employeeName} Onboarding Template`);
  const [desc, setDesc] = useState(`Saved from ${employeeName}'s onboarding tasks`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(true);

  async function handleSave() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    setSaving(true);

    // Get the employee's onboarding tasks
    let query = supabase
      .from('onboarding_tasks')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('task_phase', 'onboarding');
    if (!includeCompleted) query = query.neq('status', 'complete');

    const { data: tasks, error: e0 } = await query;
    if (e0) { setError(e0.message); setSaving(false); return; }
    if (!tasks || tasks.length === 0) {
      setError(`${employeeName} has no onboarding tasks to save.`);
      setSaving(false);
      return;
    }

    // Create new template
    const { data: tpl, error: e1 } = await supabase
      .from('onboarding_templates')
      .insert({
        name: name.trim(),
        department: department ?? 'All Departments',
        description: desc.trim(),
      })
      .select()
      .single();
    if (e1 || !tpl) { setError(e1?.message ?? 'Failed to create template'); setSaving(false); return; }

    // Convert tasks to template_tasks
    // We compute days_from_start from due_date - start_date if both exist, else default to 7
    const rows = tasks.map(t => ({
      template_id: tpl.id,
      title: t.title,
      category: t.category ?? 'document',
      required: t.required ?? false,
      days_from_start: 7, // Default; HR can edit
    }));

    const { error: e2 } = await supabase.from('template_tasks').insert(rows);
    if (e2) { setError(e2.message); setSaving(false); return; }

    setSaving(false);
    onSaved(tpl.id);
    onClose();
  }

  return (
    <Modal title="Save as Template" onClose={onClose} footer={
      <>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving\u2026' : 'Create Template'}
        </button>
      </>
    }>
      {error && <div className="error-msg">{error}</div>}
      <div style={{ marginBottom: 16, padding: '10px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, fontSize: 13, color: '#075985' }}>
        Saving <strong>{employeeName}'s</strong> onboarding tasks as a reusable template. All task days will default to "Day 7 from start" — you can edit them after creation.
      </div>
      <div className="form-grid">
        <div className="field full"><label>Template name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="field full"><label>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
        </div>
        <div className="field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="incl-completed" checked={includeCompleted} onChange={e => setIncludeCompleted(e.target.checked)} />
          <label htmlFor="incl-completed" style={{ margin: 0, fontSize: 13, fontWeight: 400 }}>Include already-completed tasks</label>
        </div>
      </div>
    </Modal>
  );
}