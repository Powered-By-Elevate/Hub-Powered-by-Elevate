export const APPLICANT_PHASES = [
  'Screening',
  'Interviewing',
  'Offer',
  'Verification',
  'Closed',
] as const;

export type ApplicantPhase = typeof APPLICANT_PHASES[number];

export const APPLICANT_STAGES_BY_PHASE: Record<ApplicantPhase, string[]> = {
  Screening: ['Resume Vetting', 'Initial Screening', 'Screening Complete'],
  Interviewing: ['Hiring Manager Review', 'Interview 1', 'Interview 2', 'Additional Interview'],
  Offer: ['Offer Letter Draft', 'Offer Letter Sent', 'Offer Letter Accepted'],
  Verification: ['Reference Request', 'Background Check & Drug Test', 'Working Genius Assessment'],
  Closed: ['Closed (did not move forward)'],
};

// Flat list of every stage, in chronological order
export const APPLICANT_STAGES: string[] = APPLICANT_PHASES.flatMap(
  phase => APPLICANT_STAGES_BY_PHASE[phase]
);

// Default stage for new applicants
export const DEFAULT_APPLICANT_STAGE = 'Resume Vetting';
export const DEFAULT_APPLICANT_PHASE: ApplicantPhase = 'Screening';

// Source options
export const APPLICANT_SOURCES = [
  'LinkedIn',
  'Indeed',
  'Referral',
  'Recruiter',
  'Direct Application',
  'Job Fair',
  'Other',
];

// Given a stage, return its phase
export function phaseForStage(stage: string | null): ApplicantPhase | null {
  if (!stage) return null;
  for (const phase of APPLICANT_PHASES) {
    if (APPLICANT_STAGES_BY_PHASE[phase].includes(stage)) return phase;
  }
  return null;
}

// Color tags for phases (used for badges in tables)
export const PHASE_COLORS: Record<ApplicantPhase, { bg: string; color: string }> = {
  Screening: { bg: '#E8EFF8', color: '#1B3F6E' },
  Interviewing: { bg: '#FEF3C7', color: '#92400E' },
  Offer: { bg: '#DCFCE7', color: '#16A34A' },
  Verification: { bg: '#F3E8FF', color: '#7E22CE' },
  Closed: { bg: '#F2F1ED', color: '#6B6860' },
};