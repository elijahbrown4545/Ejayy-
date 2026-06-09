/**
 * Site Scoring Engine
 *
 * Scores a candidate lat/lng 0–100 using real OSM data:
 *   - Road accessibility  (35 pts) — road classification as traffic proxy
 *   - Retail synergy      (30 pts) — nearby anchor retailers / shopping centers
 *   - Competition dynamics(35 pts) — restaurant density signals demand without saturation
 *
 * Cannibalization penalty: deducted when site is too close to an existing own store.
 * Own stores are NEVER counted as competitors.
 */

import { haversineDistance } from './expansion';

/** Road type → base traffic tier */
const ROAD_TIER = {
  motorway:      35,
  motorway_link: 30,
  trunk:         30,
  trunk_link:    25,
  primary:       22,
  secondary:     15,
};

/**
 * Score a candidate site.
 * @param {number} lat
 * @param {number} lng
 * @param {{ restaurants: Array, retailers: Array, roads: Array }} areaData
 * @param {Array} ownLocations — your existing store list
 * @returns {{ score: number, breakdown: object }}
 */
export function scoreSite(lat, lng, areaData, ownLocations = []) {
  const { restaurants = [], retailers = [], roads = [] } = areaData;

  // ── Cannibalization / territory ──────────────────────────────────────────
  let minOwn = Infinity;
  for (const loc of ownLocations) {
    const d = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (d < minOwn) minOwn = d;
  }
  if (minOwn < 0.8) return { score: 0, breakdown: { road: 0, retail: 0, competition: 0, cannibalization: -100 } };
  const cannibalPenalty = minOwn < 1.5 ? 35 : minOwn < 2.5 ? 15 : 0;

  // ── Road accessibility (traffic proxy) ───────────────────────────────────
  let roadScore = 5;
  for (const road of roads) {
    const d = haversineDistance(lat, lng, road.lat, road.lng);
    const tier = ROAD_TIER[road.type] ?? 0;
    if (d < 0.15 && tier > roadScore) roadScore = tier;
  }

  // ── Retail synergy ────────────────────────────────────────────────────────
  const nearRetail = retailers.filter(r => haversineDistance(lat, lng, r.lat, r.lng) < 0.6);
  const retailScore = Math.min(30, nearRetail.length * 10);

  // ── Competition dynamics ──────────────────────────────────────────────────
  const nearRest = restaurants.filter(r => haversineDistance(lat, lng, r.lat, r.lng) < 0.5);
  let compScore;
  const n = nearRest.length;
  if      (n === 0)  compScore = 12; // no demand signal
  else if (n <= 2)   compScore = 22;
  else if (n <= 6)   compScore = 35; // active food corridor
  else if (n <= 12)  compScore = 25; // some saturation
  else               compScore = 12; // oversaturated

  const raw = roadScore + retailScore + compScore - cannibalPenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    breakdown: { road: roadScore, retail: retailScore, competition: compScore, cannibalization: -cannibalPenalty },
  };
}

/**
 * Heat map color for a 0–100 score.
 * Dark blue (weak) → light blue → yellow → orange → red (strongest).
 */
export function heatColor(score) {
  if (score < 20) return { fill: '#0d47a1', opacity: 0.50 }; // dark blue
  if (score < 40) return { fill: '#1976d2', opacity: 0.52 }; // medium blue
  if (score < 55) return { fill: '#fdd835', opacity: 0.55 }; // yellow
  if (score < 70) return { fill: '#f4511e', opacity: 0.60 }; // orange
  return              { fill: '#b71c1c', opacity: 0.70 }; // red
}

/**
 * Generate a scored heatmap grid for the visible map bounds.
 * Skips cells with score < threshold to keep the grid sparse & fast.
 */
export function generateHeatGrid(bounds, areaData, ownLocations, stepMiles = 0.4) {
  const { north, south, east, west } = bounds;
  const latStep = stepMiles / 69.0;
  const lngStep = stepMiles / (69.0 * Math.cos((((north + south) / 2) * Math.PI) / 180));

  const points = [];
  for (let lat = south; lat <= north; lat += latStep) {
    for (let lng = west; lng <= east; lng += lngStep) {
      const { score } = scoreSite(lat, lng, areaData, ownLocations);
      if (score >= 15) {
        const { fill, opacity } = heatColor(score);
        // Radius scales with score: stronger = slightly larger blob
        const radius = 200 + score * 4; // metres
        points.push({ lat, lng, score, fill, opacity, radius });
      }
    }
  }
  return points;
}

/**
 * Generate AI expansion recommendations from a scored grid.
 * Filters out cannibalistic sites and deduplicates within 0.6 miles.
 */
export function generateScoredRecommendations(bounds, areaData, ownLocations) {
  const grid = generateHeatGrid(bounds, areaData, ownLocations, 0.35);

  // Sort descending
  grid.sort((a, b) => b.score - a.score);

  // Deduplicate: no two recs within 0.6 miles of each other
  const recs = [];
  for (const pt of grid) {
    if (pt.score < 50) break; // only orange/red sites
    const tooClose = recs.some(r => haversineDistance(pt.lat, pt.lng, r.lat, r.lng) < 0.6);
    if (!tooClose) recs.push(pt);
    if (recs.length >= 6) break;
  }

  // Enrich with nearest own store
  return recs.map(pt => {
    let nearest = null, nearestDist = Infinity;
    for (const loc of ownLocations) {
      const d = haversineDistance(pt.lat, pt.lng, loc.lat, loc.lng);
      if (d < nearestDist) { nearestDist = d; nearest = loc; }
    }
    return { ...pt, nearestStore: nearest?.name ?? 'N/A', distanceToNearest: nearestDist };
  });
}
