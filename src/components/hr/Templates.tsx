import { TemplateWithTasks } from '../../lib/database.types';

interface Props {
  templates: TemplateWithTasks[];
  onOpenModal: (type: string, eid?: string) => void;
}

export function HRTemplates({ templates, onOpenModal }: Props) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Onboarding Templates</h1>
          <p>Reusable task lists that can be applied to any new hire</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => onOpenModal('new-template')}>+ Create Template</button>
        </div>
      </div>
      <div className="content">
        <div className="two-col">
          {templates.map(t => (
            <div key={t.id} className="card">
              <div className="card-header">
                <div>
                  <h3>{t.name}</h3>
                  <div style={{ fontSize: 11, color: '#9B9890', marginTop: 2 }}>{t.department}</div>
                </div>
                <span className="badge b-navy">{t.tasks.length} task{t.tasks.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: '#6B6860', lineHeight: 1.55, marginBottom: '1rem' }}>{t.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9890' }}>Used for {t.used_count} employee{t.used_count !== 1 ? 's' : ''}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost sm" onClick={() => onOpenModal('edit-template', t.id)}>Edit</button>
                    <button className="btn-primary sm" onClick={() => onOpenModal('apply-template', t.id)}>Apply to Employee</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
