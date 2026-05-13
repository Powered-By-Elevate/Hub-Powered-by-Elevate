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
// MANAGER TOUR — placeholder, fills in next phase
// ============================================================

export const managerTour: TourStep[] = [];
export const managerIntro = { title: 'Welcome', body: 'Manager tour coming soon.' };
export const managerOutro = { title: 'All set', body: 'Enjoy the Hub.' };

// ============================================================
// HR TOUR — placeholder, fills in next phase
// ============================================================

export const hrTour: TourStep[] = [];
export const hrIntro = { title: 'Welcome', body: 'HR tour coming soon.' };
export const hrOutro = { title: 'All set', body: 'Enjoy the Hub.' };