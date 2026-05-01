import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MobileLayout } from '../components/mobile/MobileLayout';
import { MobileHREmployees } from '../components/mobile/MobileHREmployees';
import { MobileHRSettings } from '../components/mobile/MobileHRSettings';
import { MobileDashboard } from '../components/mobile/MobileDashboard';

function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => removeEventListener('resize', handler);
  }, []);
  return isMobile;
}
import {
  Employee, OnboardingTask, TemplateWithTasks,
  Document, Schedule, ActivityLog,
  EmployeeNote, Company, Pathway,
  Review, DevelopmentPlan, Certification, Checkin,
} from '../lib/database.types';
import { HRSidebar } from '../components/hr/Sidebar';
import { HRDashboard } from '../components/hr/Dashboard';
import { EmployeeList } from '../components/hr/EmployeeList';
import { EmployeeDetail } from '../components/hr/EmployeeDetail';
import { HRTemplates } from '../components/hr/Templates';
import { HRCheckins } from '../components/hr/Checkins';
import { HRSettings } from '../components/hr/Settings';
import { AddEmployeeModal } from '../components/hr/modals/AddEmployee';
import { AddTaskModal } from '../components/hr/modals/AddTask';
import { AddDepartmentModal } from '../components/hr/modals/AddDepartment';
import { SendInviteModal } from '../components/hr/modals/SendInvite';
import { ApplyTemplateModal } from '../components/hr/modals/ApplyTemplate';
import { CreateTemplateModal, EditTemplateModal } from '../components/hr/modals/TemplateEditor';
import { AddCheckinModal } from '../components/hr/modals/AddCheckin';
import { AddReviewModal } from '../components/hr/modals/AddReview';
import { AddNoteModal } from '../components/hr/modals/AddNote';
import { EditEmployeeModal } from '../components/hr/modals/EditEmployee';
import { CareerDevelopment } from '../components/hr/CareerDevelopment';
import { ToastContainer, ToastItem } from '../components/shared/Toast';

export type HRTab = 'dashboard' | 'employees' | 'templates' | 'checkins' | 'career' | 'detail' | 'settings';

async function logActivity(employeeId: string | null, action: string) {
  await supabase.from('activity_log').insert({ employee_id: employeeId, action, created_at: new Date().toISOString() });
}

export function HRApp() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<HRTab>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Record<string, OnboardingTask[]>>({});
  const [templates, setTemplates] = useState<TemplateWithTasks[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [empReviews, setEmpReviews] = useState<Record<string, Review[]>>({});
  const [empDevPlans, setEmpDevPlans] = useState<Record<string, DevelopmentPlan[]>>({});
  const [empCertifications, setEmpCertifications] = useState<Record<string, Certification[]>>({});
  const [empCheckins, setEmpCheckins] = useState<Record<string, Checkin[]>>({});
  const [notes, setNotes] = useState<Record<string, EmployeeNote[]>>({});
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: string; eid?: string } | null>(null);
  const [editEmpId, setEditEmpId] = useState<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const isMobile = useMobile();

  function showToast(message: string, type: ToastItem['type'] = 'success') {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }
  function removeToast(id: string) { setToasts(prev => prev.filter(t => t.id !== id)); }

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    setEmployees(data ?? []);
  }, []);

  const loadTasks = useCallback(async (empId: string) => {
    const { data } = await supabase.from('onboarding_tasks').select('*').eq('employee_id', empId).order('created_at');
    setTasks(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadTemplates = useCallback(async () => {
    const { data: tpls } = await supabase.from('onboarding_templates').select('*').order('created_at');
    if (!tpls) return;
    const tplsWithTasks: TemplateWithTasks[] = await Promise.all(
      tpls.map(async t => {
        const { data: tt } = await supabase.from('template_tasks').select('*').eq('template_id', t.id).order('days_from_start');
        return { ...t, tasks: tt ?? [] };
      })
    );
    setTemplates(tplsWithTasks);
  }, []);

  const loadDepartments = useCallback(async () => {
    const { data } = await supabase.from('departments').select('name').order('name');
    setDepartments(data?.map(d => d.name) ?? []);
  }, []);

  const loadCompanies = useCallback(async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data ?? []);
  }, []);

  const loadPathways = useCallback(async () => {
    const { data } = await supabase.from('pathways').select('*').order('name');
    setPathways(data ?? []);
  }, []);

  const loadEmpReviews = useCallback(async (empId: string) => {
    const { data } = await supabase.from('reviews').select('*').eq('employee_id', empId).order('review_date', { ascending: false });
    setEmpReviews(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadEmpDevPlans = useCallback(async (empId: string) => {
    const { data } = await supabase.from('development_plans').select('*').eq('employee_id', empId).order('created_at');
    setEmpDevPlans(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadEmpCertifications = useCallback(async (empId: string) => {
    const { data } = await supabase.from('certifications').select('*').eq('employee_id', empId).order('created_at');
    setEmpCertifications(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadEmpCheckins = useCallback(async (empId: string) => {
    const { data } = await supabase.from('checkins').select('*').eq('employee_id', empId).order('checkin_date', { ascending: false });
    setEmpCheckins(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadNotes = useCallback(async (empId: string) => {
    const { data } = await supabase.from('employee_notes').select('*').eq('employee_id', empId).order('created_at', { ascending: false });
    setNotes(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadActivity = useCallback(async () => {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20);
    setActivity(data ?? []);
  }, []);

  const loadDocumentsForEmp = useCallback(async (empId: string) => {
    const { data } = await supabase.from('documents').select('*').eq('employee_id', empId).order('created_at');
    setDocuments(prev => {
      const withoutEmp = prev.filter(d => d.employee_id !== empId);
      return [...withoutEmp, ...(data ?? [])];
    });
  }, []);

  // Initial load
  useEffect(() => {
    loadEmployees();
    loadTemplates();
    loadDepartments();
    loadCompanies();
    loadPathways();
    loadActivity();
    supabase.from('schedules').select('*').is('employee_id', null).order('time_label').then(({ data }) => setSchedules(data ?? []));
  }, [loadEmployees, loadTemplates, loadDepartments, loadCompanies, loadPathways, loadActivity]);

  // Real-time subscriptions
  useEffect(() => {
    // Clean up previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    const empChannel = supabase
      .channel('hr-employees-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, payload => {
        if (payload.eventType === 'INSERT') {
          setEmployees(prev => [payload.new as Employee, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setEmployees(prev => prev.map(e => e.id === (payload.new as Employee).id ? payload.new as Employee : e));
        } else if (payload.eventType === 'DELETE') {
          setEmployees(prev => prev.filter(e => e.id !== (payload.old as Employee).id));
        }
      })
      .subscribe();

    const tasksChannel = supabase
      .channel('hr-tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_tasks' }, payload => {
        const record = (payload.new ?? payload.old) as OnboardingTask;
        const empId = record?.employee_id;
        if (!empId) return;
        if (payload.eventType === 'INSERT') {
          setTasks(prev => ({ ...prev, [empId]: [...(prev[empId] ?? []), payload.new as OnboardingTask] }));
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => ({
            ...prev,
            [empId]: (prev[empId] ?? []).map(t => t.id === (payload.new as OnboardingTask).id ? payload.new as OnboardingTask : t),
          }));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => ({
            ...prev,
            [empId]: (prev[empId] ?? []).filter(t => t.id !== (payload.old as OnboardingTask).id),
          }));
        }
      })
      .subscribe();

    const docsChannel = supabase
      .channel('hr-documents-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, payload => {
        if (payload.eventType === 'INSERT') {
          setDocuments(prev => [...prev, payload.new as Document]);
        } else if (payload.eventType === 'UPDATE') {
          setDocuments(prev => prev.map(d => d.id === (payload.new as Document).id ? payload.new as Document : d));
        } else if (payload.eventType === 'DELETE') {
          setDocuments(prev => prev.filter(d => d.id !== (payload.old as Document).id));
        }
      })
      .subscribe();

    const actChannel = supabase
      .channel('hr-activity-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, payload => {
        setActivity(prev => [payload.new as ActivityLog, ...prev].slice(0, 20));
      })
      .subscribe();

    channelsRef.current = [empChannel, tasksChannel, docsChannel, actChannel];

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      if (!tasks[selectedEmpId]) loadTasks(selectedEmpId);
      if (!notes[selectedEmpId]) loadNotes(selectedEmpId);
      loadDocumentsForEmp(selectedEmpId);
      loadEmpReviews(selectedEmpId);
      loadEmpDevPlans(selectedEmpId);
      loadEmpCertifications(selectedEmpId);
      loadEmpCheckins(selectedEmpId);
    }
  }, [selectedEmpId, tasks, notes, loadTasks, loadNotes, loadDocumentsForEmp, loadEmpReviews, loadEmpDevPlans, loadEmpCertifications, loadEmpCheckins]);

  // DB trigger now handles all progress/status/lifecycle recalculation.
  // No frontend auto-promote needed — the trigger fires on every task change.

  async function viewEmployee(id: string) {
    setSelectedEmpId(id);
    setTab('detail');
    // Fetch fresh employee record — never trust cached version for detail view
    const { data } = await supabase.from('employees').select('*').eq('id', id).maybeSingle();
    if (data) setEmployees(prev => prev.map(e => e.id === id ? data as Employee : e));
  }

  async function toggleTask(taskId: string) {
    if (!selectedEmpId) return;
    const empTasks = tasks[selectedEmpId] ?? [];
    const task = empTasks.find(t => t.id === taskId);
    if (!task) return;
    const isCompleting = task.status !== 'complete';
    const newStatus = isCompleting ? 'complete' : 'in-progress';
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: newStatus };
    if (isCompleting) { updates.completed_at = now; updates.archived = true; }
    else { updates.completed_at = null; updates.archived = false; }

    // Write task — DB trigger recalculates employees.progress/status automatically
    await supabase.from('onboarding_tasks').update(updates).eq('id', taskId);

    // Optimistic local update for instant UI response
    const updated = empTasks.map(t => t.id === taskId
      ? { ...t, status: newStatus as import('../lib/database.types').TaskStatus, archived: isCompleting, completed_at: isCompleting ? now : null }
      : t
    );
    setTasks(prev => ({ ...prev, [selectedEmpId]: updated }));

    const emp = employees.find(e => e.id === selectedEmpId);
    await logActivity(selectedEmpId, `${isCompleting ? 'Completed' : 'Reopened'} task "${task.title}"${emp ? ` for ${emp.name}` : ''}`);
    // Real-time subscription on employees table will deliver the DB-computed values
  }

  async function taskStatusChange(taskId: string, status: string) {
    if (!selectedEmpId) return;
    // Write task — DB trigger handles employee progress recalculation
    await supabase.from('onboarding_tasks').update({ status }).eq('id', taskId);
    const updated = (tasks[selectedEmpId] ?? []).map(t => t.id === taskId ? { ...t, status: status as import('../lib/database.types').TaskStatus } : t);
    setTasks(prev => ({ ...prev, [selectedEmpId]: updated }));
    // Real-time subscription on employees table delivers correct recalculated values
  }

  function taskTriageChange(taskId: string, triage: 'critical' | 'normal') {
    if (!selectedEmpId) return;
    const updated = (tasks[selectedEmpId] ?? []).map(t => t.id === taskId ? { ...t, triage } : t);
    setTasks(prev => ({ ...prev, [selectedEmpId]: updated }));
  }

  async function archiveEmployee(id: string) {
    const emp = employees.find(e => e.id === id);
    await supabase.from('employees').update({ archived: true }).eq('id', id);
    await logActivity(id, `Archived employee ${emp?.name ?? id}`);
    setTab('employees');
    // Real-time subscription handles state update
  }

  async function restoreEmployee(id: string) {
    const emp = employees.find(e => e.id === id);
    await supabase.from('employees').update({ archived: false }).eq('id', id);
    await logActivity(id, `Restored employee ${emp?.name ?? id}`);
    // Real-time subscription handles state update
  }

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  const hrTabTitle: Record<string, string> = {
    dashboard: 'Dashboard', employees: 'Employees', templates: 'Templates',
    checkins: 'Check-ins', career: 'Career Dev', settings: 'Settings', detail: 'Employee Detail',
  };

  if (isMobile) {
    return (
      <>
        <MobileLayout
          title={hrTabTitle[tab] ?? 'HR'}
          isHR={true}
          userName={profile?.email?.split('@')[0] ?? 'HR Admin'}
          userInitials="HR"
          onSignOut={signOut}
          activeTab={tab}
          onTabChange={(t: string) => { setTab(t as HRTab); if (t !== 'detail') setSelectedEmpId(null); }}
          fabActions={
            tab === 'employees' || tab === 'dashboard'
              ? [{ label: 'Add Employee', onClick: () => setModal({ type: 'add-emp' }) }]
              : []
          }
        >
          {tab === 'dashboard' && (
            <MobileDashboard
              employee={{ id: '', name: profile?.email?.split('@')[0] ?? 'HR', email: profile?.email ?? '', phone: null, role: 'HR Administrator', department: null, team_id: null, manager: null, manager_user_id: null, start_date: null, status: 'complete', phase: 'active', progress: 100, archived: false, user_id: null, avatar_url: null, bio: null, onboarding_completed_at: null, lifecycle_status: 'active', birthday_month: null, birthday_day: null, company_id: null, created_at: '', current_level: null, next_level: null, pathway_id: null, readiness_level: null, current_status: null, employment_type: null }}
              tasks={[]}
              schedules={[]}
              announcement={null}
              onToggleTask={() => {}}
              onTab={t => setTab(t as HRTab)}
            />
          )}
          {(tab === 'employees' || tab === 'detail') && (
            <MobileHREmployees
              employees={employees}
              onView={(id: string) => viewEmployee(id)}
              onEdit={(id: string) => setEditEmpId(id)}
            />
          )}
          {tab === 'settings' && (
            <MobileHRSettings
              onOrgTab={() => setTab('settings')}
              onSignOut={signOut}
              employees={employees.filter(e => !e.archived)}
              onDepartmentChanged={loadDepartments}
            />
          )}
          {tab === 'templates' && (
            <HRTemplates templates={templates} onOpenModal={(type, eid) => setModal({ type, eid })} />
          )}
          {tab === 'checkins' && (
            <HRCheckins
              employees={employees.filter(e => !e.archived)}
              checkins={[]}
              reviews={[]}
              onOpenModal={(type, eid) => setModal({ type, eid })}
              onCheckinUpdated={() => {}}
              onReviewUpdated={() => {}}
            />
          )}
        </MobileLayout>
        {modal?.type === 'add-emp' && (
          <AddEmployeeModal
            departments={departments}
            companies={companies}
            onClose={() => setModal(null)}
            onCreated={async (newEmp) => {
              if (newEmp) setEmployees(prev => [newEmp, ...prev]);
              await loadActivity();
              showToast('Employee added successfully');
            }}
          />
        )}
        {editEmpId && (() => {
          const emp = employees.find(e => e.id === editEmpId);
          return emp ? (
            <EditEmployeeModal
              employee={emp}
              departments={departments}
              companies={companies}
              employees={employees}
              pathways={pathways}
              onClose={() => setEditEmpId(null)}
              onSaved={async updated => {
                setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
                setEditEmpId(null);
                await logActivity(updated.id, `HR updated profile for ${updated.name}`);
              }}
            />
          ) : null;
        })()}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
    <div className="app-shell">
      <HRSidebar tab={tab} onTab={t => { setTab(t as HRTab); if (t !== 'detail') setSelectedEmpId(null); }} />
      <div className="main-area">
        {tab === 'dashboard' && (
          <HRDashboard
            employees={employees}
            activity={activity}
            checkins={[]}
            reviews={[]}
            onViewEmployee={viewEmployee}
            onOpenModal={(type, eid) => setModal({ type, eid })}
            onTab={t => setTab(t as HRTab)}
          />
        )}
        {tab === 'employees' && (
          <EmployeeList
            employees={employees}
            companies={companies}
            departments={departments}
            onViewEmployee={viewEmployee}
            onOpenModal={(type, eid) => setModal({ type, eid })}
            onRestoreEmployee={restoreEmployee}
            onEditEmployee={id => setEditEmpId(id)}
          />
        )}
        {tab === 'templates' && (
          <HRTemplates templates={templates} onOpenModal={(type, eid) => setModal({ type, eid })} />
        )}
        {tab === 'checkins' && (
          <HRCheckins
            employees={employees.filter(e => !e.archived)}
            checkins={[]}
            reviews={[]}
            onOpenModal={(type, eid) => setModal({ type, eid })}
            onCheckinUpdated={() => {}}
            onReviewUpdated={() => {}}
          />
        )}
        {tab === 'career' && (
          <CareerDevelopment
            employees={employees.filter(e => !e.archived)}
            pathways={pathways}
            onViewEmployee={viewEmployee}
          />
        )}
        {tab === 'settings' && (
          <HRSettings employees={employees.filter(e => !e.archived)} onCheckinUpdated={() => {}} onReviewUpdated={() => {}} onDepartmentChanged={loadDepartments} />
        )}
        {tab === 'detail' && selectedEmp && (
          <EmployeeDetail
            employee={selectedEmp}
            tasks={tasks[selectedEmp.id] ?? []}
            documents={documents}
            schedules={schedules}
            checkins={empCheckins[selectedEmp.id] ?? []}
            reviews={empReviews[selectedEmp.id] ?? []}
            developmentPlans={empDevPlans[selectedEmp.id] ?? []}
            certifications={empCertifications[selectedEmp.id] ?? []}
            notes={notes[selectedEmp.id] ?? []}
            companies={companies}
            pathways={pathways}
            onBack={() => setTab('employees')}
            onOpenModal={(type, eid) => setModal({ type, eid })}
            onToggleTask={toggleTask}
            onTaskStatusChange={taskStatusChange}
            onTaskTriageChange={taskTriageChange}
            onArchive={archiveEmployee}
            onRestore={restoreEmployee}
            onEditEmployee={id => setEditEmpId(id)}
            onDocumentsChanged={loadDocumentsForEmp}
            onDataChanged={empId => {
              loadEmpReviews(empId);
              loadEmpDevPlans(empId);
              loadEmpCertifications(empId);
              loadEmpCheckins(empId);
            }}
          />
        )}
      </div>

      {modal?.type === 'add-emp' && (
        <AddEmployeeModal
          departments={departments}
          companies={companies}
          onClose={() => setModal(null)}
          onCreated={async (newEmp) => {
            if (newEmp) {
              setEmployees(prev => [newEmp, ...prev]);
            }
            await loadActivity();
            showToast('Employee added successfully');
          }}
        />
      )}
      {modal?.type === 'add-dept' && (
        <AddDepartmentModal onClose={() => setModal(null)} onCreated={() => loadDepartments()} />
      )}
      {modal?.type === 'add-task' && modal.eid && (() => {
        const taskEmp = employees.find(e => e.id === modal.eid);
        return <AddTaskModal
          employeeId={modal.eid}
          employee={taskEmp}
          assignedByRole="hr"
          assignedByName={profile?.email ?? undefined}
          onClose={() => setModal(null)}
          onCreated={async () => {
            if (modal.eid) {
              await loadTasks(modal.eid);
              await logActivity(modal.eid, `HR added a task to ${taskEmp?.name ?? modal.eid}`);
              await loadActivity();
            }
          }}
        />;
      })()}
      {modal?.type === 'send-invite' && modal.eid && (() => {
        const emp = employees.find(e => e.id === modal.eid);
        return emp ? <SendInviteModal employee={emp} onClose={() => setModal(null)} /> : null;
      })()}
      {modal?.type === 'apply-template' && (
        <ApplyTemplateModal
          templates={templates}
          employees={employees.filter(e => !e.archived)}
          defaultTemplateId={modal.eid}
          onClose={() => setModal(null)}
          onApplied={eid => { loadTasks(eid); viewEmployee(eid); }}
        />
      )}
      {modal?.type === 'new-template' && (
        <CreateTemplateModal departments={departments} onClose={() => setModal(null)} onCreated={loadTemplates} />
      )}
      {modal?.type === 'edit-template' && modal.eid && (() => {
        const tpl = templates.find(t => t.id === modal.eid);
        return tpl ? <EditTemplateModal template={tpl} departments={departments} onClose={() => setModal(null)} onUpdated={loadTemplates} /> : null;
      })()}
      {modal?.type === 'add-checkin' && (
        <AddCheckinModal
          employees={employees.filter(e => !e.archived)}
          defaultEmpId={modal.eid}
          onClose={() => setModal(null)}
          onCreated={async () => {
            if (modal.eid) {
              const emp = employees.find(e => e.id === modal.eid);
              await logActivity(modal.eid ?? null, `Scheduled check-in for ${emp?.name ?? modal.eid}`);
              await loadActivity();
            }
          }}
        />
      )}
      {modal?.type === 'add-review' && (
        <AddReviewModal
          employees={employees.filter(e => !e.archived)}
          defaultEmpId={modal.eid}
          onClose={() => setModal(null)}
          onCreated={async () => {
            if (modal.eid) {
              const emp = employees.find(e => e.id === modal.eid);
              await logActivity(modal.eid ?? null, `Scheduled annual review for ${emp?.name ?? modal.eid}`);
              await loadActivity();
            }
          }}
        />
      )}
      {modal?.type === 'add-note' && modal.eid && (
        <AddNoteModal
          employeeId={modal.eid}
          onClose={() => setModal(null)}
          onCreated={async () => {
            if (modal.eid) {
              await loadNotes(modal.eid);
              const emp = employees.find(e => e.id === modal.eid);
              await logActivity(modal.eid, `HR added a note for ${emp?.name ?? modal.eid}`);
              await loadActivity();
            }
          }}
        />
      )}
      {editEmpId && (() => {
        const emp = employees.find(e => e.id === editEmpId);
        return emp ? (
          <EditEmployeeModal
            employee={emp}
            departments={departments}
            companies={companies}
            employees={employees}
            pathways={pathways}
            onClose={() => setEditEmpId(null)}
            onSaved={async updated => {
              setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
              setEditEmpId(null);
              await logActivity(updated.id, `HR updated profile for ${updated.name}`);
              await loadActivity();
            }}
          />
        ) : null;
      })()}
    </div>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
