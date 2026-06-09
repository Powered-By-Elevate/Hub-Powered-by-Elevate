import type { Employee, Role, UserProfile, VisibilityScope } from './database.types';

/**
 * The minimal context needed to evaluate visibility/permission decisions.
 * Built once from the logged-in user's profile.
 */
export interface Viewer {
  user_id: string;
  employee_id: string | null;
  company_id: string | null;
  role: Role;
  scope: VisibilityScope | null;
  /** Department names visible to this viewer (only used when scope = department_reports). */
  departments: string[] | null;
}

/**
 * Build a Viewer object from a UserProfile.
 * Returns null if profile is null (caller should handle).
 */
export function buildViewer(profile: UserProfile | null): Viewer | null {
  if (!profile) return null;
  return {
    user_id: profile.id,
    employee_id: profile.employee_id,
    company_id: profile.company_id,
    role: profile.role,
    scope: profile.visibility_scope,
    departments: profile.visibility_departments ?? null,
  };
}

/**
 * Filter the given list of employees down to those visible to this viewer.
 * This is the single source of truth for "who can see whom."
 */
export function visibleEmployees(viewer: Viewer | null, all: Employee[]): Employee[] {
  if (!viewer) return [];
  
  if (viewer.role === 'hr') return all;
  
  if (viewer.role === 'employee') {
    return all.filter(e => e.id === viewer.employee_id);
  }
  
  // viewer.role === 'manager'
  if (viewer.scope === 'app_wide_reports') return all;

  if (viewer.scope === 'company_reports') {
    if (!viewer.company_id) return [];
    return all.filter(e => e.company_id === viewer.company_id);
  }

  if (viewer.scope === 'department_reports') {
    const depts = viewer.departments ?? [];
    if (depts.length === 0) return [];
    return all.filter(e => !!e.department && depts.includes(e.department));
  }

  // direct_reports (default if scope is null or 'direct_reports')
  if (!viewer.employee_id) return [];
  return all.filter(e => e.manager_id === viewer.employee_id);
}

/**
 * Can this viewer access the Documents area?
 * - HR: yes (full)
 * - Employee: yes (their own docs)
 * - Manager with direct_reports scope: NO
 * - Manager with company_reports or app_wide_reports scope: yes (view only)
 */
export function canViewDocuments(viewer: Viewer | null): boolean {
  if (!viewer) return false;
  if (viewer.role === 'hr') return true;
  if (viewer.role === 'employee') return true;
  return viewer.scope === 'company_reports' || viewer.scope === 'app_wide_reports';
}

/**
 * Can this viewer edit employee records, settings, etc?
 * Only HR Admin. All manager tiers are view-only.
 */
export function canEdit(viewer: Viewer | null): boolean {
  return viewer?.role === 'hr';
}

/**
 * Can this viewer access Settings and admin features?
 * Only HR Admin.
 */
export function canAccessSettings(viewer: Viewer | null): boolean {
  return viewer?.role === 'hr';
}