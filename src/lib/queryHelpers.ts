import { supabase } from './supabase';
import { Employee } from './database.types';

/**
 * Standard filter to exclude test accounts from production-facing queries.
 * Use this in any query that returns employees to real users.
 *
 * Example:
 *   const { data } = await supabase.from('employees').select('*').eq('archived', false).neq('is_test_account', true);
 *
 * Or use the helper:
 *   const { data } = await activeEmployeesQuery();
 */
export function activeEmployeesQuery() {
  return supabase
    .from('employees')
    .select('*')
    .eq('archived', false)
    .neq('is_test_account', true);
}

/**
 * All employees including archived but excluding test accounts.
 */
export function allRealEmployeesQuery() {
  return supabase
    .from('employees')
    .select('*')
    .neq('is_test_account', true);
}

/**
 * Filter test accounts out of an in-memory employee list.
 * Use when you already have data loaded and need to filter in JS.
 */
export function filterTestAccounts<T extends Pick<Employee, 'is_test_account'>>(employees: T[]): T[] {
  return employees.filter(e => !e.is_test_account);
}