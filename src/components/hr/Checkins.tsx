import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, QuarterlyCheckin, AnnualReview, LifecycleCheckin } from '../../lib/database.types';
import { checkinStatusClass, reviewStatusClass } from '../shared/utils';

type CheckinTab = 'quarterly' | 'lifecycle' | 'annual';

interface Props {
  employees: Employee[];
  checkins: QuarterlyCheckin[];
  reviews: AnnualReview[];
  lifecycleCheckins: LifecycleCheckin[];
  onOpenModal: (type: string, eid?: string) => void;
  onCheckinUpdated: () => void;
  onReviewUpdated: () => void;
  onLifecycleCheckinUpdated: () => void;
}

export function HRCheckins({ employees, checkins, reviews, lifecycleCheckins, onOpenModal, onCheckinUpdated, onReviewUpdated, onLifecycleCheckinUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<CheckinTab>('quarterly');

  function empName(id: string) {
    return employees.find(e => e.id === id)?.name ?? 'Unknown';
  }

  async function markCheckinComplete(id: string) {
    await supabase.from('quarterly_checkins').update({ status: 'completed', completed_at: new Date().toISOString().split('T')[0] }).eq('id', id);
    onCheckinUpdated();
  }

  async function markReviewComplete(id: string) {
    await supabase.from('annual_reviews').update({ status: 'completed', completed_at: new Date().toISOString().split('T')[0] }).eq('id', id);
    onReviewUpdated();
  }

  async function markLifecycleComplete(id: string) {
    await supabase.from('lifecycle_checkins').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    onLifecycleCheckinUpdated();
  }

  const overdueCheckins = checkins.filter(c => c.status === 'overdue');
  const pendingCheckins = checkins.filter(c => c.status === 'pending');
  const completedCheckins = checkins.filter(c => c.status === 'completed');

  const overdueReviews = reviews.filter(r => r.status === 'overdue');
  const pendingReviews = reviews.filter(r => r.status === 'pending' || r.status === 'in-progress');

  const activeLifecycle = lifecycleCheckins.filter(lc => lc.status !== 'skipped');
  const overdueLifecycle = activeLifecycle.filter(lc => lc.status === 'overdue');
  const pendingLifecycle = activeLifecycle.filter(lc => lc.status === 'pending');

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Check-ins & Reviews</h1>
          <p>Track quarterly check-ins, annual reviews, and 30-60-90 milestones</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost" onClick={() => onOpenModal('add-review')}>+ Annual Review</button>
          <button className="btn-primary" onClick={() => onOpenModal('add-checkin')}>+ Schedule Check-in</button>
        </div>
      </div>
      <div className="content">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="stat-card">
            <div className="stat-label">Total Check-ins</div>
            <div className="stat-value">{checkins.length}</div>
            <div className="stat-sub">{completedCheckins.length} completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Check-ins</div>
            <div className="stat-value c-navy">{pendingCheckins.length}</div>
            <div className="stat-sub">Scheduled</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">30-60-90 Pending</div>
            <div className="stat-value c-navy">{pendingLifecycle.length}</div>
            <div className="stat-sub">{overdueLifecycle.length} overdue</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Annual Reviews</div>
            <div className="stat-value">{reviews.length}</div>
            <div className="stat-sub">{overdueReviews.length + pendingReviews.length} pending</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E3DC' }}>
            {(['quarterly', 'lifecycle', 'annual'] as CheckinTab[]).map(t => (
              <button
                key={t}
                className={`tab-btn${activeTab === t ? ' active' : ''}`}
                style={{ fontSize: 13, padding: '10px 18px' }}
                onClick={() => setActiveTab(t)}
              >
                {t === 'quarterly' ? 'Quarterly Check-ins' : t === 'lifecycle' ? '30-60-90 Check-ins' : 'Annual Reviews'}
                <span style={{
                  marginLeft: 6, padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: activeTab === t ? '#E8EFF8' : '#F2F1ED',
                  color: activeTab === t ? '#1B3F6E' : '#9B9890'
                }}>
                  {t === 'quarterly' ? checkins.length : t === 'lifecycle' ? activeLifecycle.length : reviews.length}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'quarterly' && (
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Quarter</th><th>Scheduled</th><th>Status</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {checkins.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><div className="empty-icon">📅</div><p>No check-ins scheduled</p><div className="esub">Click "+ Schedule Check-in" to get started</div></div>
                  </td></tr>
                ) : checkins.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="emp-name">{empName(c.employee_id)}</div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{c.quarter} {c.year}</td>
                    <td style={{ fontSize: 12, color: '#6B6860' }}>{c.scheduled_at}</td>
                    <td><span className={`badge ${checkinStatusClass(c.status)}`}>{c.status}</span></td>
                    <td style={{ fontSize: 12, color: '#6B6860', maxWidth: 200 }}>{c.notes ?? '—'}</td>
                    <td onClick={ev => ev.stopPropagation()}>
                      {c.status !== 'completed' && (
                        <button className="btn-ghost sm" onClick={() => markCheckinComplete(c.id)}>Mark Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'lifecycle' && (
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Milestone</th><th>Scheduled</th><th>Status</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeLifecycle.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><div className="empty-icon">🎯</div><p>No 30-60-90 check-ins scheduled</p><div className="esub">These auto-generate when applicants are converted to onboarding</div></div>
                  </td></tr>
                ) : activeLifecycle.map(lc => {
                  const dayBadge = lc.milestone_day === 30 ? { bg: '#FEF3C7', color: '#92400E' } : lc.milestone_day === 60 ? { bg: '#E0F2FE', color: '#075985' } : { bg: '#D1FAE5', color: '#065F46' };
                  return (
                    <tr key={lc.id}>
                      <td>
                        <div className="emp-name">{empName(lc.employee_id)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: dayBadge.bg, color: dayBadge.color }}>
                          Day {lc.milestone_day}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#6B6860' }}>{lc.scheduled_at}</td>
                      <td><span className={`badge ${checkinStatusClass(lc.status)}`}>{lc.status}</span></td>
                      <td style={{ fontSize: 12, color: '#6B6860', maxWidth: 200 }}>{lc.notes ?? '—'}</td>
                      <td onClick={ev => ev.stopPropagation()}>
                        {lc.status !== 'completed' && (
                          <button className="btn-ghost sm" onClick={() => markLifecycleComplete(lc.id)}>Mark Complete</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'annual' && (
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Year</th><th>Scheduled</th><th>Status</th><th>Rating</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><div className="empty-icon">📊</div><p>No reviews scheduled</p><div className="esub">Click "+ Annual Review" to get started</div></div>
                  </td></tr>
                ) : reviews.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="emp-name">{empName(r.employee_id)}</div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{r.review_year}</td>
                    <td style={{ fontSize: 12, color: '#6B6860' }}>{r.scheduled_at ?? '—'}</td>
                    <td><span className={`badge ${reviewStatusClass(r.status)}`}>{r.status}</span></td>
                    <td style={{ fontSize: 13 }}>{r.rating ? `${r.rating}/5` : '—'}</td>
                    <td onClick={ev => ev.stopPropagation()}>
                      {r.status !== 'completed' && (
                        <button className="btn-ghost sm" onClick={() => markReviewComplete(r.id)}>Mark Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}