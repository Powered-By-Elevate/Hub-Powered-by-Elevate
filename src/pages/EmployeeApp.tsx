import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, OnboardingTask, Document, Schedule, Contact, QuarterlyCheckin, AnnualReview, HRAnnouncement } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { EmpSidebar } from '../components/employee/Sidebar';
import { EmpOverview } from '../components/employee/Overview';
import { EmpTasks } from '../components/employee/Tasks';
import { EmpSchedule } from '../components/employee/Schedule';
import { EmpDocuments } from '../components/employee/Documents';
import { EmpContacts } from '../components/employee/Contacts';
import { EmpTeam } from '../components/employee/Team';
import { EmpCheckins } from '../components/employee/Checkins';
import { AddTaskModal } from '../components/hr/modals/AddTask';
import { MobileLayout } from '../components/mobile/MobileLayout';
import { MobileDashboard } from '../components/mobile/MobileDashboard';
import { MobileDocuments } from '../components/mobile/MobileDocuments';

function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function ini(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export type EmpTab = 'overview' | 'tasks' | 'schedule' | 'documents' | 'contacts' | 'team' | 'checkins' | 'more';

async function logActivity(employeeId: string, action: string) {
  await supabase.from('activity_log').insert({ employee_id: employeeId, action, created_at: new Date().toISOString() });
}

export function EmployeeApp() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<EmpTab>('overview');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teammates, setTeammates] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [checkins, setCheckins] = useState<QuarterlyCheckin[]>([]);
  const [reviews, setReviews] = useState<AnnualReview[]>([]);
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const empIdRef = useRef<string | null>(null);
  const isMobile = useMobile();

  const loadDocuments = useCallback(async (empId: string) => {
    const { data } = await supabase.from('documents')
      .select('*')
      .eq('visible_to_employee', true)
      .or(`employee_id.is.null,employee_id.eq.${empId}`)
      .order('created_at');
    setDocuments(data ?? []);
  }, []);

  const loadData = useCallback(async () => {
    if (!profile?.employee_id) return;
    const empId = profile.employee_id;

    const [empRes, taskRes, schedRes, contactRes, checkinRes, reviewRes, announcementRes] = await Promise.all([
      supabase.from('employees').select('*').eq('id', empId).single(),
      supabase.from('onboarding_tasks').select('*').eq('employee_id', empId).order('created_at'),
      supabase.from('schedules').select('*').or('employee_id.is.null,employee_id.eq.' + empId).order('schedule_date').order('time_label'),
      supabase.from('contacts').select('*').order('is_primary', { ascending: false }),
      supabase.from('quarterly_checkins').select('*').eq('employee_id', empId).order('scheduled_at', { ascending: false }),
      supabase.from('annual_reviews').select('*').eq('employee_id', empId).order('review_year', { ascending: false }),
      supabase.from('hr_announcements').select('*').eq('active', true),
    ]);

    const allTasks: OnboardingTask[] = taskRes.data ?? [];
    setTasks(allTasks);
    setSchedules(schedRes.data ?? []);
    setContacts(contactRes.data ?? []);
    setCheckins(checkinRes.data ?? []);
    setReviews(reviewRes.data ?? []);
    setAnnouncements(announcementRes.data ?? []);

    if (empRes.data) {
      let emp: Employee = empRes.data;
      empIdRef.current = emp.id;

      // Repair: if all onboarding tasks are complete but lifecycle_status wasn't updated
      if (emp.lifecycle_status === 'onboarding' && allTasks.length > 0) {
        const onboardingTasks = allTasks.filter(t => t.task_phase === 'onboarding');
        if (onboardingTasks.length > 0 && onboardingTasks.every(t => t.status === 'complete')) {
          const now = new Date().toISOString();
          await supabase.from('employees').update({
            lifecycle_status: 'active',
            phase: 'active',
            progress: 100,
            onboarding_completed_at: now,
          }).eq('id', emp.id);
          emp = { ...emp, lifecycle_status: 'active', phase: 'active', progress: 100, onboarding_completed_at: now };
        }
      }

      setEmployee(emp);
      await loadDocuments(emp.id);

      const { data: allEmps } = await supabase.from('employees').select('*').eq('archived', false);
      setAllEmployees(allEmps ?? []);

      if (emp.department) {
        const mates = (allEmps ?? []).filter(e => e.department === emp.department && e.id !== emp.id);
        setTeammates(mates);
      }
    }
  }, [profile?.employee_id, loadDocuments]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time subscriptions for employee-facing data
  useEffect(() => {
    if (!profile?.employee_id) return;
    const empId = profile.employee_id;

    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    // Tasks: re-fetch tasks and recompute progress when tasks change
    const tasksChannel = supabase
      .channel('emp-tasks-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'onboarding_tasks',
        filter: `employee_id=eq.${empId}`,
      }, async () => {
        const { data } = await supabase.from('onboarding_tasks').select('*').eq('employee_id', empId).order('created_at');
        setTasks(data ?? []);
      })
      .subscribe();

    // Employee record: sync profile changes (progress, lifecycle, etc.) made by HR
    const empChannel = supabase
      .channel('emp-profile-rt')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'employees',
        filter: `id=eq.${empId}`,
      }, payload => {
        setEmployee(payload.new as Employee);
      })
      .subscribe();

    // Documents: refresh when HR uploads or deletes docs for this employee
    const docsChannel = supabase
      .channel('emp-docs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, async () => {
        const currentEmpId = empIdRef.current;
        if (currentEmpId) await loadDocuments(currentEmpId);
      })
      .subscribe();

    channelsRef.current = [tasksChannel, empChannel, docsChannel];

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [profile?.employee_id, loadDocuments]);

  async function toggleTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !employee) return;
    const isCompleting = task.status !== 'complete';
    const now = new Date().toISOString();
    const taskUpdates: Record<string, unknown> = isCompleting
      ? { status: 'complete', completed_at: now, archived: true }
      : { status: 'in-progress', completed_at: null, archived: false };

    // Write task — DB trigger recalculates employees.progress/status/lifecycle automatically
    const { error: taskErr } = await supabase.from('onboarding_tasks').update(taskUpdates).eq('id', taskId);
    if (taskErr) return;

    // Optimistic local task update for instant UI response
    const updated = tasks.map(t => t.id === taskId
      ? { ...t, status: (isCompleting ? 'complete' : 'in-progress') as OnboardingTask['status'], archived: isCompleting, completed_at: isCompleting ? now : null }
      : t
    );
    setTasks(updated);

    // Log to activity
    await logActivity(employee.id, `${isCompleting ? 'Completed' : 'Reopened'} task "${task.title}"`);

    // Real-time subscription on employees table (filtered to this employee) delivers
    // the DB-computed progress, status, and lifecycle_status automatically.
    // No manual employees.update() needed — the DB trigger handles it.
  }

  if (!employee) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  const onboardingTasks = tasks.filter(t => t.task_phase === 'onboarding');
  const done = onboardingTasks.filter(t => t.status === 'complete').length;
  const pct = onboardingTasks.length ? Math.round((done / onboardingTasks.length) * 100) : 0;
  const activeAnnouncement = announcements[0] ?? null;
  const isActive = employee.lifecycle_status === 'active';

  const moreItems = isActive
    ? [
        { id: 'team', label: 'My Team', icon: '👥' },
        { id: 'contacts', label: 'Contacts', icon: '👤' },
        { id: 'checkins', label: 'Check-ins', icon: '📊' },
      ]
    : [{ id: 'contacts', label: 'Contacts', icon: '👤' }];

  const moreTabIds = moreItems.map(i => i.id);

  async function handleDocDelete(id: string, filePath: string) {
    if (!employee) return;
    await supabase.storage.from('employee-documents').remove([filePath]);
    await supabase.from('documents').delete().eq('id', id);
    await loadDocuments(employee.id);
  }

  async function handleDocAcknowledge(id: string) {
    if (!employee) return;
    await supabase.from('documents').update({ acknowledged_at: new Date().toISOString() }).eq('id', id);
    await loadDocuments(employee.id);
  }

  if (isMobile) {
    const tabTitle: Record<string, string> = {
      overview: isActive ? 'Dashboard' : 'My Onboarding',
      tasks: 'My Tasks',
      schedule: 'Schedule',
      documents: 'Documents',
      team: 'My Team',
      contacts: 'Contacts',
      checkins: 'Check-ins',
      more: 'More',
    };
    const moreActiveTab = moreTabIds.includes(tab) ? tab : undefined;

    return (
      <>
        <MobileLayout
          title={tabTitle[tab] ?? 'Employee Hub'}
          isHR={false}
          userName={employee.name}
          userInitials={ini(employee.name)}
          onSignOut={signOut}
          activeTab={tab}
          onTabChange={t => setTab(t as EmpTab)}
          moreItems={moreItems}
          moreActiveTab={moreActiveTab}
          fabActions={tab === 'tasks' ? [{ label: 'Add Task', onClick: () => setShowAddTask(true) }] : []}
        >
          {(tab === 'overview') && (
            <MobileDashboard
              employee={employee}
              tasks={tasks}
              schedules={schedules}
              announcement={activeAnnouncement}
              onToggleTask={toggleTask}
              onTab={t => setTab(t as EmpTab)}
            />
          )}
          {tab === 'tasks' && (
            <EmpTasks tasks={tasks} onToggle={toggleTask} onAddTask={() => setShowAddTask(true)} employee={employee} />
          )}
          {tab === 'schedule' && (
            <EmpSchedule employee={employee} schedules={schedules} checkins={checkins} reviews={reviews} />
          )}
          {tab === 'documents' && (
            <MobileDocuments
              documents={documents}
              isHR={false}
              employeeId={employee.id}
              onDelete={handleDocDelete}
              onAcknowledge={handleDocAcknowledge}
            />
          )}
          {tab === 'contacts' && (
            <EmpContacts contacts={contacts} employee={employee} allEmployees={allEmployees.length > 0 ? allEmployees : [employee, ...teammates]} />
          )}
          {tab === 'team' && (
            <EmpTeam employee={employee} teammates={teammates} allEmployees={allEmployees} schedules={schedules} />
          )}
          {tab === 'checkins' && (
            <EmpCheckins checkins={checkins} reviews={reviews} employee={employee} />
          )}
        </MobileLayout>
        {showAddTask && (
          <AddTaskModal
            employeeId={employee.id}
            assignedByRole="employee"
            assignedByName={employee.name}
            onClose={() => setShowAddTask(false)}
            onCreated={async () => {
              setShowAddTask(false);
              await logActivity(employee.id, `${employee.name} added a task`);
              await loadData();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      <EmpSidebar employee={employee} tab={tab} onTab={setTab} />
      <div className="main-area">
        {tab === 'overview' && (
          <EmpOverview
            employee={employee}
            tasks={tasks}
            schedules={schedules}
            announcements={announcements}
            pct={pct}
            onTab={setTab}
            onToggle={toggleTask}
          />
        )}
        {tab === 'tasks' && (
          <EmpTasks
            tasks={tasks}
            onToggle={toggleTask}
            onAddTask={() => setShowAddTask(true)}
            employee={employee}
          />
        )}
        {tab === 'schedule' && (
          <EmpSchedule
            employee={employee}
            schedules={schedules}
            checkins={checkins}
            reviews={reviews}
          />
        )}
        {tab === 'documents' && <EmpDocuments documents={documents} />}
        {tab === 'contacts' && <EmpContacts contacts={contacts} employee={employee} allEmployees={allEmployees.length > 0 ? allEmployees : [employee, ...teammates]} />}
        {tab === 'team' && <EmpTeam employee={employee} teammates={teammates} allEmployees={allEmployees} schedules={schedules} />}
        {tab === 'checkins' && <EmpCheckins checkins={checkins} reviews={reviews} employee={employee} />}
      </div>
      {showAddTask && employee && (
        <AddTaskModal
          employeeId={employee.id}
          assignedByRole="employee"
          assignedByName={employee.name}
          onClose={() => setShowAddTask(false)}
          onCreated={async () => {
            setShowAddTask(false);
            await logActivity(employee.id, `${employee.name} added a task`);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
