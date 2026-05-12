import { supabase } from './supabase';
import { ScheduleTemplateEvent } from './database.types';

/**
 * Apply a schedule template to an employee.
 * Copies each template event to the schedules table with calculated dates
 * (start_date + day_offset). Creates bidirectional entries for shadow events.
 */
export async function applyScheduleTemplate(
  templateId: string,
  employeeId: string,
  startDate: string,
): Promise<{ success: boolean; eventCount: number; error?: string }> {
  // Load template events
  const { data: events, error: e1 } = await supabase
    .from('schedule_template_events')
    .select('*')
    .eq('template_id', templateId)
    .order('day_offset', { ascending: true })
    .order('sort_order', { ascending: true });

  if (e1) return { success: false, eventCount: 0, error: e1.message };
  if (!events || events.length === 0) return { success: false, eventCount: 0, error: 'Template has no events' };

  const start = new Date(startDate);
  const rows = events.map((ev: ScheduleTemplateEvent) => {
    const eventDate = new Date(start);
    eventDate.setDate(eventDate.getDate() + (ev.day_offset - 1));
    return {
      employee_id: employeeId,
      title: ev.title,
      time_label: ev.time_label,
      location: ev.location,
      color: ev.color,
      schedule_date: eventDate.toISOString().split('T')[0],
      shadow_employee_id: ev.shadow_employee_id,
    };
  });

  // Insert primary events for the new hire
  const { error: e2 } = await supabase.from('schedules').insert(rows);
  if (e2) return { success: false, eventCount: 0, error: e2.message };

  // For each event that has a shadow_employee_id, create a mirror entry on THAT employee's calendar
  // showing they're hosting/conducting the shadow
  const shadowRows = rows
    .filter(r => r.shadow_employee_id)
    .map(r => ({
      employee_id: r.shadow_employee_id,
      title: `Shadowing session: ${r.title}`,
      time_label: r.time_label,
      location: r.location,
      color: r.color,
      schedule_date: r.schedule_date,
      shadow_employee_id: employeeId, // Bidirectional link back to the new hire
    }));

  if (shadowRows.length > 0) {
    const { error: e3 } = await supabase.from('schedules').insert(shadowRows);
    if (e3) {
      // Non-fatal — primary events were created, log but don't fail
      console.error('Failed to create shadow mirror events:', e3);
    }
  }

  return { success: true, eventCount: rows.length };
}