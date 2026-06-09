/**
 * AI Expansion Engine
 * Analyzes existing store data and recommends where to open next.
 */

/** Returns distance in miles between two lat/lng points using Haversine formula. */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts a distance in miles to approximate degree offsets.
 * Used for generating surrounding demand points.
 */
function milesToDegrees(miles, lat) {
  const latDeg = miles / 69.0;
  const lngDeg = miles / (69.0 * Math.cos((lat * Math.PI) / 180));
  return { latDeg, lngDeg };
}

/**
 * Generates demand heatmap points from existing locations.
 * For each location with avg_unit_volume, produces a center point and
 * surrounding ring points at 0.5, 1, 1.5, and 2 mile radii with 8 compass
 * directions per ring.
 *
 * @param {Array} locations
 * @returns {Array<{lat: number, lng: number, intensity: number}>}
 */
export function generateDemandPoints(locations) {
  const points = [];
  const rings = [0.5, 1.0, 1.5, 2.0];
  const directions = 8; // evenly spaced angles

  for (const loc of locations) {
    const auv = loc.avg_unit_volume ?? 0;
    if (!auv || auv <= 0) continue;

    const intensity = auv / 1_000_000;

    // Center point
    points.push({ lat: loc.lat, lng: loc.lng, intensity });

    // Surrounding ring points
    for (const ring of rings) {
      const ringIntensity = intensity * Math.max(0, 1 - ring / 2.5); // fade with distance
      const { latDeg, lngDeg } = milesToDegrees(ring, loc.lat);

      for (let i = 0; i < directions; i++) {
        const angle = (2 * Math.PI * i) / directions;
        points.push({
          lat: loc.lat + latDeg * Math.sin(angle),
          lng: loc.lng + lngDeg * Math.cos(angle),
          intensity: Math.max(0.05, ringIntensity),
        });
      }
    }
  }

  return points;
}

/**
 * Generates ranked expansion recommendations based on existing store locations
 * and their revenue (AUV) data.
 *
 * @param {Array} locations
 * @returns {Array} sorted recommendation objects
 */
export function generateExpansionRecommendations(locations) {
  const activeStores = locations.filter(
    (l) => l.status === 'active' || (l.avg_unit_volume ?? 0) > 0
  );

  if (activeStores.length === 0) return [];

  const expansionDistances = [2.0, 3.0, 4.0]; // miles
  const compassDirections = 8;

  const candidates = [];

  for (const store of activeStores) {
    for (const dist of expansionDistances) {
      const { latDeg, lngDeg } = milesToDegrees(dist, store.lat);

      for (let i = 0; i < compassDirections; i++) {
        const angle = (2 * Math.PI * i) / compassDirections;
        const candidateLat = store.lat + latDeg * Math.sin(angle);
        const candidateLng = store.lng + lngDeg * Math.cos(angle);

        // Cannibalization check: skip if any existing store is within 0.8 miles
        const tooClose = locations.some(
          (l) => haversineDistance(candidateLat, candidateLng, l.lat, l.lng) < 0.8
        );
        if (tooClose) continue;

        // Demand score: sum weighted contribution of all nearby active stores
        let demandScore = 0;
        for (const s of activeStores) {
          const d = haversineDistance(candidateLat, candidateLng, s.lat, s.lng);
          const auv = s.avg_unit_volume ?? 0;
          demandScore += (auv / 1_000_000) * Math.max(0, 1 - d / 5);
        }

        // Market gap bonus: no existing store within 1.5 miles
        const hasMarketGap = !locations.some(
          (l) => haversineDistance(candidateLat, candidateLng, l.lat, l.lng) < 1.5
        );
        if (hasMarketGap) demandScore += 0.3;

        // Find nearest existing store for display
        let nearestStore = null;
        let distanceToNearest = Infinity;
        for (const l of locations) {
          const d = haversineDistance(candidateLat, candidateLng, l.lat, l.lng);
          if (d < distanceToNearest) {
            distanceToNearest = d;
            nearestStore = l;
          }
        }

        // Normalize score to 0-100 (demand scores typically range 0 - ~3)
        const rawScore = Math.min(demandScore, 3.0);
        const score = Math.round((rawScore / 3.0) * 100);

        // Build reasoning string
        const auvFormatted = nearestStore?.avg_unit_volume
          ? `$${(nearestStore.avg_unit_volume / 1_000_000).toFixed(1)}M`
          : 'N/A';
        const distFormatted = distanceToNearest.toFixed(1);
        const gapNote = hasMarketGap
          ? ' No existing competition in this market gap.'
          : ' Some overlap with existing coverage area.';
        const overlapNote =
          distanceToNearest < 3
            ? ' High customer overlap expected in this corridor.'
            : ' Moderate customer overlap with nearest location.';

        const reasoning = `${distFormatted} miles from ${nearestStore?.name ?? 'nearest store'} (AUV: ${auvFormatted}).${overlapNote}${gapNote}`;

        candidates.push({
          lat: parseFloat(candidateLat.toFixed(5)),
          lng: parseFloat(candidateLng.toFixed(5)),
          score,
          demandScore: parseFloat(demandScore.toFixed(3)),
          nearestStore: nearestStore?.name ?? 'Unknown',
          distanceToNearest: parseFloat(distanceToNearest.toFixed(2)),
          reasoning,
        });
      }
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate: remove candidates within 0.5 miles of an already-accepted candidate
  const deduplicated = [];
  for (const candidate of candidates) {
    const tooCloseToAccepted = deduplicated.some(
      (accepted) =>
        haversineDistance(candidate.lat, candidate.lng, accepted.lat, accepted.lng) < 0.5
    );
    if (!tooCloseToAccepted) {
      deduplicated.push(candidate);
    }
    if (deduplicated.length >= 6) break;
  }

  return deduplicated;
}

/**
 * Converts a 0-100 score to a letter grade.
 * @param {number} score
 * @returns {'A'|'B'|'C'|'D'}
 */
export function scoreToGrade(score) {
  if (score >= 75) return 'A';
  if (score >= 50) return 'B';
  if (score >= 25) return 'C';
  return 'D';
}
