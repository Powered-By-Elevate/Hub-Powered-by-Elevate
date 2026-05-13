import { TourStep } from '../components/shared/SpotlightTour';

// Onboarding Employee Tour — fires on first login while in onboarding status
export const employeeOnboardingTour: TourStep[] = [
  {
    targetId: 'emp-sidebar-overview',
    title: 'Your Dashboard',
    body: "This is your home base. You'll see your onboarding progress, upcoming tasks, and any announcements from HR right here.",
  },
  {
    targetId: 'emp-sidebar-tasks',
    title: 'My Tasks',
    body: "Your onboarding checklist lives here. Mark tasks complete as you finish them — HR sees your progress in real time.",
  },
  {
    targetId: 'emp-sidebar-schedule',
    title: 'My Schedule',
    body: "Day 1 and beyond — meetings, shadowing sessions, and trainings your HR team set up. Click on any item to see details.",
  },
  {
    targetId: 'emp-sidebar-documents',
    title: 'Documents',
    body: "Your employee handbook, policies, and any forms HR has sent your way. Some require your acknowledgment before you can complete onboarding.",
  },
  {
    targetId: 'emp-sidebar-contacts',
    title: 'Contacts',
    body: "Quick access to HR, IT support, and other vendors. Click email or Teams to reach out directly.",
  },
];

export const employeeOnboardingIntro = {
  title: 'Welcome to The Hub',
  body: "We're glad you're here. The Hub is where you'll complete your onboarding, access important documents, and stay connected with your team. Let's take a quick tour so you know where everything is.",
};

export const employeeOnboardingOutro = {
  title: "You're ready to go",
  body: "That's everything you need to get started. Reach out to your manager or HR if you have any questions along the way. Welcome to the team!",
};

// Active Employee Tour — fires when lifecycle flips from onboarding to active
export const employeeActiveTour: TourStep[] = [
  {
    targetId: 'emp-sidebar-team',
    title: 'My Team',
    body: "See your department and your company at a glance. Email or Teams chat with any teammate directly from here.",
  },
  {
    targetId: 'emp-sidebar-my-goals',
    title: 'My Goals',
    body: "Your development goals — what you're working toward in your career. Track progress as you go.",
  },
  {
    targetId: 'emp-sidebar-my-certifications',
    title: 'My Certifications',
    body: "Trainings, certifications, and credentials you've earned or are working toward.",
  },
  {
    targetId: 'emp-sidebar-my-checkins',
    title: 'My Check-ins',
    body: "Your quarterly conversations with HR, plus 30-60-90 milestones for new hires. This is where alignment happens.",
  },
  {
    targetId: 'emp-sidebar-my-reviews',
    title: 'My Reviews',
    body: "Your annual performance reviews. A record of feedback, growth, and recognition over time.",
  },
];

export const employeeActiveIntro = {
  title: "🎉 You're fully onboarded!",
  body: "Welcome to the team officially. Your full Employee Hub has been unlocked, and you've got access to a few new sections we want to show you.",
};

export const employeeActiveOutro = {
  title: "You're all set",
  body: "Explore your new Hub at your own pace. If you have questions about career development, your goals, or anything else — your manager and HR are here to help.",
};

// Manager Tour — fires on first manager login
export const managerTour: TourStep[] = [
  {
    targetId: 'mgr-sidebar-dashboard',
    title: 'Your Dashboard',
    body: "Quick view of your direct reports, applicants assigned to you, and any tasks needing attention.",
  },
  {
    targetId: 'mgr-sidebar-team',
    title: 'My Team',
    body: "Every employee who reports to you. Click into anyone's profile to assign tasks, view their progress, or schedule check-ins.",
  },
  {
    targetId: 'mgr-sidebar-applicants',
    title: 'Open Applicants',
    body: "Candidates assigned to you as the hiring manager. Track them through phases and provide hiring decisions.",
  },
];

export const managerIntro = {
  title: 'Welcome to The Hub',
  body: "As a manager, you have visibility into your team's progress, applicants you're interviewing, and tools to assign tasks. Let's show you around.",
};

export const managerOutro = {
  title: "You're ready to lead",
  body: "Your dashboard is your home base — start there each day. Reach out to HR if you need to add a new hire to your team or have any questions.",
};

// HR Tour — fires on first HR login
export const hrTour: TourStep[] = [
  {
    targetId: 'hr-sidebar-dashboard',
    title: 'HR Dashboard',
    body: "Your control center — total active employees, onboarding progress, check-ins due, and recent activity at a glance.",
  },
  {
    targetId: 'hr-sidebar-applicants',
    title: 'Applicants',
    body: "Your hiring pipeline. Add candidates, move them through phases, and convert them to onboarding when they accept.",
  },
  {
    targetId: 'hr-sidebar-employees',
    title: 'All Employees',
    body: "Every team member, filterable by status, department, and company. Click any employee to view or edit their full profile.",
  },
  {
    targetId: 'hr-sidebar-templates',
    title: 'Templates',
    body: "Reusable onboarding task lists. Clone an existing one or save an employee's tasks as a new template.",
  },
  {
    targetId: 'hr-sidebar-checkins',
    title: 'Check-ins & Reviews',
    body: "Schedule quarterly check-ins, annual reviews, and 30-60-90 milestones. The 30-60-90 auto-generates for new hires.",
  },
  {
    targetId: 'hr-sidebar-career',
    title: 'Career Development',
    body: "Track each employee's pathway, level, and readiness for promotion. The big picture of your team's growth.",
  },
  {
    targetId: 'hr-sidebar-settings',
    title: 'Settings',
    body: "Companies, departments, schedule templates, banners, and external contacts all live here.",
  },
];

export const hrIntro = {
  title: 'Welcome to The Hub',
  body: "You're the heart of the operation. The Hub gives you a single place to manage applicants, employees, onboarding, and everything in between. Let's take a quick tour.",
};

export const hrOutro = {
  title: "You're ready to roll",
  body: "Pro tip: press Ctrl+K from anywhere to instantly search across employees, applicants, and documents. Reach out to support if you need anything.",
};