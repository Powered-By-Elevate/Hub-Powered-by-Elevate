import { Employee, QuarterlyCheckin, AnnualReview } from '../../lib/database.types';
import { checkinStatusClass, reviewStatusClass } from '../shared/utils';

interface Props {
  employee: Employee;
  checkins: QuarterlyCheckin[];
  reviews: AnnualReview[];
}

export function EmpCheckins({ employee, checkins, reviews }: Props) {
  const upcoming = checkins.filter(c => c.status !== 'completed');
  const completedCheckins = checkins.filter(c => c.status === 'completed');

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Check-ins & Reviews</h1>
          <p>Your scheduled performance check-ins and annual reviews</p>
        </div>
      </div>
      <div className="content">
        <div className="two-col">
          <div>
            <div className="card mb2">
              <div className="card-header"><h3>Quarterly Check-ins</h3></div>
              {checkins.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <p>No check-ins scheduled yet</p>
                  <div className="esub">Your manager or HR will schedule your quarterly check-ins.</div>
                </div>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <div style={{ padding: '0 1.25rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 0 6px' }}>Upcoming</div>
                      {upcoming.map(c => (
                        <div key={c.id} className="sched-item">
                          <div className="sched-dot" style={{ background: c.status === 'overdue' ? '#DC2626' : '#1B3F6E' }} />
                          <div className="sched-time">{c.quarter} {c.year}</div>
                          <div>
                            <div className="sched-title">{c.scheduled_at}</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                              <span className={`badge ${checkinStatusClass(c.status)}`}>{c.status}</span>
                            </div>
                            {c.notes && <div className="sched-sub" style={{ marginTop: 4 }}>{c.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {completedCheckins.length > 0 && (
                    <div style={{ padding: '0 1.25rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9890', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 0 6px' }}>Completed</div>
                      {completedCheckins.map(c => (
                        <div key={c.id} className="sched-item">
                          <div className="sched-dot" style={{ background: '#2D9A60' }} />
                          <div className="sched-time">{c.quarter} {c.year}</div>
                          <div>
                            <div className="sched-title">{c.completed_at ?? c.scheduled_at}</div>
                            <span className="badge b-success">Completed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header"><h3>Annual Reviews</h3></div>
              {reviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <p>No reviews scheduled yet</p>
                  <div className="esub">Your annual review will appear here when scheduled.</div>
                </div>
              ) : reviews.map(r => (
                <div key={r.id} className="check-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.review_year} Annual Review</div>
                    <span className={`badge ${reviewStatusClass(r.status)}`}>{r.status}</span>
                  </div>
                  {r.scheduled_at && (
                    <div style={{ fontSize: 13, color: '#6B6860' }}>Scheduled: {r.scheduled_at}</div>
                  )}
                  {r.rating && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#1A1916', fontWeight: 600 }}>Rating:</span>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ fontSize: 16, color: s <= (r.rating ?? 0) ? '#F59E0B' : '#E5E3DC' }}>★</span>
                      ))}
                    </div>
                  )}
                  {r.summary && <div style={{ fontSize: 13, color: '#6B6860', lineHeight: 1.5 }}>{r.summary}</div>}
                  {r.goals_next_year && (
                    <div style={{ fontSize: 13, color: '#1A1916' }}>
                      <strong>Goals:</strong> {r.goals_next_year}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
