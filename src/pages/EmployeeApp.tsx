import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, OnboardingTask, Document, Schedule, Contact, HRAnnouncement, Review, DevelopmentPlan, Certification, Checkin, Pathway, QuarterlyCheckin, AnnualReview, LifecycleCheckin } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useViewer } from '../contexts/ViewerContext';
import { visibleEmployees } from '../lib/visibility';
import { EmpSidebar } from '../components/employee/Sidebar';
import { EmpOverview } from '../components/employee/Overview';
import { EmpTasks } from '../components/employee/Tasks';
import { EmpSchedule } from '../components/employee/Schedule';
import { EmpDocuments } from '../components/employee/Documents';
import { EmpContacts } from '../components/employee/Contacts';
import { EmpTeam } from '../components/employee/Team';
import { EmpCheckins } from '../components/employee/Checkins';
import { EmpMyGoals, EmpMyCertifications, EmpMyCheckins, EmpMyReviews } from '../components/employee/MyDevelopment';
import { ManagerDashboard } from '../components/manager/Dashboard';
import { ManagerTeam } from '../components/manager/Team';
import { ManagerEmployeeDetail } from '../components/manager/EmployeeDetail';
import { HRApplicants } from '../components/hr/Applicants';
import { HRCheckins } from '../components/hr/Checkins';
import { CareerDevelopment } from '../components/hr/CareerDevelopment';
import { AddTaskModal } from '../components/hr/modals/AddTask';
import { MobileLayout } from '../components/mobile/MobileLayout';
import { MobileDashboard } from '../components/mobile/MobileDashboard';
import { MobileDocuments } from '../components/mobile/MobileDocuments';
import { SpotlightTour } from '../components/shared/SpotlightTour';
import { employeeOnboardingTour, employeeOnboardingIntro, employeeOnboardingOutro, employeeActiveTour, employeeActiveIntro, employeeActiveOutro, managerTour, managerIntro, managerOutro } from '../lib/tours';
import { NotificationBell } from '../components/shared/NotificationBell';

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

export type EmpTab =
  | 'overview' | 'tasks' | 'schedule' | 'documents' | 'contacts' | 'team' | 'checkins'
  | 'my-goals' | 'my-certifications' | 'my-checkins' | 'my-reviews' | 'more'
  | 'mgr-dashboard' | 'mgr-team' | 'mgr-detail' | 'mgr-employees' | 'mgr-applicants' | 'mgr-checkins' | 'mgr-career';

async function logActivity(employeeId: string, action: string) {
  await supabase.from('activity_log').insert({ employee_id: employeeId, action, created_at: new Date().toISOString() });
}

export function EmployeeApp() {
  const { profile, signOut } = useAuth();
  const viewer = useViewer();
  const isManager = viewer?.role === 'manager';
  const [tab, setTab] = useState<EmpTab>('overview');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teammates, setTeammates] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [myCheckins, setMyCheckins] = useState<Checkin[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [myQuarterlyCheckins, setMyQuarterlyCheckins] = useState<QuarterlyCheckin[]>([]);
  const [myAnnualReviews, setMyAnnualReviews] = useState<AnnualReview[]>([]);
  const [myLifecycleCheckins, setMyLifecycleCheckins] = useState<LifecycleCheckin[]>([]);
  const [myDevPlans, setMyDevPlans] = useState<DevelopmentPlan[]>([]);
  const [myCertifications, setMyCertifications] = useState<Certification[]>([]);
  const [myPathways, setMyPathways] = useState<Pathway[]>([]);
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [tourState, setTourState] = useState<{ type: 'onboarding' | 'active' | 'manager' | null; step: number }>({ type: null, step: -1 });
  const [tourLoaded, setTourLoaded] = useState(false);

  // Manager-specific state
  const [team, setTeam] = useState<Employee[]>([]); // excludes self
  const [teamScope, setTeamScope] = useState<Employee[]>([]); // includes self, for name lookups
  const [teamTasks, setTeamTasks] = useState<Record<string, OnboardingTask[]>>({});
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: string; eid?: string } | null>(null);
  // Manager check-ins data
  const [teamQuarterlyCheckins, setTeamQuarterlyCheckins] = useState<QuarterlyCheckin[]>([]);
  const [teamAnnualReviews, setTeamAnnualReviews] = useState<AnnualReview[]>([]);
  const [teamLifecycleCheckins, setTeamLifecycleCheckins] = useState<LifecycleCheckin[]>([]);

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

    const [empRes, taskRes, schedRes, contactRes, checkinRes, reviewRes, devPlanRes, certRes, pathwayRes, announcementRes, qCheckinRes, aReviewRes, lCheckinRes] = await Promise.all([
      supabase.from('employees').select('*').eq('id', empId).single(),
      supabase.from('onboarding_tasks').select('*').eq('employee_id', empId).order('created_at'),
      supabase.from('schedules').select('*').or('employee_id.is.null,employee_id.eq.' + empId).order('schedule_date').order('time_label'),
      supabase.from('contacts').select('*').order('is_primary', { ascending: false }),
      supabase.from('checkins').select('*').eq('employee_id', empId).order('checkin_date', { ascending: false }),
      supabase.from('reviews').select('*').eq('employee_id', empId).order('review_date', { ascending: false }),
      supabase.from('development_plans').select('*').eq('employee_id', empId).order('created_at'),
      supabase.from('certifications').select('*').eq('employee_id', empId).order('created_at'),
      supabase.from('pathways').select('*').order('name'),
      supabase.from('hr_announcements').select('*').eq('active', true),
      supabase.from('quarterly_checkins').select('*').eq('employee_id', empId).order('scheduled_at', { ascending: false }),
      supabase.from('annual_reviews').select('*').eq('employee_id', empId).order('scheduled_at', { ascending: false }),
      supabase.from('lifecycle_checkins').select('*').eq('employee_id', empId).order('milestone_day', { ascending: true }),
    ]);

    const allTasks: OnboardingTask[] = taskRes.data ?? [];
    setTasks(allTasks);
    setSchedules(schedRes.data ?? []);
    setContacts(contactRes.data ?? []);
    setMyCheckins(checkinRes.data ?? []);
    setMyReviews(reviewRes.data ?? []);
    setMyDevPlans(devPlanRes.data ?? []);
    setMyCertifications(certRes.data ?? []);
    setMyPathways(pathwayRes.data ?? []);
    setAnnouncements(announcementRes.data ?? []);
    setMyQuarterlyCheckins(qCheckinRes.data ?? []);
    setMyAnnualReviews(aReviewRes.data ?? []);
    setMyLifecycleCheckins(lCheckinRes.data ?? []);

    if (empRes.data) {
      let emp: Employee = empRes.data;
      empIdRef.current = emp.id;

      if (emp.lifecycle_status === 'onboarding' && allTasks.length > 0) {
        const onboardingTasks = allTasks.filter(t => t.task_phase === 'onboarding');
        if (onboardingTasks.length > 0 && onboardingTasks.every(t => t.status === 'complete')) {
          const now = new Date().toISOString();
          await supabase.from('employees').update({
            lifecycle_status: 'active',
            progress: 100,
            onboarding_completed_at: now,
          }).eq('id', emp.id);
          emp = { ...emp, lifecycle_status: 'active', progress: 100, onboarding_completed_at: now };
        }
      }

      setEmployee(emp);
      await loadDocuments(emp.id);

      const { data: allEmps } = await supabase.from('employees').select('*').eq('archived', false).neq('is_test_account', true);
      setAllEmployees(allEmps ?? []);

      if (emp.department) {
        const mates = (allEmps ?? []).filter(e =>
          e.department === emp.department &&
          e.id !== emp.id &&
          !e.is_test_account
        );
        setTeammates(mates);
      }
    }
  }, [profile?.employee_id, loadDocuments]);

  // Manager-only: load team based on viewer scope
  const loadTeam = useCallback(async () => {
    if (!viewer || viewer.role !== 'manager') return;

    let query = supabase.from('employees')
      .select('*')
      .eq('archived', false)
      .neq('is_test_account', true);

    if (viewer.scope === 'app_wide_reports') {
      // see everyone
    } else if (viewer.scope === 'company_reports' && viewer.company_id) {
      query = query.eq('company_id', viewer.company_id);
    } else {
      // direct_reports
      if (!viewer.employee_id) { setTeam([]); setTeamScope([]); return; }
      query = query.or(
        `manager_user_id.eq.${viewer.user_id},manager_id.eq.${viewer.employee_id},hiring_manager_id.eq.${viewer.employee_id}`
      );
    }

    const { data } = await query.order('created_at', { ascending: false });
    const visible = visibleEmployees(viewer, data ?? []);
    setTeamScope(visible);
    setTeam(visible.filter(e => e.id !== viewer.employee_id));
  }, [viewer]);
  const loadTeamCheckinData = useCallback(async () => {
    if (!viewer || viewer.role !== 'manager') return;
    const [qRes, aRes, lRes] = await Promise.all([
      supabase.from('quarterly_checkins').select('*').order('scheduled_at', { ascending: false }),
      supabase.from('annual_reviews').select('*').order('scheduled_at', { ascending: false }),
      supabase.from('lifecycle_checkins').select('*').order('scheduled_at', { ascending: false }),
    ]);
    setTeamQuarterlyCheckins(qRes.data ?? []);
    setTeamAnnualReviews(aRes.data ?? []);
    setTeamLifecycleCheckins(lRes.data ?? []);
  }, [viewer]);

  const loadTeamMemberTasks = useCallback(async (empId: string) => {
    const { data } = await supabase.from('onboarding_tasks').select('*').eq('employee_id', empId).order('created_at');
    setTeamTasks(prev => ({ ...prev, [empId]: data ?? [] }));
  }, []);

  const loadTourState = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('users')
      .select('tour_completed_at, tour_current_step, active_tour_completed_at, active_tour_current_step, manager_tour_completed_at, manager_tour_current_step')
      .eq('id', profile.id)
      .maybeSingle();
    if (!data) { setTourLoaded(true); return; }

    // Manager tour takes precedence — covers both personal and team views
    if (isManager && !data.manager_tour_completed_at) {
      setTourState({ type: 'manager', step: data.manager_tour_current_step ?? -1 });
    } else if (employee?.lifecycle_status === 'onboarding' && !data.tour_completed_at) {
      setTourState({ type: 'onboarding', step: data.tour_current_step ?? -1 });
    } else if (employee?.lifecycle_status === 'active' && !data.active_tour_completed_at) {
      setTourState({ type: 'active', step: data.active_tour_current_step ?? -1 });
    }
    setTourLoaded(true);
  }, [profile?.id, employee?.lifecycle_status, isManager]);

  useEffect(() => { if (employee) loadTourState(); }, [employee, loadTourState]);
  useEffect(() => { loadData(); }, [loadData]);
  // Company/app-wide managers default to Team Dashboard
  useEffect(() => {
    if (viewer?.role === 'manager' && (viewer.scope === 'company_reports' || viewer.scope === 'app_wide_reports')) {
      setTab(prev => prev === 'overview' ? 'mgr-dashboard' : prev);
    }
  }, [viewer?.role, viewer?.scope]);
  useEffect(() => { if (isManager) loadTeam(); }, [isManager, loadTeam]);
  useEffect(() => { if (isManager) loadTeamCheckinData(); }, [isManager, loadTeamCheckinData]);

  useEffect(() => {
    if (selectedTeamMemberId && !teamTasks[selectedTeamMemberId]) loadTeamMemberTasks(selectedTeamMemberId);
  }, [selectedTeamMemberId, teamTasks, loadTeamMemberTasks]);

  // Realtime subscriptions
  useEffect(() => {
    if (!profile?.employee_id) return;
    const empId = profile.employee_id;

    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

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

    const empChannel = supabase
      .channel('emp-profile-rt')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'employees',
        filter: `id=eq.${empId}`,
      }, async payload => {
        const updated = payload.new as Employee;
        const oldData = payload.old as Employee;
        setEmployee(updated);
        if (oldData.lifecycle_status !== updated.lifecycle_status) {
          await loadData();
        }
      })
      .subscribe();

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
  }, [profile?.employee_id, loadDocuments, loadData]);

  async function toggleTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !employee) return;
    const isCompleting = task.status !== 'complete';
    const now = new Date().toISOString();
    const taskUpdates: Record<string, unknown> = isCompleting
      ? { status: 'complete', completed_at: now, archived: true }
      : { status: 'in-progress', completed_at: null, archived: false };

    const { error: taskErr } = await supabase.from('onboarding_tasks').update(taskUpdates).eq('id', taskId);
    if (taskErr) return;

    const updated = tasks.map(t => t.id === taskId
      ? { ...t, status: (isCompleting ? 'complete' : 'in-progress') as OnboardingTask['status'], archived: isCompleting, completed_at: isCompleting ? now : null }
      : t
    );
    setTasks(updated);
    await logActivity(employee.id, `${isCompleting ? 'Completed' : 'Reopened'} task "${task.title}"`);
  }

  function viewTeamMember(id: string) {
    setSelectedTeamMemberId(id);
    setTab('mgr-detail');
  }

  if (!employee) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  const onboardingTasks = tasks.filter(t => t.task_phase === 'onboarding');
  const done = onboardingTasks.filter(t => t.status === 'complete').length;
  const pct = onboardingTasks.length ? Math.round((done / onboardingTasks.length) * 100) : 0;
  const activeAnnouncement = announcements[0] ?? null;
  const isActive = employee.lifecycle_status === 'active';
  const selectedTeamMember = team.find(e => e.id === selectedTeamMemberId);

  const moreItems = isActive
    ? [
        { id: 'team', label: 'My Team', icon: '👥' },
        { id: 'contacts', label: 'Contacts', icon: '👤' },
        { id: 'my-goals', label: 'My Goals', icon: '🎯' },
        { id: 'my-certifications', label: 'My Certifications', icon: '🏆' },
        { id: 'my-checkins', label: 'My Check-ins', icon: '📋' },
        { id: 'my-reviews', label: 'My Reviews', icon: '📊' },
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
      'my-goals': 'My Goals',
      'my-certifications': 'My Certifications',
      'my-checkins': 'My Check-ins',
      'my-reviews': 'My Reviews',
      'mgr-dashboard': 'Team Dashboard',
      'mgr-team': 'Direct Team',
      'mgr-detail': 'Team Member',
      'mgr-employees': 'All Employees',
      'mgr-applicants': 'Applicants',
      'mgr-checkins': 'Check-ins & Reviews',
      'mgr-career': 'Career Development',
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
            <EmpSchedule employee={employee} schedules={schedules} checkins={[]} reviews={[]} />
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
            <EmpCheckins checkins={[]} reviews={[]} employee={employee} />
          )}
          {tab === 'my-goals' && isActive && <EmpMyGoals plans={myDevPlans} pathways={myPathways} employee={employee} />}
          {tab === 'my-certifications' && isActive && <EmpMyCertifications certifications={myCertifications} employee={employee} />}
          {tab === 'my-checkins' && isActive && <EmpMyCheckins checkins={myCheckins} quarterlyCheckins={myQuarterlyCheckins} lifecycleCheckins={myLifecycleCheckins} employee={employee} />}
          {tab === 'my-reviews' && isActive && <EmpMyReviews reviews={myReviews} annualReviews={myAnnualReviews} employee={employee} />}
          {tab === 'mgr-dashboard' && isManager && (
            <ManagerDashboard team={team} myEmployee={employee} onViewEmployee={viewTeamMember} onOpenModal={(type, eid) => setModal({ type, eid })} />
          )}
          {tab === 'mgr-team' && isManager && (
            <ManagerTeam team={team} onViewEmployee={viewTeamMember} onOpenModal={(type, eid) => setModal({ type, eid })} />
          )}
          {tab === 'mgr-detail' && isManager && selectedTeamMember && (
            <ManagerEmployeeDetail
              employee={selectedTeamMember}
              tasks={teamTasks[selectedTeamMember.id] ?? []}
              documents={documents}
              schedules={schedules}
              pathways={myPathways}
              onBack={() => setTab('mgr-team')}
              onOpenModal={(type, eid) => setModal({ type, eid })}
              onToggleTask={() => {}}
              onTaskStatusChange={() => {}}
            />
          )}
          {tab === 'mgr-employees' && isManager && (
            <ManagerTeam team={team} onViewEmployee={viewTeamMember} onOpenModal={(type, eid) => setModal({ type, eid })} />
          )}
          {tab === 'mgr-applicants' && isManager && (
          <HRApplicants
          employees={teamScope}
          onViewApplicant={viewTeamMember}
          readOnly
        />
        )}
        {tab === 'mgr-checkins' && isManager && (
          <HRCheckins
          employees={teamScope}
          checkins={teamQuarterlyCheckins}
          reviews={teamAnnualReviews}
          lifecycleCheckins={teamLifecycleCheckins}
          readOnly
        />
        )}
        {tab === 'mgr-career' && isManager && (
          <CareerDevelopment
          employees={teamScope}
          pathways={myPathways}
          onViewEmployee={viewTeamMember}
          readOnly
        />
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
        {modal?.type === 'add-task' && modal.eid && isManager && (() => {
          const taskEmp = team.find(e => e.id === modal.eid);
          return (
            <AddTaskModal
              employeeId={modal.eid}
              employee={taskEmp}
              assignedByRole="manager"
              assignedByName={employee?.name ?? profile?.email ?? undefined}
              onClose={() => setModal(null)}
              onCreated={() => { if (modal.eid) loadTeamMemberTasks(modal.eid); }}
            />
          );
        })()}
      </>
    );
  }

  return (
    <div className="app-shell">
      {profile?.id && (
        <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 50 }}>
          <NotificationBell
            userId={profile.id}
            onNavigate={(linkType) => {
              if (linkType === 'task') setTab('tasks');
              else if (linkType === 'checkin' || linkType === 'review') setTab('my-checkins');
              else if (linkType === 'document') setTab('documents');
            }}
          />
        </div>
      )}
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
            devGoalsCount={myDevPlans.length}
            certCount={myCertifications.length}
            checkinCount={myCheckins.length}
            reviewCount={myReviews.length}
            userId={profile?.id}
          />
        )}
        {tab === 'tasks' && <EmpTasks tasks={tasks} onToggle={toggleTask} onAddTask={() => setShowAddTask(true)} employee={employee} />}
        {tab === 'schedule' && <EmpSchedule employee={employee} schedules={schedules} checkins={[]} reviews={[]} />}
        {tab === 'documents' && <EmpDocuments documents={documents} />}
        {tab === 'contacts' && <EmpContacts contacts={contacts} employee={employee} allEmployees={allEmployees.length > 0 ? allEmployees : [employee, ...teammates]} />}
        {tab === 'team' && <EmpTeam employee={employee} teammates={teammates} allEmployees={allEmployees} schedules={schedules} />}
        {tab === 'checkins' && <EmpCheckins checkins={[]} reviews={[]} employee={employee} />}
        {tab === 'my-goals' && isActive && <EmpMyGoals plans={myDevPlans} pathways={myPathways} employee={employee} />}
        {tab === 'my-certifications' && isActive && <EmpMyCertifications certifications={myCertifications} employee={employee} />}
        {tab === 'my-checkins' && isActive && <EmpMyCheckins checkins={myCheckins} quarterlyCheckins={myQuarterlyCheckins} lifecycleCheckins={myLifecycleCheckins} employee={employee} />}
        {tab === 'my-reviews' && isActive && <EmpMyReviews reviews={myReviews} annualReviews={myAnnualReviews} employee={employee} />}

        {/* Manager tabs */}
        {tab === 'mgr-dashboard' && isManager && (
          <ManagerDashboard team={team} myEmployee={employee} onViewEmployee={viewTeamMember} onOpenModal={(type, eid) => setModal({ type, eid })} />
        )}
        {tab === 'mgr-team' && isManager && (
          <ManagerTeam team={team} onViewEmployee={viewTeamMember} onOpenModal={(type, eid) => setModal({ type, eid })} />
        )}
        {tab === 'mgr-detail' && isManager && selectedTeamMember && (
          <ManagerEmployeeDetail
            employee={selectedTeamMember}
            tasks={teamTasks[selectedTeamMember.id] ?? []}
            documents={documents}
            schedules={schedules}
            pathways={myPathways}
            onBack={() => setTab('mgr-team')}
            onOpenModal={(type, eid) => setModal({ type, eid })}
            onToggleTask={() => {}}
            onTaskStatusChange={() => {}}
          />
        )}
        {tab === 'mgr-employees' && isManager && (
          <ManagerTeam team={team} onViewEmployee={viewTeamMember} onOpenModal={(type, eid) => setModal({ type, eid })} />
        )}
        {tab === 'mgr-applicants' && isManager && (
          <HRApplicants
          employees={teamScope}
            onViewApplicant={viewTeamMember}
            readOnly
          />
        )}
        {tab === 'mgr-checkins' && isManager && (
          <HRCheckins
          employees={teamScope}
            checkins={teamQuarterlyCheckins}
            reviews={teamAnnualReviews}
            lifecycleCheckins={teamLifecycleCheckins}
            readOnly
          />
        )}
        {tab === 'mgr-career' && isManager && (
          <CareerDevelopment
          employees={teamScope}
          pathways={myPathways}
          onViewEmployee={viewTeamMember}
          readOnly
        />
        )}
      </div>

      {tourLoaded && tourState.type === 'onboarding' && profile?.id && (
        <SpotlightTour
        steps={employeeOnboardingTour(setTab)}
          currentStep={tourState.step}
          introTitle={employeeOnboardingIntro.title}
          introBody={employeeOnboardingIntro.body}
          outroTitle={employeeOnboardingOutro.title}
          outroBody={employeeOnboardingOutro.body}
          onAdvance={async (newStep) => {
            setTourState({ type: 'onboarding', step: newStep });
            await supabase.from('users').update({ tour_current_step: newStep }).eq('id', profile.id);
          }}
          onComplete={async () => {
            setTab('overview');
            setTourState({ type: null, step: -1 });
            await supabase.from('users').update({
              tour_completed_at: new Date().toISOString(),
              tour_current_step: employeeOnboardingTour(setTab).length,
            }).eq('id', profile.id);
          }}
        />
      )}
      {tourLoaded && tourState.type === 'active' && profile?.id && (
        <SpotlightTour
        steps={employeeActiveTour(setTab)}
          currentStep={tourState.step}
          introTitle={employeeActiveIntro.title}
          introBody={employeeActiveIntro.body}
          outroTitle={employeeActiveOutro.title}
          outroBody={employeeActiveOutro.body}
          onAdvance={async (newStep) => {
            setTourState({ type: 'active', step: newStep });
            await supabase.from('users').update({ active_tour_current_step: newStep }).eq('id', profile.id);
          }}
          onComplete={async () => {
            setTab('overview');
            setTourState({ type: null, step: -1 });
            await supabase.from('users').update({
              active_tour_completed_at: new Date().toISOString(),
              active_tour_current_step: employeeActiveTour(setTab).length,
            }).eq('id', profile.id);
          }}
        />
      )}

{tourLoaded && tourState.type === 'manager' && profile?.id && (
        <SpotlightTour
          steps={managerTour(setTab)}
          currentStep={tourState.step}
          introTitle={managerIntro.title}
          introBody={managerIntro.body}
          outroTitle={managerOutro.title}
          outroBody={managerOutro.body}
          onAdvance={async (newStep) => {
            setTourState({ type: 'manager', step: newStep });
            await supabase.from('users').update({ manager_tour_current_step: newStep }).eq('id', profile.id);
          }}
          onComplete={async () => {
            setTab('overview');
            setTourState({ type: null, step: -1 });
            await supabase.from('users').update({
              manager_tour_completed_at: new Date().toISOString(),
              manager_tour_current_step: managerTour(setTab).length,
            }).eq('id', profile.id);
          }}
        />
      )}

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

      {modal?.type === 'add-task' && modal.eid && isManager && (() => {
        const taskEmp = team.find(e => e.id === modal.eid);
        return (
          <AddTaskModal
            employeeId={modal.eid}
            employee={taskEmp}
            assignedByRole="manager"
            assignedByName={employee?.name ?? profile?.email ?? undefined}
            onClose={() => setModal(null)}
            onCreated={() => { if (modal.eid) loadTeamMemberTasks(modal.eid); }}
          />
        );
      })()}
    </div>
  );
}