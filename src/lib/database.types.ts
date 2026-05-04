export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'hr' | 'manager' | 'employee';
export type Phase = 'onboarding' | 'active';
export type TaskStatus = 'pending' | 'in-progress' | 'complete' | 'overdue';
export type TaskCategory = 'document' | 'training' | 'form' | 'meeting' | 'task' | 'personal' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskTriage = 'critical' | 'normal';
export type TaskPhase = 'onboarding' | 'active';
export type LifecycleStatus = 'onboarding' | 'active';
export type AssignedByRole = 'hr' | 'manager' | 'employee' | 'system';
export type EmployeeStatus = 'not-started' | 'in-progress' | 'complete' | 'overdue';
export type CheckinStatus = 'pending' | 'completed' | 'overdue';
export type ReviewStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';
export type AnnouncementType = 'announcement' | 'critical' | 'birthday' | 'shoutout' | 'reminder';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  employee_id: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  type: string | null;
  created_at: string;
}

export interface JobTitle {
  id: string;
  title: string;
  category: string;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  department: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  created_at: string;
}
export interface CompanyType {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}
export interface Pathway {
  id: string;
  name: string;
  category: string;
  active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string | null;
  team_id: string | null;
  manager: string | null;
  manager_user_id: string | null;
  start_date: string | null;
  status: EmployeeStatus;
  phase: Phase;
  progress: number;
  archived: boolean;
  user_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  onboarding_completed_at: string | null;
  lifecycle_status: LifecycleStatus;
  birthday_month: number | null;
  birthday_day: number | null;
  company_id: string | null;
  current_level: string | null;
  next_level: string | null;
  pathway_id: string | null;
  readiness_level: string | null;
  current_status: string | null;
  employment_type: string | null;
  access_role: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  employee_id: string;
  review_date: string;
  review_type: string;
  review_year: number;
  sentiment: string;
  notes: string | null;
  pdf_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DevelopmentPlan {
  id: string;
  employee_id: string;
  goal_title: string;
  status: string;
  progress_pct: number;
  target_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Certification {
  id: string;
  employee_id: string;
  course_name: string;
  status: string;
  completion_date: string | null;
  proof_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  employee_id: string;
  checkin_date: string;
  motivation_level: string;
  notes: string | null;
  decision: string;
  pillar_focus: string | null;
  pillar_reflection: string | null;
  contribution_to_growth: string | null;
  business_dev_involvement: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OnboardingTask {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  due_date: string | null;
  status: TaskStatus;
  required: boolean;
  notes: string | null;
  assigned_by: string | null;
  assigned_by_name: string | null;
  assigned_by_role: AssignedByRole;
  document_url: string | null;
  document_name: string | null;
  priority: TaskPriority;
  triage: TaskTriage;
  task_phase: TaskPhase;
  completed_at: string | null;
  completed_by: string | null;
  archived: boolean;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: UserProfile;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  department: string | null;
  description: string | null;
  used_count: number;
  created_at: string;
}

export interface TemplateTask {
  id: string;
  template_id: string;
  title: string;
  category: TaskCategory;
  required: boolean;
  days_from_start: number;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  type: string | null;
  file_url: string | null;
  file_path: string | null;
  size_label: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  employee_id: string | null;
  uploaded_by: string | null;
  category: string;
  section: string | null;
  description: string | null;
  requires_acknowledgment: boolean;
  acknowledged_at: string | null;
  visible_to_employee: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  employee_id: string | null;
  title: string;
  time_label: string | null;
  location: string | null;
  color: string | null;
  schedule_date: string | null;
  department: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface QuarterlyCheckin {
  id: string;
  employee_id: string;
  scheduled_at: string;
  completed_at: string | null;
  status: CheckinStatus;
  quarter: string;
  year: number;
  notes: string | null;
  rating: string | null;
  is_overridden: boolean;
  conducted_by: string | null;
  created_at: string;
}

export interface AnnualReview {
  id: string;
  employee_id: string;
  review_year: number;
  scheduled_at: string | null;
  completed_at: string | null;
  status: ReviewStatus;
  rating: number | null;
  rating_label: string | null;
  is_overridden: boolean;
  summary: string | null;
  goals_next_year: string | null;
  conducted_by: string | null;
  created_at: string;
}

export interface EmployeeNote {
  id: string;
  employee_id: string;
  author_id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author?: UserProfile;
}

export interface ActivityLog {
  id: string;
  employee_id: string | null;
  action: string;
  actor_id: string | null;
  created_at: string;
}

export interface SetupToken {
  id: string;
  token: string;
  employee_id: string;
  email: string;
  used: boolean;
  expires_at: string;
  created_at: string;
}

export interface CompanySetting {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export interface HRAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  start_date: string;
  end_date: string;
  department_id: string | null;
  employee_id: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export type TemplateWithTasks = OnboardingTemplate & { tasks: TemplateTask[] };
