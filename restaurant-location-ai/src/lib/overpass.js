/**
 * Overpass API wrapper — free, no key required.
 * Fetches restaurants, retail anchors, and major roads for a bounding box.
 * Results are cached 10 minutes per bbox.
 */

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Don't query areas larger than ~30×30 miles to keep requests fast
const MAX_AREA_DEG = 0.5; // ~35 miles

export async function fetchAreaData(bounds) {
  let { north, south, east, west } = bounds;

  // Clamp if area is too large
  const latSpan = north - south;
  const lngSpan = east - west;
  if (latSpan > MAX_AREA_DEG || lngSpan > MAX_AREA_DEG) {
    const midLat = (north + south) / 2;
    const midLng = (east + west) / 2;
    const half = MAX_AREA_DEG / 2;
    north = midLat + half; south = midLat - half;
    east  = midLng + half; west  = midLng - half;
  }

  const key = `${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const bbox = `${south},${west},${north},${east}`;

  // Lean query — only the data we actually use for scoring
  const query =
    `[out:json][timeout:25];(` +
    `node["amenity"~"^(restaurant|fast_food|cafe)$"](${bbox});` +
    `way["amenity"~"^(restaurant|fast_food|cafe)$"](${bbox});` +
    `node["shop"~"^(supermarket|department_store|mall|wholesale)$"](${bbox});` +
    `way["shop"~"^(supermarket|department_store|mall|wholesale)$"](${bbox});` +
    `way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|secondary)$"](${bbox});` +
    `);out center tags;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(28000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const restaurants = [];
    const retailers   = [];
    const roads       = [];

    for (const el of json.elements || []) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) continue;

      const tags    = el.tags || {};
      const amenity = tags.amenity;
      const shop    = tags.shop;
      const highway = tags.highway;
      const name    = tags.name || tags.brand || '';

      if (amenity && ['restaurant','fast_food','cafe'].includes(amenity)) {
        restaurants.push({ lat, lng, name: name || amenity, type: amenity });
      } else if (shop && ['supermarket','department_store','mall','wholesale'].includes(shop)) {
        retailers.push({ lat, lng, name: name || shop, type: shop });
      } else if (highway) {
        roads.push({ lat, lng, type: highway });
      }
    }

    const data = { restaurants, retailers, roads };
    CACHE.set(key, { data, ts: Date.now() });
    return data;
  } catch (err) {
    console.warn('[Overpass]', err.message);
    return { restaurants: [], retailers: [], roads: [] };
  }
}

/** Competitor count within a radius (used in detail panel). */
export async function fetchNearbyRestaurants(lat, lng, radiusMiles = 1) {
  const r = Math.round(radiusMiles * 1609);
  const q =
    `[out:json][timeout:12];` +
    `(node["amenity"~"^(restaurant|fast_food)$"](around:${r},${lat},${lng}););out count;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(q),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(14000),
    });
    const data = await res.json();
    return data.elements?.[0]?.tags?.total ?? null;
  } catch {
    return null;
  }
}
