import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, OnboardingTask, Document, Schedule, Pathway } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useViewer } from '../contexts/ViewerContext';
import { visibleEmployees } from '../lib/visibility';
import { NotificationBell } from '../components/shared/NotificationBell';
import { ManagerSidebar } from '../components/manager/Sidebar';
import { ManagerDashboard } from '../components/manager/Dashboard';
import { ManagerTeam } from '../components/manager/Team';
import { ManagerEmployeeDetail } from '../components/manager/EmployeeDetail';
import { AddTaskModal } from '../components/hr/modals/AddTask';
import { computeProgress } from '../components/shared/utils';

export type ManagerTab = 'dashboard' | 'team' | 'detail';

export function ManagerApp() {
  const { profile } = useAuth();
const viewer = useViewer();
  const [tab, setTab] = useState<ManagerTab>('dashboard');
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  const [team, setTeam] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Record<string, OnboardingTask[]>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: string; eid?: string } | null>(null);

  const loadTeam = useCallback(async () => {
    if (!viewer) return;

    let query = supabase.from('employees')
      .select('*')
      .eq('archived', false)
      .neq('is_test_account', true);

    if (viewer.role === 'manager') {
      if (viewer.scope === 'app_wide_reports') {
        // No additional filter — manager sees everyone
      } else if (viewer.scope === 'company_reports' && viewer.company_id) {
        query = query.eq('company_id', viewer.company_id);
      } else {
        // direct_reports (default) — only their direct reports + applicants they hire
        if (!viewer.employee_id) { setTeam([]); return; }
        query = query.or(
          `manager_user_id.eq.${viewer.user_id},manager_id.eq.${viewer.employee_id},hiring_manager_id.eq.${viewer.employee_id}`
        );
      }
    }

    const { data } = await query.order('created_at', { ascending: false });
    setTeam(visibleEmployees(viewer, data ?? []));
  }, [viewer]);

  const loadMyProfile = useCallback(async () => {
    if (!profile?.employee_id) return;
    const { data } = await supabase.from('employees').select('*').eq('id', profile.employee_id).maybeSingle();
    if (data) setMyEmployee(data);
  }, [profile?.employee_id]);

  const loadTasks = useCallback(async (empId: string) => {
    const { data } = await supabase.from('onboarding_tasks').select('*').eq('employee_id', empId).order('created_at');
    setTasks(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  useEffect(() => {
    loadTeam();
    loadMyProfile();
    supabase.from('documents').select('*').eq('visible_to_employee', true).order('created_at').then(({ data }) => setDocuments(data ?? []));
    supabase.from('schedules').select('*').is('employee_id', null).order('time_label').then(({ data }) => setSchedules(data ?? []));
    supabase.from('pathways').select('*').eq('active', true).order('name').then(({ data }) => setPathways(data ?? []));
  }, [loadTeam, loadMyProfile]);

  useEffect(() => {
    if (selectedEmpId && !tasks[selectedEmpId]) loadTasks(selectedEmpId);
  }, [selectedEmpId, tasks, loadTasks]);

  function viewEmployee(id: string) {
    setSelectedEmpId(id);
    setTab('detail');
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
    await supabase.from('onboarding_tasks').update(updates).eq('id', taskId);
    const updated = empTasks.map(t => t.id === taskId
      ? { ...t, status: newStatus as OnboardingTask['status'], archived: isCompleting, completed_at: isCompleting ? now : null }
      : t
    );
    setTasks(prev => ({ ...prev, [selectedEmpId]: updated }));
    const onboardingTasks = updated.filter(t => t.task_phase === 'onboarding');
    const { pct, status } = computeProgress(onboardingTasks);
    await supabase.from('employees').update({ progress: pct, status }).eq('id', selectedEmpId);
    setTeam(prev => prev.map(e => e.id === selectedEmpId ? { ...e, progress: pct, status: status as Employee['status'] } : e));
  }

  async function taskStatusChange(taskId: string, status: string) {
    if (!selectedEmpId) return;
    await supabase.from('onboarding_tasks').update({ status }).eq('id', taskId);
    const updated = (tasks[selectedEmpId] ?? []).map(t => t.id === taskId ? { ...t, status: status as OnboardingTask['status'] } : t);
    setTasks(prev => ({ ...prev, [selectedEmpId]: updated }));
    const onboardingTasks = updated.filter(t => t.task_phase === 'onboarding');
    const { pct, status: newStatus } = computeProgress(onboardingTasks);
    await supabase.from('employees').update({ progress: pct, status: newStatus }).eq('id', selectedEmpId);
    setTeam(prev => prev.map(e => e.id === selectedEmpId ? { ...e, progress: pct, status: newStatus as Employee['status'] } : e));
  }

  const selectedEmp = team.find(e => e.id === selectedEmpId);

  return (
    <div className="app-shell">
      {profile?.id && (
        <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 50 }}>
          <NotificationBell
            userId={profile.id}
            onNavigate={(linkType) => {
              if (linkType === 'task') setTab('team');
              else if (linkType === 'checkin' || linkType === 'review') setTab('team');
              else if (linkType === 'document') setTab('team');
            }}
          />
        </div>
      )}
      <ManagerSidebar
        myEmployee={myEmployee}
        tab={tab}
        onTab={t => { setTab(t as ManagerTab); if (t !== 'detail') setSelectedEmpId(null); }}
      />
      <div className="main-area">
        {tab === 'dashboard' && (
          <ManagerDashboard
            team={team}
            myEmployee={myEmployee}
            onViewEmployee={viewEmployee}
            onOpenModal={(type, eid) => setModal({ type, eid })}
          />
        )}
        {tab === 'team' && (
          <ManagerTeam
            team={team}
            onViewEmployee={viewEmployee}
            onOpenModal={(type, eid) => setModal({ type, eid })}
          />
        )}
        {tab === 'detail' && selectedEmp && (
          <ManagerEmployeeDetail
            employee={selectedEmp}
            tasks={tasks[selectedEmp.id] ?? []}
            documents={documents}
            schedules={schedules}
            pathways={pathways}
            onBack={() => setTab('team')}
            onOpenModal={(type, eid) => setModal({ type, eid })}
            onToggleTask={toggleTask}
            onTaskStatusChange={taskStatusChange}
          />
        )}
      </div>

      {modal?.type === 'add-task' && modal.eid && (() => {
        const taskEmp = team.find(e => e.id === modal.eid);
        return (
          <AddTaskModal
            employeeId={modal.eid}
            employee={taskEmp}
            assignedByRole="manager"
            assignedByName={myEmployee?.name ?? profile?.email ?? undefined}
            onClose={() => setModal(null)}
            onCreated={() => { if (modal.eid) loadTasks(modal.eid); }}
          />
        );
      })()}
    </div>
  );
}
