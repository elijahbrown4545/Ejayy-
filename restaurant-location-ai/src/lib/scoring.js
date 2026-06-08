/**
 * Weights used to compute a location's composite score.
 * All weights must sum to 1.
 */
export const SCORE_WEIGHTS = {
  foot_traffic_score: 0.30,
  competition_score:  0.20,
  demographics_score: 0.20,
  accessibility_score: 0.15,
  rent_score:          0.15,
};

export const SCORE_LABELS = {
  foot_traffic_score:   'Foot Traffic',
  competition_score:    'Low Competition',
  demographics_score:   'Demographics Fit',
  accessibility_score:  'Accessibility',
  rent_score:           'Rent Value',
};

/** Returns a 0-100 composite score from individual dimension scores. */
export function computeOverallScore(location) {
  return Math.round(
    Object.entries(SCORE_WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + (location[key] ?? 50) * weight;
    }, 0)
  );
}

/** Returns a color class string based on score value. */
export function scoreColor(score) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-600';
}

export function scoreBgColor(score) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  if (score >= 40) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export function scoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

/** Ranks locations by overall score descending. */
export function rankLocations(locations) {
  return [...locations].sort((a, b) => {
    const sa = computeOverallScore(a);
    const sb = computeOverallScore(b);
    return sb - sa;
  });
}
