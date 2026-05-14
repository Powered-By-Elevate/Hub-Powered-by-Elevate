import { TourStep } from '../components/shared/SpotlightTour';
import type { EmpTab } from '../pages/EmployeeApp';

// ============================================================
// ONBOARDING EMPLOYEE TOUR
// Walks the new hire through every tab, highlighting key sections.
// ============================================================

export const employeeOnboardingTour = (setTab: (t: EmpTab) => void): TourStep[] => [
  // ---- Dashboard ----
  { targetId: 'emp-sidebar-overview', title: 'Your Dashboard', body: "Let's start at your home base. The Dashboard is where you'll land each time you log in.", onEnter: () => setTab('overview') },
  { targetId: 'emp-dashboard-progress', title: 'Your Onboarding Progress', body: "This banner tracks how far along you are. Complete your tasks and it fills up — when you hit 100%, your full Hub unlocks." },
  { targetId: 'emp-dashboard-tasks', title: "What's Up Next", body: "The most important tasks waiting for you. Click any one to mark it complete, or visit My Tasks for the full list." },
  { targetId: 'emp-dashboard-schedule', title: "Today's Schedule", body: "Meetings, shadowing sessions, and trainings your HR team set up for you. Don't miss your Day 1 plan." },
  { targetId: 'emp-dashboard-stats', title: 'Your Progress at a Glance', body: "A quick breakdown of your tasks by status — complete, in progress, not started, and overdue." },
  { targetId: 'emp-topbar-clock', title: 'Current Date & Time', body: "Always visible up here so you stay oriented in your day." },

  // ---- Tasks ----
  { targetId: 'emp-sidebar-tasks', title: 'My Tasks', body: "Now let's look at your full onboarding checklist.", onEnter: () => setTab('tasks') },
  { targetId: 'emp-tasks-filter', title: 'Filter by Time', body: "Focus on this week, this month, or see everything. Critical tasks always rise to the top." },
  { targetId: 'emp-tasks-list', title: 'Your Checklist', body: "Click the checkbox to mark a task complete. HR sees your progress in real time." },

  // ---- Schedule ----
  { targetId: 'emp-sidebar-schedule', title: 'My Schedule', body: "Your weekly view of meetings, trainings, and check-ins.", onEnter: () => setTab('schedule') },
  { targetId: 'emp-schedule-week', title: 'Your Week', body: "See what's planned across the whole week. Use the arrows to look ahead or back." },
  { targetId: 'emp-schedule-day1', title: 'Day 1 Plan', body: "Your first-day schedule. Orientation, intro meetings, and anything your team has set up for you." },
  { targetId: 'emp-schedule-upcoming', title: 'Upcoming Check-ins', body: "Your 30-60-90 milestones and quarterly check-ins with HR will appear here as they're scheduled." },

  // ---- Documents ----
  { targetId: 'emp-sidebar-documents', title: 'Documents', body: "Handbook, policies, and forms — everything HR shares with you lives here.", onEnter: () => setTab('documents') },
  { targetId: 'emp-documents-list', title: 'Organized by Bucket', body: "Documents are grouped into categories like Handbook, Benefits, and Training so they're easy to find." },

  // ---- Contacts ----
  { targetId: 'emp-sidebar-contacts', title: 'Contacts', body: "Quick access to HR, IT, and other people you might need to reach.", onEnter: () => setTab('contacts') },
  { targetId: 'emp-contacts-search', title: 'Search the Directory', body: "Search by name, role, or department to find who you need. Email or Teams chat them directly from each card." },
];

export const employeeOnboardingIntro = {
  title: 'Welcome to The Hub',
  body: "We're glad you're here. The Hub is where you'll complete your onboarding, access important documents, and stay connected with your team. Let's take a quick tour so you know where everything is.",
};

export const employeeOnboardingOutro = {
  title: "You're ready to go",
  body: "That's everything you need to get started. Reach out to your manager or HR if you have any questions along the way. Welcome to the team!",
};

// ============================================================
// ACTIVE EMPLOYEE TOUR
// Full walkthrough — every tab, every major section.
// Fires for employees who were hired before The Hub launched,
// or who finished onboarding and got upgraded.
// ============================================================

export const employeeActiveTour = (setTab: (t: EmpTab) => void): TourStep[] => [
  // ---- Dashboard ----
  { targetId: 'emp-sidebar-overview', title: 'Your Dashboard', body: "Welcome to your Hub. Let's walk through everything available to you.", onEnter: () => setTab('overview') },
  { targetId: 'emp-dashboard-tasks', title: 'Open Tasks', body: "Tasks assigned to you across the company. Mark them complete as you go." },
  { targetId: 'emp-dashboard-schedule', title: "Today's Schedule", body: "Meetings, check-ins, and events scheduled for today." },
  { targetId: 'emp-topbar-clock', title: 'Current Date & Time', body: "Always visible up here so you stay oriented." },

  // ---- Tasks ----
  { targetId: 'emp-sidebar-tasks', title: 'My Tasks', body: "All tasks assigned to you, organized by deadline.", onEnter: () => setTab('tasks') },
  { targetId: 'emp-tasks-list', title: 'Your Active Tasks', body: "Click the checkbox to mark complete. You can also create your own tasks with the + button. Critical tasks always sort to the top." },

  // ---- Team ----
  { targetId: 'emp-sidebar-team', title: 'My Team', body: "Your department, your company, and a shared calendar of who's doing what.", onEnter: () => setTab('team') },
  { targetId: 'emp-team-tabs', title: 'Team or Calendar', body: "Switch between seeing teammates and seeing the team's combined schedule." },
  { targetId: 'emp-team-self', title: 'You & Your Team', body: "Your card sits at the top, with the rest of your department below. Email or Teams chat anyone directly from their card." },

  // ---- Schedule ----
  { targetId: 'emp-sidebar-schedule', title: 'My Schedule', body: "Your personal calendar of meetings, check-ins, and reviews.", onEnter: () => setTab('schedule') },
  { targetId: 'emp-schedule-week', title: 'Week View', body: "See your week at a glance. Use the arrows to navigate to other weeks." },
  { targetId: 'emp-schedule-upcoming', title: 'Upcoming Check-ins & Reviews', body: "Your scheduled quarterly check-ins and annual reviews are listed here so you know what's coming." },

  // ---- Documents ----
  { targetId: 'emp-sidebar-documents', title: 'Documents', body: "Handbook, policies, training materials, and anything HR shares.", onEnter: () => setTab('documents') },
  { targetId: 'emp-documents-list', title: 'Organized by Bucket', body: "Documents are grouped into categories so they're easy to find. Any required documents will be flagged for you to acknowledge." },

  // ---- Contacts ----
  { targetId: 'emp-sidebar-contacts', title: 'Contacts', body: "Your company directory plus external vendors.", onEnter: () => setTab('contacts') },
  { targetId: 'emp-contacts-search', title: 'Find Anyone', body: "Search by name, role, or department across your whole company plus external vendors like IT and benefits providers." },

  // ---- My Goals ----
  { targetId: 'emp-sidebar-my-goals', title: 'My Goals', body: "Your development goals and career pathway live here.", onEnter: () => setTab('my-goals') },
  { targetId: 'emp-mygoals-active', title: 'Active Goals', body: "What you're working toward right now. Progress bars show how far you've come." },

  // ---- My Certifications ----
  { targetId: 'emp-sidebar-my-certifications', title: 'My Certifications', body: "Trainings and credentials you've earned or are working toward.", onEnter: () => setTab('my-certifications') },
  { targetId: 'emp-mycerts-list', title: 'Your Certifications', body: "Sorted by status — in progress, completed, and not yet started. View proof of completion for any you've finished." },

  // ---- My Check-ins ----
  { targetId: 'emp-sidebar-my-checkins', title: 'My Check-ins', body: "Your quarterly conversations with HR, plus any 30-60-90 milestones if you're new.", onEnter: () => setTab('my-checkins') },
  { targetId: 'emp-mycheckins-list', title: 'Your Check-in History', body: "A record of every check-in. This is where alignment, feedback, and growth conversations happen." },

  // ---- My Reviews ----
  { targetId: 'emp-sidebar-my-reviews', title: 'My Reviews', body: "Your annual performance reviews live here.", onEnter: () => setTab('my-reviews') },
  { targetId: 'emp-myreviews-list', title: 'Review History', body: "A timeline of your performance reviews — a record of feedback, growth, and recognition over time." },
];

export const employeeActiveIntro = {
  title: "Welcome to The Hub",
  body: "We've built The Hub to be your home for everything career-related — your tasks, your team, your development goals, and your performance reviews. Let's take a quick tour so you know where everything lives.",
};

export const employeeActiveOutro = {
  title: "You're all set",
  body: "That's the full tour. Explore at your own pace — your manager and HR are always here if you have questions about your goals, your reviews, or anything else.",
};

// ============================================================
// MANAGER TOUR — covers employee tabs PLUS manager-specific tabs.
// Designed for the widest scope (app_wide_reports); auto-skip
// handles tabs unavailable to direct_reports managers.
// ============================================================

export const managerTour = (setTab: (t: EmpTab) => void): TourStep[] => [
  // ---- Personal Dashboard (managers also have their own personal view) ----
  { targetId: 'emp-sidebar-overview', title: 'Your Personal Dashboard', body: "As a manager, you have both a personal view and a team view. Let's start with your personal hub.", onEnter: () => setTab('overview') },
  { targetId: 'emp-dashboard-tasks', title: 'Your Own Tasks', body: "Tasks assigned to you personally — separate from the tasks you assign to your team." },
  { targetId: 'emp-topbar-clock', title: 'Current Date & Time', body: "Always visible up here so you stay oriented in your day." },

  // ---- Manager Dashboard ----
  { targetId: 'emp-sidebar-mgr-dashboard', title: 'Your Team Dashboard', body: "Now let's switch to your team view. This is where you'll spend most of your management time.", onEnter: () => setTab('mgr-dashboard') },
  { targetId: 'mgr-dashboard-stats', title: 'Team at a Glance', body: "Quick stats: who's on your team, who's onboarding, who needs attention. Watch the red Needs Attention card for overdue tasks." },
  { targetId: 'mgr-dashboard-team', title: 'Your Team Members', body: "Every employee reporting to you. Click any row to view their profile or use the + Task button to assign work." },
  { targetId: 'mgr-dashboard-applicants', title: 'Your Open Applicants', body: "Candidates you're the hiring manager for. Track them through the hiring pipeline from here." },

  // ---- Direct Team ----
  { targetId: 'emp-sidebar-mgr-team', title: 'Direct Team', body: "A deeper view of just your direct reports — same info as the dashboard but in a full list.", onEnter: () => setTab('mgr-team') },
  { targetId: 'mgr-team-list', title: 'Full Team Roster', body: "Click any team member to dive into their profile, tasks, schedule, and check-ins. Use + Task to assign work directly." },

  // ---- All Employees (company/app-wide scope only) ----
  { targetId: 'emp-sidebar-mgr-employees', title: 'All Employees', body: "Browse every employee in your scope — your whole company or the whole org depending on your access level.", onEnter: () => setTab('mgr-employees') },
  { targetId: 'mgr-team-list', title: 'Org-Wide View', body: "Same view as Direct Team but expanded to everyone you can see. Useful for finding cross-team collaborators or company-wide context." },

  // ---- Applicants ----
  { targetId: 'emp-sidebar-mgr-applicants', title: 'All Applicants', body: "The hiring pipeline across your scope. You can view but not edit — HR drives the hiring process.", onEnter: () => setTab('mgr-applicants') },

  // ---- Check-ins & Reviews ----
  { targetId: 'emp-sidebar-mgr-checkins', title: 'Check-ins & Reviews', body: "Read-only view of all quarterly check-ins, 30-60-90 milestones, and annual reviews across your scope.", onEnter: () => setTab('mgr-checkins') },

  // ---- Career Development ----
  { targetId: 'emp-sidebar-mgr-career', title: 'Career Development', body: "Career pathways, levels, and pillar health across your scope. Spot at-risk employees and growth opportunities.", onEnter: () => setTab('mgr-career') },

  // ---- Personal sections back in employee view ----
  { targetId: 'emp-sidebar-tasks', title: 'Your Personal Tasks', body: "Switching back to your personal view — these are tasks assigned to you, not work you delegate.", onEnter: () => setTab('tasks') },
  { targetId: 'emp-sidebar-team', title: 'My Team (Personal)', body: "Your department and company directory. Different from Direct Team — this shows your peers, not your reports.", onEnter: () => setTab('team') },
  { targetId: 'emp-sidebar-documents', title: 'Documents', body: "Company documents shared with you personally. Handbook, policies, training materials.", onEnter: () => setTab('documents') },
  { targetId: 'emp-sidebar-my-goals', title: 'Your Own Goals', body: "Managers grow too. Your personal development goals and pathway live here.", onEnter: () => setTab('my-goals') },
  { targetId: 'emp-sidebar-my-reviews', title: 'Your Reviews', body: "Your personal performance reviews — your own growth track.", onEnter: () => setTab('my-reviews') },
];

export const managerIntro = {
  title: 'Welcome, Manager',
  body: "As a manager, you have two views: your personal employee hub and your team view. The Hub combines both so you can manage your team while still tracking your own growth. Let's walk through everything.",
};

export const managerOutro = {
  title: "You're ready to lead",
  body: "Your team dashboard is your home base — start there each day to see what needs attention. Reach out to HR for hiring help or to add new reports to your team.",
};

// ============================================================
// HR TOUR — full walkthrough of every HR section.
// ============================================================

export const hrTour = (setTab: (t: string) => void): TourStep[] => [
  // ---- Dashboard ----
  { targetId: 'hr-sidebar-dashboard', title: 'HR Dashboard', body: "Your control center. Total employees, onboarding progress, check-ins due, recent activity — all at a glance.", onEnter: () => setTab('dashboard') },
  { targetId: 'hr-dashboard-stats', title: 'Quick Stats', body: "Active employees, onboarding count, needs attention, and check-ins due. The red number flags anything overdue." },
  { targetId: 'hr-dashboard-actions', title: 'Quick Actions', body: "Add a new employee or schedule a check-in directly from the dashboard — saves digging through tabs." },
  { targetId: 'hr-dashboard-recent', title: 'Recent Employees', body: "Your five most recently added employees. Click any row to jump straight to their profile." },
  { targetId: 'hr-dashboard-upcoming', title: 'Upcoming Check-ins', body: "Quarterly check-ins coming due. Click View all to see the full schedule." },
  { targetId: 'hr-dashboard-activity', title: 'Recent Activity', body: "Live feed of what's happening — tasks completed, employees added, check-ins scheduled. Click any row to jump to that employee." },

  // ---- Applicants ----
  { targetId: 'hr-sidebar-applicants', title: 'Applicants', body: "Your hiring pipeline. Add candidates, track them through phases, convert them to onboarding when they accept.", onEnter: () => setTab('applicants') },

  // ---- All Employees ----
  { targetId: 'hr-sidebar-employees', title: 'All Employees', body: "Every team member, filterable by status, department, and company. The heart of HR operations.", onEnter: () => setTab('employees') },

  // ---- Templates ----
  { targetId: 'hr-sidebar-templates', title: 'Templates', body: "Reusable onboarding task lists. Clone an existing template or save an employee's tasks as a new template for future hires.", onEnter: () => setTab('templates') },

  // ---- Documents ----
  { targetId: 'hr-sidebar-documents', title: 'Documents', body: "Company-wide and employee-specific documents organized by bucket. Set targeting, require acknowledgments, track who's read what.", onEnter: () => setTab('documents') },

  // ---- Check-ins & Reviews ----
  { targetId: 'hr-sidebar-checkins', title: 'Check-ins & Reviews', body: "Schedule quarterly check-ins, annual reviews, and 30-60-90 milestones. The 30-60-90 auto-generates for new hires.", onEnter: () => setTab('checkins') },

  // ---- Career Development ----
  { targetId: 'hr-sidebar-career', title: 'Career Development', body: "Each employee's pathway, level, and readiness for promotion. Spot at-risk employees and growth opportunities.", onEnter: () => setTab('career') },

  // ---- Settings ----
  { targetId: 'hr-sidebar-settings', title: 'Settings', body: "Companies, departments, schedule templates, banners, document buckets, user roles, and external contacts — everything customizable.", onEnter: () => setTab('settings') },
];

// ============================================================
// HR MOBILE TOUR — covers the 5 tabs accessible from mobile bottom nav
// (Dashboard, Employees, Career, Check-ins, Settings).
// Full HR tour with all sections runs on desktop only.
// ============================================================

export const hrMobileTour = (setTab: (t: string) => void): TourStep[] => [
  { targetId: 'hr-mobile-dashboard', title: 'HR Dashboard', body: "Your home base. Quick stats, recent employees, upcoming check-ins, and activity at a glance.", onEnter: () => setTab('dashboard') },
  { targetId: 'hr-mobile-employees', title: 'All Employees', body: "Your full team roster. Tap any employee to view or edit their profile.", onEnter: () => setTab('employees') },
  { targetId: 'hr-mobile-career', title: 'Career Development', body: "Each employee's pathway, level, and readiness for promotion.", onEnter: () => setTab('career') },
  { targetId: 'hr-mobile-checkins', title: 'Check-ins & Reviews', body: "Quarterly check-ins, annual reviews, and 30-60-90 milestones.", onEnter: () => setTab('checkins') },
  { targetId: 'hr-mobile-settings', title: 'Settings', body: "Companies, departments, document buckets, user roles, and more. For deeper customization, log in on desktop.", onEnter: () => setTab('settings') },
];

export const hrMobileIntro = {
  title: 'Welcome to The Hub',
  body: "Here's a quick tour of what's available on mobile. For the full HR experience — Applicants, Templates, Documents, and detailed Settings — log in from your desktop.",
};

export const hrMobileOutro = {
  title: "You're ready to roll",
  body: "Tap any tab in the bottom nav to dive in. For full features, head to your desktop.",
};

export const hrIntro = {
  title: 'Welcome to The Hub',
  body: "You're the operations heart of this app. The Hub gives you a single place to manage applicants, employees, onboarding, documents, and everything in between. Let's walk through every section.",
};

export const hrOutro = {
  title: "You're ready to roll",
  body: "Pro tip: press Ctrl+K from anywhere to instantly search across employees, applicants, and documents. Everything's customizable in Settings — start there if you want to shape the app to your org.",
};