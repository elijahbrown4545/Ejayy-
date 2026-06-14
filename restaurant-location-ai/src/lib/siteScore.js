/**
 * Site Scoring Engine
 *
 * Two modes:
 *  • With OSM data  — scores on road type, retail anchors, competition density
 *  • Without data   — demand-ring fallback from own store AUV (works immediately)
 *
 * Own stores are NEVER competitors. Cannibalization penalty applied.
 */

import { haversineDistance } from './expansion';

const ROAD_TIER = {
  motorway: 35, motorway_link: 30,
  trunk: 30, trunk_link: 25,
  primary: 22, secondary: 15,
};

export function scoreSite(lat, lng, areaData, ownLocations = []) {
  const { restaurants = [], retailers = [], roads = [] } = areaData || {};

  // Cannibalization check — own stores only
  let minOwn = Infinity;
  for (const loc of ownLocations) {
    const d = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (d < minOwn) minOwn = d;
  }
  if (minOwn < 0.8) return { score: 0, breakdown: { road: 0, retail: 0, competition: 0, cannibalization: -100 } };
  const cannibalPenalty = minOwn < 1.5 ? 35 : minOwn < 2.5 ? 15 : 0;

  // Road access (traffic proxy)
  let roadScore = 5;
  for (const road of roads) {
    const d = haversineDistance(lat, lng, road.lat, road.lng);
    const tier = ROAD_TIER[road.type] ?? 0;
    if (d < 0.15 && tier > roadScore) roadScore = tier;
  }

  // Retail synergy — anchors within 0.6 mi
  const nearRetail = retailers.filter(r => haversineDistance(lat, lng, r.lat, r.lng) < 0.6);
  const retailScore = Math.min(30, nearRetail.length * 10);

  // Competition dynamics — restaurant density signals demand
  const nearRest = restaurants.filter(r => haversineDistance(lat, lng, r.lat, r.lng) < 0.5);
  const n = nearRest.length;
  const compScore =
    n === 0  ? 12 :
    n <= 2   ? 22 :
    n <= 6   ? 35 :
    n <= 12  ? 25 : 12;

  const raw = roadScore + retailScore + compScore - cannibalPenalty;
  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    breakdown: { road: roadScore, retail: retailScore, competition: compScore, cannibalization: -cannibalPenalty },
  };
}

/**
 * Fallback score used when Overpass data hasn't loaded yet.
 * Uses AUV-based demand rings from own stores so the heatmap
 * shows something meaningful immediately.
 */
function fallbackScore(lat, lng, ownLocations) {
  if (!ownLocations.length) return 28;
  let demand = 0;
  for (const loc of ownLocations) {
    const d = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (d < 0.8) return 0; // inside existing store trade area
    const auv = loc.avg_unit_volume ?? 500000;
    const radius = 1.5 + Math.min(2.5, auv / 700000);
    if (d < radius) {
      const intensity = (auv / 1_000_000) * (1 - d / radius);
      if (intensity > demand) demand = intensity;
    }
  }
  return Math.min(85, Math.round(22 + demand * 45));
}

/** Color scale: dark blue (weak) → light blue → yellow → orange → red (best) */
export function heatColor(score) {
  if (score < 25) return { fill: '#0d47a1', opacity: 0.50 };
  if (score < 42) return { fill: '#1976d2', opacity: 0.52 };
  if (score < 58) return { fill: '#fdd835', opacity: 0.55 };
  if (score < 72) return { fill: '#f4511e', opacity: 0.60 };
  return              { fill: '#b71c1c', opacity: 0.70 };
}

/**
 * Generate a scored heatmap grid. Works with or without Overpass data.
 * Capped at MAX_POINTS to keep the map responsive.
 */
export function generateHeatGrid(bounds, areaData, ownLocations, stepMiles = 1.0) {
  const { north, south, east, west } = bounds;
  const midLat = (north + south) / 2;
  const latStep = stepMiles / 69.0;
  const lngStep = stepMiles / (69.0 * Math.cos((midLat * Math.PI) / 180));

  const hasRealData =
    (areaData?.roads?.length ?? 0) > 3 ||
    (areaData?.retailers?.length ?? 0) > 0;

  const all = [];
  for (let lat = south; lat <= north; lat += latStep) {
    for (let lng = west; lng <= east; lng += lngStep) {
      const { score } = hasRealData
        ? scoreSite(lat, lng, areaData, ownLocations)
        : { score: fallbackScore(lat, lng, ownLocations) };

      if (score >= 15) {
        const { fill, opacity } = heatColor(score);
        // Radius in px: 18 (weak) → 28 (strongest)
        const radius = Math.round(18 + (score / 100) * 10);
        all.push({ lat, lng, score, fill, opacity, radius });
      }
    }
  }

  // Sort by score descending, cap at 250 points for performance
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, 250);
}

/**
 * Pick top expansion recommendations from the scored grid.
 * Only includes high-opportunity sites (score >= 50) separated by 0.6+ miles.
 */
export function generateScoredRecommendations(bounds, areaData, ownLocations) {
  const grid = generateHeatGrid(bounds, areaData, ownLocations, 0.4);
  const recs = [];

  for (const pt of grid) {
    if (pt.score < 50) break;
    const tooClose = recs.some(r => haversineDistance(pt.lat, pt.lng, r.lat, r.lng) < 0.6);
    if (!tooClose) {
      // Re-score with full breakdown for the popup
      const result = (areaData?.roads?.length ?? 0) > 0
        ? scoreSite(pt.lat, pt.lng, areaData, ownLocations)
        : { score: pt.score, breakdown: { road: '-', retail: '-', competition: '-', cannibalization: 0 } };

      let nearest = null, nearestDist = Infinity;
      for (const loc of ownLocations) {
        const d = haversineDistance(pt.lat, pt.lng, loc.lat, loc.lng);
        if (d < nearestDist) { nearestDist = d; nearest = loc; }
      }

      recs.push({
        ...pt,
        ...result,
        nearestStore: nearest?.name ?? 'N/A',
        distanceToNearest: nearestDist,
      });
    }
    if (recs.length >= 6) break;
  }

  return recs;
}
