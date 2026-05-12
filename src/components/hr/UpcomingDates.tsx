import { Employee } from '../../lib/database.types';
import { Cake, Award } from 'lucide-react';

interface Props {
  employees: Employee[];
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function yearsOfService(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) years--;
  return years;
}

export function UpcomingDates({ employees }: Props) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // Active employees only, with birthday data
  const activeEmployees = employees.filter(e => !e.archived && e.lifecycle_status === 'active');

  // Birthdays this month — sorted by day, only show upcoming (today or later)
  const birthdaysThisMonth = activeEmployees
    .filter(e => e.birthday_month === currentMonth && e.birthday_day && e.birthday_day >= currentDay)
    .sort((a, b) => (a.birthday_day ?? 0) - (b.birthday_day ?? 0));

  // Anniversaries this month — based on start_date, only upcoming
  const anniversariesThisMonth = activeEmployees
    .filter(e => {
      if (!e.start_date) return false;
      const start = new Date(e.start_date);
      const startMonth = start.getMonth() + 1;
      const startDay = start.getDate();
      // Skip current-year hires (not yet a 1-year anniversary)
      const years = yearsOfService(e.start_date);
      return startMonth === currentMonth && startDay >= currentDay && years >= 1;
    })
    .sort((a, b) => {
      const ad = new Date(a.start_date!).getDate();
      const bd = new Date(b.start_date!).getDate();
      return ad - bd;
    });

  if (birthdaysThisMonth.length === 0 && anniversariesThisMonth.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <h3>This Month in {MONTHS[currentMonth - 1]}</h3>
      </div>
      <div style={{ padding: '0 1.25rem 1rem' }}>
        {birthdaysThisMonth.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10, paddingBottom: 6, fontSize: 11, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Cake size={12} /> Birthdays
            </div>
            {birthdaysThisMonth.map(e => (
              <div key={`bd-${e.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F2F1ED' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1B3F6E', minWidth: 38 }}>{ordinal(e.birthday_day!)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: '#9B9890' }}>{e.role} · {e.department}</div>
                </div>
              </div>
            ))}
          </>
        )}
        {anniversariesThisMonth.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 14, paddingBottom: 6, fontSize: 11, fontWeight: 700, color: '#9B9890', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Award size={12} /> Work Anniversaries
            </div>
            {anniversariesThisMonth.map(e => {
              const years = yearsOfService(e.start_date!);
              const day = new Date(e.start_date!).getDate();
              return (
                <div key={`an-${e.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F2F1ED' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#2D9A60', minWidth: 38 }}>{ordinal(day)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: '#9B9890' }}>{years} year{years !== 1 ? 's' : ''} · {e.role}</div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}