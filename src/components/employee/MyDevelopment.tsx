import { Employee, DevelopmentPlan, Certification, Checkin, Review, Pathway } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { FileText } from 'lucide-react';

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PLAN_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'Not Started': { bg: '#F2F1ED', color: '#6B6860' },
  'In Progress': { bg: '#E8EFF8', color: '#1B3F6E' },
  'Completed': { bg: '#D1FAE5', color: '#065F46' },
};

// ── My Goals (Development Plans) ─────────────────────────────────────────────
// Employee view: shows current_level, pathway — NOT readiness_level, next_level, current_status

interface MyGoalsProps {
  plans: DevelopmentPlan[];
  pathways: Pathway[];
  employee: Employee;
}

export function EmpMyGoals({ plans, pathways, employee }: MyGoalsProps) {
  const pathwayName = pathways.find(p => p.id === employee.pathway_id)?.name ?? null;
  const active = plans.filter(p => p.status !== 'Completed');
  const completed = plans.filter(p => p.status === 'Completed');

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Development Goals</h1>
          <p>{active.length} active · {completed.length} completed</p>
        </div>
      </div>
      <div className="content">
        {/* Only show current_level and pathway — NOT next_level, readiness_level, current_status */}
        {(employee.current_level || pathwayName) && (
          <div className="card mb2" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {employee.current_level && (
                <div>
                  <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 2 }}>My Current Level</div>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#1B3F6E', background: '#E8EFF8', padding: '3px 12px', borderRadius: 8, display: 'inline-block' }}>{employee.current_level}</span>
                </div>
              )}
              {pathwayName && (
                <div>
                  <div style={{ fontSize: 11, color: '#9B9890', marginBottom: 2 }}>My Pathway</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1916' }}>{pathwayName}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>No development goals yet</p>
              <div className="esub">Your HR team will set up your development plan.</div>
            </div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="card mb2">
                <div className="card-header"><h3>Active Goals ({active.length})</h3></div>
                {active.map(p => {
                  const sc = PLAN_STATUS_COLORS[p.status] ?? PLAN_STATUS_COLORS['Not Started'];
                  return (
                    <div key={p.id} style={{ padding: '14px 1.25rem', borderBottom: '1px solid #F2F1ED' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{p.goal_title}</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 700 }}>{p.status}</span>
                          </div>
                          {p.target_date && <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 6 }}>Target: {fmt(p.target_date)}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ flex: 1, maxWidth: 240, height: 8, background: '#F2F1ED', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: p.progress_pct + '%', background: '#1B3F6E', borderRadius: 4, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6860' }}>{p.progress_pct}%</span>
                          </div>
                          {p.notes && <div style={{ fontSize: 12, color: '#6B6860', lineHeight: 1.5 }}>{p.notes}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {completed.length > 0 && (
              <div className="card">
                <div className="card-header"><h3>Completed ({completed.length})</h3></div>
                {completed.map(p => (
                  <div key={p.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F2F1ED', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1916' }}>{p.goal_title}</div>
                      {p.target_date && <div style={{ fontSize: 11, color: '#9B9890', marginTop: 2 }}>Target: {fmt(p.target_date)}</div>}
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', fontWeight: 700 }}>Completed</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── My Certifications ────────────────────────────────────────────────────────
// Employee view: shows all certification fields (these are earned by the employee)

interface MyCertificationsProps {
  certifications: Certification[];
  employee: Employee;
}

export function EmpMyCertifications({ certifications }: MyCertificationsProps) {
  async function viewProof(path: string) {
    const { data } = await supabase.storage.from('certification-proofs').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const completed = certifications.filter(c => c.status === 'Completed');
  const inProgress = certifications.filter(c => c.status === 'In Progress');
  const notStarted = certifications.filter(c => c.status === 'Not Started');

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Certifications</h1>
          <p>{completed.length} completed · {inProgress.length} in progress · {notStarted.length} not started</p>
        </div>
      </div>
      <div className="content">
        {certifications.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <p>No certifications tracked yet</p>
              <div className="esub">Certifications assigned by HR will appear here.</div>
            </div>
          </div>
        ) : (
          <div className="card">
            {([['In Progress', inProgress], ['Completed', completed], ['Not Started', notStarted]] as [string, Certification[]][]).map(([label, group]) => {
              if (group.length === 0) return null;
              return (
                <div key={label}>
                  <div style={{ padding: '10px 1.25rem 6px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#9B9890', borderBottom: '1px solid #F2F1ED' }}>
                    {label}
                  </div>
                  {group.map(c => {
                    const sc = PLAN_STATUS_COLORS[c.status] ?? PLAN_STATUS_COLORS['Not Started'];
                    return (
                      <div key={c.id} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #F9F8F5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{c.course_name}</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 700 }}>{c.status}</span>
                          </div>
                          {c.completion_date && <div style={{ fontSize: 12, color: '#9B9890', marginBottom: 4 }}>Completed: {fmt(c.completion_date)}</div>}
                          {c.proof_path && (
                            <button className="btn-ghost sm" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }} onClick={() => viewProof(c.proof_path!)}>
                              <FileText size={12} /> View Proof
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── My Check-ins ─────────────────────────────────────────────────────────────
// Employee view: shows date and pillar_focus ONLY
// Hidden: motivation_level, decision, pillar_reflection, contribution_to_growth,
//         business_dev_involvement, notes (all HR-internal)

interface MyCheckinsProps {
  checkins: Checkin[];
  quarterlyCheckins: import('../../lib/database.types').QuarterlyCheckin[];
  lifecycleCheckins: import('../../lib/database.types').LifecycleCheckin[];
  employee: Employee;
}

export function EmpMyCheckins({ checkins, quarterlyCheckins, lifecycleCheckins }: MyCheckinsProps) {
  // Combine all check-in types into a single sortable list
  type CheckinEntry = {
    id: string;
    date: string;
    type: 'Quarterly' | 'Lifecycle' | 'Legacy';
    label: string;
    status?: string;
    pillar_focus?: string | null;
  };

  const combined: CheckinEntry[] = [
    ...quarterlyCheckins.map(c => ({
      id: c.id,
      date: c.scheduled_at,
      type: 'Quarterly' as const,
      label: `${c.quarter} ${c.year} Check-in`,
      status: c.status,
    })),
    ...lifecycleCheckins.filter(lc => lc.status !== 'skipped').map(lc => ({
      id: lc.id,
      date: lc.scheduled_at,
      type: 'Lifecycle' as const,
      label: `Day ${lc.milestone_day} Check-in`,
      status: lc.status,
    })),
    ...checkins.map(c => ({
      id: c.id,
      date: c.checkin_date,
      type: 'Legacy' as const,
      label: 'Quarterly Check-in',
      pillar_focus: c.pillar_focus,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCount = combined.length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Check-ins</h1>
          <p>{totalCount} check-in{totalCount !== 1 ? 's' : ''} on record</p>
        </div>
      </div>
      <div className="content">
        {totalCount === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No check-ins yet</p>
              <div className="esub">Your scheduled check-ins with HR will appear here.</div>
            </div>
          </div>
        ) : (
          <div className="card">
            {combined.map(c => {
              const statusColor = c.status === 'completed'
                ? { bg: '#D1FAE5', color: '#065F46' }
                : c.status === 'overdue'
                  ? { bg: '#FEE2E2', color: '#991B1B' }
                  : { bg: '#FEF3C7', color: '#92400E' };
              const typeColor = c.type === 'Quarterly'
                ? { bg: '#E8EFF8', color: '#1B3F6E' }
                : c.type === 'Lifecycle'
                  ? { bg: '#F0F9FF', color: '#075985' }
                  : { bg: '#F2F1ED', color: '#6B6860' };
              return (
                <div key={`${c.type}-${c.id}`} style={{ padding: '14px 1.25rem', borderBottom: '1px solid #F2F1ED', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.label}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: typeColor.bg, color: typeColor.color, fontWeight: 700 }}>{c.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9B9890' }}>{fmt(c.date)}</div>
                    {c.pillar_focus && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: '#E8EFF8', color: '#1B3F6E', fontWeight: 600 }}>
                          {c.pillar_focus}
                        </span>
                      </div>
                    )}
                  </div>
                  {c.status && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: statusColor.bg, color: statusColor.color }}>
                      {c.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── My Reviews ───────────────────────────────────────────────────────────────
// Employee view: shows date, type, year ONLY
// Hidden: sentiment, notes, pdf_path (all HR-internal)

interface MyReviewsProps {
  reviews: Review[];
  annualReviews: import('../../lib/database.types').AnnualReview[];
  employee: Employee;
}

export function EmpMyReviews({ reviews, annualReviews }: MyReviewsProps) {
  type ReviewEntry = {
    id: string;
    date: string;
    type: string;
    year: number;
    source: 'annual' | 'legacy';
    status?: string;
  };

  const combined: ReviewEntry[] = [
    ...annualReviews.map(r => ({
      id: r.id,
      date: r.scheduled_at ?? r.created_at,
      type: 'Annual Review',
      year: r.review_year,
      source: 'annual' as const,
      status: r.status,
    })),
    ...reviews.map(r => ({
      id: r.id,
      date: r.review_date,
      type: r.review_type,
      year: r.review_year,
      source: 'legacy' as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>My Reviews</h1>
          <p>{combined.length} review{combined.length !== 1 ? 's' : ''} on record</p>
        </div>
      </div>
      <div className="content">
        {combined.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No reviews yet</p>
              <div className="esub">Your scheduled performance reviews will appear here.</div>
            </div>
          </div>
        ) : (
          <div className="card">
            {combined.map(r => {
              const statusColor = r.status === 'completed'
                ? { bg: '#D1FAE5', color: '#065F46' }
                : r.status === 'overdue'
                  ? { bg: '#FEE2E2', color: '#991B1B' }
                  : { bg: '#FEF3C7', color: '#92400E' };
              return (
                <div key={`${r.source}-${r.id}`} style={{ padding: '14px 1.25rem', borderBottom: '1px solid #F2F1ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.type} {r.year}</div>
                    <div style={{ fontSize: 12, color: '#9B9890', marginTop: 3 }}>{fmt(r.date)}</div>
                  </div>
                  {r.status ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: statusColor.bg, color: statusColor.color }}>
                      {r.status}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6B6860', background: '#F2F1ED', padding: '3px 10px', borderRadius: 8 }}>
                      {r.type}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
